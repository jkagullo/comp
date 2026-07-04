# comp

A desktop video compressor for Windows, macOS, and Linux — drop in a video, pick a target size or percentage, and get a smaller file out. Built with Electron, TypeScript, React, and Tailwind CSS.

## Features

- **Two-pass ffmpeg encoding** with live progress and an ETA, not a simulated progress bar
- **Compress by target size (MB) or by percentage** of the original
- **Drag-and-drop or native file picker**, with supported-format validation up front
- **Cancel mid-compression** — kills the encode and cleans up the partial output
- **Overwrite protection** on the output path, plus a "show in folder" shortcut when done
- **Light/dark theme**, remembered across launches
- Supports MP4, MOV, MKV, AVI, WEBM, WMV, FLV

ffmpeg and ffprobe are bundled with the app (via `ffmpeg-static`/`ffprobe-static`) — no separate install required.

## Screenshot

_Add a screenshot of the app here._

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## License

MIT — see [LICENSE](LICENSE).
