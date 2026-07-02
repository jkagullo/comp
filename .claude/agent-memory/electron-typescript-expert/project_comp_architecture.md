---
name: project-comp-architecture
description: Architecture and conventions of the "comp" Electron video compressor scaffold
metadata:
  type: project
---

`comp` (C:\Users\jkyle\Documents\development\comp) is an Electron + TypeScript + React + Tailwind v4 desktop video compressor, scaffolded 2026-07-01 via `npm create @quick-start/electron` (electron-vite, react-ts template).

**Why these choices:** electron-vite was picked over raw webpack/electron-forge for fast HMR and a standard main/preload/renderer split out of the box. Tailwind v4 (`@tailwindcss/vite` plugin, CSS-first `@theme inline` config) was used instead of v3 for simpler config.

**Key structure:**

- `src/shared/ipcTypes.ts` — single source of truth for IPC channel names (`IPC_CHANNELS`) and payload types, imported by both `src/main` and `src/preload`/renderer via the `@shared/*` path alias (renderer) or relative import (main/preload).
- `src/preload/index.ts` exposes one namespaced API: `window.comp.*` (minimizeWindow, toggleMaximizeWindow, closeWindow, isWindowMaximized, onWindowMaximizedChange, pickVideoFile, pickOutputFolder, getDefaultOutputFolder, showItemInFolder, getPathForFile, pathToFileUrl). No generic `electronAPI`/`ipcRenderer` passthrough is exposed — every renderer-reachable call is a named, typed method.
- Renderer state machine lives in `src/renderer/src/App.tsx` driving a `Screen` discriminated union (`empty | loaded | progress | done | error`) defined in `src/renderer/src/types.ts`.
- Compression is **stubbed**: `src/renderer/src/hooks/useCompressionRun.ts` runs a fake `setInterval`-based progress simulation scaled to file size (no ffmpeg/child_process anywhere). Real encoding is a deliberate TODO for follow-up work — see [[feedback-electron-scaffold-tooling]] for the one tooling gotcha hit while building this.
- Theme: CSS custom properties (oklch colors) defined in `src/renderer/src/assets/main.css` under `:root` (light) and `:root.dark` (dark), remapped to Tailwind utilities via `@theme inline` (e.g. `--color-primary`, `--color-accent-tint`) so components use plain utility classes like `bg-accent-tint`, `text-primary` instead of `bg-[var(--x)]` everywhere. Theme toggled via `useTheme` hook (localStorage + `.dark` class on `<html>`).
- Video metadata (duration/resolution/thumbnail) extracted client-side via an offscreen `<video>` + `<canvas>` in `src/renderer/src/utils/videoMetadata.ts` — works for both drag-and-dropped `File` objects (object URL) and dialog-picked paths (`file://` URL via `window.comp.pathToFileUrl`).
- `webUtils.getPathForFile()` (Electron 32+) is used in preload to resolve absolute paths for drag-and-dropped `File` objects, since `File.path` no longer exists on renderer File objects in modern Electron.
