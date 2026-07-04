import { describe, expect, it } from 'vitest'
import { calculateBitratesKbps } from './bitrate'

describe('calculateBitratesKbps', () => {
  it('clamps audio to the 128kbps ceiling for a generous budget', () => {
    const result = calculateBitratesKbps(100, 60)
    expect(result.totalKbps).toBe(13653)
    expect(result.audioKbps).toBe(128)
    expect(result.videoKbps).toBe(13525)
  })

  it('gives audio a flat 20% share when within the 32-128kbps band', () => {
    const result = calculateBitratesKbps(1, 20)
    expect(result.totalKbps).toBe(410)
    expect(result.audioKbps).toBe(82)
    expect(result.videoKbps).toBe(328)
  })

  it('clamps audio to the 32kbps floor and video to the 64kbps floor for a tiny budget, allowing total to exceed target', () => {
    const result = calculateBitratesKbps(1, 600)
    expect(result.totalKbps).toBe(14)
    expect(result.audioKbps).toBe(32)
    expect(result.videoKbps).toBe(64)
    // The video+audio floor sum (96kbps) exceeds the 14kbps budget - intentional,
    // since a video track needs some minimum bitrate to be decodable at all.
    expect(result.videoKbps + result.audioKbps).toBeGreaterThan(result.totalKbps)
  })

  it('treats a zero duration as 1 second rather than dividing by zero', () => {
    const result = calculateBitratesKbps(10, 0)
    expect(Number.isFinite(result.totalKbps)).toBe(true)
    expect(Number.isFinite(result.videoKbps)).toBe(true)
    expect(Number.isFinite(result.audioKbps)).toBe(true)
    expect(result.totalKbps).toBe(81920)
  })

  it('treats a negative duration the same as a zero duration', () => {
    const zero = calculateBitratesKbps(10, 0)
    const negative = calculateBitratesKbps(10, -5)
    expect(negative).toEqual(zero)
  })

  it('keeps videoKbps + audioKbps approximately equal to totalKbps outside the video-floor case', () => {
    const result = calculateBitratesKbps(100, 60)
    expect(result.videoKbps + result.audioKbps).toBeCloseTo(result.totalKbps, 0)
  })
})
