'use strict';
/*
 * Smoke test: crea (si hace falta) un repositorio SVN de prueba local,
 * lanza Electron contra él, captura una captura de pantalla y sale.
 *
 *   pnpm smoke                       -> captura de la vista de árbol
 *   node scripts/smoke.js --route "/blob?path=src/app.js"
 *   node scripts/smoke.js --lang en --theme gitlab-dark
 *   node scripts/smoke.js --out captura.png
 *
 * Requiere `svn` y `svnadmin` en el PATH (misma requisito que la app).
 */
const { spawn, execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.join(__dirname, '..');
const FIXTURE = path.join(ROOT, '.smoke');
const REPO = path.join(FIXTURE, 'repo');
const WC = path.join(FIXTURE, 'wc');
const SHOT = path.join(FIXTURE, 'shot.png');

/* ---------- CLI ---------- */

function parseArgs(argv) {
  const args = { route: '/tree', lang: 'system', theme: 'catppuccin-mocha', out: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--route') args.route = argv[++i];
    else if (a === '--lang') args.lang = argv[++i];
    else if (a === '--theme') args.theme = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--url') args.url = argv[++i];
  }
  return args;
}

/* ---------- Repositorio de prueba ---------- */

function svn(args, cwd) {
  return execFileSync('svn', args, {
    cwd: cwd || ROOT,
    encoding: 'utf8',
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const FILES = {
  'README.md': `# Proyecto de prueba\n\nRepositorio generado por \`scripts/smoke.js\` para validar SVN Viewer.\n\n- Vistas: árbol, visor, historial, blame y diff.\n- Tema por defecto: Catppuccin Mocha.\n`,
  'src/app.js': `// Punto de entrada de la aplicación de ejemplo
import { createStore } from './store.js';

const DEFAULT_STATE = { count: 0, name: 'smoke' };

export function createApp(initial = {}) {
  const state = { ...DEFAULT_STATE, ...initial };
  const store = createStore(state);

  return {
    store,
    increment() {
      store.set('count', store.get('count') + 1);
    },
    greet(times = 3) {
      for (let i = 0; i < times; i++) {
        console.log(\`Hola desde \${state.name} (\${i + 1})\`);
      }
    },
  };
}
`,
  'src/store.js': `// Almacén mínimo de estado
export function createStore(initial) {
  let state = { ...initial };
  return {
    get(key) {
      return state[key];
    },
    set(key, value) {
      state = { ...state, [key]: value };
    },
    all() {
      return { ...state };
    },
  };
}
`,
  'docs/guide.md': `# Guía\n\n## Instalación\n\n    pnpm install\n    pnpm dev\n\n## Revisiones\n\nEl visor permite comparar cualquier par de revisiones.\n`,
};

function ensureRepo() {
  const url = pathToFileURL(REPO).href;
  if (fs.existsSync(path.join(REPO, 'db', 'current'))) {
    if (!fs.existsSync(path.join(WC, 'README.md'))) svn(['checkout', url, WC]);
    return url;
  }

  fs.mkdirSync(FIXTURE, { recursive: true });
  console.log('[smoke] Creando repositorio de prueba en ' + REPO);
  execFileSync('svnadmin', ['create', REPO], { windowsHide: true });
  svn(['checkout', url, WC]);

  // Commit 1: contenido inicial
  for (const [rel, content] of Object.entries(FILES)) {
    const abs = path.join(WC, rel);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, content, 'utf8');
  }
  svn(['add', '--force', WC]);
  svn(['commit', '--username', 'tester', '-m', 'Importación inicial del proyecto'], WC);

  // Commit 2: modificación (para tener historial y diff)
  const app = path.join(WC, 'src', 'app.js');
  fs.writeFileSync(
    app,
    FILES['src/app.js'].replace("const DEFAULT_STATE = { count: 0, name: 'smoke' };", "const DEFAULT_STATE = { count: 0, name: 'smoke-test' };"),
    'utf8'
  );
  fs.writeFileSync(path.join(WC, 'src', 'utils.js'), `// Utilidades\nexport const noop = () => {};\n`, 'utf8');
  svn(['add', path.join(WC, 'src', 'utils.js')]);
  svn(['commit', '--username', 'tester', '-m', 'Renombra el estado por defecto y añade utils'], WC);

  // Commit 3: documentación
  fs.appendFileSync(path.join(WC, 'docs', 'guide.md'), '\nNotas adicionales de la revisión 3.\n', 'utf8');
  svn(['commit', '--username', 'tester', '-m', 'Amplía la guía con notas'], WC);

  return url;
}

/* ---------- Lanzamiento ---------- */

function run(args, url) {
  const electronExe = require('electron');
  return new Promise((resolve, reject) => {
    const child = spawn(electronExe, ['.'], {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        SMOKE_SHOT: SHOT,
        SMOKE_ROUTE: args.route,
        SVN_REPO_URL: url,
        SVN_LANG: args.lang,
        SVN_THEME: args.theme,
      },
    });
    child.on('error', reject);
    child.on('exit', (code) => resolve(code));
  });
}

(async () => {
  const args = parseArgs(process.argv.slice(2));
  try {
    const url = args.url || ensureRepo();
    if (fs.existsSync(SHOT)) fs.unlinkSync(SHOT);
    const code = await run(args, url);
    if (!fs.existsSync(SHOT)) {
      console.error('[smoke] No se generó la captura (electron salió con código ' + code + ').');
      process.exit(1);
    }
    if (args.out) {
      fs.copyFileSync(SHOT, path.resolve(args.out));
      console.log('[smoke] Captura copiada a ' + path.resolve(args.out));
    }
    console.log('[smoke] OK -> ' + SHOT);
  } catch (err) {
    console.error('[smoke] ' + (err.stderr ? String(err.stderr).trim() || err.message : err.message));
    process.exit(1);
  }
})();
