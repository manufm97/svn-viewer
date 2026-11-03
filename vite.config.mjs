import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// base: './' es imprescindible para cargar el build desde file:// dentro de Electron.
export default defineConfig({
  base: './',
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
