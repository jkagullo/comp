import type { ReactNode } from 'react'

type IconTileVariant = 'neutral' | 'success' | 'error'

interface IconTileProps {
  readonly icon: ReactNode
  readonly variant?: IconTileVariant
}

const VARIANT_CLASSES: Record<IconTileVariant, string> = {
  neutral: 'rounded-2xl border border-border bg-panel',
  success: 'rounded-full bg-success-tint',
  error: 'rounded-full bg-error-tint'
}

/** Shared "big icon" motif shown at the top of centered screens (empty, onboarding, done, error). */
export function IconTile({ icon, variant = 'neutral' }: IconTileProps): React.JSX.Element {
  return (
    <div className={`flex h-16 w-16 items-center justify-center ${VARIANT_CLASSES[variant]}`}>
      {icon}
    </div>
  )
}
