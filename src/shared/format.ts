const BYTES_PER_MB = 1024 * 1024

export function bytesToMB(bytes: number): number {
  return bytes / BYTES_PER_MB
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
