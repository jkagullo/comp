import { describe, expect, it } from 'vitest'
import { describeCompressionError } from './compressionErrors'
import type { CompressionErrorCode } from '@shared/ipcTypes'

const ALL_CODES: readonly CompressionErrorCode[] = [
  'input-stat-failed',
  'ffmpeg-execution-failed',
  'output-missing',
  'output-not-smaller',
  'invalid-duration',
  'invalid-target-size',
  'pass-one-failed',
  'pass-two-failed',
  'cancelled',
  'unsupported-codec',
  'disk-full',
  'no-write-permission'
]

describe('describeCompressionError', () => {
  it.each(ALL_CODES)('returns non-empty title/detail for code %s', (code) => {
    const { title, detail } = describeCompressionError(code)
    expect(title.length).toBeGreaterThan(0)
    expect(detail.length).toBeGreaterThan(0)
  })

  it('returns non-empty title/detail for a null code', () => {
    const { title, detail } = describeCompressionError(null)
    expect(title.length).toBeGreaterThan(0)
    expect(detail.length).toBeGreaterThan(0)
  })

  it('gives the new structured failure codes distinct titles', () => {
    const titles = new Set(
      ['disk-full', 'no-write-permission', 'unsupported-codec', 'cancelled'].map(
        (code) => describeCompressionError(code as CompressionErrorCode).title
      )
    )
    expect(titles.size).toBe(4)
  })
})
