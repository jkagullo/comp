const BYTES_PER_MB = 1024 * 1024

export function bytesToMB(bytes: number): number {
  return bytes / BYTES_PER_MB
}

export function formatMB(bytes: number, fractionDigits = 1): string {
  return `${bytesToMB(bytes).toFixed(fractionDigits)} MB`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < BYTES_PER_MB) return `${(bytes / 1024).toFixed(0)} KB`
  return formatMB(bytes)
}

export function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds))
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`
}

export function formatResolution(width: number, height: number): string {
  return `${width}×${height}`
}

export function formatEta(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds))
  if (rounded < 60) return `${rounded}s`
  const minutes = Math.floor(rounded / 60)
  const secs = rounded % 60
  return `${minutes}m ${secs}s`
}

export function basenameWithoutExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.')
  return lastDot > 0 ? fileName.slice(0, lastDot) : fileName
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Joins a folder and file name using whichever path separator the folder already uses. */
export function joinPath(folder: string, fileName: string): string {
  const separator = folder.includes('\\') ? '\\' : '/'
  const trimmedFolder = folder.endsWith(separator) ? folder.slice(0, -1) : folder
  return `${trimmedFolder}${separator}${fileName}`
}
