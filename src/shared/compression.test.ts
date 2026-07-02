import { describe, expect, it } from 'vitest'
import { estimateTargetMB, isPercentValid, isTargetSizeValid } from './compression'

const ONE_HUNDRED_MB_BYTES = 100 * 1024 * 1024

describe('estimateTargetMB', () => {
  it('computes 1% reduction in percentage mode', () => {
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'percentage', percent: 1 })).toBeCloseTo(
      99,
      6
    )
  })

  it('computes 99% reduction in percentage mode', () => {
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'percentage', percent: 99 })).toBeCloseTo(
      1,
      6
    )
  })

  it('produces a non-integer result for a non-round percentage', () => {
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'percentage', percent: 33 })).toBeCloseTo(
      67,
      6
    )
  })

  it('returns the target size unchanged when within bounds', () => {
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'targetSize', targetMB: 40 })).toBe(40)
  })

  it('clamps a target size at or above the source size down to the source size', () => {
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'targetSize', targetMB: 100 })).toBe(100)
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'targetSize', targetMB: 150 })).toBe(100)
  })

  it('clamps a zero or negative target size up to 0.1', () => {
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'targetSize', targetMB: 0 })).toBe(0.1)
    expect(estimateTargetMB(ONE_HUNDRED_MB_BYTES, { kind: 'targetSize', targetMB: -10 })).toBe(0.1)
  })
})

describe('isPercentValid', () => {
  it('rejects 0', () => {
    expect(isPercentValid(0)).toBe(false)
  })

  it('accepts the lower boundary of 1', () => {
    expect(isPercentValid(1)).toBe(true)
  })

  it('accepts the upper boundary of 99', () => {
    expect(isPercentValid(99)).toBe(true)
  })

  it('rejects 100', () => {
    expect(isPercentValid(100)).toBe(false)
  })

  it('rejects non-integer values', () => {
    expect(isPercentValid(50.5)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isPercentValid(NaN)).toBe(false)
  })
})

describe('isTargetSizeValid', () => {
  it('accepts a value just under the source size', () => {
    expect(isTargetSizeValid(99.9, ONE_HUNDRED_MB_BYTES)).toBe(true)
  })

  it('rejects a value equal to the source size', () => {
    expect(isTargetSizeValid(100, ONE_HUNDRED_MB_BYTES)).toBe(false)
  })

  it('rejects a value greater than the source size', () => {
    expect(isTargetSizeValid(150, ONE_HUNDRED_MB_BYTES)).toBe(false)
  })

  it('rejects zero or negative values', () => {
    expect(isTargetSizeValid(0, ONE_HUNDRED_MB_BYTES)).toBe(false)
    expect(isTargetSizeValid(-5, ONE_HUNDRED_MB_BYTES)).toBe(false)
  })
})
