/*
 * Construcción de filas de diff a partir de:
 *  - dos textos (jsdiff `diffLines`) → diff de un único fichero
 *  - diff unificado de `svn diff` (ya limitado a cambios + contexto)
 * más utilidades de presentación (colapso, lado a lado, estadísticas).
 */
import { diffLines } from 'diff';

/* ---------- Filas desde dos textos ---------- */

export function rowsFromTexts(oldText, newText) {
  const parts = diffLines(String(oldText ?? ''), String(newText ?? ''));
  const rows = [];
  let l = 0;
  let r = 0;
  for (const part of parts) {
    const lines = String(part.value).split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    if (!part.added && !part.removed) {
      for (const t of lines) {
        l++; r++;
        rows.push({ type: 'ctx', l, r, text: t });
      }
    } else if (part.removed) {
      for (const t of lines) {
        l++;
        rows.push({ type: 'del', l, r: null, text: t });
      }
    } else {
      for (const t of lines) {
        r++;
        rows.push({ type: 'add', l: null, r, text: t });
      }
    }
  }
  return rows;
}

/* ---------- Estadísticas ---------- */

export function statsOf(rows) {
  let add = 0;
  let del = 0;
  for (const row of rows) {
    if (row.type === 'add') add++;
    else if (row.type === 'del') del++;
  }
  return { add, del };
}

/* ---------- Colapso de contexto (3 líneas) ---------- */

export function collapseRows(rows, ctx = 3) {
  if (!rows.some((row) => row.type !== 'ctx')) return rows;
  const keep = new Array(rows.length).fill(false);
  rows.forEach((row, i) => {
    if (row.type !== 'ctx') {
      for (let k = Math.max(0, i - ctx); k <= Math.min(rows.length - 1, i + ctx); k++) keep[k] = true;
    }
  });
  const out = [];
  let skipping = false;
  rows.forEach((row, i) => {
    if (keep[i]) {
      out.push(row);
      skipping = false;
    } else if (!skipping) {
      out.push({ type: 'gap' });
      skipping = true;
    }
  });
  return out;
}

/* ---------- Vista lado a lado ---------- */

export function toSideBySide(rows) {
  const out = [];
  let i = 0;
  while (i < rows.length) {
    const row = rows[i];
    if (row.type === 'ctx' || row.type === 'gap') {
      if (row.type === 'ctx') out.push({ l: row, r: row });
      i++;
      continue;
    }
    const block = [];
    while (i < rows.length && rows[i].type !== 'ctx' && rows[i].type !== 'gap') block.push(rows[i++]);
    const dels = block.filter((x) => x.type === 'del');
    const adds = block.filter((x) => x.type === 'add');
    const n = Math.max(dels.length, adds.length);
    for (let k = 0; k < n; k++) out.push({ l: dels[k] || null, r: adds[k] || null });
  }
  return out;
}

/* ---------- Parser del diff unificado de `svn diff` ---------- */

export function parseUnifiedDiff(text) {
  const files = [];
  let cur = null;
  let hunk = null;
  let inProps = false;
  // Líneas vacías dentro de un hunk: se mantienen pendientes y sólo se vuelven
  // contexto si después llega otra fila de diff (así la línea vacía final del
  // output o las que separan ficheros no generan filas fantasma).
  let pendingEmpty = 0;

  const dropPending = () => {
    pendingEmpty = 0;
  };

  const flushPending = () => {
    for (let i = 0; i < pendingEmpty; i++) {
      hunk.rows.push({ type: 'ctx', l: hunk.oldNum++, r: hunk.newNum++, text: '' });
    }
    pendingEmpty = 0;
  };

  for (const line of String(text || '').split(/\r?\n/)) {
    if (line.startsWith('Index: ')) {
      dropPending();
      cur = { path: line.slice(7).trim(), hunks: [], props: false, binary: false };
      hunk = null;
      inProps = false;
      files.push(cur);
      continue;
    }
    if (!cur || inProps) continue;
    if (/^={10,}$/.test(line)) {
      dropPending();
      continue;
    }
    if (/file marked as binary|cannot display/i.test(line)) {
      dropPending();
      cur.binary = true;
      hunk = null;
      continue;
    }
    if (line.startsWith('Property changes on:')) {
      dropPending();
      inProps = true;
      cur.props = true;
      hunk = null;
      continue;
    }
    if (!hunk && (line.startsWith('svn:') || line === '' || line.startsWith('_'))) continue;

    const hm = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hm) {
      dropPending();
      hunk = { oldNum: Number(hm[1]), newNum: Number(hm[3]), rows: [] };
      cur.hunks.push(hunk);
      continue;
    }
    if (hunk) {
      if (line.startsWith('\\')) continue; // "\ No newline at end of file"
      if (line === '') {
        pendingEmpty++;
        continue;
      }
      flushPending(); // había líneas vacías y ahora sí viene contenido real
      const tag = line[0];
      const body = line.slice(1);
      if (tag === ' ') {
        hunk.rows.push({ type: 'ctx', l: hunk.oldNum++, r: hunk.newNum++, text: body });
      } else if (tag === '-') {
        hunk.rows.push({ type: 'del', l: hunk.oldNum++, r: null, text: body });
      } else if (tag === '+') {
        hunk.rows.push({ type: 'add', l: null, r: hunk.newNum++, text: body });
      } else {
        hunk.rows.push({ type: 'ctx', l: hunk.oldNum++, r: hunk.newNum++, text: line });
      }
    }
  }
  return files;
}

/* Filas de un fichero del diff unificado (hunks unidos con separadores). */
export function rowsFromParsedFile(file) {
  const rows = [];
  file.hunks.forEach((hunk, i) => {
    if (i > 0) rows.push({ type: 'gap' });
    rows.push(...hunk.rows);
  });
  return rows;
}
