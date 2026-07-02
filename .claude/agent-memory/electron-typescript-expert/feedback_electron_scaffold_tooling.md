---
name: feedback-electron-scaffold-tooling
description: Don't pipe `yes` into interactive Electron/Vite scaffolding CLIs
metadata:
  type: feedback
---

Never pipe `yes` (or any auto-confirm loop) into `npm create @quick-start/electron` or similar interactive scaffolding CLIs to bypass a single confirmation prompt.

**Why:** In the `comp` project scaffold, `yes | npm create @quick-start/electron@latest . -- --template react-ts` was used to auto-answer a "directory not empty, continue?" prompt. `yes` kept emitting `y\n` after that prompt was answered, and the _next_ interactive prompt (project name) consumed the flood of `y` characters as raw text input, producing a ~32KB string of `y`s that got written into `package.json` (`name` field), `electron-builder.yml` (`productName`, `win.executableName`), and `README.md` (title). This wasn't caught until `npm install` printed the corrupted name and had to be manually repaired with a `node -e` script.

**How to apply:** If a directory-not-empty (or similar single-shot) prompt needs bypassing non-interactively, move/rename conflicting files out of the target directory first (e.g. `mv CLAUDE.md CLAUDE.md.bak`) so the CLI sees an empty directory and never prompts, then restore afterward — rather than piping an auto-confirm value into a multi-prompt wizard.
