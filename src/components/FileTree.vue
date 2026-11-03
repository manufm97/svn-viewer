<script setup>
import { computed, reactive, watch } from 'vue';
import { store } from '../store';
import { listDir } from '../api';
import { joinPath } from '../utils';
import { t } from '../i18n';
import FileIcon from './FileIcon.vue';

/*
 * Árbol lateral aplanado (sin componentes recursivos): sólo se cargan en
 * memoria las carpetas que el usuario despliega o las necesarias para
 * mostrar la ruta actual.
 */
const props = defineProps({
  currentPath: { type: String, default: '' },
});
const emit = defineEmits(['navigate']);

const tree = reactive({
  expanded: new Set(['']),
  children: new Map(),

  load(path) {
    const existing = tree.children.get(path);
    if (existing && existing.status === 'loading') return Promise.resolve(existing);
    tree.children.set(path, { status: 'loading', entries: [] });
    return listDir(path, store.rev)
      .then((entries) => {
        tree.children.set(path, { status: 'ok', entries });
      })
      .catch((err) => {
        tree.children.set(path, { status: 'error', error: err.message, entries: [] });
      });
  },

  toggle(path) {
    if (tree.expanded.has(path)) {
      tree.expanded.delete(path);
    } else {
      tree.expanded.add(path);
      tree.load(path);
    }
  },

  /* Expande y precarga todos los prefijos de `p` excepto el último segmento. */
  async ensurePath(p) {
    const segs = String(p || '').split('/').filter(Boolean);
    tree.expanded.add('');
    await tree.load('');
    let acc = '';
    for (const seg of segs.slice(0, -1)) {
      acc = acc ? `${acc}/${seg}` : seg;
      tree.expanded.add(acc);
      await tree.load(acc);
    }
  },
});

const visible = computed(() => {
  const out = [];
  const root = tree.children.get('');
  // La raíz falló: nodo de error con reintento (antes se quedaba en «Cargando…»)
  if (root && root.status === 'error') {
    out.push({ type: 'status', path: '', depth: 0, status: 'error', error: root.error });
    return out;
  }
  if (root && root.status === 'ok' && !root.entries.length) {
    out.push({ type: 'status', path: '', depth: 0, status: 'empty' });
    return out;
  }
  const walk = (dirPath, depth) => {
    const rec = tree.children.get(dirPath);
    if (!rec || rec.status !== 'ok') return;
    for (const entry of rec.entries) {
      const path = joinPath(dirPath, entry.name);
      out.push({ type: 'entry', ...entry, path, depth });
      if (entry.kind !== 'dir' || !tree.expanded.has(path)) continue;
      const child = tree.children.get(path);
      if (!child || child.status === 'loading') {
        out.push({ type: 'status', path, depth: depth + 1, status: 'loading' });
      } else if (child.status === 'error') {
        out.push({ type: 'status', path, depth: depth + 1, status: 'error', error: child.error });
      } else if (child.entries.length === 0) {
        out.push({ type: 'status', path, depth: depth + 1, status: 'empty' });
      } else {
        walk(path, depth + 1);
      }
    }
  };
  walk('', 0);
  return out;
});

function onItemClick(item) {
  if (item.type === 'status') {
    if (item.status === 'error') tree.load(item.path);
    return;
  }
  if (item.kind === 'dir') tree.toggle(item.path);
  else emit('navigate', item.path);
}

watch(
  () => props.currentPath,
  (p) => {
    tree.ensurePath(p);
  },
  { immediate: true }
);

/* Vuelve a cargar la raíz y todas las carpetas desplegadas (rev o repo nuevo). */
async function reload() {
  tree.children.clear();
  await Promise.all([...tree.expanded].map((p) => tree.load(p)));
  await tree.ensurePath(props.currentPath);
}

watch(() => store.rev, reload);
watch(() => store.reloadTick, reload);
</script>

<template>
  <aside class="sidebar" :aria-label="t('tree.navLabel')">
    <div class="sb-head">
      <span class="material-icons sm">folder</span>
      {{ t('tree.title') }}
    </div>
    <div class="tree">
      <div v-if="!visible.length" class="tree-msg">{{ t('common.loading') }}</div>
      <div
        v-for="item in visible"
        :key="item.type + ':' + item.path"
        class="tnode"
        :class="{
          active: item.type === 'entry' && item.path === currentPath,
          isdir: item.type === 'entry' && item.kind === 'dir',
          isstatus: item.type === 'status',
        }"
        :style="{ paddingLeft: 8 + item.depth * 16 + 'px' }"
        :title="item.type === 'status' && item.error ? item.error : item.name"
        @click="onItemClick(item)"
      >
        <template v-if="item.type === 'entry'">
          <span
            v-if="item.kind === 'dir'"
            class="material-icons chevron"
            :class="{ open: tree.expanded.has(item.path) }"
            >chevron_right</span
          >
          <span v-else class="chevron placeholder"></span>
          <FileIcon :name="item.name" :dir="item.kind === 'dir'" />
          <span class="tnode-name">{{ item.name }}</span>
        </template>
        <template v-else>
          <span class="material-icons chevron open dim">chevron_right</span>
          <span class="tnode-msg" :class="{ err: item.status === 'error' }">
            <template v-if="item.status === 'loading'">{{ t('common.loading') }}</template>
            <template v-else-if="item.status === 'error'">{{ t('tree.error') }}</template>
            <template v-else>{{ t('tree.empty') }}</template>
          </span>
        </template>
      </div>
    </div>
  </aside>
</template>
