<script setup>
import { computed, onMounted, ref } from 'vue';
import { store } from '../store';
import { saveSettings } from '../api';
import { applyTheme, THEMES, DEFAULT_THEME } from '../themes';
import { t } from '../i18n';

const maximized = ref(false);

const repoLabel = computed(() => {
  const url = (store.settings && store.settings.repoUrl) || '';
  if (!url) return '';
  return url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/\/+$/, '');
});

const themeId = computed(() => (store.settings && store.settings.theme) || DEFAULT_THEME);

onMounted(() => {
  if (window.api && window.api.onWindowMaximized) {
    window.api.onWindowMaximized((v) => {
      maximized.value = !!v;
    });
  }
});

function onDblClick(e) {
  if (e.target.closest('button, select, label, a, input')) return;
  if (window.api) window.api.windowToggleMaximize();
}

async function onThemeChange(e) {
  const id = e.target.value;
  applyTheme(id);
  try {
    store.settings = await saveSettings({ theme: id });
  } catch {
    /* el error ya se muestra en el banner */
  }
}

function win(action) {
  if (window.api) window.api[action]();
}
</script>

<template>
  <header class="topnav drag-region" @dblclick="onDblClick">
    <span v-if="store.busy > 0" class="progress" aria-hidden="true"></span>

    <div class="brand">
      <span class="material-icons brand-icon">account_tree</span>
      <span class="brand-name">SVN Viewer</span>
    </div>

    <button
      v-if="repoLabel"
      class="nav-chip"
      :title="t('open.title')"
      :aria-label="t('open.title')"
      @click="store.showOpen = true"
    >
      <span class="material-icons sm">link</span>
      <span class="nav-chip-text">{{ repoLabel }}</span>
      <span class="material-icons sm">expand_more</span>
    </button>

    <span class="spacer"></span>

    <label class="theme-select" :title="t('nav.theme')">
      <span class="material-icons sm">palette</span>
      <select :value="themeId" :aria-label="t('nav.theme')" @change="onThemeChange">
        <option v-for="th in THEMES" :key="th.id" :value="th.id">{{ th.name }}</option>
      </select>
    </label>

    <button class="icon-btn" :title="t('settings.title')" :aria-label="t('settings.title')" @click="store.showSettings = true">
      <span class="material-icons">settings</span>
    </button>

    <div class="win-controls">
      <button class="win-btn" :title="t('nav.minimize')" :aria-label="t('nav.minimize')" @click="win('windowMinimize')">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"><path d="M0 5.5h11" /></svg>
      </button>
      <button
        class="win-btn"
        :title="maximized ? t('nav.restore') : t('nav.maximize')"
        :aria-label="maximized ? t('nav.restore') : t('nav.maximize')"
        @click="win('windowToggleMaximize')"
      >
        <svg v-if="!maximized" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M0.5 0.5h9v9h-9z" /></svg>
        <svg v-else width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor"><path d="M2.5 2.5v-2h7v7h-2M0.5 2.5h7v7h-7z" /></svg>
      </button>
      <button class="win-btn win-close" :title="t('common.close')" :aria-label="t('common.close')" @click="win('windowClose')">
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor"><path d="M0.35 0.35l10.3 10.3M10.65 0.35L0.35 10.65" /></svg>
      </button>
    </div>
  </header>
</template>
