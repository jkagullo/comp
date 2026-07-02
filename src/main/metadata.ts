import { execFile } from 'child_process'
import { promisify } from 'util'
import { stat } from 'fs/promises'
import { getFfprobeBinaryPath } from './ffmpegPaths'
import { VideoMetadataResult } from '../shared/ipcTypes'

const execFileAsync = promisify(execFile)

interface FfprobeStream {
  codec_type?: string
  width?: number
  height?: number
}

interface FfprobeFormat {
  duration?: string
}

interface FfprobeOutput {
  format?: FfprobeFormat
  streams?: FfprobeStream[]
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** Runs ffprobe against a file and resolves duration/dimensions/size. Never throws or rejects -
 *  every failure mode is folded into the returned VideoMetadataResult's 'error' branch. */
export async function getVideoMetadata(filePath: string): Promise<VideoMetadataResult> {
  const binaryPath = getFfprobeBinaryPath()

  let stdout: string
  try {
    const result = await execFileAsync(binaryPath, [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath
    ])
    stdout = result.stdout
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      kind: 'error',
      error: {
        code: 'ffprobe-execution-failed',
        message: `Failed to probe "${filePath}": ${reason}`
      }
    }
  }

  let parsed: FfprobeOutput
  try {
    parsed = JSON.parse(stdout) as FfprobeOutput
  } catch {
    return {
      kind: 'error',
      error: {
        code: 'unparseable-output',
        message: `ffprobe produced output that was not valid JSON for "${filePath}".`
      }
    }
  }

  const videoStream = parsed.streams?.find((s) => s.codec_type === 'video')
  if (
    videoStream === undefined ||
    !isFiniteNumber(videoStream.width) ||
    !isFiniteNumber(videoStream.height)
  ) {
    return {
      kind: 'error',
      error: {
        code: 'no-video-stream',
        message: `No usable video stream found in "${filePath}" - the file may not be a video, or may be corrupted.`
      }
    }
  }

  const duration = Number(parsed.format?.duration)
  if (!Number.isFinite(duration)) {
    return {
      kind: 'error',
      error: {
        code: 'missing-duration',
        message: `Could not determine duration for "${filePath}".`
      }
    }
  }

  let stats: Awaited<ReturnType<typeof stat>>
  try {
    stats = await stat(filePath)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      kind: 'error',
      error: {
        code: 'stat-failed',
        message: `Could not read file size for "${filePath}": ${reason}`
      }
    }
  }

  return {
    kind: 'success',
    metadata: {
      duration,
      width: videoStream.width,
      height: videoStream.height,
      sizeBytes: stats.size
    }
  }
}
