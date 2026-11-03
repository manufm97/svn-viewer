/*
 * i18n del renderer: ES/EN, con «system» como valor por defecto (idioma del SO).
 * `t()` lee una computed reactiva, así que los componentes que la usan en el
 * template se repintan solos al cambiar de idioma.
 */
import { computed, ref } from 'vue';
import messages from '../shared/messages.json';

export const LANG_OPTIONS = [
  { id: 'system', labelKey: 'settings.lang.system' },
  { id: 'es', labelKey: 'settings.lang.es' },
  { id: 'en', labelKey: 'settings.lang.en' },
];

const setting = ref('system'); // 'system' | 'es' | 'en'

function systemLang() {
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en';
  return nav.toLowerCase().startsWith('es') ? 'es' : 'en';
}

export const locale = computed(() => (messages[setting.value] ? setting.value : systemLang()));

export function setLangSetting(value) {
  setting.value = value && (value === 'system' || messages[value]) ? value : 'system';
}

export function t(key, params) {
  const dict = messages[locale.value] || messages.en;
  let str = dict[key];
  if (str == null) str = messages.en[key];
  if (str == null) str = key;
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
  }
  return str;
}
