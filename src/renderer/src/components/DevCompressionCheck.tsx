import { useState } from 'react'

/**
 * TEMPORARY dev-only diagnostic for Story 1.4-T1, proving the main -> child_process
 * -> IPC -> renderer round trip for single-pass ffmpeg compression, in both dev mode
 * and a packaged build. Delete this file and its usage in TitleBar once real Epic 2
 * UI supersedes the need for a manual trigger.
 */
export function DevCompressionCheck(): React.JSX.Element {
  const [status, setStatus] = useState<string>('idle')

  const handleClick = async (): Promise<void> => {
    setStatus('picking...')
    const picked = await window.comp.pickVideoFile()
    if (picked.kind !== 'picked') {
      setStatus(`no file selected (${picked.kind})`)
      return
    }

    setStatus('compressing...')
    const result = await window.comp.runSinglePassCompression(picked.file.path)
    if (result.kind === 'success') {
      const { inputSizeBytes, outputSizeBytes, outputPath } = result.result
      const pct = (100 * (1 - outputSizeBytes / inputSizeBytes)).toFixed(1)
      setStatus(`${inputSizeBytes} -> ${outputSizeBytes} bytes (-${pct}%) at ${outputPath}`)
    } else {
      setStatus(`error [${result.error.code}]: ${result.error.message}`)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="titlebar-no-drag rounded px-2 py-0.5 text-xs text-secondary hover:text-primary"
      title="Dev-only: pick a video and run single-pass ffmpeg compression"
    >
      compression check ({status})
    </button>
  )
}
