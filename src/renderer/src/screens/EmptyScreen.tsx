import { useCallback, useState } from 'react'
import { ChevronUp } from 'lucide-react'
import { SUPPORTED_VIDEO_EXTENSIONS, SupportedVideoExtension } from '@shared/ipcTypes'
import { Button } from '../components/Button'
import { extractVideoMetadata } from '../utils/videoMetadata'
import type { LoadedVideo } from '../types'

interface EmptyScreenProps {
  readonly onVideoLoaded: (video: LoadedVideo) => void
  readonly onUnsupportedFile: (fileName: string, extension: string) => void
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
  onUnsupportedFile
}: EmptyScreenProps): React.JSX.Element {
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const loadFromPath = useCallback(
    async (path: string, name: string, extension: SupportedVideoExtension, sizeBytes: number) => {
      const sourceUrl = window.comp.pathToFileUrl(path)
      const metadata = await extractVideoMetadata(sourceUrl)
      onVideoLoaded({
        sourceUrl,
        path,
        name,
        extension,
        sizeBytes,
        durationSec: metadata.durationSec,
        width: metadata.width,
        height: metadata.height,
        thumbnailDataUrl: metadata.thumbnailDataUrl
      })
    },
    [onVideoLoaded]
  )

  const handleSelectFile = useCallback(async () => {
    const result = await window.comp.pickVideoFile()
    if (result.kind === 'cancelled') return
    if (result.kind === 'unsupported-extension') {
      onUnsupportedFile(result.fileName, result.extension)
      return
    }
    await loadFromPath(
      result.file.path,
      result.file.name,
      result.file.extension,
      result.file.sizeBytes
    )
  }, [loadFromPath, onUnsupportedFile])

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
      await loadFromPath(path, file.name, extension, file.size)
    },
    [loadFromPath, onUnsupportedFile]
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
