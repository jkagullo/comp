import type { CompressionMode } from '../types'
import { bytesToMB, clamp } from './format'

/** Projected output size in MB for the current mode, before compression actually runs. */
export function estimateTargetMB(sourceSizeBytes: number, mode: CompressionMode): number {
  const fromMB = bytesToMB(sourceSizeBytes)
  if (mode.kind === 'percentage') {
    return fromMB * (1 - mode.percent / 100)
  }
  return clamp(mode.targetMB, 0.1, fromMB)
}

export function reductionPercent(fromMB: number, toMB: number): number {
  if (fromMB <= 0) return 0
  return clamp(Math.round(((fromMB - toMB) / fromMB) * 100), 0, 99)
}

/**
 * Simulated "achieved" size once a (fake) compression run finishes: applies a
 * small jitter around the pre-run estimate so the result doesn't look
 * suspiciously exact, without ever landing above the original size.
 */
export function jitterAchievedMB(fromMB: number, targetMB: number): number {
  const jitterFactor = 1 + (Math.random() * 0.06 - 0.03)
  return clamp(targetMB * jitterFactor, 0.1, fromMB)
}
