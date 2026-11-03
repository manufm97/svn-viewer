<script setup>
import { reactive, ref } from 'vue';
import { store } from '../store';
import { saveSettings, testConnection } from '../api';
import { t } from '../i18n';

const emit = defineEmits(['saved']);

const form = reactive({
  repoUrl: (store.settings && store.settings.repoUrl) || '',
  trustCert: !!(store.settings && store.settings.trustCert),
});

const status = reactive({ kind: '', text: '' });
const testing = ref(false);
const saving = ref(false);

async function test() {
  if (!form.repoUrl.trim()) {
    status.kind = 'err';
    status.text = t('form.needUrl');
    return;
  }
  testing.value = true;
  status.kind = '';
  status.text = '';
  try {
    const info = await testConnection({ ...form });
    status.kind = 'ok';
    status.text = t('form.connected', { rev: info.revision }) +
      (info.commit ? t('form.connectedLast', { rev: info.commit.revision, author: info.commit.author }) : '');
  } catch (err) {
    status.kind = 'err';
    status.text = err.message;
  } finally {
    testing.value = false;
  }
}

async function save() {
  if (!form.repoUrl.trim()) {
    status.kind = 'err';
    status.text = t('form.needUrl');
    return;
  }
  saving.value = true;
  status.kind = '';
  status.text = '';
  try {
    store.settings = await saveSettings({ ...form });
    status.kind = 'ok';
    status.text = t('form.saved');
    emit('saved');
  } catch (err) {
    status.kind = 'err';
    status.text = err.message;
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <form class="repo-form" @submit.prevent="save">
    <div class="field">
      <label for="repoUrl">{{ t('form.repoUrl') }}</label>
      <input
        id="repoUrl"
        v-model="form.repoUrl"
        type="text"
        spellcheck="false"
        autocomplete="off"
        :placeholder="t('form.repoUrlPlaceholder')"
      />
    </div>

    <label class="check">
      <input v-model="form.trustCert" type="checkbox" />
      <span>{{ t('form.trustCert') }}</span>
    </label>

    <p class="hint">{{ t('form.hint') }}</p>

    <div class="form-actions">
      <button type="button" class="btn" :disabled="testing" @click="test">
        <span class="material-icons sm">{{ testing ? 'hourglass_top' : 'wifi_tethering' }}</span>
        {{ t('form.test') }}
      </button>
      <button type="submit" class="btn btn-primary" :disabled="saving">
        <span class="material-icons sm">save</span>
        {{ t('form.save') }}
      </button>
    </div>

    <p v-if="status.text" class="form-status" :class="status.kind" role="status">{{ status.text }}</p>
  </form>
</template>
