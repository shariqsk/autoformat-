// AutoFormat desktop shell. Serves the built web app from a privileged app:// scheme so module
// workers, WebAssembly, fetch and WebGPU behave exactly as they do on the web, and grants the
// microphone. Everything still runs locally; models are cached in the app's own storage.

import { app, BrowserWindow, net, protocol, session, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..', 'dist')
const ORIGIN = 'app://autoformat'

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true } },
])

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 380,
    minHeight: 600,
    title: 'AutoFormat',
    backgroundColor: '#fff1d6',
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true },
  })

  // Links to GitHub, model hosts etc. open in the user's browser, never inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault()
      if (/^https?:/.test(url)) void shell.openExternal(url)
    }
  })

  void win.loadURL(`${ORIGIN}/index.html`)
}

app.whenReady().then(() => {
  protocol.handle('app', (request) => {
    const { pathname } = new URL(request.url)
    const file = path.normalize(path.join(root, decodeURIComponent(pathname)))
    // Never serve anything outside the bundled app.
    if (!file.startsWith(root)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(file).toString())
  })

  // The recorder needs the microphone; nothing else is granted.
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => callback(permission === 'media'))
  session.defaultSession.setPermissionCheckHandler((_wc, permission) => permission === 'media')

  createWindow()
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow())
})

app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit())
