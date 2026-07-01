import { CheckCircle2 } from 'lucide-react'
import { Button } from '../components/Button'
import { bytesToMB } from '../utils/format'
import { reductionPercent } from '../utils/compressionEstimate'
import type { CompressionMode, LoadedVideo, OutputSettings } from '../types'

interface DoneScreenProps {
  readonly video: LoadedVideo
  readonly mode: CompressionMode
  readonly output: OutputSettings
  readonly achievedMB: number
  readonly onShowInFolder: () => void
  readonly onCompressAnother: () => void
}

export function DoneScreen({
  video,
  mode,
  output,
  achievedMB,
  onShowInFolder,
  onCompressAnother
}: DoneScreenProps): React.JSX.Element {
  const fromMB = bytesToMB(video.sizeBytes)
  const comparisonCaption =
    mode.kind === 'percentage'
      ? `${reductionPercent(fromMB, achievedMB)}% smaller`
      : `Target: ${mode.targetMB.toFixed(0)} MB · Achieved: ${achievedMB.toFixed(1)} MB`

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-tint">
        <CheckCircle2 className="h-7 w-7 text-success" strokeWidth={1.75} />
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[17px] font-semibold text-primary">Compression complete</p>
        <p className="text-[15px] font-medium text-primary">
          {fromMB.toFixed(1)} MB → {achievedMB.toFixed(1)} MB
        </p>
        <p className="text-[13px] text-secondary">{comparisonCaption}</p>
        <p
          className="mt-1 truncate text-[12px] text-tertiary"
          title={`${output.folder}\\${output.fileName}`}
        >
          {output.fileName}
        </p>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <Button variant="secondary" onClick={onShowInFolder}>
          Show in folder
        </Button>
        <Button variant="primary" onClick={onCompressAnother}>
          Compress another
        </Button>
      </div>
    </div>
  )
}
