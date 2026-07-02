import { bytesToMB, clamp } from './format'

export type CompressionMode =
  | { readonly kind: 'percentage'; readonly percent: number }
  | { readonly kind: 'targetSize'; readonly targetMB: number }

/** Projected output size in MB for the current mode, before compression actually runs. */
export function estimateTargetMB(sourceSizeBytes: number, mode: CompressionMode): number {
  const fromMB = bytesToMB(sourceSizeBytes)
  if (mode.kind === 'percentage') {
    return fromMB * (1 - mode.percent / 100)
  }
  return clamp(mode.targetMB, 0.1, fromMB)
}

export function isPercentValid(percent: number): boolean {
  return Number.isFinite(percent) && Number.isInteger(percent) && percent >= 1 && percent <= 99
}

export function isTargetSizeValid(targetMB: number, sourceSizeBytes: number): boolean {
  return Number.isFinite(targetMB) && targetMB > 0 && targetMB < bytesToMB(sourceSizeBytes)
}
