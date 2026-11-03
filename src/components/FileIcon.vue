<script setup>
import { computed } from 'vue';
import { fileKind } from '../utils';

const props = defineProps({
  name: { type: String, default: '' },
  dir: { type: Boolean, default: false },
});

const ICONS = {
  folder: 'folder',
  code: 'code',
  style: 'palette',
  doc: 'description',
  image: 'image',
  archive: 'archive',
  config: 'settings',
  file: 'insert_drive_file',
};

const kind = computed(() => (props.dir ? 'folder' : fileKind(props.name)));
const icon = computed(() => ICONS[kind.value] || ICONS.file);
</script>

<template>
  <span class="ficon" :class="`k-${kind}`" aria-hidden="true">
    <span class="material-icons sm">{{ icon }}</span>
  </span>
</template>
