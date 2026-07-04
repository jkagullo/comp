import type { CompressionErrorCode } from '@shared/ipcTypes'

/** Plain-language title/detail for a failed compression run, safe to show directly in the
 *  UI — no raw ffmpeg stderr or internal error codes leak through. */
export function describeCompressionError(code: CompressionErrorCode | null): {
  readonly title: string
  readonly detail: string
} {
  switch (code) {
    case 'disk-full':
      return {
        title: 'Not enough disk space',
        detail:
          'comp ran out of disk space while writing the compressed file. Free up some space and try again.'
      }
    case 'no-write-permission':
      return {
        title: "Couldn't write the output file",
        detail:
          "comp doesn't have permission to write to the chosen output location. Try choosing a different output folder."
      }
    case 'unsupported-codec':
      return {
        title: "Compression isn't supported on this system",
        detail:
          'comp needs a video encoder that appears to be unavailable. Try reinstalling the app.'
      }
    case 'input-stat-failed':
      return {
        title: "Couldn't open this file",
        detail:
          'comp could not access the selected video. It may have been moved, renamed, or deleted, or comp may not have permission to read it.'
      }
    case 'ffmpeg-execution-failed':
      return {
        title: 'Compression failed to start',
        detail:
          'comp could not run the video-compression tool. Try restarting the app, or try a different file.'
      }
    case 'output-missing':
      return {
        title: "Couldn't find the compressed file",
        detail:
          'comp finished compressing but the output file could not be found afterward. Try again with a different output location.'
      }
    case 'output-not-smaller':
      return {
        title: "Couldn't shrink this file further",
        detail:
          "The compressed result wasn't smaller than the original. Try a lower target size or a different compression mode."
      }
    case 'invalid-duration':
    case 'invalid-target-size':
      return {
        title: 'Something went wrong',
        detail:
          "comp couldn't calculate the settings needed to compress this video. Try a different file."
      }
    case 'pass-one-failed':
    case 'pass-two-failed':
      return {
        title: 'Compression failed',
        detail:
          'comp ran into a problem while compressing this video. Try again, or try a different file.'
      }
    case 'cancelled':
      return {
        title: 'Compression cancelled',
        detail: 'This compression job was cancelled.'
      }
    case null:
      return {
        title: 'Something went wrong',
        detail: 'comp ran into an unexpected problem while compressing this video. Try again.'
      }
  }
}
