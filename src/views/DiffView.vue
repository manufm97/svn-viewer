<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import { getCat, getDiff, copyText } from '../api';
import { langFor } from '../utils';
import { t } from '../i18n';
import { highlightLine, escapeHtml } from '../highlight-lib';
import {
  rowsFromTexts,
  collapseRows,
  toSideBySide,
  statsOf,
  parseUnifiedDiff,
  rowsFromParsedFile,
} from '../diff-utils';
import Breadcrumbs from '../components/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();

/* ---------- Estado de la vista ---------- */

const singleFile = computed(() => String(route.query.file || ''));
const dirPath = computed(() => String(route.query.path || ''));
const target = computed(() => (singleFile.value ? singleFile.value : dirPath.value));

const r1 = ref('HEAD');
const r2 = ref('HEAD');

const files = ref([]); // [{ path, rows, stats, binary, props }]
const loading = ref(false);
const error = ref('');
const loaded = ref(false);

const sideBySide = ref(String(route.query.view || '') === 'sbs');
const showFull = ref(false); // fichero único: contexto completo en vez de 3 líneas
const tooLarge = ref(false); // diff de fichero único demasiado grande para calcular
const collapsed = reactive(new Set()); // ficheros contraídos por el usuario

/* Límites de rendimiento: con diffs enormes se recorta el pintado/resaltado */
const MAX_RENDER_ROWS = 6000; // filas pintadas por fichero
const MAX_HL_ROWS = 3000;     // por encima, sin resaltado de sintaxis
const MAX_SINGLE_BYTES = 4e6; // fichero único: 4 MB combinados (jsdiff)

const totalStats = computed(() => {
  const t2 = { add: 0, del: 0 };
  for (const f of files.value) {
    t2.add += f.stats.add;
    t2.del += f.stats.del;
  }
  return t2;
});

const changedFiles = computed(() => files.value.filter((f) => f.stats.add || f.stats.del || f.binary).length);

/* ---------- Rangos de revisión ---------- */

function defaultR1() {
  if (/^\d+$/.test(store.rev)) return String(store.rev);
  if (store.headRevision) return String(Math.max(1, store.headRevision - 1));
  return 'HEAD';
}
function defaultR2() {
  if (/^\d+$/.test(store.rev)) return String(store.rev);
  if (store.headRevision) return String(store.headRevision);
  return 'HEAD';
}

function normalizeRev(v) {
  const s = String(v || '').trim().replace(/^r/i, '');
  if (s.toUpperCase() === 'HEAD') return 'HEAD';
  if (/^\d+$/.test(s)) return s;
  return null;
}

let lastRepoTick = store.repoTick;

function applyRevisions(ignoreQuery = false) {
  const q1 = ignoreQuery ? null : normalizeRev(route.query.r1);
  const q2 = ignoreQuery ? null : normalizeRev(route.query.r2);
  r1.value = q1 || defaultR1();
  r2.value = q2 || defaultR2();
}

function swap() {
  const a = r1.value;
  const b = r2.value;
  if (b !== 'HEAD') r1.value = b;
  r2.value = a;
  load();
}

/* ---------- Carga ---------- */

function makeFile(path, rows, extra = {}) {
  return {
    path,
    rows,
    stats: statsOf(rows), // sobre las filas completas: los +/− no se recortan
    binary: false,
    props: false,
    truncated: false,
    noHl: false,
    ...extra,
  };
}

/* Aplica los topes de pintado y resaltado a los ficheros cargados. */
function finalize(list) {
  for (const f of list) {
    if (f.rows.length > MAX_RENDER_ROWS) {
      f.rows = f.rows.slice(0, MAX_RENDER_ROWS);
      f.truncated = true;
    }
    f.noHl = f.rows.length > MAX_HL_ROWS;
  }
  return list;
}

async function loadSingle() {
  const [oldFile, newFile] = await Promise.all([
    getCat(singleFile.value, r1.value),
    getCat(singleFile.value, r2.value),
  ]);
  if (oldFile.binary || newFile.binary) {
    files.value = finalize([makeFile(singleFile.value, [], { binary: true })]);
    return;
  }
  if (oldFile.content.length + newFile.content.length > MAX_SINGLE_BYTES) {
    tooLarge.value = true;
    files.value = [];
    return;
  }
  const rows = rowsFromTexts(oldFile.content, newFile.content);
  const stats = statsOf(rows);
  // Sin diferencias: NO se pinta el fichero completo, sólo el aviso de «sin cambios»
  if (!stats.add && !stats.del) {
    files.value = [];
    return;
  }
  files.value = finalize([makeFile(singleFile.value, showFull.value ? rows : collapseRows(rows, 3))]);
}

async function loadMulti() {
  const text = await getDiff({ path: dirPath.value, r1: r1.value, r2: r2.value });
  const parsed = parseUnifiedDiff(text);
  files.value = finalize(
    parsed.map((f) =>
      makeFile(f.path, rowsFromParsedFile(f), {
        binary: f.binary,
        props: f.props,
        truncated: !!f.truncated,
      })
    )
  );
}

async function load() {
  loading.value = true;
  error.value = '';
  tooLarge.value = false;
  try {
    if (singleFile.value) await loadSingle();
    else await loadMulti();
    loaded.value = true;
  } catch (err) {
    error.value = err.message;
    files.value = [];
  } finally {
    loading.value = false;
  }
}

watch(
  [target, () => store.rev, () => store.reloadTick, () => store.repoTick],
  () => {
    const repoChanged = store.repoTick !== lastRepoTick;
    lastRepoTick = store.repoTick;
    // Al cambiar de proyecto se ignoran r1/r2 de la URL (pueden no existir)
    applyRevisions(repoChanged);
    load();
  },
  { immediate: true }
);

watch([showFull], () => {
  if (singleFile.value && loaded.value) load();
});

/* ---------- Presentación ---------- */

function pairsOf(file) {
  return sideBySide.value ? toSideBySide(file.rows) : file.rows;
}

function cellFor(row, side) {
  if (!sideBySide.value) return row;
  return row ? row[side] : null;
}

function cellClass(cell) {
  if (!cell) return 'empty-cell';
  if (cell.type === 'gap') return 'gap';
  if (cell.type === 'add') return 'add';
  if (cell.type === 'del') return 'del';
  return 'ctx';
}

function cellHtml(cell, file) {
  if (!cell || cell.type === 'gap') return '';
  if (cell.text === '') return ' ';
  if (file.noHl) return escapeHtml(cell.text); // diffs grandes: sin resaltado
  const lang = langFor(file.path);
  return lang ? highlightLine(cell.text, lang) : escapeHtml(cell.text);
}

/* Colapso por archivo (la cabecera queda visible) */
function toggleFile(path) {
  if (collapsed.has(path)) collapsed.delete(path);
  else collapsed.add(path);
}

function isCollapsed(file) {
  return collapsed.has(file.path);
}

function lineNo(cell, side) {
  if (!cell) return '';
  if (side === 'l') return cell.l ?? '';
  if (side === 'r') return cell.r ?? '';
  return cell.l ?? cell.r ?? '';
}

function signOf(cell, side) {
  if (!cell) return ' ';
  if (cell.type === 'add') return side === 'r' ? '+' : ' ';
  if (cell.type === 'del') return side === 'l' ? '−' : ' ';
  return ' ';
}

function copyName(path) {
  copyText(path);
}
</script>

<template>
  <div class="view diff-view">
    <div class="crumb-row">
      <Breadcrumbs :path="singleFile || dirPath" icon="compare_arrows" />
      <div class="crumb-actions">
        <span v-if="totalStats.add || totalStats.del" class="diff-stats">
          <span class="stat-add">+{{ totalStats.add }}</span>
          <span class="stat-del">−{{ totalStats.del }}</span>
          <span class="muted">{{ changedFiles === 1 ? t('diff.fileOne') : t('diff.fileN', { n: changedFiles }) }}</span>
        </span>
      </div>
    </div>

    <!-- Selector de revisiones -->
    <div class="diff-bar panel">
      <div class="rev-pair">
        <label class="rev-field">
          <span class="rev-tag base">{{ t('diff.base') }}</span>
          <input v-model="r1" class="rev-input" spellcheck="false" autocomplete="off" @keydown.enter="load" />
        </label>
        <button class="icon-btn" :title="t('diff.swap')" :aria-label="t('diff.swap')" @click="swap">
          <span class="material-icons sm">swap_horiz</span>
        </button>
        <label class="rev-field">
          <span class="rev-tag head">{{ t('diff.new') }}</span>
          <input v-model="r2" class="rev-input" spellcheck="false" autocomplete="off" @keydown.enter="load" />
        </label>
        <button class="btn btn-sm btn-primary" :disabled="loading" @click="load">
          <span class="material-icons sm">compare_arrows</span>
          {{ t('common.compare') }}
        </button>
      </div>

      <div class="diff-toggles">
        <div class="seg" role="group" :aria-label="t('diff.mode')">
          <button class="seg-btn" :class="{ active: !sideBySide }" :title="t('diff.unifiedHint')" @click="sideBySide = false">
            <span class="material-icons sm">notes</span>
            {{ t('diff.unified') }}
          </button>
          <button class="seg-btn" :class="{ active: sideBySide }" :title="t('diff.sbsHint')" @click="sideBySide = true">
            <span class="material-icons sm">vertical_split</span>
            {{ t('diff.sbs') }}
          </button>
        </div>
        <label v-if="singleFile" class="check compact" :title="t('diff.fullFileHint')">
          <input v-model="showFull" type="checkbox" />
          <span>{{ t('diff.fullFile') }}</span>
        </label>
      </div>
    </div>

    <div v-if="loading" class="state">
      <span class="spinner"></span>
      {{ t('diff.loading') }}
    </div>

    <div v-else-if="error" class="state err">
      <span class="material-icons state-icon">error_outline</span>
      <p>{{ error }}</p>
      <button class="btn btn-sm" @click="load">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="tooLarge" class="state empty">
      <span class="material-icons state-icon">stack_off</span>
      <p>{{ t('diff.tooLarge') }}</p>
    </div>

    <div v-else-if="!files.length" class="state empty">
      <span class="material-icons state-icon">rule</span>
      <p>{{ t('diff.none', { r1, r2 }) }}</p>
    </div>

    <template v-else>
      <article v-for="file in files" :key="file.path" class="diff-file panel">
        <header class="diff-file-head">
          <button
            class="icon-btn diff-collapse"
            :title="isCollapsed(file) ? t('diff.expand') : t('diff.collapse')"
            :aria-label="isCollapsed(file) ? t('diff.expand') : t('diff.collapse')"
            :aria-expanded="String(!isCollapsed(file))"
            @click="toggleFile(file.path)"
          >
            <span class="material-icons sm" :class="{ open: !isCollapsed(file) }">chevron_right</span>
          </button>
          <span class="material-icons sm" :class="file.binary ? 'ic-warn' : 'ic-file'">
            {{ file.binary ? 'binary' : 'insert_drive_file' }}
          </span>
          <button class="diff-file-name" :title="file.path" @click="copyName(file.path)">
            {{ file.path || t('diff.root') }}
          </button>
          <span v-if="file.props" class="badge">{{ t('diff.props') }}</span>
          <span class="spacer"></span>
          <span class="diff-stats">
            <span class="stat-add">+{{ file.stats.add }}</span>
            <span class="stat-del">−{{ file.stats.del }}</span>
          </span>
          <button class="icon-btn" :title="t('diff.copyName')" :aria-label="t('diff.copyName')" @click="copyName(file.path)">
            <span class="material-icons sm">content_copy</span>
          </button>
        </header>

        <template v-if="!isCollapsed(file)">
          <div v-if="file.binary" class="diff-binary muted">
            <span class="material-icons">block</span>
            {{ t('diff.binary') }}
          </div>

          <div v-else-if="!file.rows.length" class="diff-binary muted">
            <span class="material-icons">info</span>
            {{ file.props ? t('diff.propsOnly') : t('diff.noContent') }}
          </div>

          <!-- Unificado -->
          <div v-else-if="!sideBySide" class="diff-body">
            <div v-for="(row, i) in file.rows" :key="`${file.path}-${i}-${row.type}`">
              <div v-if="row.type === 'gap'" class="diff-gap">
                <span class="gap-line"></span>
              </div>
              <div v-else class="diff-row" :class="row.type">
                <span class="dnum">{{ row.l ?? '' }}</span>
                <span class="dnum">{{ row.r ?? '' }}</span>
                <span class="dsign">{{ row.type === 'add' ? '+' : row.type === 'del' ? '−' : ' ' }}</span>
                <pre class="dcode"><code class="hljs" v-html="cellHtml(row, file)"></code></pre>
              </div>
            </div>
          </div>

          <!-- Lado a lado -->
          <div v-else class="diff-body sbs">
            <div v-for="(pair, i) in pairsOf(file)" :key="`${file.path}-sbs-${i}`" class="sbs-row">
              <div class="sbs-side" :class="cellClass(cellFor(pair, 'l'))">
                <span class="dnum">{{ lineNo(cellFor(pair, 'l'), 'l') }}</span>
                <span class="dsign">{{ signOf(cellFor(pair, 'l'), 'l') }}</span>
                <pre class="dcode"><code class="hljs" v-html="cellHtml(cellFor(pair, 'l'), file)"></code></pre>
              </div>
              <div class="sbs-side" :class="cellClass(cellFor(pair, 'r'))">
                <span class="dnum">{{ lineNo(cellFor(pair, 'r'), 'r') }}</span>
                <span class="dsign">{{ signOf(cellFor(pair, 'r'), 'r') }}</span>
                <pre class="dcode"><code class="hljs" v-html="cellHtml(cellFor(pair, 'r'), file)"></code></pre>
              </div>
            </div>
          </div>

          <div v-if="file.truncated" class="diff-truncated muted">
            <span class="material-icons sm">unfold_more</span>
            {{ t('diff.truncated', { n: file.rows.length }) }}
          </div>
        </template>
      </article>
    </template>
  </div>
</template>
