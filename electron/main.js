'use strict';
/*
 * Proceso principal: ventana frameless (patrón tomcat-launcher), IPC hacia el
 * servicio SVN y ciclo de vida de la app.
 */
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const svn = require('./svn');
const { loadConfig, saveConfig } = require('./config');
const { appError, localizeError, resolveLang } = require('./i18n');

const LIGHT_THEMES = new Set(['catppuccin-latte', 'gitlab-light']);
const isDev = !app.isPackaged;

let mainWindow = null;
let cfgCache = null;

function settings() {
  if (!cfgCache) cfgCache = loadConfig(app.getPath('userData'));
  return cfgCache;
}

function repoConfig() {
  const cfg = settings();
  if (!cfg.repoUrl) {
    throw appError('err.noRepo');
  }
  return cfg;
}

function sanitizePath(p) {
  const clean = String(p || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = clean.split('/').filter(Boolean);
  if (parts.some((seg) => seg === '..' || seg === '.' || seg.includes('\0'))) {
    throw appError('err.badPath');
  }
  return parts.join('/');
}

function handle(channel, fn) {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      return await fn(payload || {});
    } catch (err) {
      // Faltan credenciales: el renderer abre el diálogo de usuario/contraseña
      // (el evento viaja antes de localizar, que sólo deja el mensaje).
      if (err && (err.code === 'err.authFailed' || err.code === 'err.redirectLoop')) {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('auth-required');
        }
      }
      // Los errores con código se localizan con el idioma activo (settings.lang)
      const lang = resolveLang(settings().lang, app.getLocale());
      throw localizeError(err, lang);
    }
  });
}

/* ---------- IPC: configuración ---------- */

handle('settings:get', () => settings());
handle('settings:set', (patch) => {
  if (patch && typeof patch.repoUrl === 'string' && patch.repoUrl.trim() !== '') {
    // validateUrl normaliza (añade https:// si el usuario no puso protocolo)
    patch = { ...patch, repoUrl: svn.validateUrl(patch.repoUrl) };
  }
  cfgCache = saveConfig(app.getPath('userData'), patch);
  return cfgCache;
});

/* ---------- IPC: operaciones SVN ---------- */

handle('svn:test', (payload) => {
  const cfg = payload && payload.config ? { ...settings(), ...payload.config } : settings();
  return svn.testConnection(cfg);
});
handle('svn:info', ({ path: p, rev }) => svn.info(repoConfig(), sanitizePath(p), rev));
handle('svn:ls', ({ path: p, rev }) => svn.list(repoConfig(), sanitizePath(p), rev));
handle('svn:cat', ({ path: p, rev }) => svn.cat(repoConfig(), sanitizePath(p), rev));
handle('svn:blame', ({ path: p, rev }) => svn.blame(repoConfig(), sanitizePath(p), rev));
handle('svn:log', (opts) => {
  const num = (v) => (v != null && /^\d+$/.test(String(v)) ? String(v) : null);
  const limit = Math.min(Math.max(parseInt(opts.limit, 10) || 30, 1), 200);
  return svn.log(repoConfig(), {
    path: sanitizePath(opts.path),
    rev: opts.rev || 'HEAD',
    limit,
    order: opts.order === 'asc' ? 'asc' : 'desc',
    upper: num(opts.upper),
    lower: num(opts.lower),
  });
});
/* Explorador de proyectos: lista los repositorios de una URL (sin requerir repo activo) */
handle('svn:explore', ({ url }) => svn.explore(settings(), url));
/* Credenciales del diálogo: `svn ls --non-interactive --username --password <url>`
   (sólo para que svn las cacheje; no se escriben en settings.json) */
handle('svn:auth', ({ username, password }) => svn.auth(repoConfig(), username, password));
handle('svn:diff', (opts) =>
  svn.diff(repoConfig(), {
    path: sanitizePath(opts.path),
    r1: opts.r1 || 'HEAD',
    r2: opts.r2 || 'HEAD',
  })
);

/* ---------- Ventana ---------- */

function wireWindow(win) {
  const sendMax = (v) => {
    if (!win.isDestroyed()) win.webContents.send('window-maximized', v);
  };
  win.on('maximize', () => sendMax(true));
  win.on('unmaximize', () => sendMax(false));

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  if (isDev) {
    win.webContents.on('console-message', (...args) => {
      // Firma moderna: (details); firma clásica: (event, level, message, line, sourceId, frame)
      const d = args[0] && typeof args[0] === 'object' && 'message' in args[0] ? args[0] : null;
      const level = d ? d.level : args[1];
      const message = d ? d.message : args[2];
      const where = d ? `${d.sourceUrl || ''}` : `${args[4] || ''}:${args[3] || ''}`;
      console.log(`[renderer:${level}] ${message} (${where})`);
    });
  }

  // Menú contextual (la app va sin menú nativo por la ventana frameless)
  win.webContents.on('context-menu', (_e, params) => {
    const editable = !!params.isEditable;
    const items = [];
    if (editable) {
      items.push(
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { type: 'separator' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      );
    } else if (params.selectionText) {
      items.push(
        { role: 'copy', label: 'Copiar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
        { type: 'separator' },
        ...(isDev ? [{ role: 'reload', label: 'Recargar' }] : [])
      );
    } else {
      items.push({ role: 'selectAll', label: 'Seleccionar todo' }, ...(isDev ? [{ role: 'reload', label: 'Recargar' }] : []));
    }
    if (items.length) Menu.buildFromTemplate(items).popup({ window: win });
  });
}

async function loadRenderer(win) {
  const dist = path.join(__dirname, '..', 'dist', 'index.html');
  if (app.isPackaged || process.env.SMOKE_SHOT) {
    // SMOKE_ROUTE: ruta inicial tipo "/blob?path=src/app.js" (va tras el '#')
    const opts = process.env.SMOKE_ROUTE ? { hash: process.env.SMOKE_ROUTE } : {};
    await win.loadFile(dist, opts);
    return;
  }
  const devUrl = process.env.ELECTRON_RENDERER_URL || 'http://127.0.0.1:5173';
  for (let attempt = 0; attempt < 40 && !win.isDestroyed(); attempt++) {
    try {
      await win.loadURL(devUrl);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 500)); // esperando a que arranque Vite
    }
  }
  if (!win.isDestroyed()) await win.loadFile(dist).catch(() => {});
}

function wireSmoke(win) {
  win.webContents.on('did-finish-load', () => {
    setTimeout(async () => {
      try {
        if (process.env.SMOKE_DEBUG) {
          const text = await win.webContents.executeJavaScript('document.body.innerText');
          console.log('----- UI TEXT BEGIN -----\n' + text + '\n----- UI TEXT END -----');
          const diag = await win.webContents.executeJavaScript(`(() => {
            const btns = [...document.querySelectorAll('.win-btn')];
            return JSON.stringify({
              styles: btns.map((b) => {
                const cs = getComputedStyle(b);
                return { bg: b.className, color: cs.color, background: cs.backgroundColor };
              }),
              rects: btns.map((b) => {
                const svg = b.querySelector('svg');
                const r = svg.getBoundingClientRect();
                const cs = getComputedStyle(svg);
                return { w: r.width, h: r.height, cssW: cs.width, cssH: cs.height, stroke: cs.strokeWidth };
              }),
              navBg: getComputedStyle(document.querySelector('.topnav')).backgroundColor,
            }, null, 1);
          })()`);
          console.log('----- WIN DIAG -----\n' + diag);
        }
        const image = await win.webContents.capturePage();
        fs.writeFileSync(process.env.SMOKE_SHOT, image.toPNG());
        console.log('[smoke] captura guardada en ' + process.env.SMOKE_SHOT);
      } catch (err) {
        console.error('[smoke] ' + err.message);
      }
      app.quit();
    }, 4500);
  });
}

function createWindow() {
  const cfg = settings();
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: LIGHT_THEMES.has(cfg.theme) ? '#eff1f5' : '#181825',
    title: 'SVN Viewer',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (!mainWindow.isDestroyed()) mainWindow.show();
  });
  wireWindow(mainWindow);
  if (process.env.SMOKE_SHOT) wireSmoke(mainWindow);
  loadRenderer(mainWindow);
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/* ---------- Controles de ventana (frameless) ---------- */

ipcMain.on('window-minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize();
});
ipcMain.on('window-toggle-maximize', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
});

/* ---------- Ciclo de vida ---------- */

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
