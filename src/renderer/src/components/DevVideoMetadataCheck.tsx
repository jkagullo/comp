import { useState } from 'react'

/**
 * TEMPORARY dev-only diagnostic for Story 1.3-T1, proving the main -> child_process
 * -> IPC -> renderer round trip for ffprobe-based metadata extraction. Delete this file
 * and its usage in TitleBar once real Epic 2 UI (2.1-T1) supersedes the need for a manual trigger.
 */
export function DevVideoMetadataCheck(): React.JSX.Element {
  const [status, setStatus] = useState<string>('idle')

  const handleClick = async (): Promise<void> => {
    setStatus('picking...')
    const picked = await window.comp.pickVideoFile()
    if (picked.kind !== 'picked') {
      setStatus(`no file selected (${picked.kind})`)
      return
    }

    setStatus('probing...')
    const result = await window.comp.getVideoMetadata(picked.file.path)
    if (result.kind === 'success') {
      const { duration, width, height, sizeBytes } = result.metadata
      setStatus(`${width}x${height}, ${duration.toFixed(2)}s, ${sizeBytes} bytes`)
    } else {
      setStatus(`error [${result.error.code}]: ${result.error.message}`)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="titlebar-no-drag rounded px-2 py-0.5 text-xs text-secondary hover:text-primary"
      title="Dev-only: pick a video and probe its metadata via ffprobe"
    >
      metadata check ({status})
    </button>
  )
}
