import { AlertTriangle } from 'lucide-react'
import { Button } from '../components/Button'
import { IconTile } from '../components/IconTile'

interface ErrorScreenProps {
  readonly title: string
  readonly detail: string
  readonly onChooseDifferentFile: () => void
  readonly onTryAgain: () => void
}

export function ErrorScreen({
  title,
  detail,
  onChooseDifferentFile,
  onTryAgain
}: ErrorScreenProps): React.JSX.Element {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 px-10 text-center">
      <IconTile
        variant="error"
        icon={<AlertTriangle className="h-7 w-7 text-error" strokeWidth={1.75} />}
      />
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-lg font-semibold text-primary">{title}</p>
        <p className="max-w-sm text-sm text-secondary">{detail}</p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Button variant="secondary" onClick={onChooseDifferentFile}>
          Choose different file
        </Button>
        <Button variant="primary" onClick={onTryAgain}>
          Try again
        </Button>
      </div>
    </div>
  )
}
