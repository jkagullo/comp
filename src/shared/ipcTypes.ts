/**
 * Types shared across the main, preload, and renderer processes.
 *
 * Keeping these in one place ensures the IPC boundary has a single source of
 * truth for payload shapes, so a change to a channel's contract is a
 * type-checked, compile-time event in all three processes at once.
 */

/** Video container extensions the compressor accepts, without the leading dot. */
export const SUPPORTED_VIDEO_EXTENSIONS = [
  'mp4',
  'mov',
  'mkv',
  'avi',
  'webm',
  'wmv',
  'flv'
] as const

export type SupportedVideoExtension = (typeof SUPPORTED_VIDEO_EXTENSIONS)[number]

/** IPC channel names, centralized to avoid typo-prone string literals at call sites. */
export const IPC_CHANNELS = {
  windowMinimize: 'window:minimize',
  windowMaximizeToggle: 'window:maximize-toggle',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  windowMaximizedChanged: 'window:maximized-changed',
  dialogPickVideoFile: 'dialog:pick-video-file',
  dialogPickFolder: 'dialog:pick-folder',
  pathGetDefaultOutputFolder: 'path:get-default-output-folder',
  shellShowItemInFolder: 'shell:show-item-in-folder',
  shellOpenExternalLink: 'shell:open-external-link',
  ffmpegGetVersion: 'ffmpeg:get-version'
} as const

/**
 * Allowlist of external destinations the renderer may ask the OS browser to open.
 * The renderer only ever sends the *key*, never a raw URL — this makes it impossible
 * for renderer-side code (or a compromised renderer) to direct `shell.openExternal`
 * at an arbitrary address via the IPC boundary.
 */
export const EXTERNAL_LINKS = {
  portfolio: 'https://jkagullo.is-pinoy.dev/',
  github: 'https://github.com/jkagullo'
} as const

export type ExternalLinkKey = keyof typeof EXTERNAL_LINKS

/** Result of a native "select video file" dialog, already stat'd on the main side. */
export interface PickedVideoFile {
  readonly path: string
  readonly name: string
  readonly extension: SupportedVideoExtension
  readonly sizeBytes: number
}

/** Discriminated result for the file picker so the renderer never has to guess why nothing came back. */
export type PickVideoFileResult =
  | { readonly kind: 'picked'; readonly file: PickedVideoFile }
  | { readonly kind: 'cancelled' }
  | {
      readonly kind: 'unsupported-extension'
      readonly fileName: string
      readonly extension: string
    }
