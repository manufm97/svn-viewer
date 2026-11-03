<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import { getLog } from '../api';
import { avatarColor, formatDate, formatAge, initials } from '../utils';
import { t } from '../i18n';
import Breadcrumbs from '../components/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();

const LIMIT = 30;

const path = computed(() => String(route.query.path || ''));
const isFile = computed(() => String(route.query.kind || '') === 'file');

/* 'desc' = más recientes primero (por defecto); 'asc' = más antiguos primero.
   El orden lo aplica SVN en el servidor: cambiarlo vuelve a consultar. */
const order = ref(route.query.order === 'asc' ? 'asc' : 'desc');

const entries = ref([]); // en el orden en que los trajo svn
const loading = ref(false);
const loadingMore = ref(false);
const error = ref('');
const exhausted = ref(false);
const nextCursor = ref(null); // desc: siguiente tope superior · asc: siguiente revisión inferior

function toggleOrder() {
  order.value = order.value === 'desc' ? 'asc' : 'desc';
  // Reconsulta a SVN con el otro sentido de rango (no reordena lo ya cargado)
  load(true);
}

async function load(reset) {
  if (reset) {
    loading.value = true;
    error.value = '';
    exhausted.value = false;
    entries.value = [];
    nextCursor.value = null;
  }
  try {
    const opts = { path: path.value, rev: store.rev, limit: LIMIT, order: order.value };
    if (!reset) {
      if (order.value === 'asc') opts.lower = nextCursor.value;
      else opts.upper = nextCursor.value;
    }
    const batch = await getLog(opts);
    entries.value = reset ? batch.slice() : entries.value.concat(batch);
    if (batch.length < LIMIT) {
      exhausted.value = true;
    } else if (order.value === 'asc') {
      // Ascendente: el más alto del lote marca por dónde sigue «Cargar más»
      const maxRev = Math.max(...batch.map((e) => e.revision));
      nextCursor.value = String(maxRev + 1);
      const top = /^\d+$/.test(store.rev) ? Number(store.rev) : store.headRevision;
      if (top != null && maxRev >= top) exhausted.value = true;
    } else {
      // Descendente: el lote viene reciente → antiguo, el más bajo es el último
      const minRev = Math.min(...batch.map((e) => e.revision));
      nextCursor.value = String(minRev - 1);
      if (minRev <= 1) exhausted.value = true;
    }
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
}

watch(
  [path, () => store.rev, () => store.reloadTick],
  () => {
    load(true);
  },
  { immediate: true }
);

function loadMore() {
  loadingMore.value = true;
  load(false);
}

function openDiff(entry) {
  const query = { r1: String(Math.max(1, entry.revision - 1)), r2: String(entry.revision) };
  if (isFile.value) query.file = path.value;
  else query.path = path.value;
  router.push({ path: '/diff', query });
}
</script>

<template>
  <div class="view">
    <div class="crumb-row">
      <Breadcrumbs v-if="path" :path="path" />
      <div v-else class="crumb-root-title">
        <span class="material-icons">history</span> {{ t('log.title') }}
      </div>
      <div class="crumb-actions">
        <button
          class="btn btn-sm"
          :title="t('log.invert')"
          :aria-label="t('log.invert')"
          @click="toggleOrder"
        >
          <span class="material-icons sm">swap_vert</span>
          <span class="btn-label">{{ order === 'desc' ? t('log.orderNewest') : t('log.orderOldest') }}</span>
        </button>
        <span
          class="badge"
          :title="isFile ? t('log.badgeFileTitle') : path ? t('log.badgeDirTitle') : t('log.title')"
        >
          {{ isFile ? t('log.badgeFile') : path ? t('log.badgeDir') : t('log.badgeRepo') }}
        </span>
      </div>
    </div>

    <div v-if="loading" class="state">
      <span class="spinner"></span>
      {{ t('log.loading') }}
    </div>

    <div v-else-if="error" class="state err">
      <span class="material-icons state-icon">error_outline</span>
      <p>{{ error }}</p>
      <button class="btn btn-sm" @click="load(true)">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="!entries.length" class="state empty">
      <span class="material-icons state-icon">history</span>
      <p>{{ t('log.empty') }}</p>
    </div>

    <template v-else>
      <div class="commit-list">
        <article v-for="e in entries" :key="e.revision" class="commit-card">
          <span class="avatar" :style="{ background: avatarColor(e.author) }">{{ initials(e.author) }}</span>
          <div class="commit-body">
            <div class="commit-msg">{{ e.msg || t('log.noMsg') }}</div>
            <div class="commit-meta">
              <strong>{{ e.author }}</strong>
              <span :title="formatDate(e.date)">{{ formatAge(e.date) }}</span>
              <span class="commit-date">{{ formatDate(e.date) }}</span>
            </div>
          </div>
          <button
            class="rev-pill rev-btn"
            :title="t('log.revTitle', { rev: e.revision })"
            @click="openDiff(e)"
          >
            r{{ e.revision }}
            <span class="material-icons sm">compare_arrows</span>
          </button>
        </article>
      </div>

      <div v-if="!exhausted" class="load-more">
        <button class="btn" :disabled="loadingMore" @click="loadMore">
          <span v-if="loadingMore" class="spinner sm"></span>
          <span v-else class="material-icons sm">expand_more</span>
          {{ t('log.loadMore') }}
        </button>
      </div>
      <div v-else class="load-end muted">{{ t('log.noMore') }}</div>
    </template>
  </div>
</template>
