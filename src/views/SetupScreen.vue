<script setup>
import { computed } from 'vue';
import { store } from '../store';
import { saveSettings } from '../api';
import { t } from '../i18n';
import RepoForm from '../components/RepoForm.vue';

/* Proyectos usados anteriormente: un clic para volver a ellos */
const recents = computed(() => (store.settings && store.settings.recent) || []);

async function pick(url) {
  try {
    store.settings = await saveSettings({ repoUrl: url });
  } catch {
    /* el error queda en el banner global */
  }
}
</script>

<template>
  <div class="setup">
    <div class="setup-main">
      <div class="setup-card">
        <div class="setup-brand">
          <span class="material-icons setup-icon">account_tree</span>
          <div>
            <h1>SVN Viewer</h1>
            <p>{{ t('app.tagline') }}</p>
          </div>
        </div>

        <div v-if="store.noElectron" class="notice err">
          <span class="material-icons">error_outline</span>
          {{ t('setup.noElectron') }}
        </div>

        <div v-if="recents.length" class="setup-recents">
          <h3 class="section-title">
            <span class="material-icons sm">history</span> {{ t('open.recent') }}
          </h3>
          <div class="proj-list">
            <button
              v-for="u in recents"
              :key="u"
              type="button"
              class="proj-item"
              :title="t('open.use')"
              @click="pick(u)"
            >
              <span class="material-icons sm">folder</span>
              <span class="proj-url">{{ u }}</span>
              <span class="material-icons sm proj-arrow">chevron_right</span>
            </button>
          </div>
        </div>

        <RepoForm />
      </div>

      <div class="setup-help">
        <h3><span class="material-icons sm">help_outline</span> {{ t('setup.requirements') }}</h3>
        <ul>
          <li>
            <strong>{{ t('setup.req1Title') }}</strong>: {{ t('setup.req1Body') }}
            <code>svn --version</code>
          </li>
          <li>
            <strong>{{ t('setup.req2Title') }}</strong>: {{ t('setup.req2Body') }}
            <code>svn ls &lt;url&gt;</code>
          </li>
          <li>
            <strong>{{ t('setup.req3Title') }}</strong>: {{ t('setup.req3Body') }}
            <code>https://</code> <code>http://</code> <code>svn://</code> <code>svn+ssh://</code> <code>file:///</code>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
