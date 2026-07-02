import type { VideoMetadataErrorCode } from '@shared/ipcTypes'

/** Plain-language title/detail for a failed getVideoMetadata IPC call, safe to show directly
 *  in the UI — no raw ffprobe output or internal error codes leak through. */
export function describeVideoMetadataError(
  fileName: string,
  code: VideoMetadataErrorCode | null
): { readonly title: string; readonly detail: string } {
  switch (code) {
    case 'ffprobe-execution-failed':
      return {
        title: "Couldn't read this video",
        detail: `comp couldn't analyze "${fileName}" because the video-reading tool failed to run. Try restarting the app, or try a different file.`
      }
    case 'unparseable-output':
      return {
        title: "Couldn't read this video",
        detail: `comp couldn't make sense of "${fileName}"'s video information. The file may be corrupted or in an unexpected format.`
      }
    case 'no-video-stream':
      return {
        title: 'No video found in this file',
        detail: `"${fileName}" doesn't appear to contain a video track. Make sure you're selecting a video file, not audio-only or another type of file.`
      }
    case 'missing-duration':
      return {
        title: "Couldn't read this video",
        detail: `comp couldn't determine how long "${fileName}" is. The file may be incomplete or corrupted.`
      }
    case 'stat-failed':
      return {
        title: "Couldn't open this file",
        detail: `comp couldn't access "${fileName}". It may have been moved, renamed, or deleted, or comp may not have permission to read it.`
      }
    case null:
      return {
        title: 'Something went wrong',
        detail: `comp ran into an unexpected problem while loading "${fileName}". Try again, or try a different file.`
      }
  }
}
