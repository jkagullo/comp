import { Film, FolderOpen, FolderOutput, Percent, Target, Globe, Code2, Heart } from 'lucide-react'
import { Button } from '../components/Button'
import { IconTile } from '../components/IconTile'
import { useFadeTransition } from '../hooks/useFadeTransition'
import type { ExternalLinkKey } from '@shared/ipcTypes'

interface OnboardingScreenProps {
  readonly step: number
  readonly onBack: () => void
  readonly onNext: () => void
  readonly onSkip: () => void
  readonly onFinish: () => void
}

interface OnboardingStepContent {
  readonly title: string
  readonly description: string
  readonly body: React.JSX.Element
}

function ModeChip({
  icon,
  label
}: {
  readonly icon: React.JSX.Element
  readonly label: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-full bg-accent-tint px-4 py-2 text-sm font-medium text-accent">
      {icon}
      {label}
    </div>
  )
}

const STEPS: readonly OnboardingStepContent[] = [
  {
    title: 'Welcome to comp',
    description:
      'A simple, local video compressor. Nothing is uploaded, and nothing is tracked — everything happens on your machine.',
    body: <IconTile icon={<Film className="h-6 w-6 text-tertiary" strokeWidth={1.75} />} />
  },
  {
    title: 'Load a video',
    description: 'Drag a video file in, or pick one from disk.',
    body: <IconTile icon={<FolderOpen className="h-6 w-6 text-tertiary" strokeWidth={1.75} />} />
  },
  {
    title: 'Choose how to compress',
    description: 'Compress by percentage, or target an exact file size.',
    body: (
      <div className="flex items-center gap-3">
        <ModeChip icon={<Percent className="h-4 w-4" strokeWidth={1.75} />} label="Percentage" />
        <ModeChip icon={<Target className="h-4 w-4" strokeWidth={1.75} />} label="Target size" />
      </div>
    )
  },
  {
    title: 'Output & compress',
    description: 'Pick an output folder and filename, then compress.',
    body: <IconTile icon={<FolderOutput className="h-6 w-6 text-tertiary" strokeWidth={1.75} />} />
  },
  {
    title: 'Thank you for using comp',
    description: 'Built by jkd. If you’d like to see more of my work or say hi, find me here.',
    body: <IconTile icon={<Heart className="h-6 w-6 text-tertiary" strokeWidth={1.75} />} />
  }
]

const LAST_STEP_INDEX = STEPS.length - 1

function openExternalLink(key: ExternalLinkKey): void {
  window.comp.openExternalLink(key)
}

/**
 * First-run onboarding sequence shown once before EmptyScreen. All 4 steps share one layout
 * (progress dots + Back/Skip/Next footer) driven by a local content array, mirroring how
 * LoadedScreen branches internally on compression mode rather than splitting into per-mode
 * components.
 */
export function OnboardingScreen({
  step,
  onBack,
  onNext,
  onSkip,
  onFinish
}: OnboardingScreenProps): React.JSX.Element {
  const { displayedValue: displayedStep, isVisible } = useFadeTransition(step)
  const isLastStep = displayedStep === LAST_STEP_INDEX
  const content = STEPS[displayedStep]

  return (
    <div className="absolute inset-5 animate-[fade-in_200ms_ease-out]">
      <div className="flex h-full w-full flex-col items-center justify-center gap-6 rounded-[14px] border-2 border-dashed border-border">
        <div
          className={`flex flex-col items-center gap-6 transition-opacity duration-150 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        >
          {content.body}

          <div className="flex max-w-md flex-col items-center gap-1 px-6 text-center">
            <p className="text-lg font-semibold text-primary">{content.title}</p>
            <p className="text-sm text-secondary">{content.description}</p>
          </div>

          {isLastStep && (
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => openExternalLink('portfolio')}
                className="w-44"
              >
                <Globe className="h-4 w-4" strokeWidth={1.75} />
                Portfolio
              </Button>
              <Button
                variant="secondary"
                onClick={() => openExternalLink('github')}
                className="w-44"
              >
                <Code2 className="h-4 w-4" strokeWidth={1.75} />
                GitHub
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 w-1.5 rounded-full ${index === step ? 'bg-accent' : 'bg-border'}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="secondary" onClick={onBack}>
              Back
            </Button>
          )}
          {!isLastStep && (
            <Button variant="secondary" onClick={onSkip}>
              Skip
            </Button>
          )}
          <Button variant="primary" onClick={isLastStep ? onFinish : onNext}>
            {isLastStep ? 'Finish' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  )
}
