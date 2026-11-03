import { store, setError } from './store';
import { t } from './i18n';

/* Todas las llamadas pasan por aquí: barra de progreso + banner de error global. */
async function call(fn, opts) {
  const banner = !opts || opts.banner !== false;
  store.busy++;
  try {
    return await fn();
  } catch (err) {
    // Electron antepon «Error invoking remote method 'svn:xx': Error:» — lo quitamos
    if (err && typeof err.message === 'string') {
      err.message = err.message.replace(/^Error invoking remote method '[^']+':\s*(?:Error:\s*)?/, '');
    }
    if (banner && (!err || !err.noBanner)) setError(err);
    throw err;
  } finally {
    store.busy--;
  }
}

function bridge() {
  if (!window.api) {
    store.noElectron = true;
    const err = new Error(t('app.noElectron'));
    err.noBanner = true; // el aviso ya se muestra en la pantalla de conexión
    throw err;
  }
  return window.api;
}

/* ---------- Configuración ---------- */

export const getSettings = () => call(() => bridge().getSettings());
export const saveSettings = (patch) => call(() => bridge().saveSettings(patch));
export const testConnection = (config) => {
  // Los errores del "probar conexión" se muestran en el propio formulario,
  // pero también dejamos rastro en el banner.
  return call(() => bridge().testConnection(config));
};

/* ---------- Repositorio ---------- */

export const getInfo = (path, rev) => call(() => bridge().info(path, rev));
export const listDir = (path, rev) => call(() => bridge().ls(path, rev));
export const getCat = (path, rev) => call(() => bridge().cat(path, rev));
export const getLog = (opts) => call(() => bridge().log(opts));
export const getBlame = (path, rev) => call(() => bridge().blame(path, rev));
export const getDiff = (opts) => call(() => bridge().diff(opts));
/* Lista los repositorios de una URL (explorador de proyectos) */
export const exploreServer = (url) => call(() => bridge().explore(url));

/*
 * Credenciales del diálogo de autenticación: el proceso principal ejecuta
 * `svn ls --non-interactive --username … --password … <url>` para que svn las
 * cacheje. No se guardan en settings.json, así que el error se muestra en el
 * propio modal (sin banner global).
 */
export const authCredentials = (username, password) =>
  call(() => bridge().auth(username, password), { banner: false });

/* Resuelve el número real de HEAD para mostrarlo en la interfaz. */
export async function refreshHead() {
  if (!store.settings || !store.settings.repoUrl) {
    store.headRevision = null;
    return null;
  }
  try {
    const info = await getInfo('', 'HEAD');
    store.headRevision = info.revision;
    return info;
  } catch {
    return null; // el error ya queda registrado en el banner
  }
}

export const copyText = (text) => {
  if (window.api && window.api.copyText) window.api.copyText(text);
};
