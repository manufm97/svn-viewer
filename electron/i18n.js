'use strict';
/*
 * i18n del proceso principal. Los errores se lanzan con código
 * (`appError('err.timeout', {seconds: 60})`) y se localizan en el wrapper
 * `handle()` de main.js, donde ya está disponible la configuración.
 */
const messages = require('../shared/messages.json');

function systemLang(systemLocale) {
  return String(systemLocale || '').toLowerCase().startsWith('es') ? 'es' : 'en';
}

/* setting: 'system' | 'es' | 'en' (del settings.json); systemLocale: app.getLocale(). */
function resolveLang(setting, systemLocale) {
  if (setting === 'es' || setting === 'en') return setting;
  return systemLang(systemLocale);
}

function format(str, params) {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (params[k] != null ? String(params[k]) : m));
}

function translate(key, lang, params) {
  const dict = messages[lang] || messages.en;
  let str = dict[key];
  if (str == null) str = messages.en[key];
  if (str == null) str = key;
  return format(str, params);
}

/* Error con código traducible (el mensaje provisional es la propia clave). */
function appError(code, params) {
  const err = new Error(code);
  err.code = code;
  err.params = params;
  return err;
}

/* Convierte cualquier error a uno con mensaje ya localizado. */
function localizeError(err, lang) {
  if (err && err.code && messages.en[err.code]) {
    return new Error(translate(err.code, lang, err.params));
  }
  return new Error(err && err.message ? err.message : String(err));
}

module.exports = { resolveLang, translate, localizeError, appError };
