import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'

interface ThemeToggleProps {
  readonly theme: Theme
  readonly onToggle: () => void
}

/** Pill-shaped light/dark switch used in the titlebar. */
export function ThemeToggle({ theme, onToggle }: ThemeToggleProps): React.JSX.Element {
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Toggle theme"
      onClick={onToggle}
      className="titlebar-no-drag relative flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-border bg-hover px-0.5 transition-colors"
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full bg-panel shadow-sm transition-transform duration-200 ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon className="h-3 w-3 text-secondary" strokeWidth={2.25} />
        ) : (
          <Sun className="h-3 w-3 text-secondary" strokeWidth={2.25} />
        )}
      </span>
    </button>
  )
}
