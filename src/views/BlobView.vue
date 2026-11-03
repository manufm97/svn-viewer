<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import { getCat, getInfo, copyText } from '../api';
import { basename, formatBytes, formatDate, langFor } from '../utils';
import { t } from '../i18n';
import Breadcrumbs from '../components/Breadcrumbs.vue';
import CodeBlock from '../components/CodeBlock.vue';

const route = useRoute();
const router = useRouter();

const path = computed(() => String(route.query.path || ''));

const content = ref('');
const binary = ref(false);
const bytes = ref(0);
const encoding = ref('');
const info = ref(null);
const loading = ref(false);
const error = ref('');
const raw = ref(false);
const copied = ref(false);

const language = computed(() => langFor(path.value));

async function load() {
  loading.value = true;
  error.value = '';
  raw.value = false;
  try {
    const [file, meta] = await Promise.all([
      getCat(path.value, store.rev),
      getInfo(path.value, store.rev).catch(() => null),
    ]);
    binary.value = file.binary;
    content.value = file.content || '';
    bytes.value = file.bytes;
    encoding.value = file.encoding || '';
    info.value = meta;
  } catch (err) {
    error.value = err.message;
    content.value = '';
    info.value = null;
  } finally {
    loading.value = false;
  }
}

watch([path, () => store.rev, () => store.reloadTick], load, { immediate: true });

function goBlame() {
  router.push({ path: '/blame', query: { path: path.value } });
}
function goHistory() {
  router.push({ path: '/log', query: { path: path.value, kind: 'file' } });
}
function goCompare() {
  router.push({ path: '/diff', query: { file: path.value } });
}
function toggleRaw() {
  raw.value = !raw.value;
}
function copy() {
  copyText(content.value);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1500);
}
</script>

<template>
  <div class="view">
    <div class="crumb-row">
      <Breadcrumbs :path="path" icon="description" />
      <div class="crumb-actions">
        <button class="btn btn-sm" :title="t('blob.blame')" @click="goBlame">
          <span class="material-icons sm">person</span>
          <span class="btn-label">Blame</span>
        </button>
        <button class="btn btn-sm" :title="t('blob.history')" @click="goHistory">
          <span class="material-icons sm">history</span>
          <span class="btn-label">{{ t('common.history') }}</span>
        </button>
        <button class="btn btn-sm" :title="t('blob.compare')" @click="goCompare">
          <span class="material-icons sm">compare_arrows</span>
          <span class="btn-label">{{ t('common.compare') }}</span>
        </button>
        <button class="btn btn-sm" :class="{ active: raw }" :title="t('blob.rawHint')" @click="toggleRaw">
          <span class="material-icons sm">code</span>
          <span class="btn-label">{{ t('blob.raw') }}</span>
        </button>
        <button class="btn btn-sm" :title="t('blob.copy')" @click="copy">
          <span class="material-icons sm">{{ copied ? 'check' : 'content_copy' }}</span>
          <span class="btn-label">{{ copied ? t('common.copied') : t('common.copy') }}</span>
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

    <template v-else>
      <div class="file-meta panel">
        <div class="file-meta-main">
          <span class="material-icons">description</span>
          <div>
            <div class="file-title">{{ basename(path) }}</div>
            <div class="file-sub muted">
              <span v-if="bytes">{{ formatBytes(bytes) }}</span>
              <span v-if="encoding"> · {{ encoding }}</span>
              <template v-if="info && info.commit">
                · <span class="rev-pill">r{{ info.commit.revision }}</span>
                {{ info.commit.author }} · {{ formatDate(info.commit.date) }}
              </template>
            </div>
            <div v-if="info && info.commit && info.commit.msg" class="file-msg">{{ info.commit.msg }}</div>
          </div>
        </div>
        <span v-if="binary" class="badge badge-warn">{{ t('blob.binaryBadge') }}</span>
      </div>

      <div v-if="binary" class="state empty">
        <span class="material-icons state-icon">binary</span>
        <p>{{ t('blob.binaryBody', { size: formatBytes(bytes) }) }}</p>
      </div>

      <div v-else-if="!content" class="state empty">
        <span class="material-icons state-icon">notes</span>
        <p>{{ t('blob.empty') }}</p>
      </div>

      <pre v-else-if="raw" class="raw-block"><code>{{ content }}</code></pre>

      <CodeBlock v-else :code="content" :language="language" />
    </template>
  </div>
</template>
