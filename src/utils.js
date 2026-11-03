/* Utilidades varias: rutas, formatos, iconos e idioma para resaltado. */
import { locale, t } from './i18n';

/* Locale concreto (es-ES / en-US) para formatos de fecha y números. */
function intlLocale() {
  return locale.value === 'es' ? 'es-ES' : 'en-US';
}

export function dirname(p) {
  const s = String(p || '');
  const i = s.lastIndexOf('/');
  return i === -1 ? '' : s.slice(0, i);
}

export function basename(p) {
  const s = String(p || '');
  return s.slice(s.lastIndexOf('/') + 1);
}

export function joinPath(dir, name) {
  return dir ? `${dir}/${name}` : name;
}

export function extOf(name) {
  const b = basename(name);
  const i = b.lastIndexOf('.');
  return i > 0 ? b.slice(i + 1).toLowerCase() : '';
}

export function formatBytes(n) {
  if (n == null || !Number.isFinite(n)) return '';
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let v = n;
  let u = -1;
  do {
    v /= 1024;
    u++;
  } while (v >= 1024 && u < units.length - 1);
  return `${v.toLocaleString(intlLocale(), { maximumFractionDigits: 1 })} ${units[u]}`;
}

function parseSvnDate(iso) {
  if (!iso) return null;
  // SVN emite microsegundos (…123456Z); JS Date solo acepta milisegundos.
  const d = new Date(String(iso).replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso) {
  const d = parseSvnDate(iso);
  if (!d) return '';
  return d.toLocaleString(intlLocale(), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* RelativeTimeFormat por locale (con caché: se recrea sólo al cambiar de idioma). */
let rtfCache = { locale: null, fmt: null };
function relativeFmt() {
  const l = intlLocale();
  if (rtfCache.locale !== l) {
    rtfCache = { locale: l, fmt: new Intl.RelativeTimeFormat(l, { numeric: 'auto' }) };
  }
  return rtfCache.fmt;
}

const AGE_UNITS = [
  ['year', 31536000],
  ['month', 2592000],
  ['week', 604800],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
];

export function formatAge(iso) {
  const d = parseSvnDate(iso);
  if (!d) return '';
  const seconds = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(seconds);
  if (abs < 60) return t('time.now');
  const rtf = relativeFmt();
  for (const [unit, size] of AGE_UNITS) {
    if (abs >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return '';
}

/* Avatar: iniciales + color estable por autor (como en GitLab). */
export function initials(name) {
  const raw = String(name || '?').split('@')[0].trim();
  const words = raw.split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function avatarColor(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 55%, 45%)`;
}

/* ---------- Categorías de fichero (iconos) ---------- */

const KIND_BY_EXT = {
  js: 'code', mjs: 'code', cjs: 'code', jsx: 'code', ts: 'code', tsx: 'code', vue: 'code',
  java: 'code', py: 'code', c: 'code', h: 'code', cpp: 'code', hpp: 'code', cc: 'code',
  cs: 'code', go: 'code', rs: 'code', rb: 'code', php: 'code', sh: 'code', ps1: 'code',
  bat: 'code', cmd: 'code', kt: 'code', swift: 'code', scala: 'code', lua: 'code', r: 'code',
  json: 'config', yml: 'config', yaml: 'config', xml: 'config', ini: 'config', cfg: 'config',
  conf: 'config', toml: 'config', properties: 'config', env: 'config', gradle: 'config',
  css: 'style', scss: 'style', less: 'style', html: 'style', htm: 'style',
  md: 'doc', txt: 'doc', rst: 'doc', adoc: 'doc', pdf: 'doc',
  png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', svg: 'image', webp: 'image',
  ico: 'image', bmp: 'image',
  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive', gz: 'archive',
  jar: 'archive', war: 'archive', tgz: 'archive',
};

const SPECIAL = {
  dockerfile: 'config',
  makefile: 'config',
  license: 'doc',
  readme: 'doc',
};

export function fileKind(name) {
  const b = basename(String(name || '')).toLowerCase();
  if (SPECIAL[b]) return SPECIAL[b];
  if (b.startsWith('readme')) return 'doc';
  return KIND_BY_EXT[extOf(b)] || 'file';
}

/* ---------- Lenguaje para highlight.js ---------- */

const LANG_BY_EXT = {
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  ts: 'typescript', tsx: 'typescript', json: 'json',
  py: 'python', java: 'java', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', cc: 'cpp',
  cs: 'csharp', go: 'go', rs: 'rust', rb: 'ruby', php: 'php',
  sh: 'bash', bash: 'bash', zsh: 'bash', bat: 'powershell', cmd: 'powershell', ps1: 'powershell',
  sql: 'sql', xml: 'xml', svg: 'xml', html: 'xml', htm: 'xml', vue: 'xml', plist: 'xml',
  yml: 'yaml', yaml: 'yaml',
  ini: 'ini', cfg: 'ini', conf: 'ini', toml: 'ini', properties: 'ini', env: 'ini',
  md: 'markdown', markdown: 'markdown',
  css: 'css', scss: 'css', less: 'css',
  dockerfile: 'dockerfile', makefile: 'makefile',
};

const LANG_BY_NAME = {
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  'gnumakefile': 'makefile',
};

export function langFor(name) {
  const b = basename(String(name || '')).toLowerCase();
  if (LANG_BY_NAME[b]) return LANG_BY_NAME[b];
  return LANG_BY_EXT[extOf(b)] || null;
}
