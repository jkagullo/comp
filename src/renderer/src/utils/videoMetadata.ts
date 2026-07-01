export interface ExtractedVideoMetadata {
  readonly durationSec: number
  readonly width: number
  readonly height: number
  readonly thumbnailDataUrl: string | null
}

/**
 * Loads a video off-DOM to read its duration/resolution and grab a frame near
 * the midpoint as a thumbnail. Used for both drag-and-dropped Files (object
 * URL) and dialog-picked files (file:// URL) — either works as a <video> src.
 */
export function extractVideoMetadata(sourceUrl: string): Promise<ExtractedVideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = sourceUrl

    const cleanup = (): void => {
      video.onloadedmetadata = null
      video.onseeked = null
      video.onerror = null
      video.src = ''
    }

    video.onloadedmetadata = () => {
      const midpoint = video.duration > 0.2 ? video.duration / 2 : 0
      video.currentTime = midpoint
    }

    video.onseeked = () => {
      const { videoWidth: width, videoHeight: height, duration: durationSec } = video
      let thumbnailDataUrl: string | null = null
      try {
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (context && width > 0 && height > 0) {
          context.drawImage(video, 0, 0, width, height)
          thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.72)
        }
      } catch {
        // Thumbnail capture is best-effort; a placeholder is shown if this fails.
        thumbnailDataUrl = null
      }
      cleanup()
      resolve({ durationSec, width, height, thumbnailDataUrl })
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('This file could not be read as a video.'))
    }
  })
}
