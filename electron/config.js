'use strict';
/*
 * Configuración persistente de la app (estilo tomcat-launcher: settings.json en userData).
 * La leen/escriben los procesos de Electron; el renderer pasa por IPC.
 */
const fs = require('fs');
const path = require('path');
const { appError } = require('./i18n');

const DEFAULTS = {
  repoUrl: '',            // URL base del repositorio SVN (http, svn, svn+ssh, file...)
  username: '',           // opcional: el CLI usa las credenciales cacheadas si no se indican
  password: '',           // opcional (se guarda en claro; mejor cachear con `svn ls <url>`)
  trustCert: false,       // confiar en certificados autofirmados (SSL)
  theme: 'catppuccin-mocha',
  lang: 'system',         // 'system' | 'es' | 'en'
  recent: [],             // proyectos recientes (URLs, más reciente primero, máx. 10)
};

const MAX_RECENT = 10;

function settingsFile(userDataDir) {
  return path.join(userDataDir, 'settings.json');
}

function readRaw(userDataDir) {
  try {
    const data = JSON.parse(fs.readFileSync(settingsFile(userDataDir), 'utf8'));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {}; // primera ejecución o fichero corrupto
  }
}

/* Overrides por variables de entorno (útiles para pruebas/automatización). */
function withEnv(cfg) {
  if (process.env.SVN_REPO_URL) {
    cfg.repoUrl = process.env.SVN_REPO_URL;
    // La URL activa por variable de entorno también aparece en recientes
    const url = cfg.repoUrl.trim();
    cfg.recent = [url, ...(Array.isArray(cfg.recent) ? cfg.recent : [])]
      .filter((u, i, a) => u && a.indexOf(u) === i)
      .slice(0, MAX_RECENT);
  }
  if (process.env.SVN_USER) cfg.username = process.env.SVN_USER;
  if (process.env.SVN_PASS) cfg.password = process.env.SVN_PASS;
  if (process.env.SVN_TRUST_CERT) cfg.trustCert = process.env.SVN_TRUST_CERT === '1';
  if (process.env.SVN_THEME) cfg.theme = process.env.SVN_THEME;
  if (process.env.SVN_LANG) cfg.lang = process.env.SVN_LANG;
  return cfg;
}

function loadConfig(userDataDir) {
  return withEnv({ ...DEFAULTS, ...readRaw(userDataDir) });
}

function saveConfig(userDataDir, patch) {
  const merged = {
    ...DEFAULTS,
    ...readRaw(userDataDir),
    ...(patch && typeof patch === 'object' ? patch : {}),
  };
  // Proyectos recientes: la URL activa pasa al principio de la lista
  const url = typeof merged.repoUrl === 'string' ? merged.repoUrl.trim() : '';
  if (url) {
    const base = Array.isArray(merged.recent) ? merged.recent : [];
    const rest = base.filter((u) => typeof u === 'string' && u.trim() && u !== url);
    merged.recent = [url, ...rest].slice(0, MAX_RECENT);
  } else if (!Array.isArray(merged.recent)) {
    merged.recent = [];
  }
  try {
    fs.mkdirSync(userDataDir, { recursive: true });
    fs.writeFileSync(settingsFile(userDataDir), JSON.stringify(merged, null, 2), 'utf8');
  } catch (err) {
    throw appError('err.saveSettings', { reason: err.message });
  }
  return loadConfig(userDataDir);
}

module.exports = { DEFAULTS, loadConfig, saveConfig };
