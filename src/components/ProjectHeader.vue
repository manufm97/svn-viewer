<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store } from '../store';
import { dirname } from '../utils';
import RevSelector from './RevSelector.vue';
import { t } from '../i18n';

const route = useRoute();
const router = useRouter();

const repoName = computed(() => {
  const url = (store.settings && store.settings.repoUrl) || '';
  const noProto = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const segs = noProto.split('/').filter(Boolean);
  return segs.length ? segs[segs.length - 1] : 'repositorio';
});

const currentDir = computed(() => {
  const p = String(route.query.path || '');
  if (route.path === '/blob' || route.path === '/blame') return dirname(p);
  if (route.path === '/diff') return route.query.file ? dirname(String(route.query.file)) : p;
  return p;
});

const isRepoTab = computed(() => ['/tree', '/blob', '/blame', '/diff'].includes(route.path));
const isLogTab = computed(() => route.path === '/log');

function compare() {
  router.push({ path: '/diff', query: { path: currentDir.value } });
}
</script>

<template>
  <div class="project-header">
    <div class="ph-top">
      <div class="project-title">
        <span class="material-icons proj-icon">deployed_code</span>
        <span class="proj-name"><span class="muted">svn-viewer&nbsp;/&nbsp;</span><strong>{{ repoName }}</strong></span>
        <span class="badge">SVN</span>
      </div>
      <div class="ph-actions">
        <RevSelector />
        <button class="btn btn-sm" :title="t('common.compare')" @click="compare">
          <span class="material-icons sm">compare_arrows</span>
          <span class="btn-label">{{ t('common.compare') }}</span>
        </button>
      </div>
    </div>
    <nav class="tabs">
      <router-link class="tab" :class="{ active: isRepoTab }" :to="{ path: '/tree', query: { path: currentDir } }">
        <span class="material-icons sm">folder</span>
        {{ t('header.tabRepo') }}
      </router-link>
      <router-link class="tab" :class="{ active: isLogTab }" :to="{ path: '/log', query: { path: currentDir } }">
        <span class="material-icons sm">history</span>
        {{ t('header.tabHistory') }}
      </router-link>
    </nav>
  </div>
</template>
