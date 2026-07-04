// eslint-disable-next-line no-control-regex -- deliberately rejecting ASCII control characters, which Windows disallows in filenames
const ILLEGAL_CHARS_RE = /[<>:"/\\|?*\x00-\x1f]/
const RESERVED_NAMES_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex <= 0 ? '' : fileName.slice(dotIndex + 1)
}

function basenameOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex <= 0 ? fileName : fileName.slice(0, dotIndex)
}

/** Reason a filename is invalid, or null if it's fine. Mirrors isPercentValid/isTargetSizeValid's
 *  pure-function style so this can be unit tested and reused without any React/IPC dependency. */
export function filenameErrorMessage(fileName: string, requiredExtension: string): string | null {
  const trimmed = fileName.trim()

  if (trimmed.length === 0) return 'Filename cannot be empty.'
  if (ILLEGAL_CHARS_RE.test(fileName))
    return 'Filename contains a character that isn\'t allowed: < > : " / \\ | ? *'
  if (/[. ]$/.test(fileName)) return 'Filename cannot end with a space or a period.'
  if (RESERVED_NAMES_RE.test(basenameOf(fileName))) {
    return 'That filename is reserved by Windows and cannot be used.'
  }

  const extension = extensionOf(fileName)
  if (extension.length === 0) return `Filename must end with .${requiredExtension}`
  if (extension.toLowerCase() !== requiredExtension.toLowerCase()) {
    return `Filename must end with .${requiredExtension}`
  }

  return null
}

export function isFilenameValid(fileName: string, requiredExtension: string): boolean {
  return filenameErrorMessage(fileName, requiredExtension) === null
}
