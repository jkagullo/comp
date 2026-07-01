import { Copy, Minus, Square, X } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import { useWindowMaximized } from '../hooks/useWindowMaximized'
import { ThemeToggle } from './ThemeToggle'

interface TitleBarProps {
  readonly theme: Theme
  readonly onToggleTheme: () => void
}

export function TitleBar({ theme, onToggleTheme }: TitleBarProps): React.JSX.Element {
  const isMaximized = useWindowMaximized()

  return (
    <header className="titlebar-drag flex h-10 shrink-0 items-center gap-3 border-b border-border bg-titlebar pl-3 pr-0">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-[13px] font-bold text-accent-fg">
          c
        </div>
        <span className="text-[13px] font-semibold text-primary">comp</span>
      </div>

      <div className="flex-1" />

      <ThemeToggle theme={theme} onToggle={onToggleTheme} />

      <div className="titlebar-no-drag flex h-full items-center">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => window.comp.minimizeWindow()}
          className="flex h-full w-11 items-center justify-center text-secondary transition-colors hover:bg-hover"
        >
          <Minus className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => window.comp.toggleMaximizeWindow()}
          className="flex h-full w-11 items-center justify-center text-secondary transition-colors hover:bg-hover"
        >
          {isMaximized ? (
            <Copy className="h-3.5 w-3.5 -scale-x-100" strokeWidth={1.75} />
          ) : (
            <Square className="h-3.5 w-3.5" strokeWidth={1.75} />
          )}
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => window.comp.closeWindow()}
          className="flex h-full w-11 items-center justify-center text-secondary transition-colors hover:bg-error hover:text-accent-fg"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
