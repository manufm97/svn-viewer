'use strict';
/* Puente expuesto al renderer como `window.api` (misma convención que tomcat-launcher). */
const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Configuración
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (patch) => ipcRenderer.invoke('settings:set', patch),
  testConnection: (config) => ipcRenderer.invoke('svn:test', config || null),

  // Repositorio SVN
  info: (path, rev) => ipcRenderer.invoke('svn:info', { path, rev }),
  ls: (path, rev) => ipcRenderer.invoke('svn:ls', { path, rev }),
  cat: (path, rev) => ipcRenderer.invoke('svn:cat', { path, rev }),
  log: (opts) => ipcRenderer.invoke('svn:log', opts || {}),
  blame: (path, rev) => ipcRenderer.invoke('svn:blame', { path, rev }),
  diff: (opts) => ipcRenderer.invoke('svn:diff', opts || {}),
  explore: (url) => ipcRenderer.invoke('svn:explore', { url }),
  auth: (username, password) => ipcRenderer.invoke('svn:auth', { username, password }),

  // Ventana (frameless)
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowToggleMaximize: () => ipcRenderer.send('window-toggle-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  onWindowMaximized: (cb) => ipcRenderer.on('window-maximized', (_e, state) => cb(state)),
  /* El proceso principal avisa cuando svn pide credenciales (err.authFailed) */
  onAuthRequired: (cb) => ipcRenderer.on('auth-required', () => cb()),

  // Portapapeles (el renderer no expone clipboard con sandbox)
  copyText: (text) => clipboard.writeText(String(text ?? '')),
});
