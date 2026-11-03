<script setup>
import { computed } from 'vue';
import { store } from '../store';
import { saveSettings } from '../api';
import { applyTheme, THEMES, themeSwatches, DEFAULT_THEME } from '../themes';
import { t, setLangSetting, LANG_OPTIONS } from '../i18n';
import RepoForm from './RepoForm.vue';

const emit = defineEmits(['close']);

const currentTheme = computed(() => (store.settings && store.settings.theme) || DEFAULT_THEME);
const currentLang = computed(() => (store.settings && store.settings.lang) || 'system');

async function pick(id) {
  applyTheme(id);
  try {
    store.settings = await saveSettings({ theme: id });
  } catch {
    /* banner */
  }
}

async function pickLang(e) {
  const id = e.target.value;
  setLangSetting(id);
  try {
    store.settings = await saveSettings({ lang: id });
  } catch {
    /* banner */
  }
}

function onSaved() {
  emit('close');
}
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal" role="dialog" aria-modal="true" :aria-label="t('settings.title')">
      <div class="modal-head">
        <span class="material-icons">settings</span>
        <span class="modal-title">{{ t('settings.title') }}</span>
        <button class="icon-btn" :title="t('common.close')" :aria-label="t('common.close')" @click="emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <div class="modal-body">
        <section class="section">
          <h3 class="section-title">{{ t('settings.repo') }}</h3>
          <RepoForm @saved="onSaved" />
        </section>

        <section class="section">
          <h3 class="section-title">{{ t('settings.appearance') }}</h3>
          <div class="theme-grid">
            <button
              v-for="th in THEMES"
              :key="th.id"
              type="button"
              class="theme-card"
              :class="{ selected: currentTheme === th.id }"
              @click="pick(th.id)"
            >
              <span class="swatches">
                <i v-for="c in themeSwatches(th)" :key="c" class="sw" :style="{ background: c }"></i>
              </span>
              <span class="theme-meta">
                <span class="theme-name">{{ th.name }}</span>
                <span class="theme-kind">{{ th.scheme === 'dark' ? t('settings.dark') : t('settings.light') }}</span>
              </span>
              <span v-if="currentTheme === th.id" class="material-icons theme-check">check_circle</span>
            </button>
          </div>
          <p class="hint">{{ t('settings.themeHint') }}</p>
        </section>

        <section class="section">
          <h3 class="section-title">{{ t('settings.language') }}</h3>
          <div class="field">
            <label for="appLang">{{ t('settings.language') }}</label>
            <select id="appLang" class="lang-select" :value="currentLang" @change="pickLang">
              <option v-for="opt in LANG_OPTIONS" :key="opt.id" :value="opt.id">{{ t(opt.labelKey) }}</option>
            </select>
          </div>
          <p class="hint">{{ t('settings.langHint') }}</p>
        </section>
      </div>

      <div class="modal-foot">
        <button type="button" class="btn" @click="emit('close')">{{ t('common.close') }}</button>
      </div>
    </div>
  </div>
</template>
