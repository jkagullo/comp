import type { SupportedVideoExtension } from '@shared/ipcTypes'

/** A video loaded into the app, enriched with metadata pulled from an offscreen <video>/<canvas>. */
export interface LoadedVideo {
  readonly sourceUrl: string
  readonly path: string | null
  readonly name: string
  readonly extension: SupportedVideoExtension
  readonly sizeBytes: number
  readonly durationSec: number
  readonly width: number
  readonly height: number
  readonly thumbnailDataUrl: string | null
}

import type { CompressionMode } from '@shared/compression'

export type { CompressionMode }

export interface OutputSettings {
  readonly folder: string
  readonly fileName: string
}

export type Screen =
  | { readonly kind: 'onboarding'; readonly step: number }
  | { readonly kind: 'empty' }
  | { readonly kind: 'loaded'; readonly video: LoadedVideo }
  | {
      readonly kind: 'progress'
      readonly video: LoadedVideo
      readonly mode: CompressionMode
      readonly output: OutputSettings
    }
  | {
      readonly kind: 'done'
      readonly video: LoadedVideo
      readonly mode: CompressionMode
      readonly output: OutputSettings
      readonly achievedMB: number
    }
  | { readonly kind: 'error'; readonly title: string; readonly detail: string }
