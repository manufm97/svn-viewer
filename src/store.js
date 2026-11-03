import { reactive } from 'vue';

/* Estado global de la app (sin dependencias externas: un único store reactivo). */
export const store = reactive({
  ready: false,            // settings cargados
  settings: null,          // { repoUrl, username, password, trustCert, theme, recent }
  rev: 'HEAD',             // revisión activa: 'HEAD' o número
  reloadTick: 0,           // forzar recarga de las vistas (botón actualizar)
  repoTick: 0,             // cambió el repositorio (la revisión deja de valer)
  headRevision: null,      // número real de HEAD (si se pudo resolver)
  busy: 0,                 // peticiones SVN en curso (barra de progreso)
  error: null,             // último error global (banner)
  noElectron: false,       // abierto sin el puente window.api
  showSettings: false,     // modal de ajustes
  showOpen: false,         // modal «Abrir proyecto» (recientes + explorador)
  showCreds: false,        // modal de credenciales (sólo si svn pide autenticación)
});

export function setError(err) {
  if (err == null) {
    store.error = null;
    return;
  }
  store.error = typeof err === 'string' ? err : (err && err.message) || 'Error desconocido';
}
