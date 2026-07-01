import { useCallback, useState } from 'react'
import { TitleBar } from './components/TitleBar'
import { EmptyScreen } from './screens/EmptyScreen'
import { LoadedScreen } from './screens/LoadedScreen'
import { ProgressScreen } from './screens/ProgressScreen'
import { DoneScreen } from './screens/DoneScreen'
import { ErrorScreen } from './screens/ErrorScreen'
import { useTheme } from './hooks/useTheme'
import { useCompressionRun } from './hooks/useCompressionRun'
import { bytesToMB, joinPath } from './utils/format'
import { estimateTargetMB, jitterAchievedMB } from './utils/compressionEstimate'
import type { CompressionMode, LoadedVideo, OutputSettings, Screen } from './types'

const SUPPORTED_EXTENSIONS_LABEL = 'MP4, MOV, MKV, AVI, WEBM, WMV, or FLV'

function App(): React.JSX.Element {
  const { theme, toggleTheme } = useTheme()
  const [screen, setScreen] = useState<Screen>({ kind: 'empty' })
  const compressionRun = useCompressionRun()

  const resetToEmpty = useCallback(() => setScreen({ kind: 'empty' }), [])

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
        {screen.kind === 'empty' && (
          <EmptyScreen
            onVideoLoaded={handleVideoLoaded}
            onUnsupportedFile={handleUnsupportedFile}
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
