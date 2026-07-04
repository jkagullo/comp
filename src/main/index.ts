import { app, shell, BrowserWindow, ipcMain, dialog, IpcMainInvokeEvent } from 'electron'
import { join, extname } from 'path'
import { stat } from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import {
  IPC_CHANNELS,
  SUPPORTED_VIDEO_EXTENSIONS,
  SupportedVideoExtension,
  PickVideoFileResult,
  VideoMetadataResult,
  CompressionResult,
  CompressionStartTwoPassRequest,
  EXTERNAL_LINKS
} from '../shared/ipcTypes'
import icon from '../../resources/icon.png?asset'
import { getFfmpegVersion } from './ffmpeg'
import { getVideoMetadata } from './metadata'
import { runTwoPassCompression, cancelJob } from './compress2pass'

let mainWindow: BrowserWindow | null = null

function isSupportedExtension(extension: string): extension is SupportedVideoExtension {
  return (SUPPORTED_VIDEO_EXTENSIONS as readonly string[]).includes(extension)
}

/** Renderer input crossing the IPC boundary is untrusted: validate the shape before
 *  passing it on to the two-pass compression runner. */
function isValidTwoPassRequest(request: unknown): request is CompressionStartTwoPassRequest {
  if (typeof request !== 'object' || request === null) return false
  const candidate = request as Record<string, unknown>
  return (
    typeof candidate.jobId === 'string' &&
    candidate.jobId.length > 0 &&
    typeof candidate.inputPath === 'string' &&
    candidate.inputPath.length > 0 &&
    typeof candidate.outputPath === 'string' &&
    candidate.outputPath.length > 0 &&
    typeof candidate.targetMB === 'number' &&
    typeof candidate.durationSec === 'number'
  )
}

/** Every ipcMain handler that receives a window-scoped call resolves the sender's BrowserWindow this way. */
function windowFromEvent(event: IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 700,
    minWidth: 760,
    minHeight: 560,
    show: false,
    frame: false,
    backgroundColor: '#fbfaf8',
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.windowMaximizedChanged, true)
  })
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send(IPC_CHANNELS.windowMaximizedChanged, false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.appGetVersion, () => app.getVersion())

  ipcMain.on(IPC_CHANNELS.windowMinimize, (event) => {
    windowFromEvent(event)?.minimize()
  })

  ipcMain.on(IPC_CHANNELS.windowMaximizeToggle, (event) => {
    const win = windowFromEvent(event)
    if (!win) return
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  })

  ipcMain.on(IPC_CHANNELS.windowClose, (event) => {
    windowFromEvent(event)?.close()
  })

  ipcMain.handle(IPC_CHANNELS.windowIsMaximized, (event) => {
    return windowFromEvent(event)?.isMaximized() ?? false
  })

  ipcMain.handle(IPC_CHANNELS.dialogPickVideoFile, async (event): Promise<PickVideoFileResult> => {
    const win = windowFromEvent(event)
    const result = await dialog.showOpenDialog(win ?? mainWindow!, {
      title: 'Select a video',
      properties: ['openFile'],
      filters: [
        { name: 'Video files', extensions: [...SUPPORTED_VIDEO_EXTENSIONS] },
        { name: 'All files', extensions: ['*'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { kind: 'cancelled' }
    }

    const path = result.filePaths[0]
    const extension = extname(path).slice(1).toLowerCase()
    const name = path.split(/[\\/]/).pop() ?? path

    if (!isSupportedExtension(extension)) {
      return { kind: 'unsupported-extension', fileName: name, extension }
    }

    const stats = await stat(path)
    return {
      kind: 'picked',
      file: { path, name, extension, sizeBytes: stats.size }
    }
  })

  ipcMain.handle(IPC_CHANNELS.dialogPickFolder, async (event): Promise<string | null> => {
    const win = windowFromEvent(event)
    const result = await dialog.showOpenDialog(win ?? mainWindow!, {
      title: 'Choose output folder',
      properties: ['openDirectory', 'createDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle(IPC_CHANNELS.pathGetDefaultOutputFolder, () => {
    return app.getPath('downloads')
  })

  ipcMain.handle(
    IPC_CHANNELS.fsPathExists,
    async (_event, targetPath: unknown): Promise<boolean> => {
      if (typeof targetPath !== 'string' || targetPath.length === 0) return false
      try {
        await stat(targetPath)
        return true
      } catch {
        return false
      }
    }
  )

  ipcMain.on(IPC_CHANNELS.shellShowItemInFolder, (_event, targetPath: unknown) => {
    // Renderer input crossing the IPC boundary is untrusted: validate the shape before touching the OS shell.
    if (typeof targetPath !== 'string' || targetPath.length === 0) return
    shell.showItemInFolder(targetPath)
  })

  ipcMain.on(IPC_CHANNELS.shellOpenExternalLink, (_event, key: unknown) => {
    // Only ever accept a known allowlist key from the renderer, never a raw URL string,
    // so the renderer can't direct shell.openExternal at an arbitrary address.
    if (key !== 'portfolio' && key !== 'github') return
    shell.openExternal(EXTERNAL_LINKS[key])
  })

  ipcMain.handle(IPC_CHANNELS.ffmpegGetVersion, () => getFfmpegVersion())

  ipcMain.handle(
    IPC_CHANNELS.videoGetMetadata,
    (_event, filePath: unknown): Promise<VideoMetadataResult> => {
      // Renderer input crossing the IPC boundary is untrusted: validate the shape before touching the filesystem.
      if (typeof filePath !== 'string' || filePath.length === 0) {
        return Promise.resolve({
          kind: 'error',
          error: { code: 'stat-failed', message: 'No file path was provided.' }
        })
      }
      return getVideoMetadata(filePath)
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.compressionStartTwoPass,
    (event, request: unknown): Promise<CompressionResult> => {
      if (!isValidTwoPassRequest(request)) {
        return Promise.resolve({
          kind: 'error',
          error: { code: 'input-stat-failed', message: 'Malformed compression start request.' }
        })
      }
      const senderWindow = windowFromEvent(event)
      return runTwoPassCompression({
        ...request,
        onProgress: (percent, pass, etaSec) => {
          senderWindow?.webContents.send(IPC_CHANNELS.compressionProgress, {
            jobId: request.jobId,
            pass,
            percent,
            etaSec
          })
        }
      })
    }
  )

  ipcMain.handle(
    IPC_CHANNELS.compressionCancel,
    (_event, jobId: unknown): Promise<{ cancelled: boolean }> => {
      // Renderer input crossing the IPC boundary is untrusted: validate the shape before touching the process table.
      if (typeof jobId !== 'string' || jobId.length === 0) {
        return Promise.resolve({ cancelled: false })
      }
      return cancelJob(jobId)
    }
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.jkd.comp')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
