import { describe, expect, it } from 'vitest'
import { filenameErrorMessage, isFilenameValid } from './filename'

describe('isFilenameValid / filenameErrorMessage', () => {
  it('rejects an empty or whitespace-only filename', () => {
    expect(isFilenameValid('', 'mp4')).toBe(false)
    expect(isFilenameValid('   ', 'mp4')).toBe(false)
    expect(filenameErrorMessage('', 'mp4')).not.toBeNull()
  })

  it('rejects each Windows-illegal character', () => {
    for (const char of ['<', '>', ':', '"', '/', '\\', '|', '?', '*']) {
      expect(isFilenameValid(`bad${char}name.mp4`, 'mp4')).toBe(false)
    }
  })

  it('rejects control characters', () => {
    expect(isFilenameValid('bad\x01name.mp4', 'mp4')).toBe(false)
  })

  it('rejects a trailing dot', () => {
    expect(isFilenameValid('video.mp4.', 'mp4')).toBe(false)
  })

  it('rejects a trailing space', () => {
    expect(isFilenameValid('video.mp4 ', 'mp4')).toBe(false)
  })

  it('rejects reserved Windows device names, case-insensitively', () => {
    expect(isFilenameValid('CON.mp4', 'mp4')).toBe(false)
    expect(isFilenameValid('con.mp4', 'mp4')).toBe(false)
    expect(isFilenameValid('NUL.mp4', 'mp4')).toBe(false)
    expect(isFilenameValid('COM1.mp4', 'mp4')).toBe(false)
    expect(isFilenameValid('LPT9.mp4', 'mp4')).toBe(false)
  })

  it('rejects a missing extension', () => {
    expect(isFilenameValid('video', 'mp4')).toBe(false)
  })

  it('rejects an extension that does not match the required one', () => {
    expect(isFilenameValid('video.mov', 'mp4')).toBe(false)
  })

  it('accepts a matching extension case-insensitively', () => {
    expect(isFilenameValid('video.MP4', 'mp4')).toBe(true)
  })

  it('accepts valid filenames with spaces, unicode, and hyphens', () => {
    expect(isFilenameValid('my video.mp4', 'mp4')).toBe(true)
    expect(isFilenameValid('vidéo-compressée.mp4', 'mp4')).toBe(true)
    expect(isFilenameValid('clip-2024-01.mp4', 'mp4')).toBe(true)
  })

  it('returns null from filenameErrorMessage for a valid filename', () => {
    expect(filenameErrorMessage('video-compressed.mp4', 'mp4')).toBeNull()
  })
})
