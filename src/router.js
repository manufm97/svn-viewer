import { createRouter, createWebHashHistory } from 'vue-router';

import TreeView from './views/TreeView.vue';
import BlobView from './views/BlobView.vue';
import BlameView from './views/BlameView.vue';
import LogView from './views/LogView.vue';
import DiffView from './views/DiffView.vue';

/*
 * Histórico hash (#/tree?path=...): obligatorio porque el build se carga vía
 * file:// dentro de Electron y no se puede usar pushState con historial normal.
 * La ruta dentro del repo viaja en la query `path` (evita ambigüedad con
 * segmentos codificados); la revisión vive en el store global.
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', redirect: { path: '/tree' } },
    { path: '/tree', component: TreeView },
    { path: '/blob', component: BlobView },
    { path: '/blame', component: BlameView },
    { path: '/log', component: LogView },
    { path: '/diff', component: DiffView },
    { path: '/:pathMatch(.*)*', redirect: { path: '/tree' } },
  ],
});

export default router;
