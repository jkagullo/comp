# comp

A desktop video compressor for Windows, macOS, and Linux — drop in a video, pick a target size or percentage, and get a smaller file out. Built with Electron, TypeScript, React, and Tailwind CSS.

## Features

- **Two-pass ffmpeg encoding** with live progress and an ETA, not a simulated progress bar
- **Compress by target size (MB) or by percentage** of the original
- **Drag-and-drop or native file picker**, with supported-format validation up front
- **Cancel mid-compression** — kills the encode and cleans up the partial output
- **Overwrite protection** on the output path, plus a "show in folder" shortcut when done
- **Light/dark theme**, remembered across launches
- **In-app auto-update** on Windows
- Supports MP4, MOV, MKV, AVI, WEBM, WMV, FLV

ffmpeg and ffprobe are bundled with the app (via `ffmpeg-static`/`ffprobe-static`) — no separate install required.

## Screenshot

_Add a screenshot of the app here._

## How it works

The renderer (React UI) never touches the filesystem or spawns processes directly. It talks to the Electron main process over a small set of typed IPC channels defined in [`src/shared/ipcTypes.ts`](src/shared/ipcTypes.ts), and the [preload script](src/preload/index.ts) exposes only that validated surface via `contextBridge` — `contextIsolation` is on and `nodeIntegration` is off.

Compression itself is a two-pass ffmpeg encode (analysis pass, then encode pass) run as a child process with an argument array — never a shell string — so user-supplied paths can't be interpreted as shell syntax. Progress is parsed from ffmpeg's `-progress` output and streamed back to the UI in real time.

```
src/
├─ main/        Electron main process: window/IPC setup, ffmpeg invocation, auto-update
├─ preload/     contextBridge surface exposed to the renderer
├─ renderer/    React UI (screens, components, hooks)
└─ shared/      Types and pure logic (bitrate math, filenames, etc.) shared across processes
```

## Project Setup

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Development

```bash
npm run dev
```

### Test, lint, and typecheck

```bash
npm test          # vitest
npm run lint      # eslint
npm run typecheck # tsc, main + renderer configs
```

### Build

```bash
npm run build:win    # Windows
npm run build:mac    # macOS
npm run build:linux  # Linux
```

## Contributing

Issues and pull requests are welcome. Please run `npm run lint`, `npm run typecheck`, and `npm test` before opening a PR.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## License

MIT — see [LICENSE](LICENSE).
