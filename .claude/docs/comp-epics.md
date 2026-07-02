# EPICS

## comp

**App Name:** comp
Derived from: `video-compressor-app-PRD.md`
Stack: Electron + TypeScript + React

---

## Epic 1: Foundation, FFmpeg & Video Metadata

**Goal:** Stand up the Electron + React + TypeScript app skeleton and get FFmpeg fully working inside it — this is the technical foundation everything else builds on.

**Related PRD sections:** 5 (Tech Stack & Architecture), 10 (Dev Environment), Milestones 1–2

### Stories

- **1.1 Project scaffold:** Scaffold an Electron + React + TypeScript project (`npm create electron-vite@latest`), with proper `main.ts` / `preload.ts` (contextBridge) / renderer separation so the UI never directly touches Node.js/filesystem APIs. Tailwind (or CSS Modules) configured. `electron-builder` installed as a dev dependency.
  - Acceptance: `npm run dev` launches a blank window on Windows; renderer can only reach Node/file APIs through `contextBridge`-exposed functions; a styled test component renders.
- **1.2 FFmpeg bundling:** Install and wire up `ffmpeg-static` + `ffprobe-static` in the main process.
  - Acceptance: a test IPC call successfully invokes FFmpeg and logs its version.
- **1.3 Video metadata extraction:** Use `ffprobe` to read a video's duration, resolution, and file size.
  - Acceptance: given a sample file, returns `{ duration, width, height, sizeBytes }` correctly.
- **1.4 Basic compression proof-of-concept:** Run a single-pass FFmpeg command end-to-end (input path → smaller output path) to confirm the pipeline works before adding target-size logic.
  - Acceptance: a test video is compressed and written to disk successfully, including once inside a _packaged_ (non-dev) build — bundled binaries can behave differently once built, so this needs to be confirmed early, not just in `npm run dev`.

---

## Epic 2: Core Compression Flow (Input → Settings → Compress → Output)

**Goal:** Deliver the entire user-facing workflow end to end: pick a video, choose how much to compress it by, run accurate 2-pass compression with progress/cancel, and save the result where the user wants.

**Related PRD sections:** 6 (Target Size Logic), 7 (Functional Requirements), Milestones 3–6

### Stories

- **2.1 File input:** Select a video via native file picker or drag-and-drop (MP4, MOV, MKV, AVI, WEBM, WMV, FLV). Display filename, size, duration, resolution once loaded. Show a clear error for corrupted/unsupported files.
  - Acceptance: both selection methods produce the same state; unsupported formats and unreadable files show plain-language errors instead of a broken UI.
- **2.2 Compression settings:** Toggle between "by Percentage" (1–99%) and "by Target Size" (MB), with inline validation (target must be less than original size) and a live preview (e.g., "100MB → 10MB (~90% reduction)"). Internally, percentage mode is always converted to an equivalent target-size-in-MB so the rest of the pipeline only handles one case.
  - Acceptance: invalid inputs are blocked; preview updates live; percentage-to-MB conversion is unit-tested.
- **2.3 Two-pass compression engine:** Calculate the required video bitrate from target size + duration (reserving bitrate for audio), then run FFmpeg in 2-pass mode as a background child process, streaming progress back to the UI via IPC without freezing it.
  - Acceptance: output size lands within ~1–3% of the requested target across several test files/formats; UI stays responsive throughout; progress bar reflects real FFmpeg progress (0–100%).
- **2.4 Cancel & error handling:** User can cancel a running job (cleanly kills the FFmpeg process and deletes partial output, no orphaned processes left behind). Failures (bad codec, disk full, no write permission) show clear, plain-language errors.
  - Acceptance: verified via Task Manager that cancelled/failed jobs leave no lingering FFmpeg processes; each failure case listed above is explicitly tested.
- **2.5 Output handling:** User picks an output folder (native folder picker, defaults sensibly), can edit the auto-generated filename, and on completion sees the achieved size vs. target plus a "Show in folder" button and a "Compress another" reset.
  - Acceptance: "Show in folder" opens Explorer with the file selected; "Compress another" fully resets app state.

---

## Epic 3: Minimalist UI & Packaging

**Goal:** Make the app look and feel like the clean, minimalist tool described in the PRD, and ship it as a Windows installer that works with zero setup for the end user.

**Related PRD sections:** 8 (UI/UX Requirements), 9 (Non-Functional Requirements), Milestones 7–8

### Stories

- **3.1 UI polish:** Apply a consistent minimalist visual style (neutral palette + single accent color, clean sans-serif like Inter, generous white space, one obvious primary action per screen) across all states: empty, file-loaded, progress, done, and error. Optionally follow OS light/dark theme.
  - Acceptance: all five states are visually consistent and each has a single clear call-to-action; no contrast issues in either theme if dark mode is implemented.
- **3.2 Windows packaging:** Build a distributable installer (.exe via NSIS) using `electron-builder`, with proper app name/icon/version metadata, and confirm FFmpeg/FFprobe work correctly in the packaged build on a machine with no FFmpeg installed system-wide.
  - Acceptance: installer runs cleanly on a fresh Windows machine/VM; app installs, launches, and successfully compresses a video with no manual dependency setup.

---

## Suggested Build Order

1. **Epic 1** — Foundation, FFmpeg & Video Metadata _(highest risk/newest territory — do this first)_
2. **Epic 2** — Core Compression Flow
3. **Epic 3** — Minimalist UI & Packaging

---

## Backlog / Future Epics (Out of Scope for v1)

- **Batch/Queue Processing** — compress multiple videos in sequence.
- **GPU-Accelerated Encoding** (NVENC/QuickSync) — faster compression.
- **Persisted Preferences** — remember last output folder, theme, etc.
- **Advanced Settings Panel** — manual codec/resolution/frame-rate control.

---

_End of EPICS._
