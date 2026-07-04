import { Code2, Copy, Globe, Minus, Square, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Theme } from '../hooks/useTheme'
import { useWindowMaximized } from '../hooks/useWindowMaximized'
import { ThemeToggle } from './ThemeToggle'

interface TitleBarProps {
  readonly theme: Theme
  readonly onToggleTheme: () => void
}

function DevInfo(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [version, setVersion] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    window.comp.getAppVersion().then(setVersion)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent): void => {
      if (!containerRef.current?.contains(event.target as Node)) setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div
      ref={containerRef}
      className="titlebar-no-drag relative flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label="Developer info and app version"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
        className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1 transition-colors hover:bg-hover"
      >
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent text-sm font-bold text-accent-fg">
          c
        </div>
        <span className="text-sm font-semibold text-primary">comp by jkd🌼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-56 rounded-lg border border-border bg-panel p-3 shadow-lg">
          <p className="text-sm font-semibold text-primary">comp{version ? ` v${version}` : ''}</p>
          <p className="mt-0.5 text-xs text-secondary">by jkd</p>
          <div className="mt-3 flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => window.comp.openExternalLink('portfolio')}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-secondary transition-colors hover:bg-hover hover:text-primary"
            >
              <Globe className="h-3.5 w-3.5" strokeWidth={1.75} />
              Portfolio
            </button>
            <button
              type="button"
              onClick={() => window.comp.openExternalLink('github')}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-secondary transition-colors hover:bg-hover hover:text-primary"
            >
              <Code2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              GitHub
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function TitleBar({ theme, onToggleTheme }: TitleBarProps): React.JSX.Element {
  const isMaximized = useWindowMaximized()

  return (
    <header className="titlebar-drag flex h-10 shrink-0 items-center gap-3 border-b border-border bg-titlebar pl-3 pr-0">
      <DevInfo />

      <div className="flex-1" />

      <ThemeToggle theme={theme} onToggle={onToggleTheme} />

      <div className="titlebar-no-drag flex h-full items-center">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => window.comp.minimizeWindow()}
          className="flex h-full w-11 cursor-pointer items-center justify-center text-secondary transition-colors hover:bg-hover"
        >
          <Minus className="h-4 w-4" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? 'Restore' : 'Maximize'}
          onClick={() => window.comp.toggleMaximizeWindow()}
          className="flex h-full w-11 cursor-pointer items-center justify-center text-secondary transition-colors hover:bg-hover"
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
          className="flex h-full w-11 cursor-pointer items-center justify-center text-secondary transition-colors hover:bg-error hover:text-accent-fg"
        >
          <X className="h-4 w-4" strokeWidth={1.75} />
        </button>
      </div>
    </header>
  )
}
