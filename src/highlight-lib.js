/*
 * Highlight.js «core» con sólo los lenguajes que usamos (reduce el bundle)
 * y helpers para obtener HTML ya escapado.
 */
import hljs from 'highlight.js/lib/core';

import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import go from 'highlight.js/lib/languages/go';
import rust from 'highlight.js/lib/languages/rust';
import ruby from 'highlight.js/lib/languages/ruby';
import php from 'highlight.js/lib/languages/php';
import bash from 'highlight.js/lib/languages/bash';
import powershell from 'highlight.js/lib/languages/powershell';
import json from 'highlight.js/lib/languages/json';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import ini from 'highlight.js/lib/languages/ini';
import markdown from 'highlight.js/lib/languages/markdown';
import sql from 'highlight.js/lib/languages/sql';
import css from 'highlight.js/lib/languages/css';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import makefile from 'highlight.js/lib/languages/makefile';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('typescript', typescript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('java', java);
hljs.registerLanguage('c', c);
hljs.registerLanguage('cpp', cpp);
hljs.registerLanguage('csharp', csharp);
hljs.registerLanguage('go', go);
hljs.registerLanguage('rust', rust);
hljs.registerLanguage('ruby', ruby);
hljs.registerLanguage('php', php);
hljs.registerLanguage('bash', bash);
hljs.registerLanguage('powershell', powershell);
hljs.registerLanguage('json', json);
hljs.registerLanguage('xml', xml);
hljs.registerLanguage('yaml', yaml);
hljs.registerLanguage('ini', ini);
hljs.registerLanguage('markdown', markdown);
hljs.registerLanguage('sql', sql);
hljs.registerLanguage('css', css);
hljs.registerLanguage('dockerfile', dockerfile);
hljs.registerLanguage('makefile', makefile);

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

/* Resalta un texto completo (fichero entero). */
export function highlightCode(code, lang) {
  const text = String(code ?? '');
  if (!lang || text.length > 1_500_000) return escapeHtml(text);
  try {
    const def = hljs.getLanguage(lang);
    if (!def) return escapeHtml(text);
    return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(text);
  }
}

/* Resaltado por línea (diff/blame). Multi-línea imperfecto, pero suficiente. */
export function highlightLine(line, lang) {
  const text = String(line ?? '');
  if (!lang) return escapeHtml(text);
  try {
    const def = hljs.getLanguage(lang);
    if (!def) return escapeHtml(text);
    return hljs.highlight(text, { language: lang, ignoreIllegals: true }).value;
  } catch {
    return escapeHtml(text);
  }
}
