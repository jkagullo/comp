import { BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC_CHANNELS } from '../shared/ipcTypes'

/** Delay between the renderer being told the update is downloaded and the app actually
 *  restarting, so the "Installing update..." message in the UI is visible for a moment
 *  before the window disappears. */
const QUIT_AND_INSTALL_DELAY_MS = 1500

let updaterWindow: BrowserWindow | null = null

/** Wires electron-updater's events to the renderer over IPC, and checks for an update
 *  once. Windows-only for now: unsigned macOS builds can't self-update without a paid
 *  Apple Developer certificate + notarization, so this is never called on other
 *  platforms (see src/main/index.ts). Downloads never start automatically - only once
 *  the renderer calls updaterStartDownload (wired in registerIpcHandlers) after the
 *  user taps Install. */
export function initUpdater(window: BrowserWindow): void {
  updaterWindow = window
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  autoUpdater.on('update-available', (info) => {
    updaterWindow?.webContents.send(IPC_CHANNELS.updaterUpdateAvailable, { version: info.version })
  })

  autoUpdater.on('download-progress', (progress) => {
    updaterWindow?.webContents.send(IPC_CHANNELS.updaterDownloadProgress, {
      percent: progress.percent
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    updaterWindow?.webContents.send(IPC_CHANNELS.updaterUpdateDownloaded, {
      version: info.version
    })
    setTimeout(() => autoUpdater.quitAndInstall(), QUIT_AND_INSTALL_DELAY_MS)
  })

  autoUpdater.on('error', (error) => {
    updaterWindow?.webContents.send(IPC_CHANNELS.updaterError, { message: error.message })
  })

  autoUpdater.checkForUpdates().catch((error) => {
    updaterWindow?.webContents.send(IPC_CHANNELS.updaterError, {
      message: error instanceof Error ? error.message : String(error)
    })
  })
}

export function startUpdateDownload(): void {
  autoUpdater.downloadUpdate().catch((error) => {
    updaterWindow?.webContents.send(IPC_CHANNELS.updaterError, {
      message: error instanceof Error ? error.message : String(error)
    })
  })
}
