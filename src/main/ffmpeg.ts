import { execFile } from 'child_process'
import { promisify } from 'util'
import { getFfmpegBinaryPath } from './ffmpegPaths'

const execFileAsync = promisify(execFile)

/** Spawns the bundled ffmpeg binary and extracts the version token from `ffmpeg -version`'s first line. */
export async function getFfmpegVersion(): Promise<string> {
  const binaryPath = getFfmpegBinaryPath()

  let stdout: string
  try {
    const result = await execFileAsync(binaryPath, ['-version'])
    stdout = result.stdout
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to execute ffmpeg binary at "${binaryPath}": ${reason}`)
  }

  const firstLine = stdout.split('\n')[0] ?? ''
  const match = /ffmpeg version (\S+)/.exec(firstLine)

  if (match === null || match[1] === undefined) {
    throw new Error(`Could not parse ffmpeg version from output: "${firstLine}"`)
  }

  return match[1]
}
