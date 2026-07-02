# TASKS

## comp

Derived from: `comp-epics.md`
Stack: Electron + TypeScript + React

Each task below is scoped to be roughly "one focused PR" of work — cohesive chunks that group closely related implementation steps rather than a large number of tiny tasks.

---

## Epic 1: Foundation, FFmpeg & Video Metadata

### Story 1.1 — Project scaffold

- **1.1-T1: Scaffold Electron + React + TypeScript project with secure process separation**
  - Covers:
    - Run `npm create electron-vite@latest` to scaffold the project (React + TS template).
    - Configure `main.ts` (main process entry), `preload.ts` (contextBridge boundary), and the React renderer, ensuring `contextIsolation: true` and `nodeIntegration: false` on the `BrowserWindow`.
    - Set up a typed `contextBridge.exposeInMainWorld` API surface in `preload.ts` (even if empty/stubbed initially) with a corresponding `.d.ts` declaration for `window.api` so the renderer gets full type safety.
    - Install and configure Tailwind CSS (or CSS Modules) in the renderer build.
    - Add `electron-builder` as a dev dependency (config wired later in Epic 3).
    - Add a trivial styled test component to prove the render pipeline works.
  - Acceptance:
    - `npm run dev` launches a blank Electron window on Windows.
    - Renderer has no direct access to Node/`require`/`fs` — verified by confirming `nodeIntegration` is off and `contextIsolation` is on.
    - A styled test component renders using Tailwind (or CSS Modules) classes.
    - `window.api` is typed end-to-end (no `any`) via the preload `.d.ts`.
  - Technical notes: This is the security foundation for the whole app — every later IPC addition must go through `contextBridge`, never by flipping `nodeIntegration` on. Keep `preload.ts` minimal and only expose specific, narrow functions (not entire Node modules).

### Story 1.2 — FFmpeg bundling

- **1.2-T1: Bundle FFmpeg/FFprobe and prove a main-process IPC round trip**
  - Covers:
    - Install `ffmpeg-static` and `ffprobe-static`; resolve their binary paths correctly for both dev and packaged contexts (paths differ once ASAR-packaged — use `app.isPackaged` / `.asar.unpacked` handling).
    - Create a small main-process module (e.g. `main/ffmpeg.ts`) that spawns FFmpeg via `child_process.spawn`/`execFile` and returns its version string.
    - Define a typed IPC channel (e.g. `ffmpeg:getVersion`) with `ipcMain.handle` in main, exposed through `preload.ts` as `window.api.ffmpeg.getVersion()`.
    - Add a temporary test button/UI trigger in the renderer to invoke it and display the result (can be removed/replaced once Epic 2 UI lands).
  - Acceptance:
    - Clicking the test trigger logs/display the FFmpeg version string, proving main → child_process → IPC → renderer all work.
    - Binary path resolution is verified to work in `npm run dev`.
  - Technical notes: electron-builder's ASAR packaging is the most common source of "works in dev, breaks packaged" FFmpeg bugs — resolve paths via a helper that accounts for `app.isPackaged`, and note that this will be re-verified end-to-end in 1.4-T1.

### Story 1.3 — Video metadata extraction

- **1.3-T1: ffprobe-based metadata extraction service**
  - Covers:
    - Build a main-process function (e.g. `main/metadata.ts`) that runs `ffprobe` against a given file path and parses duration, width, height, and file size (via `fs.stat` for size).
    - Define a typed IPC channel (e.g. `video:getMetadata`) and expose it via `preload.ts` as `window.api.video.getMetadata(path)`, returning a typed `VideoMetadata` interface shared between main/preload/renderer (`{ duration, width, height, sizeBytes }`).
    - Handle ffprobe failures (invalid/corrupt file) by rejecting with a structured, typed error rather than a raw stderr dump.
  - Acceptance:
    - Given a known sample video file, the IPC call returns `{ duration, width, height, sizeBytes }` with correct values.
    - Passing a non-video or corrupted file returns a clear structured error instead of throwing an unhandled exception or hanging.
  - Technical notes: Parse ffprobe's JSON output (`-print_format json -show_format -show_streams`) rather than scraping human-readable text — far more reliable and already structured.

### Story 1.4 — Basic compression proof-of-concept

- **1.4-T1: Single-pass compression pipeline + packaged-build verification**
  - Covers:
    - Build a main-process function that runs a single-pass FFmpeg command (input path → output path) as a child process, resolving on successful exit.
    - Wire a temporary IPC channel/test trigger to run this against a sample file and confirm the output file exists and is smaller.
    - Package the app via `electron-builder` (basic/unsigned config is fine at this stage) and run the same compression test **inside the packaged build**, not just `npm run dev`.
  - Acceptance:
    - A test video compresses successfully end-to-end in dev mode.
    - The identical flow succeeds in a packaged (non-dev) build — bundled FFmpeg/ffprobe binaries resolve and execute correctly outside the dev environment.
  - Technical notes: This task exists specifically to catch ASAR/binary-path issues early, before Epic 2's more complex 2-pass pipeline is built on top of a potentially broken packaging setup. Don't skip the packaged-build check — the acceptance criteria in the epic explicitly call it out as a distinct risk.

---

## Epic 2: Core Compression Flow (Input → Settings → Compress → Output)

### Story 2.1 — File input

- **2.1-T1: File selection UI (picker + drag-and-drop) with metadata display and error states**
  - Covers:
    - Native file picker via a main-process `dialog.showOpenDialog` call, exposed through `preload.ts`/IPC (filtered to supported formats: MP4, MOV, MKV, AVI, WEBM, WMV, FLV).
    - Drag-and-drop zone in the renderer (HTML5 drag events) that resolves to the same file-path state as the picker, so both paths converge on one piece of app state.
    - On file selection, call the 1.3-T1 metadata IPC to fetch and display filename, size, duration, resolution.
    - Error UI for unsupported formats or unreadable/corrupted files, using the structured errors from 1.3-T1, shown as plain-language messages (no raw stack traces/ffprobe output).
  - Acceptance:
    - Selecting via native picker and via drag-and-drop both populate identical renderer state.
    - Unsupported formats and unreadable files show a clear plain-language error and leave the UI in a recoverable (not broken) state.
  - Technical notes: In the renderer, drag-and-drop only gives you a `File` object/path via Electron's `webUtils.getPathForFile` (or equivalent) — the actual read/validation still happens through the main process via IPC, consistent with the contextBridge boundary from 1.1-T1.

### Story 2.2 — Compression settings

- **2.2-T1: Percentage/target-size toggle with validation, live preview, and unit-tested conversion**
  - Covers:
    - Renderer UI: mode toggle between "By Percentage" (1–99 slider/input) and "By Target Size" (MB numeric input).
    - Inline validation: target size must be less than original file size; percentage must be within 1–99.
    - Live preview text (e.g., "100MB → 10MB (~90% reduction)") that updates as the user types/slides.
    - Shared conversion utility (pure function, framework-agnostic) that normalizes percentage mode into an equivalent target-size-in-MB, so all downstream logic (Epic 2.3) only ever deals with one unit.
    - Unit tests for the conversion utility covering edge cases (1%, 99%, non-integer results, rounding behavior).
  - Acceptance:
    - Invalid inputs (target ≥ original size, percentage outside 1–99) are blocked from proceeding, with inline error messaging.
    - Preview text updates live without perceptible lag as inputs change.
    - Percentage-to-MB conversion has passing unit tests covering boundary values.
  - Technical notes: Keep the conversion function pure and outside of React state/render logic so it can be unit ttested in isolation and reused directly by the main-process bitrate calculation in 2.3-T1.

### Story 2.3 — Two-pass compression engine

- **2.3-T1: Bitrate calculation + 2-pass FFmpeg engine with streaming IPC progress**
  - Covers:
    - Main-process bitrate calculator implementing PRD Section 6: `target_bitrate (kbps) = (target_size_MB * 8192) / duration_seconds`, reserving a fixed/scaled slice for audio (e.g. 128kbps, scaled down for very small targets) and giving the remainder to video.
    - 2-pass FFmpeg child-process runner: pass 1 (analysis, output to null/devnull) followed by pass 2 (actual encode with calculated bitrate), run as background child processes so the renderer/UI thread is never blocked.
    - Parse FFmpeg's stderr progress output (`-progress` pipe or stderr scraping) and stream progress updates back to the renderer via an IPC event channel (e.g. `compression:progress`) as the job runs, covering both passes (e.g. pass 1 = 0–50%, pass 2 = 50–100%, or a weighted split).
    - Job-tracking state in main process (e.g. a map of jobId → child process handle) so a given job can be referenced later for cancellation (Story 2.4).
  - Acceptance:
    - Across several test files/formats, output file size lands within ~1–3% of the requested target.
    - UI remains responsive (no freezing) for the full duration of a compression job.
    - Progress bar reflects real FFmpeg progress from 0–100%, not a fake/simulated timer.
  - Technical notes: This is the highest-complexity task in the app — isolate the bitrate math into its own pure/testable function (reusing the normalization from 2.2-T1), and keep the child-process/IPC-streaming logic in a separate module so each piece can be reasoned about (and tested) independently.

### Story 2.4 — Cancel & error handling

- **2.4-T1: Job cancellation and structured failure handling**
  - Covers:
    - Cancel IPC channel (e.g. `compression:cancel`) that looks up the running job by ID (from 2.3-T1's job map) and kills the FFmpeg child process tree cleanly (accounting for the fact that FFmpeg 2-pass may spawn/be spawned in a way that needs the whole process tree killed, not just the immediate PID — use `taskkill /pid <pid> /t /f` on Windows or an equivalent tree-kill approach).
    - On cancel, delete the partial output file(s) (including pass-1 log files) from disk.
    - Renderer cancel button wired to the IPC channel, transitioning UI state back to a pre-job state.
    - Structured error handling in the main-process compression runner for known failure modes: unsupported/bad codec, disk full (`ENOSPC`), no write permission (`EACCES`/`EPERM`) — each mapped to a distinct plain-language message surfaced to the renderer via the existing error-reporting pattern from 2.1-T1.
  - Acceptance:
    - After cancelling or a failed job, Task Manager shows no lingering/orphaned FFmpeg processes.
    - Each listed failure case (bad codec, disk full, no write permission) is explicitly tested and produces its own clear, plain-language error message (not a generic "something went wrong").
  - Technical notes: Windows process trees from spawned child processes are a common source of orphaned processes — `child_process.kill()` alone is often insufficient; verify actual behavior via Task Manager, not just that the promise/callback resolved.

### Story 2.5 — Output handling

- **2.5-T1: Output folder picker, filename editing, and completion state**
  - Covers:
    - Native folder picker (`dialog.showOpenDialog` with `properties: ['openDirectory']`) exposed via IPC, defaulting sensibly (e.g. same folder as source file, falling back to Downloads).
    - Auto-generated output filename (e.g. `myvideo_compressed.mp4`) with an editable text field in the renderer, including basic filename sanitization/collision handling (e.g. avoid overwriting an existing file silently, or confirm before overwrite).
    - Completion-state UI: show achieved file size vs. requested target (using the actual output file size read post-job), a "Show in folder" button, and a "Compress another" button.
    - "Show in folder" implemented via `shell.showItemInFolder` (main process, exposed via IPC) to open Explorer with the file pre-selected.
    - "Compress another" resets all renderer state (selected file, settings, progress, job ID) back to the empty/initial state.
  - Acceptance:
    - "Show in folder" opens Windows Explorer with the correct file selected.
    - "Compress another" results in a full reset — no stale file/settings/progress data carries over into the next job.
  - Technical notes: Read the actual output file's size from disk after the job completes (don't just trust the calculated target) so the "achieved vs. target" comparison reflects reality, including any 1–3% drift from Story 2.3.

---

## Epic 3: Minimalist UI & Packaging

### Story 3.1 — UI polish

- **3.1-T1: Minimalist visual system applied across all app states**
  - Covers:
    - Define a shared design system in Tailwind config (or CSS Modules variables): neutral palette, single accent color, Inter (or similar clean sans-serif) as the base font, consistent spacing scale.
    - Apply this system consistently across all five states: empty (drop zone), file-loaded (settings form), progress, done, and error — ensuring each state has exactly one obvious primary action (e.g. "Compress", "Cancel", "Compress another").
    - Optional: OS light/dark theme detection (`nativeTheme` in main process or `prefers-color-scheme` in renderer) with theme-aware component styling.
  - Acceptance:
    - All five states are visually consistent with the same design system and each has a single unambiguous call-to-action.
    - If dark mode is implemented, no contrast issues in either theme (spot-checked against WCAG AA-ish contrast for text).
  - Technical notes: This is primarily a design/CSS pass over already-functional components from Epic 2 — avoid introducing new state/behavior here, keep it scoped to visual/layout changes.

### Story 3.2 — Windows packaging

- **3.2-T1: electron-builder installer configuration and clean-machine verification**
  - Covers:
    - Configure `electron-builder` (`electron-builder.yml` or `package.json` `build` field) for an NSIS Windows installer: app name, icon (multi-resolution `.ico`), version metadata, publisher info, and correct `asarUnpack` entries for `ffmpeg-static`/`ffprobe-static` binaries so they're accessible at runtime post-install.
    - Build the installer (`npm run build` / `electron-builder --win`) and confirm binary path resolution logic (from 1.2-T1/1.4-T1) correctly handles the final installed-app directory structure.
    - Test the installer on a machine or VM with no FFmpeg installed system-wide and no dev environment present.
  - Acceptance:
    - Installer runs cleanly on a fresh Windows machine/VM (no missing dependency errors).
    - App installs, launches, and successfully compresses a test video with zero manual setup steps required from the user.
  - Technical notes: This is the final end-to-end validation of every "works in dev, might break packaged" risk flagged since Epic 1 (1.2-T1, 1.4-T1) — treat any packaging-only failure here as a signal to revisit binary path resolution, not as a packaging config afterthought.

---

## Suggested Build Order

Follows the epics' suggested order:

1. **1.1-T1 → 1.2-T1 → 1.3-T1 → 1.4-T1** (Epic 1, in sequence — each depends on the prior)
2. **2.1-T1 → 2.2-T1 → 2.3-T1 → 2.4-T1 → 2.5-T1** (Epic 2, in sequence — 2.3 depends on 2.2's conversion utility and 2.1's file state; 2.4 depends on 2.3's job tracking; 2.5 depends on 2.3's completion)
3. **3.1-T1 → 3.2-T1** (Epic 3 — 3.1 is a polish pass over Epic 2's components; 3.2 is the final packaging validation)

---

_End of TASKS._
