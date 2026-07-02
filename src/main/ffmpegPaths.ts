import { app } from 'electron'
import ffmpegPath from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'

/**
 * electron-builder's ASAR packaging leaves the JS wrapper inside app.asar but
 * unpacks native binaries to app.asar.unpacked (once asarUnpack is configured
 * for these packages) — ffmpeg-static/ffprobe-static's exported path string
 * still points inside app.asar, so it needs rewriting when packaged.
 */
function resolveUnpackedPath(rawPath: string): string {
  return app.isPackaged ? rawPath.replace('app.asar', 'app.asar.unpacked') : rawPath
}

export function getFfmpegBinaryPath(): string {
  if (ffmpegPath === null) {
    throw new Error('ffmpeg-static did not resolve a binary path for this platform/arch.')
  }
  return resolveUnpackedPath(ffmpegPath)
}

export function getFfprobeBinaryPath(): string {
  return resolveUnpackedPath(ffprobeStatic.path)
}
