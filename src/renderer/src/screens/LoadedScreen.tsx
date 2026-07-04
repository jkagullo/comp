import { useEffect, useState } from 'react'
import { Folder } from 'lucide-react'
import { Button } from '../components/Button'
import {
  bytesToMB,
  basenameWithoutExtension,
  formatDuration,
  formatFileSize,
  formatResolution,
  joinPath
} from '../utils/format'
import { estimateTargetMB, isPercentValid, isTargetSizeValid } from '@shared/compression'
import { filenameErrorMessage, isFilenameValid } from '@shared/filename'
import { reductionPercent } from '../utils/compressionEstimate'
import type { CompressionMode, LoadedVideo, OutputSettings } from '../types'

interface LoadedScreenProps {
  readonly video: LoadedVideo
  readonly onChangeFile: () => void
  readonly onStartCompress: (mode: CompressionMode, output: OutputSettings) => void
}

const DEFAULT_PERCENT = 50
const DEFAULT_TARGET_MB = 25

export function LoadedScreen({
  video,
  onChangeFile,
  onStartCompress
}: LoadedScreenProps): React.JSX.Element {
  const [modeKind, setModeKind] = useState<CompressionMode['kind']>('percentage')
  const [percent, setPercent] = useState(DEFAULT_PERCENT)
  const [targetMB, setTargetMB] = useState(DEFAULT_TARGET_MB)
  const [outputFolder, setOutputFolder] = useState<string>('')
  const [fileName, setFileName] = useState(
    () => `${basenameWithoutExtension(video.name)}-compressed.${video.extension}`
  )
  const [pendingOverwriteConfirm, setPendingOverwriteConfirm] = useState(false)

  useEffect(() => {
    window.comp.getDefaultOutputFolder().then(setOutputFolder)
  }, [])

  const mode: CompressionMode =
    modeKind === 'percentage' ? { kind: 'percentage', percent } : { kind: 'targetSize', targetMB }

  const fromMB = bytesToMB(video.sizeBytes)
  const toMB = estimateTargetMB(video.sizeBytes, mode)
  const reduction = reductionPercent(fromMB, toMB)

  const filenameError = filenameErrorMessage(fileName, video.extension)

  const isValid =
    (modeKind === 'percentage'
      ? isPercentValid(percent)
      : isTargetSizeValid(targetMB, video.sizeBytes)) && isFilenameValid(fileName, video.extension)

  const errorMessage =
    modeKind === 'percentage'
      ? isPercentValid(percent)
        ? null
        : 'Percentage must be between 1% and 99%.'
      : isTargetSizeValid(targetMB, video.sizeBytes)
        ? null
        : targetMB >= fromMB
          ? `Target size must be less than the original file size (${fromMB.toFixed(1)} MB).`
          : 'Enter a target size greater than 0 MB.'

  const handleChooseFolder = async (): Promise<void> => {
    const folder = await window.comp.pickOutputFolder()
    if (folder) {
      setOutputFolder(folder)
      setPendingOverwriteConfirm(false)
    }
  }

  const handleFileNameChange = (value: string): void => {
    setFileName(value)
    setPendingOverwriteConfirm(false)
  }

  const output: OutputSettings = { folder: outputFolder, fileName }

  const handleCompressClick = async (): Promise<void> => {
    if (pendingOverwriteConfirm) {
      onStartCompress(mode, output)
      return
    }
    const exists = await window.comp.pathExists(joinPath(outputFolder, fileName))
    if (exists) {
      setPendingOverwriteConfirm(true)
      return
    }
    onStartCompress(mode, output)
  }

  return (
    <div className="flex h-full w-full flex-col gap-5 overflow-y-auto p-5">
      {/* File info card */}
      <div className="flex items-center gap-3 rounded-xl border border-border bg-panel p-3">
        <div className="relative h-11 w-[72px] shrink-0 overflow-hidden rounded-md border border-border bg-hover">
          {video.thumbnailDataUrl ? (
            <img src={video.thumbnailDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div
              className="h-full w-full opacity-40"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, var(--border) 0, var(--border) 2px, transparent 2px, transparent 8px)'
              }}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-primary">{video.name}</p>
          <p className="truncate text-xs text-secondary">
            {formatFileSize(video.sizeBytes)} · {formatDuration(video.durationSec)} ·{' '}
            {formatResolution(video.width, video.height)}
          </p>
        </div>
        <Button variant="secondary" onClick={onChangeFile} className="shrink-0">
          Change file
        </Button>
      </div>

      {/* Compression settings */}
      <div className="flex flex-col gap-3">
        <p className="text-2xs font-semibold tracking-wide text-tertiary">COMPRESSION</p>

        <div className="inline-flex w-fit rounded-lg border border-border bg-hover p-0.5">
          <button
            type="button"
            onClick={() => setModeKind('percentage')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              modeKind === 'percentage' ? 'bg-panel text-primary shadow-sm' : 'text-secondary'
            }`}
          >
            By percentage
          </button>
          <button
            type="button"
            onClick={() => setModeKind('targetSize')}
            className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              modeKind === 'targetSize' ? 'bg-panel text-primary shadow-sm' : 'text-secondary'
            }`}
          >
            By target size
          </button>
        </div>

        {modeKind === 'percentage' ? (
          <>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={99}
                value={percent}
                onChange={(event) => setPercent(Number(event.target.value))}
                className="h-1.5 flex-1 accent-[var(--accent)]"
              />
              <span className="w-10 shrink-0 text-right text-sm font-medium text-primary tabular-nums">
                {percent}%
              </span>
            </div>
            {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={Math.max(1, Math.floor(fromMB))}
                value={targetMB}
                onChange={(event) => setTargetMB(Number(event.target.value))}
                className={`w-24 rounded-lg border bg-panel px-2.5 py-1.5 text-sm text-primary outline-none focus:border-accent ${
                  isValid ? 'border-border' : 'border-error'
                }`}
              />
              <span className="text-sm text-secondary">MB</span>
            </div>
            {errorMessage && <p className="text-xs text-error">{errorMessage}</p>}
          </>
        )}

        <div className="flex items-center gap-2 rounded-lg bg-hover px-3 py-2">
          <span className="text-sm font-medium text-primary tabular-nums">
            {fromMB.toFixed(1)} MB → {toMB.toFixed(1)} MB
          </span>
          <span className="ml-auto rounded-full bg-accent-tint px-2 py-0.5 text-2xs font-medium text-accent">
            ~{reduction}% reduction
          </span>
        </div>
      </div>

      {/* Output settings */}
      <div className="flex flex-col gap-2">
        <p className="text-2xs font-semibold tracking-wide text-tertiary">OUTPUT</p>

        <button
          type="button"
          onClick={() => {
            void handleChooseFolder()
          }}
          className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-left transition-colors hover:bg-hover"
        >
          <Folder className="h-4 w-4 shrink-0 text-tertiary" strokeWidth={1.75} />
          <span className="min-w-0 flex-1 truncate text-sm text-secondary">{outputFolder}</span>
          <span className="shrink-0 text-xs font-medium text-accent">Choose folder</span>
        </button>

        <input
          type="text"
          value={fileName}
          onChange={(event) => handleFileNameChange(event.target.value)}
          className={`w-full rounded-lg border bg-panel px-3 py-2 text-sm text-primary outline-none focus:border-accent ${
            filenameError ? 'border-error' : 'border-border'
          }`}
        />
        {filenameError && <p className="text-xs text-error">{filenameError}</p>}
      </div>

      {pendingOverwriteConfirm && (
        <div className="flex flex-col gap-2 rounded-lg border border-error bg-hover px-3 py-2">
          <p className="text-xs text-error">
            &quot;{fileName}&quot; already exists in this folder. Compressing will overwrite it.
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setPendingOverwriteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onStartCompress(mode, output)}>
              Overwrite and compress
            </Button>
          </div>
        </div>
      )}

      <Button
        variant="primary"
        className="mt-auto w-full py-2.5"
        disabled={!isValid}
        onClick={() => {
          void handleCompressClick()
        }}
      >
        Compress
      </Button>
    </div>
  )
}
