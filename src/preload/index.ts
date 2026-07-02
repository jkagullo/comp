import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { pathToFileURL } from 'url'
import { IPC_CHANNELS, PickVideoFileResult, ExternalLinkKey } from '../shared/ipcTypes'

/**
 * The only surface the renderer can reach. Every member is either a thin,
 * validated IPC call or a pure/local transform — nothing here hands the
 * renderer direct filesystem or process access.
 */
const compApi = {
  minimizeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.windowMinimize)
  },
  toggleMaximizeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.windowMaximizeToggle)
  },
  closeWindow: (): void => {
    ipcRenderer.send(IPC_CHANNELS.windowClose)
  },
  isWindowMaximized: (): Promise<boolean> => ipcRenderer.invoke(IPC_CHANNELS.windowIsMaximized),
  onWindowMaximizedChange: (callback: (maximized: boolean) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, maximized: boolean): void =>
      callback(maximized)
    ipcRenderer.on(IPC_CHANNELS.windowMaximizedChanged, listener)
    return () => ipcRenderer.removeListener(IPC_CHANNELS.windowMaximizedChanged, listener)
  },

  pickVideoFile: (): Promise<PickVideoFileResult> =>
    ipcRenderer.invoke(IPC_CHANNELS.dialogPickVideoFile),
  pickOutputFolder: (): Promise<string | null> => ipcRenderer.invoke(IPC_CHANNELS.dialogPickFolder),
  getDefaultOutputFolder: (): Promise<string> =>
    ipcRenderer.invoke(IPC_CHANNELS.pathGetDefaultOutputFolder),
  showItemInFolder: (targetPath: string): void => {
    ipcRenderer.send(IPC_CHANNELS.shellShowItemInFolder, targetPath)
  },
  /** Opens a known, allowlisted destination in the OS default browser (never in-app navigation). */
  openExternalLink: (key: ExternalLinkKey): void => {
    ipcRenderer.send(IPC_CHANNELS.shellOpenExternalLink, key)
  },

  /** Resolves the absolute filesystem path for a File the renderer received via drag-and-drop. */
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  /** Pure string transform (no I/O) so a local path can be used as a <video>/<img> src. */
  pathToFileUrl: (path: string): string => pathToFileURL(path).href
}

export type CompApi = typeof compApi

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('comp', compApi)
  } catch (error) {
    console.error(error)
  }
} else {
  // contextIsolation is always enabled in this app; this branch only exists to satisfy the
  // conventional preload pattern and is not exercised. No unsafe fallback is provided.
  throw new Error('comp requires contextIsolation to be enabled')
}
