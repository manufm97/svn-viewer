<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { store, setError } from './store';
import { getSettings, refreshHead } from './api';
import { applyTheme, DEFAULT_THEME } from './themes';
import { setLangSetting, t } from './i18n';

import TopNav from './components/TopNav.vue';
import ProjectHeader from './components/ProjectHeader.vue';
import FileTree from './components/FileTree.vue';
import SettingsModal from './components/SettingsModal.vue';
import SetupScreen from './views/SetupScreen.vue';
import OpenProjectModal from './components/OpenProjectModal.vue';
import CredentialsModal from './components/CredentialsModal.vue';

const route = useRoute();
const router = useRouter();
const mainEl = ref(null);

const configured = computed(() => !!(store.settings && store.settings.repoUrl));
const showSidebar = computed(() => ['/tree', '/blob', '/blame'].includes(route.path));
const sidebarPath = computed(() => String(route.query.path || ''));

onMounted(async () => {
  // svn pide credenciales (err.authFailed): se abre el diálogo, sin guardar nada
  if (window.api && window.api.onAuthRequired) {
    window.api.onAuthRequired(() => {
      store.showCreds = true;
    });
  }
  try {
    store.settings = await getSettings();
  } catch {
    /* sin Electron u error de lectura: lo recoge la pantalla de conexión */
  }
  applyTheme((store.settings && store.settings.theme) || DEFAULT_THEME);
  setLangSetting(store.settings && store.settings.lang);
  // Esperamos a resolver HEAD para que las vistas arranquen con rangos útiles;
  // un fallo aquí NO debe dejar la app parada en «Cargando…».
  try {
    if (configured.value) await refreshHead();
  } finally {
    store.ready = true;
  }
});

/*
 * Al cambiar de repositorio la revisión activa deja de ser válida (puede que
 * no exista en el nuevo proyecto): volvemos a HEAD y recargamos todo.
 */
watch(
  () => (store.settings ? store.settings.repoUrl : ''),
  (url, prev) => {
    if (!store.ready || !url || url === prev) return;
    store.rev = 'HEAD';
    store.headRevision = null;
    store.repoTick++;
    store.reloadTick++;
    setError(null);
    refreshHead();
  }
);

/* ?open=projects abre el selector de proyectos (profundizable y testeable) */
watch(
  () => route.query.open,
  (v) => {
    store.showOpen = v === 'projects';
  },
  { immediate: true }
);

watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    if (mainEl.value) mainEl.value.scrollTop = 0;
  }
);

function onTreeNavigate(p) {
  router.push({ path: '/blob', query: { path: p } });
}
</script>

<template>
  <div class="app">
    <TopNav />

    <div v-if="store.error" class="error-banner" role="alert">
      <span class="material-icons sm">error_outline</span>
      <span class="error-text">{{ store.error }}</span>
      <button class="icon-btn" :title="t('app.dismiss')" :aria-label="t('app.dismiss')" @click="setError(null)">
        <span class="material-icons sm">close</span>
      </button>
    </div>

    <div v-if="!store.ready" class="boot">
      <span class="spinner"></span>
      {{ t('common.loading') }}
    </div>

    <SetupScreen v-else-if="!configured" class="scroll-area" />

    <template v-else>
      <ProjectHeader />
      <div class="repo-body">
        <FileTree
          v-if="showSidebar"
          :current-path="sidebarPath"
          @navigate="onTreeNavigate"
        />
        <main ref="mainEl" class="main">
          <router-view :key="route.fullPath" />
        </main>
      </div>
    </template>

    <SettingsModal v-if="store.showSettings" @close="store.showSettings = false" />
    <OpenProjectModal v-if="store.showOpen" @close="store.showOpen = false" />
    <CredentialsModal v-if="store.showCreds" @close="store.showCreds = false" />
  </div>
</template>
