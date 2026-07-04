import { describe, expect, it } from 'vitest'
import { classifyFfmpegFailure, parseProgressBlock, weightedPercent } from './compress2pass'

describe('parseProgressBlock', () => {
  it('extracts out_time_us from a progress block', () => {
    const result = parseProgressBlock(['frame=100', 'out_time_us=2500000', 'progress=continue'])
    expect(result.outTimeUs).toBe(2500000)
    expect(result.isEnd).toBe(false)
  })

  it('falls back to out_time_ms when out_time_us is absent', () => {
    const result = parseProgressBlock(['frame=100', 'out_time_ms=2500', 'progress=continue'])
    expect(result.outTimeUs).toBe(2500)
  })

  it('prefers out_time_us over out_time_ms when both are present', () => {
    const result = parseProgressBlock(['out_time_ms=1', 'out_time_us=999', 'progress=continue'])
    expect(result.outTimeUs).toBe(999)
  })

  it('flags progress=end', () => {
    const result = parseProgressBlock(['out_time_us=5000000', 'progress=end'])
    expect(result.isEnd).toBe(true)
  })

  it('returns null out_time_us when the block has no timing key', () => {
    const result = parseProgressBlock(['frame=1', 'fps=0.0'])
    expect(result.outTimeUs).toBeNull()
    expect(result.isEnd).toBe(false)
  })
})

describe('weightedPercent', () => {
  it('scales pass 1 fraction into the 0-35 range', () => {
    expect(weightedPercent(0, 1)).toBe(0)
    expect(weightedPercent(0.5, 1)).toBeCloseTo(17.5, 5)
    expect(weightedPercent(1, 1)).toBeCloseTo(35, 5)
  })

  it('scales pass 2 fraction into the 35-100 range', () => {
    expect(weightedPercent(0, 2)).toBeCloseTo(35, 5)
    expect(weightedPercent(0.5, 2)).toBeCloseTo(67.5, 5)
    expect(weightedPercent(1, 2)).toBeCloseTo(100, 5)
  })

  it('clamps out-of-range fractions', () => {
    expect(weightedPercent(-1, 1)).toBe(0)
    expect(weightedPercent(2, 2)).toBeCloseTo(100, 5)
  })
})

describe('classifyFfmpegFailure', () => {
  it('classifies disk-full stderr', () => {
    expect(classifyFfmpegFailure('av_interleaved_write_frame(): No space left on device')).toBe(
      'disk-full'
    )
  })

  it('classifies permission-denied stderr', () => {
    expect(classifyFfmpegFailure("Could not open 'out.mp4': Permission denied")).toBe(
      'no-write-permission'
    )
  })

  it('classifies unknown-encoder stderr', () => {
    expect(classifyFfmpegFailure("Unknown encoder 'libx264'")).toBe('unsupported-codec')
  })

  it('classifies unrecognized-option stderr', () => {
    expect(classifyFfmpegFailure("Unrecognized option 'foo'")).toBe('unsupported-codec')
  })

  it('classifies encoder-not-found stderr', () => {
    expect(classifyFfmpegFailure('Encoder not found')).toBe('unsupported-codec')
  })

  it('returns null for unrecognized stderr text', () => {
    expect(classifyFfmpegFailure('some unrelated ffmpeg warning')).toBeNull()
  })
})
