<script setup>
import { computed } from 'vue';
import { t } from '../i18n';

const props = defineProps({
  path: { type: String, default: '' },
  icon: { type: String, default: '' }, // icono Material para el último segmento (p. ej. description)
});

const segments = computed(() => String(props.path || '').split('/').filter(Boolean));
</script>

<template>
  <nav class="breadcrumbs" :aria-label="t('crumb.navLabel')">
    <router-link class="crumb root" :to="{ path: '/tree' }" :title="t('crumb.root')">
      <span class="material-icons">home</span>
    </router-link>
    <template v-for="(seg, i) in segments" :key="i">
      <span class="crumb-sep">/</span>
      <router-link
        v-if="i < segments.length - 1"
        class="crumb"
        :to="{ path: '/tree', query: { path: segments.slice(0, i + 1).join('/') } }"
        >{{ seg }}</router-link
      >
      <span v-else class="crumb current">
        <span v-if="icon" class="material-icons sm">{{ icon }}</span>{{ seg }}
      </span>
    </template>
  </nav>
</template>
