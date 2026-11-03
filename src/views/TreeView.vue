<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import { listDir } from '../api';
import { formatAge, formatBytes } from '../utils';
import { t } from '../i18n';
import Breadcrumbs from '../components/Breadcrumbs.vue';

const route = useRoute();
const router = useRouter();

const path = computed(() => String(route.query.path || ''));
const entries = ref([]);
const loading = ref(false);
const error = ref('');

async function load() {
  loading.value = true;
  error.value = '';
  try {
    entries.value = await listDir(path.value, store.rev);
  } catch (err) {
    entries.value = [];
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

watch([path, () => store.rev, () => store.reloadTick], load, { immediate: true });

function open(entry) {
  const target = path.value ? `${path.value}/${entry.name}` : entry.name;
  router.push({ path: entry.kind === 'dir' ? '/tree' : '/blob', query: { path: target } });
}

function compare() {
  router.push({ path: '/diff', query: { path: path.value } });
}

function history() {
  router.push({ path: '/log', query: { path: path.value } });
}
</script>

<template>
  <div class="view">
    <div class="crumb-row">
      <Breadcrumbs :path="path" />
      <div class="crumb-actions">
        <button class="btn btn-sm" :title="t('tree.historyTitle')" @click="history">
          <span class="material-icons sm">history</span>
          <span class="btn-label">{{ t('common.history') }}</span>
        </button>
        <button class="btn btn-sm" :title="t('common.compare')" @click="compare">
          <span class="material-icons sm">compare_arrows</span>
          <span class="btn-label">{{ t('common.compare') }}</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="state">
      <span class="spinner"></span>
      {{ t('common.loading') }}
    </div>

    <div v-else-if="error" class="state err">
      <span class="material-icons state-icon">error_outline</span>
      <p>{{ error }}</p>
      <button class="btn btn-sm" @click="load">{{ t('common.retry') }}</button>
    </div>

    <div v-else-if="!entries.length" class="state empty">
      <span class="material-icons state-icon">folder_open</span>
      <p>{{ t('tree.emptyDir') }}</p>
    </div>

    <div v-else class="panel">
      <table class="file-table">
        <thead>
          <tr>
            <th class="col-name">{{ t('table.name') }}</th>
            <th class="col-commit">{{ t('table.lastCommit') }}</th>
            <th class="col-time">{{ t('table.time') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="e in entries" :key="e.name" class="file-row" @click="open(e)">
            <td class="col-name">
              <span class="material-icons sm row-icon" :class="e.kind === 'dir' ? 'ic-dir' : 'ic-file'">
                {{ e.kind === 'dir' ? 'folder' : 'insert_drive_file' }}
              </span>
              <span class="file-name">{{ e.name }}</span>
              <span v-if="e.kind === 'file' && e.size != null" class="file-size">{{ formatBytes(e.size) }}</span>
            </td>
            <td class="col-commit">
              <span class="rev-pill" :title="t('rev.pillTitle', { rev: e.revision })">r{{ e.revision }}</span>
              <span class="muted">{{ e.author }}</span>
            </td>
            <td class="col-time muted" :title="e.date">{{ formatAge(e.date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
