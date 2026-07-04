import { useCallback, useEffect, useState } from 'react'

export type AppUpdateStatus = 'idle' | 'available' | 'downloading' | 'downloaded' | 'error'

export interface AppUpdateState {
  readonly status: AppUpdateStatus
  readonly version: string | null
  readonly percent: number
  readonly message: string | null
}

export interface UseAppUpdateResult extends AppUpdateState {
  readonly install: () => void
  readonly skip: () => void
}

const IDLE_STATE: AppUpdateState = { status: 'idle', version: null, percent: 0, message: null }

/** Tracks the lifecycle of an in-app update, driven entirely by main-process events
 *  (see src/main/updater.ts) - this hook never initiates a check itself, only a
 *  download once the user calls install(). skip() only clears local state for this
 *  session; it isn't persisted, so a still-outdated app will ask again next launch. */
export function useAppUpdate(): UseAppUpdateResult {
  const [state, setState] = useState<AppUpdateState>(IDLE_STATE)

  useEffect(() => {
    const unsubscribeAvailable = window.comp.onUpdateAvailable(({ version }) => {
      setState({ status: 'available', version, percent: 0, message: null })
    })
    const unsubscribeProgress = window.comp.onUpdateDownloadProgress(({ percent }) => {
      setState((prev) => ({ ...prev, status: 'downloading', percent }))
    })
    const unsubscribeDownloaded = window.comp.onUpdateDownloaded(({ version }) => {
      setState({ status: 'downloaded', version, percent: 100, message: null })
    })
    const unsubscribeError = window.comp.onUpdateError(({ message }) => {
      setState((prev) => ({ ...prev, status: 'error', message }))
    })

    return () => {
      unsubscribeAvailable()
      unsubscribeProgress()
      unsubscribeDownloaded()
      unsubscribeError()
    }
  }, [])

  const install = useCallback(() => {
    setState((prev) => ({ ...prev, status: 'downloading', percent: 0 }))
    window.comp.startUpdateDownload()
  }, [])

  const skip = useCallback(() => {
    setState(IDLE_STATE)
  }, [])

  return { ...state, install, skip }
}
