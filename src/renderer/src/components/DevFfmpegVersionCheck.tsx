import { useState } from 'react'

/**
 * TEMPORARY dev-only diagnostic for Story 1.2-T1, proving the main -> child_process
 * -> IPC -> renderer round trip for the bundled ffmpeg binary. Delete this file and
 * its usage in TitleBar once real Epic 2 UI supersedes the need for a manual trigger.
 */
export function DevFfmpegVersionCheck(): React.JSX.Element {
  const [status, setStatus] = useState<string>('idle')

  const handleClick = async (): Promise<void> => {
    setStatus('checking...')
    try {
      const version = await window.comp.getFfmpegVersion()
      setStatus(`ffmpeg ${version}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setStatus(`error: ${message}`)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      className="titlebar-no-drag rounded px-2 py-0.5 text-xs text-secondary hover:text-primary"
      title="Dev-only: check bundled ffmpeg version"
    >
      ffmpeg check ({status})
    </button>
  )
}
