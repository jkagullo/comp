import { useEffect, useRef, useState } from 'react'

const FADE_DURATION_MS = 150

/**
 * Cross-fades between successive values of a keyed prop (e.g. an onboarding step index):
 * hides the currently displayed value, then swaps to the new one once the fade-out
 * finishes, so callers can drive an opacity transition off `isVisible`.
 */
export function useFadeTransition<T>(value: T): { displayedValue: T; isVisible: boolean } {
  const [displayedValue, setDisplayedValue] = useState(value)
  const [isVisible, setIsVisible] = useState(true)
  const previousValueRef = useRef(value)

  useEffect(() => {
    if (value === previousValueRef.current) return
    previousValueRef.current = value
    setIsVisible(false)
    const timeout = setTimeout(() => {
      setDisplayedValue(value)
      setIsVisible(true)
    }, FADE_DURATION_MS)
    return () => clearTimeout(timeout)
  }, [value])

  return { displayedValue, isVisible }
}

export { FADE_DURATION_MS }
