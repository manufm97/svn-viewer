<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import { getCat, getBlame } from '../api';
import { basename, formatDate, langFor } from '../utils';
import { t } from '../i18n';
import { highlightLine, escapeHtml } from '../highlight-lib';
import Breadcrumbs from '../components/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();

const path = computed(() => String(route.query.path || ''));

const lines = ref([]); // { text, revision, author, date, html }
const loading = ref(false);
const error = ref('');
const binary = ref(false);

/* Autor con más líneas: resaltado tenue en el gutter. */
const topAuthor = computed(() => {
  const counts = new Map();
  for (const l of lines.value) {
    const a = l.author || '?';
    counts.set(a, (counts.get(a) || 0) + 1);
  }
  let best = null;
  let bestN = 0;
  for (const [a, n] of counts) {
    if (n > bestN) {
      best = a;
      bestN = n;
    }
  }
  return bestN > 0 && counts.size > 1 ? best : null;
});

async function load() {
  loading.value = true;
  error.value = '';
  binary.value = false;
  try {
    const [file, meta] = await Promise.all([
      getCat(path.value, store.rev),
      getBlame(path.value, store.rev),
    ]);
    if (file.binary) {
      binary.value = true;
      lines.value = [];
      return;
    }
    const lang = langFor(path.value);
    const content = String(file.content || '');
    const texts = content.split('\n');
    if (texts.length && texts[texts.length - 1] === '') texts.pop();

    // Ficheros grandes: sin resaltado por línea (bloquea el hilo principal)
    const useHl = !!lang && texts.length <= 3000;

    lines.value = texts.map((text, i) => {
      const m = meta[i] || null;
      return {
        text,
        revision: m ? m.revision : null,
        author: m ? m.author : '',
        date: m ? m.date : '',
        html: useHl ? highlightLine(text, lang) : escapeHtml(text),
      };
    });
  } catch (err) {
    error.value = err.message;
    lines.value = [];
  } finally {
    loading.value = false;
  }
}

watch([path, () => store.rev, () => store.reloadTick], load, { immediate: true });

function goFile() {
  router.push({ path: '/blob', query: { path: path.value } });
}

function goDiff(r) {
  if (!r) return;
  router.push({ path: '/diff', query: { file: path.value, r1: String(Math.max(1, r - 1)), r2: String(r) } });
}
</script>

<template>
  <div class="view">
    <div class="crumb-row">
      <Breadcrumbs :path="path" icon="person" />
      <div class="crumb-actions">
        <button class="btn btn-sm" :title="t('blame.viewFile')" @click="goFile">
          <span class="material-icons sm">description</span>
          <span class="btn-label">{{ t('blame.viewFile') }}</span>
        </button>
        <span class="badge" :title="t('blame.badgeTitle')">{{ t('blame.badge', { n: lines.length }) }}</span>
      </div>
    </div>

    <div v-if="loading" class="state">
      <span class="spinner"></span>
      {{ t('blame.loading') }}
    </div>

    <div v-else-if="error" class="state err">
      <span class="material-icons state-icon">error_outline</span>
      <p>{{ error }}</p>
      <button class="btn btn-sm" @click="load">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="binary" class="state empty">
      <span class="material-icons state-icon">binary</span>
      <p>{{ t('blame.binary') }}</p>
    </div>

    <div v-else-if="!lines.length" class="state empty">
      <span class="material-icons state-icon">notes</span>
      <p>{{ t('blame.empty') }}</p>
    </div>

    <div v-else class="panel blame-panel">
      <div class="blame-legend muted">
        <span class="file-name">{{ basename(path) }}</span>
        · {{ t('blame.legend') }}
      </div>
      <div class="blame-scroll">
        <div class="blame-row" v-for="(l, i) in lines" :key="i">
          <div class="blame-gutter">
            <button
              v-if="l.revision"
              class="blame-rev"
              :class="{ top: l.author === topAuthor }"
              :title="`${l.author} · ${formatDate(l.date)}`"
              @click="goDiff(l.revision)"
            >
              r{{ l.revision }}
            </button>
            <span v-else class="blame-rev none">—</span>
            <span class="blame-author" :title="`${l.author} · ${formatDate(l.date)}`">{{ l.author || '?' }}</span>
          </div>
          <div class="blame-num" aria-hidden="true">{{ i + 1 }}</div>
          <pre class="blame-code"><code class="hljs" v-html="l.html || ' '"></code></pre>
        </div>
      </div>
    </div>
  </div>
</template>
