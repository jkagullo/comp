import { Button } from '../components/Button'
import { formatEta } from '../utils/format'
import type { LoadedVideo } from '../types'

interface ProgressScreenProps {
  readonly video: LoadedVideo
  readonly percent: number
  readonly etaSec: number
  readonly onCancel: () => void
}

export function ProgressScreen({
  video,
  percent,
  etaSec,
  onCancel
}: ProgressScreenProps): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-10">
      <p className="max-w-md truncate text-sm text-secondary" title={video.name}>
        {video.name}
      </p>

      <p className="text-3xl font-semibold leading-none text-primary tabular-nums">
        {Math.round(percent)}%
      </p>

      <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-hover">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-150 ease-linear"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="text-sm text-secondary">Compressing… about {formatEta(etaSec)} remaining</p>

      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  )
}
