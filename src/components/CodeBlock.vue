<script setup>
import { computed } from 'vue';
import { highlightCode } from '../highlight-lib';

/*
 * Bloque de código con números de línea: el gutter (columna de números) y el
 * código se pintan en paralelo con el mismo line-height y sin ajuste de línea,
 * de modo que ambas columnas quedan alineadas.
 */
const props = defineProps({
  code: { type: String, default: '' },
  language: { type: String, default: null }, // lenguaje highlight.js o null
  highlight: { type: Boolean, default: true },
  lineNumbers: { type: Boolean, default: true },
});

const lines = computed(() => {
  const arr = String(props.code).split('\n');
  if (arr.length && arr[arr.length - 1] === '') arr.pop();
  return arr;
});

const html = computed(() => {
  const big = String(props.code).length > 1_000_000 || lines.value.length > 30_000;
  if (!props.highlight || big) {
    return String(props.code)
      .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  return highlightCode(props.code, props.language);
});
</script>

<template>
  <div class="code-block" :class="{ 'no-gutter': !lineNumbers }">
    <div class="code-scroll">
      <div v-if="lineNumbers" class="code-gutter" aria-hidden="true">
        <div v-for="n in lines.length" :key="n" class="gutter-line">{{ n }}</div>
      </div>
      <pre class="code-lines"><code class="hljs" v-html="html"></code></pre>
    </div>
  </div>
</template>
