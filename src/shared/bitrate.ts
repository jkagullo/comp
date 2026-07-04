import { clamp } from './format'

export interface BitrateAllocationKbps {
  readonly videoKbps: number
  readonly audioKbps: number
  readonly totalKbps: number
}

const KBITS_PER_MB = 8192 // 1 MB = 8 * 1024 kbit
const MIN_AUDIO_KBPS = 32
const MAX_AUDIO_KBPS = 128
const AUDIO_SHARE = 0.2
const MIN_VIDEO_KBPS = 64

/**
 * Converts an already-decided target output size + duration into a video/audio
 * kbps split, per PRD Section 6: target_bitrate = (target_size_MB * 8192) / duration.
 * Audio takes a 20% share of the total budget, clamped between a 32kbps floor and a
 * 128kbps ceiling, so it never starves video at very small targets nor eats more than
 * a fixed slice at generous ones. Video is floored at 64kbps so ffmpeg never receives a
 * degenerate bitrate - at that floor the real output may exceed the requested target
 * size, which is an intentional tradeoff (a video track needs *some* minimum bitrate to
 * be decodable), not a bug.
 */
export function calculateBitratesKbps(
  targetMB: number,
  durationSec: number
): BitrateAllocationKbps {
  const safeDurationSec = durationSec > 0 ? durationSec : 1
  const totalKbps = (targetMB * KBITS_PER_MB) / safeDurationSec

  const audioKbps = Math.round(clamp(totalKbps * AUDIO_SHARE, MIN_AUDIO_KBPS, MAX_AUDIO_KBPS))
  const videoKbps = Math.max(Math.round(totalKbps - audioKbps), MIN_VIDEO_KBPS)

  return { videoKbps, audioKbps, totalKbps: Math.round(totalKbps) }
}
