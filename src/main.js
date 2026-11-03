import { createApp } from 'vue';

import App from './App.vue';
import router from './router';
import { applyTheme, DEFAULT_THEME } from './themes';

import '@material-design-icons/font/index.css';
import './styles.css';

// Tema por defecto inmediato (evita destello blanco); App aplicará el guardado.
applyTheme(DEFAULT_THEME);

createApp(App).use(router).mount('#app');
