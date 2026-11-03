'use strict';
/*
 * Servicio SVN: ejecuta el cliente `svn` del sistema (CLI) y parsea su salida.
 * Todas las operaciones usan --non-interactive para no bloquearse sin TTY;
 * las credenciales salen de la caché de svn o de la configuración.
 */
const { execFile } = require('child_process');
const { appError } = require('./i18n');

const MAX_BUFFER = 64 * 1024 * 1024; // 64 MB
const TIMEOUT_MS = 60000;

const URL_RE = /^[a-z][a-z0-9+.-]*:\/\/.+/i;
const REV_RE = /^\d+$/;
/* Parece un host (sin protocolo): svn.xunta.es/repo, localhost:8080/repo */
const HOSTISH_RE = /^[a-z0-9][a-z0-9.-]*(?::\d+)?(?:\/|$)/i;

/*
 * Decodificación de la salida de svn.
 * - `--xml` y el contenido de los ficheros del repo vienen en UTF-8.
 * - Los mensajes del propio CLI en Windows salen en la codepage ANSI del
 *   sistema (p. ej. CP1252 en español): si los bytes no son UTF-8 válido
 *   se decodifican como windows-1252 para que los acentos lleguen bien.
 */
const UTF8_STRICT = new TextDecoder('utf-8', { fatal: true });
const CP1252 = new TextDecoder('windows-1252');

function decodeText(buf) {
  if (!buf || !buf.length) return { text: '', encoding: 'UTF-8' };
  try {
    return { text: UTF8_STRICT.decode(buf), encoding: 'UTF-8' };
  } catch {
    // ¿Sólo unos pocos bytes erróneos? Entonces sigue siendo UTF-8 (con �).
    const lossy = buf.toString('utf8');
    const bad = (lossy.match(/\uFFFD/g) || []).length;
    if (bad / Math.max(lossy.length, 1) <= 0.001) {
      return { text: lossy, encoding: 'UTF-8' };
    }
    return { text: CP1252.decode(buf), encoding: 'Windows-1252' };
  }
}

function bufText(buf) {
  return decodeText(buf).text;
}

function isRev(rev) {
  return REV_RE.test(String(rev || ''));
}

/*
 * Valida y normaliza la URL del repositorio.
 * - Si trae protocolo (https://, svn://, file:///…) se respeta.
 * - Si parece un host sin protocolo se antepone https:// (evita el error
 *   más común: pegar «svn.xunta.es/repo» sin «https://»).
 */
function validateUrl(url) {
  const s = String(url || '').trim();
  if (!s) throw appError('err.badUrl');
  if (URL_RE.test(s)) return s;
  const looksLikeDrive = /^[a-z]:[\\/]/i.test(s); // C:\repo → exige file:///C:/repo
  if (!looksLikeDrive && HOSTISH_RE.test(s)) {
    const withScheme = `https://${s}`;
    if (URL_RE.test(withScheme)) return withScheme;
  }
  throw appError('err.badUrl');
}

/*
 * Traduce los errores habituales del CLI a mensajes accionables.
 * (El texto crudo de svn a veces es engañoso: sin credenciales, este servidor
 * devuelve «Redirect cycle» en vez de un claro «401 Authentication required».)
 */
function friendlySvnError(text) {
  const t = String(text || '');
  if (/E195019|Redirect cycle/i.test(t)) return appError('err.redirectLoop');
  if (/E215004|Authentication failed|No more credentials/i.test(t)) return appError('err.authFailed');
  if (/E160006/i.test(t)) {
    const m = /E160006\D*(\d+)/.exec(t); // "No such revision 2716" / "No hay una revisión 999"
    return appError('err.revNotFound', { rev: m ? m[1] : '?' });
  }
  if (/E170000/i.test(t)) return appError('err.urlNotFound');
  // file:// inexistente: E180001 «Unable to open repository» (va con E170013)
  if (/E180001/i.test(t)) return appError('err.urlNotFound');
  if (/certificate|SSL|handshake|peer did not/i.test(t)) return appError('err.certIssue');
  if (/E170013|Could not resolve host|Connection refused|Connection timed out|E731001/i.test(t)) {
    return appError('err.connFailed');
  }
  return null;
}

/* `svn [subcomando] [globales] [resto]` — los globales tras el subcomando es el uso habitual. */
function runSvn(cfg, args) {
  const global = ['--non-interactive'];
  if (cfg && cfg.username) global.push('--username', String(cfg.username));
  if (cfg && cfg.password) global.push('--password', String(cfg.password));
  if (cfg && cfg.trustCert) global.push('--trust-server-cert');
  const argv = [args[0], ...global, ...args.slice(1)];

  return new Promise((resolve, reject) => {
    execFile(
      'svn',
      argv,
      { maxBuffer: MAX_BUFFER, timeout: TIMEOUT_MS, windowsHide: true, encoding: 'buffer' },
      (err, stdout, stderr) => {
        if (!err) return resolve({ stdout, stderr: bufText(stderr) });
        if (err.killed || err.signal) {
          return reject(appError('err.timeout', { seconds: TIMEOUT_MS / 1000 }));
        }
        if (err.code === 'ENOENT') {
          return reject(appError('err.svnMissing'));
        }
        if (err.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') {
          return reject(appError('err.maxBuffer', { mb: MAX_BUFFER / (1024 * 1024) }));
        }
        const stdErr = bufText(stderr);
        reject(friendlySvnError(stdErr) || new Error(stdErr.trim() || err.message));
      }
    );
  });
}

/* ---------- URLs y peg revisions ---------- */

function encodeRepoPath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .map(encodeURIComponent)
    .join('/');
}

/*
 * URL del objetivo. Si `repoUrl` trae un peg fijado (`…/repo@500`) se separa y
 * se re-aplica AL FINAL: SVN sólo admite `url@rev` tras la última componente,
 * así `repo@500/src/app.js` sería una ruta inexistente (E170013 en vez de
 * un claro E160006).
 */
function targetUrl(cfg, p) {
  let base = String(cfg.repoUrl || '').replace(/\/+$/, '');
  let pinned = '';
  const m = /@(\d+)$/.exec(base);
  if (m) {
    pinned = m[0];
    base = base.slice(0, m.index);
  }
  const enc = encodeRepoPath(p);
  return `${enc ? `${base}/${enc}` : base}${pinned}`;
}

/*
 * Peg revision numérica: permite leer rutas ya borradas en HEAD (`url@N`).
 * - Si `rev` es numérico manda la revisión pedida (quita el peg previo).
 * - Para HEAD/BASE se respeta el peg fijado en la propia URL.
 */
function peg(url, rev) {
  if (isRev(rev)) return `${url.replace(/@\d+$/, '')}@${rev}`;
  return url;
}

/* ---------- Decodificación y parsers XML de svn --xml ---------- */

function decodeEntities(s) {
  if (!s) return '';
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, ent) => {
    if (ent[0] === '#') {
      const code = ent[1] === 'x' || ent[1] === 'X' ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    return Object.prototype.hasOwnProperty.call(named, ent) ? named[ent] : m;
  });
}

function tagText(body, tag) {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(body);
  return m ? decodeEntities(m[1]) : '';
}

function parseList(xml) {
  const out = [];
  const entryRe = /<entry\s+kind="([^"]+)"[^>]*>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const kind = m[1];
    const body = m[2];
    const sizeM = /<size>(\d+)<\/size>/.exec(body);
    const commitM = /<commit\s+revision="(\d+)">([\s\S]*?)<\/commit>/.exec(body);
    out.push({
      kind,
      name: tagText(body, 'name'),
      size: sizeM ? Number(sizeM[1]) : null,
      revision: commitM ? Number(commitM[1]) : null,
      author: commitM ? tagText(commitM[2], 'author') : '',
      date: commitM ? tagText(commitM[2], 'date') : '',
    });
  }
  // Carpetas primero, luego orden alfabético (como en GitLab)
  return out.sort((a, b) =>
    a.kind === b.kind ? a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) : a.kind === 'dir' ? -1 : 1
  );
}

function parseLog(xml) {
  const out = [];
  const re = /<logentry\s+revision="(\d+)">([\s\S]*?)<\/logentry>/g;
  let m;
  while ((m = re.exec(xml))) {
    out.push({
      revision: Number(m[1]),
      author: tagText(m[2], 'author'),
      date: tagText(m[2], 'date'),
      msg: tagText(m[2], 'msg'),
    });
  }
  return out;
}

function parseBlame(xml) {
  const out = [];
  const re = /<entry\s+line-number="(\d+)"[^>]*>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml))) {
    const commitM = /<commit\s+revision="(\d+)">([\s\S]*?)<\/commit>/.exec(m[2]);
    out.push({
      line: Number(m[1]),
      revision: commitM ? Number(commitM[1]) : null,
      author: commitM ? tagText(commitM[2], 'author') : '',
      date: commitM ? tagText(commitM[2], 'date') : '',
    });
  }
  return out;
}

function parseInfo(xml) {
  const entryM = /<entry\s+([^>]*)>([\s\S]*?)<\/entry>/.exec(xml);
  if (!entryM) throw appError('err.badInfo');
  const attrs = entryM[1];
  const body = entryM[2];
  const revM = /revision="(\d+)"/.exec(attrs);
  const commitM = /<commit\s+revision="(\d+)">([\s\S]*?)<\/commit>/.exec(body);
  return {
    revision: revM ? Number(revM[1]) : null,
    kind: (/kind="([^"]+)"/.exec(attrs) || [])[1] || '',
    url: tagText(body, 'url'),
    root: /<root>([\s\S]*?)<\/root>/.exec(body) ? decodeEntities(RegExp.$1) : '',
    commit: commitM
      ? {
          revision: Number(commitM[1]),
          author: tagText(commitM[2], 'author'),
          date: tagText(commitM[2], 'date'),
          msg: tagText(commitM[2], 'msg'),
        }
      : null,
  };
}

/* ---------- Análisis del contenido de `svn cat` ---------- */

function analyzeContent(buf) {
  const probe = buf.subarray(0, 8000);
  let hasNull = false;
  for (const b of probe) {
    if (b === 0) { hasNull = true; break; }
  }
  if (hasNull) return { binary: true, bytes: buf.length, content: '' };

  const { text, encoding } = decodeText(buf);
  return { binary: false, bytes: buf.length, content: text, encoding };
}

/* ---------- Operaciones públicas ---------- */

async function list(cfg, p, rev) {
  const { stdout } = await runSvn(cfg, ['ls', '--xml', peg(targetUrl(cfg, p), rev)]);
  return parseList(bufText(stdout));
}

async function info(cfg, p, rev) {
  const { stdout } = await runSvn(cfg, ['info', '--xml', peg(targetUrl(cfg, p), rev)]);
  return parseInfo(bufText(stdout));
}

async function cat(cfg, p, rev) {
  const { stdout } = await runSvn(cfg, ['cat', peg(targetUrl(cfg, p), rev)]);
  return analyzeContent(stdout);
}

/*
 * Historial paginado, en el orden que se pida:
 * - order 'desc' (por defecto): rango `top:1` con -l => svn devuelve los
 *   `limit` cambios MÁS RECIENTES del rango (reciente → antiguo).
 * - order 'asc': rango `lower:top` con -l => los `limit` MÁS ANTIGUOS a
 *   partir de `lower` (antiguo → reciente), para «Cargar más» hacia arriba.
 * (Con `-r 1:top -l limit` en modo desc svn devolvería los más antiguos y la
 * paginación se rompería a partir de `limit` revisiones.)
 */
async function log(
  cfg,
  { path: p = '', rev = 'HEAD', limit = 30, order = 'desc', upper = null, lower = null } = {}
) {
  const url = targetUrl(cfg, p);
  const base = String(rev || 'HEAD');
  let range;
  let target;
  if (order === 'asc') {
    const from = lower != null && /^\d+$/.test(String(lower)) ? String(lower) : '1';
    // Cursor por encima del tope: no queda nada que cargar
    if (isRev(base) && Number(from) > Number(base)) return [];
    range = `${from}:${base}`;
    target = peg(url, base);
  } else {
    const top = upper != null ? String(upper) : base;
    range = `${top}:1`;
    target = peg(url, top);
  }
  const { stdout } = await runSvn(cfg, ['log', '--xml', '-l', String(limit), '-r', range, target]);
  const entries = parseLog(bufText(stdout));
  entries.sort((a, b) => (order === 'asc' ? a.revision - b.revision : b.revision - a.revision));
  return entries;
}

async function blame(cfg, p, rev) {
  const { stdout } = await runSvn(cfg, ['blame', '--xml', peg(targetUrl(cfg, p), rev)]);
  return parseBlame(bufText(stdout));
}

/* Diff unificado (archivo o directorio completo entre dos revisiones). */
async function diff(cfg, { path: p = '', r1 = 'HEAD', r2 = 'HEAD' } = {}) {
  const url = targetUrl(cfg, p);
  const a = String(r1 || 'HEAD');
  const b = String(r2 || 'HEAD');
  const target = peg(url, b);
  const { stdout } = await runSvn(cfg, ['diff', '-r', `${a}:${b}`, target]);
  return bufText(stdout);
}

/*
 * Lista el contenido de una URL (raíz del servidor o «colección de
 * repositorios») para el explorador de proyectos del renderer.
 */
async function explore(cfg, url) {
  const target = validateUrl(url);
  const { stdout } = await runSvn(cfg, ['ls', '--xml', target]);
  return parseList(bufText(stdout));
}

/* Comprobación de conexión usada por el formulario de ajustes. */
async function testConnection(cfg) {
  const url = validateUrl(cfg && cfg.repoUrl);
  return info({ ...cfg, repoUrl: url }, '', 'HEAD');
}

/*
 * Autenticación puntual (diálogo de credenciales):
 *   svn ls --non-interactive --username <u> --password <p> <url>
 * La app NO guarda nada: si el servidor acepta las credenciales, el propio
 * cliente svn las deja en su caché (%APPDATA%\Subversion\auth) y el resto de
 * la sesión (y las siguientes) funcionan sin usuario ni contraseña.
 */
async function auth(cfg, username, password) {
  const user = String(username || '').trim();
  const pass = String(password == null ? '' : password);
  if (!user || !pass) throw appError('creds.needed');
  const url = targetUrl(cfg, '');
  await runSvn({ ...cfg, username: user, password: pass }, ['ls', url]);
}

module.exports = { list, info, cat, log, blame, diff, testConnection, validateUrl, explore, auth };
