import { useCallback, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { EmptyScreen } from './screens/EmptyScreen'
import { LoadedScreen } from './screens/LoadedScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { DoneScreen } from './screens/DoneScreen'
import { ErrorScreen } from './screens/ErrorScreen'
import { OnboardingScreen } from './screens/OnboardingScreen'
import { useTheme } from './hooks/useTheme'
import { useCompressionRun } from './hooks/useCompressionRun'
import { useHasSeenOnboarding } from './hooks/useHasSeenOnboarding'
import { bytesToMB, joinPath } from './utils/format'
import { estimateTargetMB } from '@shared/compression'
import { jitterAchievedMB } from './utils/compressionEstimate'
import { describeVideoMetadataError } from './utils/videoMetadataErrors'
import type { VideoMetadataErrorCode } from '@shared/ipcTypes'
import type { CompressionMode, LoadedVideo, OutputSettings, Screen } from './types'

const SUPPORTED_EXTENSIONS_LABEL = 'MP4, MOV, MKV, AVI, WEBM, WMV, or FLV'

function App(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const { hasSeenOnboarding, markOnboardingComplete } = useHasSeenOnboarding()
  const [screen, setScreen] = useState<Screen>(
    hasSeenOnboarding ? { kind: 'empty' } : { kind: 'onboarding', step: 0 }
  )
  const compressionRun = useCompressionRun()

  const resetToEmpty = useCallback(() => setScreen({ kind: 'empty' }), [])

  const handleOnboardingBack = useCallback(() => {
    setScreen((prev) =>
      prev.kind === 'onboarding' ? { kind: 'onboarding', step: prev.step - 1 } : prev
    )
  }, [])

  const handleOnboardingNext = useCallback(() => {
    setScreen((prev) =>
      prev.kind === 'onboarding' ? { kind: 'onboarding', step: prev.step + 1 } : prev
    )
  }, [])

  const handleOnboardingComplete = useCallback(() => {
    markOnboardingComplete()
    setScreen({ kind: 'empty' })
  }, [markOnboardingComplete])

  const handleVideoLoaded = useCallback((video: LoadedVideo) => {
    setScreen({ kind: 'loaded', video })
  }, [])

  const handleUnsupportedFile = useCallback((fileName: string, extension: string) => {
    const extensionLabel = extension === '(none)' ? 'no recognizable extension' : `.${extension}`
    setScreen({
      kind: 'error',
      title: 'Unsupported file format',
      detail: `"${fileName}" has ${extensionLabel}, which isn't supported. Try a file in one of these formats: ${SUPPORTED_EXTENSIONS_LABEL}.`
    })
  }, [])

  const handleMetadataError = useCallback(
    (fileName: string, code: VideoMetadataErrorCode | null) => {
      const { title, detail } = describeVideoMetadataError(fileName, code)
      setScreen({ kind: 'error', title, detail })
    },
    []
  )

  const handleStartCompress = useCallback(
    (video: LoadedVideo, mode: CompressionMode, output: OutputSettings) => {
      setScreen({ kind: 'progress', video, mode, output })
      compressionRun.start(bytesToMB(video.sizeBytes), () => {
        setScreen((prev) => {
          if (prev.kind !== 'progress') return prev
          const fromMB = bytesToMB(prev.video.sizeBytes)
          const targetMB = estimateTargetMB(prev.video.sizeBytes, prev.mode)
          const achievedMB = jitterAchievedMB(fromMB, targetMB)
          return {
            kind: 'done',
            video: prev.video,
            mode: prev.mode,
            output: prev.output,
            achievedMB
          }
        })
      })
    },
    [compressionRun]
  )

  const handleCancelCompress = useCallback(() => {
    compressionRun.cancel()
    setScreen((prev) => (prev.kind === 'progress' ? { kind: 'loaded', video: prev.video } : prev))
  }, [compressionRun])

  const handleShowInFolder = useCallback((output: OutputSettings) => {
    window.comp.showItemInFolder(joinPath(output.folder, output.fileName))
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-bg text-primary">
      <TitleBar theme={theme} onToggleTheme={toggleTheme} />

      <main className="relative flex-1 overflow-hidden">
        {screen.kind === 'onboarding' && (
          <OnboardingScreen
            step={screen.step}
            onBack={handleOnboardingBack}
            onNext={handleOnboardingNext}
            onSkip={handleOnboardingComplete}
            onFinish={handleOnboardingComplete}
          />
        )}

        {screen.kind === 'empty' && (
          <EmptyScreen
            onVideoLoaded={handleVideoLoaded}
            onUnsupportedFile={handleUnsupportedFile}
            onMetadataError={handleMetadataError}
          />
        )}

        {screen.kind === 'loaded' && (
          <LoadedScreen
            video={screen.video}
            onChangeFile={resetToEmpty}
            onStartCompress={(mode, output) => handleStartCompress(screen.video, mode, output)}
          />
        )}

        {screen.kind === 'progress' && (
          <ProgressScreen
            video={screen.video}
            percent={compressionRun.progress?.percent ?? 0}
            etaSec={compressionRun.progress?.etaSec ?? 0}
            onCancel={handleCancelCompress}
          />
        )}

        {screen.kind === 'done' && (
          <DoneScreen
            video={screen.video}
            mode={screen.mode}
            output={screen.output}
            achievedMB={screen.achievedMB}
            onShowInFolder={() => handleShowInFolder(screen.output)}
            onCompressAnother={resetToEmpty}
          />
        )}

        {screen.kind === 'error' && (
          <ErrorScreen
            title={screen.title}
            detail={screen.detail}
            onChooseDifferentFile={resetToEmpty}
            onTryAgain={resetToEmpty}
          />
        )}
      </main>
    </div>
  )
}

export default App
