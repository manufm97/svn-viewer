<script setup>
import { computed, onMounted, ref } from 'vue';
import { store } from '../store';
import { saveSettings, exploreServer } from '../api';
import { t } from '../i18n';

const emit = defineEmits(['close']);

const searchEl = ref(null);
const query = ref('');
const serverUrl = ref(originOf((store.settings && store.settings.repoUrl) || ''));
const results = ref(null); // null = aún no se ha explorado
const exploring = ref(false);
const exploreError = ref('');

const recents = computed(() => {
  const list = (store.settings && store.settings.recent) || [];
  const q = query.value.trim().toLowerCase();
  return q ? list.filter((u) => u.toLowerCase().includes(q)) : list;
});

const filteredResults = computed(() => {
  if (!results.value) return [];
  const q = query.value.trim().toLowerCase();
  return q ? results.value.filter((e) => e.name.toLowerCase().includes(q)) : results.value;
});

const currentUrl = computed(() =>
  String((store.settings && store.settings.repoUrl) || '').replace(/\/+$/, '')
);

function isCurrent(url) {
  return String(url).replace(/\/+$/, '') === currentUrl.value;
}

/*
 * Raíz «servidor» de la URL activa, precargada en el explorador:
 * - https://svn.example.com/repo/proj → https://svn.example.com/
 * - file:///C:/repos/proj            → file:///C:/repos/  (carpeta padre)
 */
function originOf(url) {
  const m = /^([a-z][a-z0-9+.-]*):\/\/([^/]*)(\/.*)?$/i.exec(String(url || '').trim());
  if (!m) return '';
  const scheme = m[1];
  const host = m[2];
  const rest = m[3] || '';
  if (host) return `${scheme}://${host}/`;
  const clean = rest.replace(/\/+$/, '');
  const idx = clean.lastIndexOf('/');
  if (idx > 0) return `file://${clean.slice(0, idx + 1)}`;
  return clean ? `file://${clean}/` : 'file:///';
}

function joinUrl(base, name) {
  const b = String(base || '').trim();
  return (b.endsWith('/') ? b : `${b}/`) + encodeURIComponent(name);
}

async function explore() {
  const url = serverUrl.value.trim();
  if (!url || exploring.value) return;
  exploring.value = true;
  exploreError.value = '';
  try {
    results.value = await exploreServer(url);
  } catch (err) {
    results.value = null;
    exploreError.value = err.message;
  } finally {
    exploring.value = false;
  }
}

async function useRepo(url) {
  try {
    store.settings = await saveSettings({ repoUrl: url });
    emit('close');
  } catch {
    /* el banner global ya muestra el error */
  }
}

onMounted(() => {
  if (searchEl.value) searchEl.value.focus();
});
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="t('open.title')">
      <div class="modal-head">
        <span class="material-icons">folder_open</span>
        <span class="modal-title">{{ t('open.title') }}</span>
        <button class="icon-btn" :title="t('common.close')" :aria-label="t('common.close')" @click="emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <div class="field open-search">
          <input
            ref="searchEl"
            v-model="query"
            type="search"
            :placeholder="t('open.search')"
            :aria-label="t('open.search')"
          />
        </div>

        <section class="section">
          <h3 class="section-title">
            <span class="material-icons sm">history</span> {{ t('open.recent') }}
          </h3>
          <div v-if="recents.length" class="proj-list">
            <button
              v-for="u in recents"
              :key="u"
              type="button"
              class="proj-item"
              :class="{ current: isCurrent(u) }"
              :title="t('open.use')"
              @click="useRepo(u)"
            >
              <span class="material-icons sm">folder</span>
              <span class="proj-url">{{ u }}</span>
              <span v-if="isCurrent(u)" class="badge">{{ t('open.current') }}</span>
              <span class="material-icons sm proj-arrow">chevron_right</span>
            </button>
          </div>
          <p v-else class="hint">
            {{
              (store.settings && store.settings.recent && store.settings.recent.length)
                ? t('open.noResults')
                : t('open.emptyRecent')
            }}
          </p>
        </section>

        <section class="section">
          <h3 class="section-title">
            <span class="material-icons sm">travel_explore</span> {{ t('open.server') }}
          </h3>
          <p class="hint">{{ t('open.serverHint') }}</p>
          <div class="explore-row">
            <input
              v-model="serverUrl"
              type="text"
              placeholder="https://svn.example.com/"
              :aria-label="t('open.server')"
              @keydown.enter="explore"
            />
            <button
              type="button"
              class="btn btn-primary"
              :disabled="exploring || !serverUrl.trim()"
              @click="explore"
            >
              <span v-if="exploring" class="spinner sm"></span>
              <span v-else class="material-icons sm">search</span>
              {{ t('open.explore') }}
            </button>
          </div>
          <p v-if="exploreError" class="explore-error">{{ exploreError }}</p>

          <div v-if="results" class="proj-list">
            <button type="button" class="proj-item" :title="t('open.use')" @click="useRepo(serverUrl)">
              <span class="material-icons sm">link</span>
              <span class="proj-url">{{ serverUrl }}</span>
              <span v-if="isCurrent(serverUrl)" class="badge">{{ t('open.current') }}</span>
              <span class="material-icons sm proj-arrow">chevron_right</span>
            </button>
            <button
              v-for="e in filteredResults"
              :key="e.name"
              type="button"
              class="proj-item"
              :disabled="e.kind !== 'dir'"
              :title="e.kind === 'dir' ? t('open.use') : e.name"
              @click="useRepo(joinUrl(serverUrl, e.name))"
            >
              <span class="material-icons sm">{{ e.kind === 'dir' ? 'folder' : 'insert_drive_file' }}</span>
              <span class="proj-url">{{ e.name }}</span>
              <span class="material-icons sm proj-arrow">chevron_right</span>
            </button>
            <p v-if="!filteredResults.length" class="hint">{{ t('open.noResults') }}</p>
          </div>
        </section>
      </div>

      <div class="modal-foot">
        <button type="button" class="btn" @click="emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>
