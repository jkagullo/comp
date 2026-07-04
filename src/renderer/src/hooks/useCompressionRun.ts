import { useCallback, useEffect, useRef, useState } from 'react'
import type { CompressionError } from '@shared/ipcTypes'

export interface CompressionProgress {
  readonly percent: number
  readonly etaSec: number
}

interface StartParams {
  readonly inputPath: string
  readonly outputPath: string
  readonly targetMB: number
  readonly durationSec: number
  readonly onComplete: (outputSizeBytes: number) => void
  readonly onError: (error: CompressionError) => void
}

interface UseCompressionRunResult {
  readonly progress: CompressionProgress | null
  readonly start: (params: StartParams) => void
  readonly cancel: () => void
}

/**
 * Drives a real 2-pass ffmpeg compression run via the main process, subscribing to
 * streamed compression:progress events for the job it started.
 */
export function useCompressionRun(): UseCompressionRunResult {
  const [progress, setProgress] = useState<CompressionProgress | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const jobIdRef = useRef<string | null>(null)

  const stopListening = useCallback((): void => {
    unsubscribeRef.current?.()
    unsubscribeRef.current = null
  }, [])

  useEffect(() => stopListening, [stopListening])

  const start = useCallback(
    (params: StartParams): void => {
      const jobId = crypto.randomUUID()
      jobIdRef.current = jobId

      stopListening()
      setProgress({ percent: 0, etaSec: 0 })

      unsubscribeRef.current = window.comp.onCompressionProgress((event) => {
        if (event.jobId !== jobIdRef.current) return
        setProgress({ percent: event.percent, etaSec: event.etaSec ?? 0 })
      })

      window.comp
        .startTwoPassCompression({
          jobId,
          inputPath: params.inputPath,
          outputPath: params.outputPath,
          targetMB: params.targetMB,
          durationSec: params.durationSec
        })
        .then((result) => {
          if (jobIdRef.current !== jobId) return
          stopListening()
          setProgress(null)
          if (result.kind === 'success') {
            params.onComplete(result.result.outputSizeBytes)
          } else {
            params.onError(result.error)
          }
        })
    },
    [stopListening]
  )

  const cancel = useCallback((): void => {
    const jobId = jobIdRef.current
    jobIdRef.current = null
    stopListening()
    setProgress(null)
    if (jobId) {
      window.comp.cancelCompression(jobId).catch(() => {})
    }
  }, [stopListening])

  return { progress, start, cancel }
}
