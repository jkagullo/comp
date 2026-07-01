import { useCallback, useEffect, useRef, useState } from 'react'
import { clamp } from '../utils/format'

export interface CompressionProgress {
  readonly percent: number
  readonly etaSec: number
}

const TICK_MS = 120
const MS_PER_MB = 90
const MIN_DURATION_MS = 2500
const MAX_DURATION_MS = 12000

interface UseCompressionRunResult {
  readonly progress: CompressionProgress | null
  readonly start: (sourceSizeMB: number, onComplete: () => void) => void
  readonly cancel: () => void
}

/**
 * Drives a fake, timer-based compression run scaled to the source file size.
 * This is a scaffold stub — no real encoding happens here. Swap this hook's
 * internals for a real ffmpeg-backed progress stream when that work lands.
 */
export function useCompressionRun(): UseCompressionRunResult {
  const [progress, setProgress] = useState<CompressionProgress | null>(null)
  const generationRef = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopInterval = useCallback((): void => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => stopInterval, [stopInterval])

  const cancel = useCallback((): void => {
    generationRef.current += 1
    stopInterval()
    setProgress(null)
  }, [stopInterval])

  const start = useCallback(
    (sourceSizeMB: number, onComplete: () => void): void => {
      generationRef.current += 1
      const generation = generationRef.current
      const totalMs = clamp(sourceSizeMB * MS_PER_MB, MIN_DURATION_MS, MAX_DURATION_MS)
      const startedAt = Date.now()

      setProgress({ percent: 0, etaSec: totalMs / 1000 })
      stopInterval()

      intervalRef.current = setInterval(() => {
        if (generationRef.current !== generation) return

        const elapsedMs = Date.now() - startedAt
        const percent = clamp((elapsedMs / totalMs) * 100, 0, 100)

        if (percent >= 100) {
          stopInterval()
          setProgress(null)
          onComplete()
          return
        }

        setProgress({ percent, etaSec: Math.max(0, (totalMs - elapsedMs) / 1000) })
      }, TICK_MS)
    },
    [stopInterval]
  )

  return { progress, start, cancel }
}
