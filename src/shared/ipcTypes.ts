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
  appGetVersion: 'app:get-version',
  windowMinimize: 'window:minimize',
  windowMaximizeToggle: 'window:maximize-toggle',
  windowClose: 'window:close',
  windowIsMaximized: 'window:is-maximized',
  windowMaximizedChanged: 'window:maximized-changed',
  dialogPickVideoFile: 'dialog:pick-video-file',
  dialogPickFolder: 'dialog:pick-folder',
  pathGetDefaultOutputFolder: 'path:get-default-output-folder',
  fsPathExists: 'fs:path-exists',
  shellShowItemInFolder: 'shell:show-item-in-folder',
  shellOpenExternalLink: 'shell:open-external-link',
  ffmpegGetVersion: 'ffmpeg:get-version',
  videoGetMetadata: 'video:get-metadata',
  compressionStartTwoPass: 'compression:start-two-pass',
  compressionProgress: 'compression:progress',
  compressionCancel: 'compression:cancel',
  updaterUpdateAvailable: 'updater:update-available',
  updaterDownloadProgress: 'updater:download-progress',
  updaterUpdateDownloaded: 'updater:update-downloaded',
  updaterError: 'updater:error',
  updaterStartDownload: 'updater:start-download'
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

/** Duration in seconds, dimensions in pixels, size in bytes - as extracted via ffprobe + fs.stat. */
export interface VideoMetadata {
  readonly duration: number
  readonly width: number
  readonly height: number
  readonly sizeBytes: number
}

/** Discriminated failure reasons for ffprobe-based metadata extraction, kept distinct so the
 *  renderer can react differently to "not a video" vs. "we couldn't run ffprobe at all" if needed. */
export type VideoMetadataErrorCode =
  | 'ffprobe-execution-failed' // binary spawn/exit failure (missing binary, non-zero exit, etc.)
  | 'unparseable-output' // stdout was not valid JSON
  | 'no-video-stream' // JSON parsed but streams[] has no usable codec_type === 'video' entry
  | 'missing-duration' // format.duration absent or not a finite number
  | 'stat-failed' // fs.stat on the file path failed, or no path was provided

export interface VideoMetadataError {
  readonly code: VideoMetadataErrorCode
  readonly message: string
}

/** Discriminated result for the metadata IPC channel - mirrors PickVideoFileResult's shape so
 *  ffprobe failures (corrupt/non-video files) never appear to the renderer as unhandled IPC rejections. */
export type VideoMetadataResult =
  | { readonly kind: 'success'; readonly metadata: VideoMetadata }
  | { readonly kind: 'error'; readonly error: VideoMetadataError }

/** Byte counts before/after a compression run, plus the resolved output path. Shared by
 *  both the single-pass (1.4-T1) and two-pass (2.3-T1) pipelines. */
export interface CompressionSuccess {
  readonly inputSizeBytes: number
  readonly outputSizeBytes: number
  readonly outputPath: string
}

/** Discriminated failure reasons across both compression pipelines, kept distinct so
 *  future UI can react differently to "couldn't even start" vs. "ran but produced a bad result". */
export type CompressionErrorCode =
  | 'input-stat-failed' // couldn't stat the input file before running ffmpeg
  | 'ffmpeg-execution-failed' // binary spawn/non-zero-exit failure (single-pass pipeline)
  | 'output-missing' // ffmpeg exited cleanly but the output file wasn't found
  | 'output-not-smaller' // output exists but is not smaller than the input
  | 'invalid-duration' // durationSec <= 0 or non-finite in a two-pass request
  | 'invalid-target-size' // targetMB <= 0 or non-finite in a two-pass request
  | 'pass-one-failed' // pass 1 (analysis) child process failed to spawn or exited non-zero
  | 'pass-two-failed' // pass 2 (encode) child process failed to spawn or exited non-zero
  | 'cancelled' // job was cancelled by the user via compression:cancel
  | 'unsupported-codec' // ffmpeg's stderr indicates the required encoder is unavailable
  | 'disk-full' // ENOSPC at spawn time, or ffmpeg's stderr indicates the disk filled up mid-write
  | 'no-write-permission' // EACCES/EPERM at spawn time, or ffmpeg's stderr indicates a permission error

export interface CompressionError {
  readonly code: CompressionErrorCode
  readonly message: string
}

/** Discriminated result for compression IPC channels - mirrors VideoMetadataResult's
 *  shape so ffmpeg failures never appear to the renderer as unhandled IPC rejections. */
export type CompressionResult =
  | { readonly kind: 'success'; readonly result: CompressionSuccess }
  | { readonly kind: 'error'; readonly error: CompressionError }

/** Renderer-supplied request to start a 2-pass job. jobId is generated by the renderer
 *  (crypto.randomUUID()) so it can start listening for compression:progress events
 *  filtered by this id before the start-job invoke() promise even resolves. */
export interface CompressionStartTwoPassRequest {
  readonly jobId: string
  readonly inputPath: string
  readonly outputPath: string
  readonly targetMB: number
  readonly durationSec: number
}

/** Streamed on every ffmpeg -progress pipe:1 block during either pass. percent is the
 *  overall 0-100 value across both passes (already weighted), not per-pass. */
export interface CompressionProgressEvent {
  readonly jobId: string
  readonly pass: 1 | 2
  readonly percent: number
  readonly etaSec: number | null
}

/** Sent when electron-updater finds a newer published release than the running app. */
export interface UpdateAvailableEvent {
  readonly version: string
}

/** Sent while the update installer downloads, after the renderer requests it via
 *  updaterStartDownload. percent is electron-updater's own 0-100 progress value. */
export interface UpdateDownloadProgressEvent {
  readonly percent: number
}

/** Sent once the update installer has finished downloading, shortly before the app
 *  auto-restarts to apply it (see runUpdater in src/main/updater.ts). */
export interface UpdateDownloadedEvent {
  readonly version: string
}

/** Sent when a check or download fails, so the renderer can surface it instead of the
 *  update silently never appearing. */
export interface UpdateErrorEvent {
  readonly message: string
}
