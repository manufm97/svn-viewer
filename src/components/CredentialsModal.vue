<script setup>
import { onMounted, ref } from 'vue';
import { store, setError } from '../store';
import { authCredentials, refreshHead } from '../api';
import { t } from '../i18n';

/*
 * Diálogo que sólo aparece cuando svn falla por autenticación
 * (err.authFailed / err.redirectLoop). Al enviar, el proceso principal ejecuta
 *   svn ls --non-interactive --username … --password … <url>
 * para que el cliente SVN cacheje las credenciales: la app no las guarda.
 */
const emit = defineEmits(['close']);

const userEl = ref(null);
const username = ref('');
const password = ref('');
const error = ref('');
const busy = ref(false);

async function submit() {
  const u = username.value.trim();
  const p = password.value;
  if (!u || !p) {
    error.value = t('creds.needed');
    return;
  }
  busy.value = true;
  error.value = '';
  try {
    await authCredentials(u, p);
    setError(null);          // el motivo de abrir el modal queda resuelto
    emit('close');
    store.reloadTick++;      // reintenta la vista que falló
    refreshHead();
  } catch (err) {
    error.value = (err && err.message) || t('creds.needed');
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  if (userEl.value) userEl.value.focus();
});
</script>

<template>
  <div class="modal-backdrop" @mousedown.self="emit('close')">
    <div class="modal modal-narrow" role="dialog" aria-modal="true" :aria-label="t('creds.title')">
      <div class="modal-head">
        <span class="material-icons">lock</span>
        <span class="modal-title">{{ t('creds.title') }}</span>
        <button class="icon-btn" :title="t('common.close')" :aria-label="t('common.close')" @click="emit('close')">
          <span class="material-icons">close</span>
        </button>
      </div>

      <form class="creds-form" @submit.prevent="submit">
        <div class="modal-body">
          <p class="hint">{{ t('creds.hint') }}</p>

          <div class="field">
            <label for="credUser">{{ t('form.username') }}</label>
            <input
              id="credUser"
              ref="userEl"
              v-model="username"
              type="text"
              autocomplete="username"
              :placeholder="t('form.credPlaceholder')"
            />
          </div>

          <div class="field">
            <label for="credPass">{{ t('form.password') }}</label>
            <input
              id="credPass"
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="t('form.credPlaceholder')"
            />
          </div>

          <p v-if="error" class="form-status err" role="alert">{{ error }}</p>
        </div>

        <div class="modal-foot">
          <button type="button" class="btn" :disabled="busy" @click="emit('close')">{{ t('common.cancel') }}</button>
          <button type="submit" class="btn btn-primary" :disabled="busy">
            <span v-if="busy" class="spinner sm"></span>
            <span v-else class="material-icons sm">login</span>
            {{ t('creds.submit') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
