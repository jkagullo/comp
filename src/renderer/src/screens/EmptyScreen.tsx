import { useCallback, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import {
  SUPPORTED_VIDEO_EXTENSIONS,
  SupportedVideoExtension,
  VideoMetadataErrorCode
} from '@shared/ipcTypes'
import { Button } from '../components/Button'
import { extractVideoMetadata } from '../utils/videoMetadata'
import type { LoadedVideo } from '../types'

interface EmptyScreenProps {
  readonly onVideoLoaded: (video: LoadedVideo) => void
  readonly onUnsupportedFile: (fileName: string, extension: string) => void
  readonly onMetadataError: (fileName: string, code: VideoMetadataErrorCode | null) => void
}

function extensionOf(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.slice(lastDot + 1).toLowerCase() : ''
}

function isSupportedExtension(extension: string): extension is SupportedVideoExtension {
  return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(extension)
}

export function EmptyScreen({
  onVideoLoaded,
  onUnsupportedFile,
  onMetadataError
}: EmptyScreenProps): React.JSX.Element {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const loadFromPath = useCallback(
    async (path: string, name: string, extension: SupportedVideoExtension) => {
      const result = await window.comp.getVideoMetadata(path)
      if (result.kind === 'error') {
        onMetadataError(name, result.error.code)
        return
      }

      const sourceUrl = window.comp.pathToFileUrl(path)
      let thumbnailDataUrl: string | null = null
      try {
        const extracted = await extractVideoMetadata(sourceUrl)
        thumbnailDataUrl = extracted.thumbnailDataUrl
      } catch {
        // Thumbnail capture is best-effort; a placeholder is shown if this fails.
        thumbnailDataUrl = null
      }

      onVideoLoaded({
        sourceUrl,
        path,
        name,
        extension,
        sizeBytes: result.metadata.sizeBytes,
        durationSec: result.metadata.duration,
        width: result.metadata.width,
        height: result.metadata.height,
        thumbnailDataUrl
      })
    },
    [onVideoLoaded, onMetadataError]
  )

  const handleSelectFile = useCallback(async () => {
    const result = await window.comp.pickVideoFile()
    if (result.kind === 'cancelled') return
    if (result.kind === 'unsupported-extension') {
      onUnsupportedFile(result.fileName, result.extension)
      return
    }
    try {
      await loadFromPath(result.file.path, result.file.name, result.file.extension)
    } catch {
      onMetadataError(result.file.name, null)
    }
  }, [loadFromPath, onUnsupportedFile, onMetadataError])

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDraggingOver(false)

      const file = event.dataTransfer.files[0]
      if (!file) return

      const extension = extensionOf(file.name)
      if (!isSupportedExtension(extension)) {
        onUnsupportedFile(file.name, extension || '(none)')
        return
      }

      const path = window.comp.getPathForFile(file)
      try {
        await loadFromPath(path, file.name, extension)
      } catch {
        onMetadataError(file.name, null)
      }
    },
    [loadFromPath, onUnsupportedFile, onMetadataError]
  )

  return (
    <div className="absolute inset-5 animate-[fade-in_200ms_ease-out]">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setIsDraggingOver(true)
        }}
        onDragLeave={() => setIsDraggingOver(false)}
        onDrop={(event) => {
          void handleDrop(event)
        }}
        onClick={() => {
          void handleSelectFile()
        }}
        className={`flex h-full w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-[14px] border-2 border-dashed transition-colors ${
          isDraggingOver ? 'border-accent bg-accent-tint' : 'border-border'
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-panel">
          <ChevronUp className="h-6 w-6 text-tertiary" strokeWidth={1.75} />
        </div>

        <div className="flex flex-col items-center gap-1">
          <p className="text-[17px] font-semibold text-primary">Drag a video here</p>
          <p className="text-[13px] text-secondary">or</p>
        </div>

        <Button
          variant="primary"
          onClick={(event) => {
            event.stopPropagation()
            void handleSelectFile()
          }}
        >
          Select file
        </Button>

        <p className="font-mono text-[11px] tracking-wide text-tertiary">
          MP4 · MOV · MKV · AVI · WEBM · WMV · FLV
        </p>
      </div>
    </div>
  )
}
