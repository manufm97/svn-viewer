/*
 * Arranque en desarrollo: lanza el servidor de Vite y, cuando está listo,
 * Electron apuntando a él. Sin dependencias adicionales.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const PORT = process.env.PORT || '5173';

function resolveViteBin() {
  const candidates = [];
  try {
    const pkg = require.resolve('vite/package.json', { paths: [root] });
    candidates.push(path.join(path.dirname(pkg), 'bin', 'vite.js'));
  } catch {
    /* no encontrado vía exports, probamos la ruta plana */
  }
  candidates.push(path.join(root, 'node_modules', 'vite', 'bin', 'vite.js'));
  return candidates.find((p) => fs.existsSync(p));
}

const viteBin = resolveViteBin();
if (!viteBin) {
  console.error('[dev] Vite not found. Run `pnpm install` first.');
  process.exit(1);
}

console.log(`[dev] Vite → http://127.0.0.1:${PORT}`);
const vite = spawn(process.execPath, [viteBin, '--port', PORT, '--strictPort'], {
  cwd: root,
  stdio: 'inherit',
});

let electronProc = null;
let exiting = false;

function shutdown(code) {
  if (exiting) return;
  exiting = true;
  clearTimeout(startElectron);
  if (electronProc && electronProc.exitCode === null) electronProc.kill();
  if (vite.exitCode === null) vite.kill();
  setTimeout(() => process.exit(code ?? 0), 200);
}

const startElectron = setTimeout(() => {
  let electronPath;
  try {
    electronPath = require('electron');
  } catch {
    console.error('[dev] Electron is not installed. Run `pnpm install`.');
    shutdown(1);
    return;
  }
  electronProc = spawn(electronPath, ['.'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_RENDERER_URL: `http://127.0.0.1:${PORT}` },
  });
  electronProc.on('exit', (code) => shutdown(code ?? 0));
}, 1500);

vite.on('exit', (code) => shutdown(code ?? 0));
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
