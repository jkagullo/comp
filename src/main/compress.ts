import { execFile } from 'child_process'
import { promisify } from 'util'
import { stat } from 'fs/promises'
import { getFfmpegBinaryPath } from './ffmpegPaths'
import { CompressionResult } from '../shared/ipcTypes'

const execFileAsync = promisify(execFile)

/** Fixed CRF for this proof-of-concept single-pass pipeline. Bitrate targeting against a
 *  requested output size is Story 2.3-T1's job, not this one. */
const DEFAULT_CRF = 28

/**
 * Runs a single-pass ffmpeg compression (input -> output) as a child process.
 * Never throws or rejects - every failure mode is folded into the returned
 * CompressionResult's 'error' branch, mirroring getVideoMetadata's style.
 */
export async function runSinglePassCompression(
  inputPath: string,
  outputPath: string
): Promise<CompressionResult> {
  const binaryPath = getFfmpegBinaryPath()

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

  try {
    await execFileAsync(binaryPath, [
      '-y',
      '-i',
      inputPath,
      '-c:v',
      'libx264',
      '-crf',
      String(DEFAULT_CRF),
      '-preset',
      'medium',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      outputPath
    ])
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return {
      kind: 'error',
      error: {
        code: 'ffmpeg-execution-failed',
        message: `ffmpeg failed compressing "${inputPath}": ${reason}`
      }
    }
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

  return {
    kind: 'success',
    result: { inputSizeBytes, outputSizeBytes, outputPath }
  }
}
