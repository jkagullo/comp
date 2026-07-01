import { useEffect, useState } from 'react'

/** Tracks maximize/restore state so the titlebar can swap its icon, without polling. */
export function useWindowMaximized(): boolean {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    let cancelled = false
    window.comp.isWindowMaximized().then((value) => {
      if (!cancelled) setIsMaximized(value)
    })
    const unsubscribe = window.comp.onWindowMaximizedChange((value) => setIsMaximized(value))
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return isMaximized
}
