import { clamp } from './format'

export function reductionPercent(fromMB: number, toMB: number): number {
  if (fromMB <= 0) return 0
  return clamp(Math.round(((fromMB - toMB) / fromMB) * 100), 0, 99)
}
