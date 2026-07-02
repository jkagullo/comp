import { useCallback, useState } from 'react'

const ONBOARDING_STORAGE_KEY = 'comp:hasSeenOnboarding'

function readHasSeenOnboarding(): boolean {
  return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true'
}

export interface UseHasSeenOnboardingResult {
  readonly hasSeenOnboarding: boolean
  readonly markOnboardingComplete: () => void
}

/**
 * Tracks whether the first-run onboarding sequence has already been shown, persisted in
 * localStorage (matching the `useTheme` convention) so App's initial `Screen` can be chosen
 * synchronously before first render, with no flash of the wrong screen.
 */
export function useHasSeenOnboarding(): UseHasSeenOnboardingResult {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState<boolean>(readHasSeenOnboarding)

  const markOnboardingComplete = useCallback(() => {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setHasSeenOnboarding(true)
  }, [])

  return { hasSeenOnboarding, markOnboardingComplete }
}
