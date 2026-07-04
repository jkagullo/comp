# comp — Commands & Debugging Guide

Reference for running, building, and debugging this Electron + React (Tailwind CSS) app.

## Running the app

| Command         | What it does                                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`   | Starts the app in development mode via `electron-vite dev` (hot reload for the renderer, auto-restart for main/preload changes). |
| `npm run start` | Runs a production-style preview via `electron-vite preview` (built output, no hot reload).                                       |

## Type checking

| Command                  | What it does                                                   |
| ------------------------ | -------------------------------------------------------------- |
| `npm run typecheck`      | Runs both of the below in sequence.                            |
| `npm run typecheck:node` | Type-checks the main/preload processes (`tsconfig.node.json`). |
| `npm run typecheck:web`  | Type-checks the renderer (`tsconfig.web.json`).                |

## Lint & format

| Command          | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `npm run lint`   | Runs ESLint (`eslint --cache .`) across the project.            |
| `npm run format` | Formats the whole project with Prettier (`prettier --write .`). |

## Building & packaging

| Command                | What it does                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`        | Type-checks, then builds main/preload/renderer via `electron-vite build`. Output goes to `out/`.                                                    |
| `npm run build:unpack` | Builds, then runs `electron-builder --dir` — produces an unpacked app folder (fast, no installer) for quick local testing.                          |
| `npm run build:win`    | Builds, then produces a Windows installer via `electron-builder --win` (NSIS, see `electron-builder.yml`).                                          |
| `npm run build:mac`    | Builds, then produces a macOS `.dmg` via `electron-builder --mac`. Notarization is currently **off** (`notarize: false` in `electron-builder.yml`). |
| `npm run build:linux`  | Builds, then produces AppImage/snap/deb packages via `electron-builder --linux`.                                                                    |

Packaging config lives in `electron-builder.yml`. Note: its `publish` block currently points at a placeholder URL (`https://example.com/auto-updates`) — auto-update is not wired up yet.

## Opening DevTools

With the app running (`npm run dev` or a packaged build), open Chromium DevTools in the app window:

- **Windows/Linux**: `Ctrl+Shift+I` or `F12`
- **macOS**: `Cmd+Option+I`

There is no custom DevTools-opening code in this app (no `webContents.openDevTools()` call) — it's just the standard Electron/Chromium shortcut. DevTools works the same in `npm run dev` and in packaged builds.

## Debugging

- **Renderer console/errors**: open DevTools (above) → Console tab. All `console.log`/`console.error` from React code shows up here.
- **Main process logs**: printed directly to the terminal you ran `npm run dev` from (main-process `console.log` doesn't go to the in-app DevTools).
- **localStorage-backed state**: this app persists a couple of small flags in the renderer's `localStorage`, inspectable/editable from the DevTools Console:
  - `comp:theme` — light/dark theme (`useTheme` hook).
  - `comp:hasSeenOnboarding` — whether the first-run onboarding flow has been shown. To re-trigger onboarding during dev:
    ```js
    localStorage.removeItem('comp:hasSeenOnboarding')
    ```
    then reload the window (`Ctrl+R` / `Cmd+R`).
- **IPC boundary**: all renderer→main calls go through `window.comp.*`, defined in `src/preload/index.ts` and typed in `src/shared/ipcTypes.ts`. If an IPC call silently does nothing, check the corresponding `ipcMain.on`/`ipcMain.handle` in `src/main/index.ts` — untrusted renderer input is validated there before touching the OS (e.g. `shell:open-external-link` only accepts allowlisted keys, never a raw URL).
- **Reloading without restarting**: `Ctrl+R` / `Cmd+R` in the app window reloads the renderer only (fast); fully quitting and re-running `npm run dev` restarts main + renderer.

## Project structure quick reference

- `src/main/` — Electron main process (window creation, IPC handlers, filesystem/shell access).
- `src/preload/` — the only bridge exposed to the renderer, via `contextBridge` (`window.comp`).
- `src/renderer/` — the React UI (Vite + Tailwind CSS v4).
- `src/shared/` — types/constants shared across all three processes (IPC channel names, payload shapes, allowlists).
