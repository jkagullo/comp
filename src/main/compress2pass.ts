import { ChildProcess, spawn } from 'child_process'
import { stat, unlink } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { getFfmpegBinaryPath } from './ffmpegPaths'
import { calculateBitratesKbps } from '../shared/bitrate'
import { clamp } from '../shared/format'
import { CompressionErrorCode, CompressionResult } from '../shared/ipcTypes'

const NULL_OUTPUT = process.platform === 'win32' ? 'NUL' : '/dev/null'

/** Pass 1 (analysis-only, no audio, no VBV capping) is typically faster wall-clock than
 *  pass 2 (the real encode) - this weighting is an unmeasured starting point for the
 *  overall 0-100 progress bar; retune after observing real timing on test files. */
const PASS1_WEIGHT = 0.35
const PASS2_WEIGHT = 0.65

const STDERR_TAIL_BYTES = 4000

interface TrackedJob {
  readonly jobId: string
  readonly inputPath: string
  readonly outputPath: string
  currentProcess: ChildProcess | null
  readonly startedAt: number
  cancelled: boolean
}

/** jobId -> in-flight job, so a running job can be looked up and killed by cancelJob(). */
const activeJobs = new Map<string, TrackedJob>()

export function getActiveJob(jobId: string): TrackedJob | undefined {
  return activeJobs.get(jobId)
}

/** Looks up a running job's ffmpeg process tree and kills it via `taskkill /t /f` (Windows-only
 *  app), deletes the partial output file, and marks the job cancelled so the in-flight
 *  runFfmpegPass settles with a 'cancelled' result instead of misreporting a pass failure.
 *  A no-op (returns { cancelled: false }) if the job already finished on its own - this is a
 *  benign race, not an error. */
export async function cancelJob(jobId: string): Promise<{ cancelled: boolean }> {
  const job = activeJobs.get(jobId)
  if (!job) return { cancelled: false }

  job.cancelled = true

  const pid = job.currentProcess?.pid
  if (pid !== undefined) {
    await new Promise<void>((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/t', '/f'])
      killer.on('exit', () => resolve())
      killer.on('error', () => resolve())
    })
  }

  try {
    await unlink(job.outputPath)
  } catch {
    // Partial output may not exist yet (killed before ffmpeg opened it) - not an error.
  }

  return { cancelled: true }
}

export interface TwoPassParams {
  readonly jobId: string
  readonly inputPath: string
  readonly outputPath: string
  readonly targetMB: number
  readonly durationSec: number
  readonly onProgress: (percent: number, pass: 1 | 2, etaSec: number | null) => void
}

/** Parses one "key=value\n" block from ffmpeg's `-progress pipe:1` stream, returning
 *  the elapsed output time in microseconds (if present in this block) and whether the
 *  block marks the end of this pass ("progress=end"). Exported for unit testing. */
export function parseProgressBlock(lines: readonly string[]): {
  outTimeUs: number | null
  isEnd: boolean
} {
  let outTimeUs: number | null = null
  let isEnd = false

  for (const line of lines) {
    const [key, value] = line.split('=')
    if (key === 'out_time_us' && value !== undefined) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) outTimeUs = parsed
    } else if (key === 'out_time_ms' && value !== undefined && outTimeUs === null) {
      const parsed = Number(value)
      if (Number.isFinite(parsed)) outTimeUs = parsed
    } else if (key === 'progress' && value === 'end') {
      isEnd = true
    }
  }

  return { outTimeUs, isEnd }
}

/** Combines a single pass's completion fraction (0-1) into the overall 0-100 progress
 *  value across both passes, using PASS1_WEIGHT/PASS2_WEIGHT. Exported for unit testing. */
export function weightedPercent(fraction: number, pass: 1 | 2): number {
  const clamped = clamp(fraction, 0, 1)
  if (pass === 1) return clamped * PASS1_WEIGHT * 100
  return (PASS1_WEIGHT + clamped * PASS2_WEIGHT) * 100
}

/** Best-effort classification of ffmpeg's own stderr text for known failure modes ffmpeg
 *  reports via a non-zero exit rather than a Node spawn error (e.g. the disk fills up or a
 *  permission error occurs mid-write, not at spawn time). Exported for unit testing. */
export function classifyFfmpegFailure(stderrTail: string): CompressionErrorCode | null {
  if (/no space left on device/i.test(stderrTail)) return 'disk-full'
  if (/permission denied/i.test(stderrTail)) return 'no-write-permission'
  if (
    /unknown encoder|unrecognized option|invalid encoder type|encoder not found|does not support/i.test(
      stderrTail
    )
  ) {
    return 'unsupported-codec'
  }
  return null
}

function runFfmpegPass(
  binaryPath: string,
  args: readonly string[],
  durationSec: number,
  pass: 1 | 2,
  onProgress: (percent: number, pass: 1 | 2, etaSec: number | null) => void,
  registerProcess: (proc: ChildProcess | null) => void,
  isCancelled: () => boolean
): Promise<{ ok: true } | { ok: false; code: CompressionErrorCode; stderrTail: string }> {
  return new Promise((resolve) => {
    const proc = spawn(binaryPath, args)
    registerProcess(proc)

    let stdoutBuffer = ''
    let stderrTail = ''
    const startedAt = Date.now()
    let settled = false

    const genericFailureCode: CompressionErrorCode =
      pass === 1 ? 'pass-one-failed' : 'pass-two-failed'

    const settle = (
      result: { ok: true } | { ok: false; code: CompressionErrorCode; stderrTail: string }
    ): void => {
      if (settled) return
      settled = true
      registerProcess(null)
      resolve(result)
    }

    proc.stdout?.on('data', (chunk: Buffer) => {
      stdoutBuffer += chunk.toString()
      const lines = stdoutBuffer.split('\n')
      stdoutBuffer = lines.pop() ?? ''

      const { outTimeUs, isEnd } = parseProgressBlock(lines)

      if (isEnd) {
        onProgress(weightedPercent(1, pass), pass, 0)
        return
      }

      if (outTimeUs !== null) {
        const fraction = clamp(outTimeUs / 1_000_000 / durationSec, 0, 1)
        const elapsedSec = (Date.now() - startedAt) / 1000
        const etaSec = fraction > 0.02 ? (elapsedSec / fraction) * (1 - fraction) : null
        onProgress(weightedPercent(fraction, pass), pass, etaSec)
      }
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString()).slice(-STDERR_TAIL_BYTES)
    })

    proc.on('error', (error) => {
      const errno = (error as NodeJS.ErrnoException).code
      const code: CompressionErrorCode =
        errno === 'ENOSPC'
          ? 'disk-full'
          : errno === 'EACCES' || errno === 'EPERM'
            ? 'no-write-permission'
            : genericFailureCode
      settle({ ok: false, code, stderrTail: `failed to spawn ffmpeg: ${error.message}` })
    })

    proc.on('exit', (code) => {
      if (isCancelled()) {
        settle({ ok: false, code: 'cancelled', stderrTail: '' })
        return
      }
      if (code === 0) {
        settle({ ok: true })
        return
      }
      settle({
        ok: false,
        code: classifyFfmpegFailure(stderrTail) ?? genericFailureCode,
        stderrTail
      })
    })
  })
}

async function cleanupPassLogFiles(passLogPrefix: string): Promise<void> {
  const candidates = [`${passLogPrefix}-0.log`, `${passLogPrefix}-0.log.mbtree`]
  await Promise.all(
    candidates.map(async (path) => {
      try {
        await unlink(path)
      } catch {
        // Best-effort cleanup - a missing file (already absent, or never created
        // because a pass never ran) is not an error condition here.
      }
    })
  )
}

/**
 * Runs a 2-pass ffmpeg encode (analysis pass, then a bitrate-targeted encode pass) as
 * background child processes, streaming combined 0-100 progress via onProgress. Never
 * throws - every failure mode is folded into the returned CompressionResult's 'error'
 * branch, mirroring runSinglePassCompression's style.
 */
export async function runTwoPassCompression(params: TwoPassParams): Promise<CompressionResult> {
  const { jobId, inputPath, outputPath, targetMB, durationSec, onProgress } = params

  if (!Number.isFinite(durationSec) || durationSec <= 0) {
    return {
      kind: 'error',
      error: {
        code: 'invalid-duration',
        message: `Invalid duration for compression: ${durationSec}`
      }
    }
  }

  if (!Number.isFinite(targetMB) || targetMB <= 0) {
    return {
      kind: 'error',
      error: {
        code: 'invalid-target-size',
        message: `Invalid target size for compression: ${targetMB}`
      }
    }
  }

  let inputSizeBytes: number
  try {
    const inputStats = await stat(inputPath)
    inputSizeBytes = inputStats.size
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      kind: 'error',
      error: {
        code: 'input-stat-failed',
        message: `Could not read input file "${inputPath}": ${reason}`
      }
    }
  }

  const binaryPath = getFfmpegBinaryPath()
  const { videoKbps, audioKbps } = calculateBitratesKbps(targetMB, durationSec)
  const passLogPrefix = join(tmpdir(), `comp-passlog-${jobId}`)

  const job: TrackedJob = {
    jobId,
    inputPath,
    outputPath,
    currentProcess: null,
    startedAt: Date.now(),
    cancelled: false
  }
  activeJobs.set(jobId, job)
  const isCancelled = (): boolean => job.cancelled

  try {
    const pass1Args = [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-b:v',
      `${videoKbps}k`,
      '-preset',
      'medium',
      '-pass',
      '1',
      '-passlogfile',
      passLogPrefix,
      '-an',
      '-f',
      'null',
      '-progress',
      'pipe:1',
      NULL_OUTPUT
    ]

    const pass1Result = await runFfmpegPass(
      binaryPath,
      pass1Args,
      durationSec,
      1,
      onProgress,
      (proc) => (job.currentProcess = proc),
      isCancelled
    )
    if (!pass1Result.ok) {
      return {
        kind: 'error',
        error:
          pass1Result.code === 'cancelled'
            ? { code: 'cancelled', message: 'Compression was cancelled.' }
            : {
                code: pass1Result.code,
                message: `ffmpeg pass 1 (analysis) failed for "${inputPath}": ${pass1Result.stderrTail}`
              }
      }
    }

    if (isCancelled()) {
      return { kind: 'error', error: { code: 'cancelled', message: 'Compression was cancelled.' } }
    }

    const pass2Args = [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-b:v',
      `${videoKbps}k`,
      '-maxrate',
      `${Math.round(videoKbps * 1.5)}k`,
      '-bufsize',
      `${Math.round(videoKbps * 2)}k`,
      '-preset',
      'medium',
      '-pass',
      '2',
      '-passlogfile',
      passLogPrefix,
      '-c:a',
      'aac',
      '-b:a',
      `${audioKbps}k`,
      '-progress',
      'pipe:1',
      outputPath
    ]

    const pass2Result = await runFfmpegPass(
      binaryPath,
      pass2Args,
      durationSec,
      2,
      onProgress,
      (proc) => (job.currentProcess = proc),
      isCancelled
    )
    if (!pass2Result.ok) {
      return {
        kind: 'error',
        error:
          pass2Result.code === 'cancelled'
            ? { code: 'cancelled', message: 'Compression was cancelled.' }
            : {
                code: pass2Result.code,
                message: `ffmpeg pass 2 (encode) failed for "${inputPath}": ${pass2Result.stderrTail}`
              }
      }
    }
  } finally {
    activeJobs.delete(jobId)
    await cleanupPassLogFiles(passLogPrefix)
  }

  let outputSizeBytes: number
  try {
    const outputStats = await stat(outputPath)
    outputSizeBytes = outputStats.size
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      kind: 'error',
      error: {
        code: 'output-missing',
        message: `ffmpeg reported success but output file "${outputPath}" was not found: ${reason}`
      }
    }
  }

  if (outputSizeBytes >= inputSizeBytes) {
    return {
      kind: 'error',
      error: {
        code: 'output-not-smaller',
        message: `Output file (${outputSizeBytes} bytes) was not smaller than input (${inputSizeBytes} bytes).`
      }
    }
  }

  return { kind: 'success', result: { inputSizeBytes, outputSizeBytes, outputPath } }
}
