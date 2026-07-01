import { AlertTriangle } from 'lucide-react'
import { Button } from '../components/Button'

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
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-error-tint">
        <AlertTriangle className="h-7 w-7 text-error" strokeWidth={1.75} />
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <p className="text-[17px] font-semibold text-primary">{title}</p>
        <p className="max-w-sm text-[13px] text-secondary">{detail}</p>
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
