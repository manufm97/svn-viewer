<script setup>
import { ref, watch } from 'vue';
import { store, setError } from '../store';
import { refreshHead } from '../api';
import { t } from '../i18n';

const draft = ref(store.rev);

watch(
  () => store.rev,
  (v) => {
    draft.value = v;
  }
);

function commit() {
  let v = String(draft.value || '').trim();
  if (/^r\d+$/i.test(v)) v = v.slice(1);
  if (v === '') {
    draft.value = store.rev;
    return;
  }
  if (/^\d+$/.test(v)) {
    store.rev = v;
    return;
  }
  if (v.toUpperCase() === 'HEAD') {
    store.rev = 'HEAD';
    refreshHead();
    return;
  }
  setError(t('rev.invalid'));
  draft.value = store.rev;
}

async function refresh() {
  if (store.rev === 'HEAD') await refreshHead();
  store.reloadTick++;
}
</script>

<template>
  <div class="revsel" :title="t('rev.hint')">
    <span class="material-icons sm">tag</span>
    <span class="revsel-label">rev</span>
    <input
      v-model="draft"
      class="revsel-input"
      spellcheck="false"
      autocomplete="off"
      :aria-label="t('rev.hint')"
      @keydown.enter="commit"
      @blur="commit"
    />
    <span v-if="store.rev === 'HEAD' && store.headRevision" class="revsel-head">r{{ store.headRevision }}</span>
    <button class="icon-btn revsel-btn" :title="t('rev.refresh')" :aria-label="t('rev.refresh')" @click="refresh">
      <span class="material-icons sm">refresh</span>
    </button>
  </div>
</template>
