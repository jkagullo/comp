import { clamp } from './format'

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
