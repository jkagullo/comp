import { AlertCircle, Download } from 'lucide-react'
import { useAppUpdate } from '../hooks/useAppUpdate'
import { Button } from './Button'

/** Shown just below the title bar whenever the main process (src/main/updater.ts) reports
 *  an update lifecycle event. Renders nothing in the idle state, so it's safe to always
 *  mount in App.tsx. */
export function UpdateBanner(): React.JSX.Element | null {
  const { status, version, percent, message, install, skip } = useAppUpdate()

  if (status === 'idle') return null

  return (
    <div className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2 text-sm">
      {status === 'available' && (
        <>
          <Download className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
          <p className="flex-1 text-primary">
            comp {version ? `v${version}` : 'A new version'} is available.
          </p>
          <Button variant="secondary" onClick={skip} className="px-3 py-1.5 text-xs">
            Skip
          </Button>
          <Button variant="primary" onClick={install} className="px-3 py-1.5 text-xs">
            Install
          </Button>
        </>
      )}

      {status === 'downloading' && (
        <>
          <Download className="h-4 w-4 shrink-0 animate-pulse text-accent" strokeWidth={1.75} />
          <p className="flex-1 text-primary">Downloading update… {Math.round(percent)}%</p>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-hover">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${Math.round(percent)}%` }}
            />
          </div>
        </>
      )}

      {status === 'downloaded' && (
        <>
          <Download className="h-4 w-4 shrink-0 text-accent" strokeWidth={1.75} />
          <p className="flex-1 text-primary">
            Update {version ? `v${version} ` : ''}downloaded — restarting to install…
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <AlertCircle className="h-4 w-4 shrink-0 text-error" strokeWidth={1.75} />
          <p className="flex-1 text-secondary">{message ?? 'Update check failed.'}</p>
          <Button variant="secondary" onClick={skip} className="px-3 py-1.5 text-xs">
            Dismiss
          </Button>
        </>
      )}
    </div>
  )
}
