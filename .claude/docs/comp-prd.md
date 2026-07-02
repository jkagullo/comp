# Product Requirements Document (PRD)

## comp

**App Name:** comp
**Version:** 1.0
**Status:** Draft
**Platform:** Windows Desktop
**Tech Stack:** Electron + TypeScript + React

---

## 1. Overview

A simple, minimalist Windows desktop application that lets a user compress a video file either:

- By **percentage** (e.g., "reduce to 50% of original size"), or
- By **exact target size** (e.g., "compress this 100MB video down to 10MB")

The user picks an input video, chooses a compression method, picks an output folder, and the app produces a compressed file that closely matches the requested size/percentage.

---

## 2. Goals

- Accept common video formats as input (MP4, MOV, MKV, AVI, WEBM, WMV, FLV).
- Let the user compress by **percentage** or by **exact target size (MB)**.
- Hit the target size **as closely as possible** (this requires a specific encoding strategy — see Section 6).
- Let the user choose the output/save directory.
- Minimalist, clean, easy-to-use UI — no clutter, no advanced settings shown by default.
- Ship as a Windows installer (.exe) that a non-technical user can install and run.

## 3. Non-Goals (Out of Scope for v1)

- Batch/queue processing of multiple videos at once (confirmed: single video at a time for v1).
- Video editing (trimming, cropping, filters, etc.).
- macOS/Linux builds (Windows-only for now, though Electron makes this possible later).
- Cloud upload/processing.
- Advanced manual codec/bitrate tuning UI (kept hidden/simple — see "Advanced" note in Section 7).

---

## 4. Target User

You / early users who want a **no-frills** tool to shrink a video to a specific size (e.g., to meet a Discord/email/upload size limit) without learning FFmpeg or video terminology.

---

## 5. Tech Stack & Architecture

| Layer              | Choice                                                                            | Why                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop shell      | **Electron**                                                                      | Lets you write the whole app in TypeScript/JS, easiest path since you already know React/RN concepts. Packages into a Windows `.exe`. |
| UI                 | **React + TypeScript**                                                            | Familiar to you as an RN/Next.js developer — component model transfers directly.                                                      |
| Styling            | **Tailwind CSS** (or CSS Modules)                                                 | Fast to build a minimalist UI.                                                                                                        |
| Compression engine | **FFmpeg** (via `ffmpeg-static` npm package, bundled into the app)                | Industry standard, free, handles every format you listed, and supports precise bitrate targeting.                                     |
| IPC                | Electron's built-in `ipcMain` / `ipcRenderer` (or `contextBridge` + `preload.ts`) | Needed because the actual compression runs in Electron's Node.js "main process," not the browser-like "renderer" UI.                  |
| Packaging          | **electron-builder**                                                              | Produces a signed/unsigned Windows installer (.exe / NSIS).                                                                           |

**High-level architecture:**

```
Renderer Process (React + TS UI)
   |  (user picks file, target size, output folder)
   v
IPC Bridge (preload.ts, contextBridge)
   v
Main Process (Node.js + TypeScript)
   |  spawns FFmpeg as a child process
   v
FFmpeg (bundled binary) --> compressed file written to chosen folder
   |
   v
Progress events sent back to Renderer via IPC --> progress bar updates
```

This separation matters because FFmpeg needs full filesystem/child-process access, which only Electron's main process (Node.js side) has — the UI (renderer) side is sandboxed, similar to how a webview can't directly touch the file system.

---

## 6. How "Exact Target Size" Actually Works (Important)

You confirmed hitting the exact target size matters a lot. Here's the plan to make that accurate:

1. Get the video's **duration** (via `ffprobe`, bundled with FFmpeg).
2. Calculate the **target total bitrate** needed:
   `target_bitrate (kbps) = (target_size_MB * 8192) / duration_seconds`
3. Reserve a small slice of that bitrate for audio (e.g., 128kbps, or scale down for very small targets), and give the rest to video.
4. Run FFmpeg in **2-pass encoding mode** using the calculated video bitrate. Two-pass encoding is what makes the output land very close (typically within 1–3%) to the target size — single-pass/CRF-based compression cannot guarantee an exact size.
5. If the user instead picked "compress by percentage," convert that percentage into a target size first (`original_size * percentage`), then run the same pipeline above.

This means every compression job — whether started by % or by MB — is normalized into a **target size in MB**, then handled by one consistent 2-pass pipeline. Trade-off: 2-pass encoding takes roughly 2x longer than single-pass, but it's the right trade for accuracy, which you said matters most.

---

## 7. Functional Requirements

### 7.1 Input

- User selects a video file via a file picker or drag-and-drop.
- Supported formats: MP4, MOV, MKV, AVI, WEBM, WMV, FLV (anything FFmpeg supports can be added later).
- App displays: filename, current size (MB), duration, resolution.

### 7.2 Compression Settings

- Toggle between two modes:
  - **By Percentage** — slider or input (1–99%) of original file size.
  - **By Target Size** — numeric input in MB (validated: must be less than original size).
- Live preview text: "Compressing 100MB → 10MB (~90% reduction)."

### 7.3 Output

- "Choose folder" button (native Windows folder picker) — defaults to same folder as source or Downloads.
- Output filename auto-generated (e.g., `myvideo_compressed.mp4`), editable by user.

### 7.4 Compression Process

- "Compress" button starts the job.
- Progress bar with percentage and estimated time remaining (parsed from FFmpeg's progress output).
- Cancel button to abort an in-progress job (kills the FFmpeg child process cleanly).
- On completion: show final file size achieved vs. target, with a "Show in folder" button.
- On failure (corrupt file, unsupported codec, disk full, etc.): clear, plain-language error message.

### 7.5 Simple Settings (kept minimal, optional for v1)

- Output format dropdown (default: keep as MP4, since it's the most compatible).
- That's it — no codec/resolution/frame-rate controls in v1 to keep the UI minimalist, per your requirement.

---

## 8. UI/UX Requirements

- **Style:** Minimalist — plenty of white space, one primary action visible at a time, muted neutral color palette with a single accent color, system font or a clean sans-serif (e.g., Inter).
- **Single-window app**, no multi-page navigation needed:
  1. Drop zone / file picker (empty state)
  2. Once a file is loaded: file info + compression mode toggle + target input + output folder + "Compress" button
  3. Progress state (progress bar, cancel button)
  4. Done state (result summary, "Show in folder", "Compress another" button)
- No dark/light mode toggle needed for v1 (can follow OS theme automatically, or default to light).

---

## 9. Non-Functional Requirements

- **Performance:** Compression speed is bound by FFmpeg/hardware, not the app itself; UI must stay responsive during compression (this is guaranteed by running FFmpeg in the main process, not blocking the renderer/UI thread).
- **Reliability:** App must not crash if given a corrupted or unsupported file — should show an error instead.
- **Portability:** FFmpeg binary is bundled inside the app package — user should NOT need to separately install FFmpeg.
- **Installer:** Single `.exe` installer (via electron-builder/NSIS), no manual dependency installation required for the end user.

---

## 10. What You Need to Install (Development Environment Setup)

Since you haven't done Windows desktop app development before, here's exactly what to install, in order:

1. **Node.js (LTS version)** — https://nodejs.org
   Gives you `node` and `npm`, needed to run/build the Electron app. Verify with `node -v` and `npm -v` in a terminal.

2. **Visual Studio Code** — https://code.visualstudio.com (you may already have this)
   Your code editor. Not required (any editor works) but recommended.

3. **Git** — https://git-scm.com (optional but recommended for version control)

4. **A package manager of choice** — `npm` (comes with Node) is enough; `pnpm` or `yarn` are optional alternatives.

5. **Project scaffolding tool** — we'll use `electron-vite` or the Electron + React + TypeScript template (e.g., via `npm create electron-vite@latest`) to scaffold the project — no separate install needed, it runs via `npx`/`npm create`.

6. **FFmpeg — NOT installed manually.** We bundle it via the `ffmpeg-static` (and `ffprobe-static`) npm packages, so it ships inside your app automatically. You do not need to install FFmpeg system-wide, and neither will your end users.

7. **electron-builder** — added as a dev dependency in the project (`npm install --save-dev electron-builder`) — used only when you're ready to package the final `.exe`.

You do **not** need Rust, Visual Studio (the full IDE, not VS Code), or any C++ build tools for this stack — that's one of the advantages of choosing Electron over Tauri for this project.

---

## 11. Milestones / Suggested Build Order

1. **Scaffold** Electron + React + TypeScript project; confirm a blank window launches on Windows.
2. **Wire up FFmpeg**: bundle `ffmpeg-static`/`ffprobe-static`, confirm you can run a basic compression command from the main process via a test button.
3. **Build the file input UI**: file picker/drag-drop, show file metadata (size/duration) using `ffprobe`.
4. **Implement target-size calculation logic** (Section 6) and wire it to a real 2-pass FFmpeg compression call.
5. **Build output folder picker** and progress bar (parse FFmpeg stderr progress output, send via IPC to renderer).
6. **Add cancel + error handling.**
7. **Polish UI** to minimalist spec (Section 8).
8. **Package with electron-builder** into a Windows installer; test on a clean machine/VM if possible.

---

## 12. Open Questions / Future Considerations

- Should there be a max input file size or duration warning (e.g., for very large 4K files that may take a long time)?
- Should the app remember the last-used output folder between sessions?
- Future v2 ideas (not in scope now): batch queue, GPU-accelerated encoding (NVENC/QuickSync) for speed, drag-to-reorder batch list, dark mode.

---

_End of PRD._
