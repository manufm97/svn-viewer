/*
 * Sistema de temas: fuente única de verdad de los tokens de color.
 * Cada tema expone las MISMAS claves (kebab-case) que se aplican como
 * variables CSS en :root. Por defecto: Catppuccin Mocha.
 */

/* ---------- Utilidades de color ---------- */

function hexToRgb(hex) {
  let h = String(hex).replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function withAlpha(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function darken(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const f = (c) => Math.round(c * (1 - amount));
  return `rgb(${f(r)}, ${f(g)}, ${f(b)})`;
}

/* ---------- Paletas Catppuccin ---------- */

const MOCHA = {
  rosewater: '#f5e0dc', flamingo: '#f2cdcd', pink: '#f5c2e7', mauve: '#cba6f7',
  red: '#f38ba8', maroon: '#eba0ac', peach: '#fab387', yellow: '#f9e2af',
  green: '#a6e3a1', teal: '#94e2d5', sky: '#89dceb', sapphire: '#74c7ec',
  blue: '#89b4fa', lavender: '#b4befe',
  text: '#cdd6f4', subtext1: '#bac2de', subtext0: '#a6adc8',
  overlay2: '#9399b2', overlay1: '#7f849c', overlay0: '#6c7086',
  surface2: '#585b70', surface1: '#45475a', surface0: '#313244',
  base: '#1e1e2e', mantle: '#181825', crust: '#11111b',
};

const MACCHIATO = {
  rosewater: '#f4dbd6', flamingo: '#f2cdcd', pink: '#f5c2e7', mauve: '#c6a0f6',
  red: '#ed8796', maroon: '#ee99a0', peach: '#f5a97f', yellow: '#eed49f',
  green: '#a6da95', teal: '#8bd5ca', sky: '#91d7e3', sapphire: '#7dc4e4',
  blue: '#8aadf4', lavender: '#b7bdf8',
  text: '#cad3f5', subtext1: '#b8c0e0', subtext0: '#a5adcb',
  overlay2: '#939ab7', overlay1: '#8087a2', overlay0: '#6e738d',
  surface2: '#5b6078', surface1: '#494d64', surface0: '#363a4f',
  base: '#24273a', mantle: '#1e2030', crust: '#181926',
};

const FRAPPE = {
  rosewater: '#f2d5cf', flamingo: '#eebebe', pink: '#f4b8e4', mauve: '#ca9ee6',
  red: '#e78284', maroon: '#ea999c', peach: '#ef9f76', yellow: '#e5c890',
  green: '#a6d189', teal: '#81c8be', sky: '#99d1db', sapphire: '#85c1dc',
  blue: '#8caaee', lavender: '#babbf1',
  text: '#c6d0f5', subtext1: '#b5bfe2', subtext0: '#a5adce',
  overlay2: '#949cbb', overlay1: '#838ba7', overlay0: '#737994',
  surface2: '#626880', surface1: '#51576d', surface0: '#414559',
  base: '#303446', mantle: '#292c3c', crust: '#232634',
};

const LATTE = {
  rosewater: '#dc8a78', flamingo: '#dd7878', pink: '#ea76cb', mauve: '#8839ef',
  red: '#d20f39', maroon: '#e64553', peach: '#fe640b', yellow: '#df8e1b',
  green: '#40a02b', teal: '#179299', sky: '#04a5e5', sapphire: '#209fb5',
  blue: '#1e66f5', lavender: '#7287fd',
  text: '#4c4f69', subtext1: '#5c5f77', subtext0: '#6c6f85',
  overlay2: '#7c7f93', overlay1: '#8c8fa1', overlay0: '#9ca0b0',
  surface2: '#acb0be', surface1: '#bcc0cc', surface0: '#ccd0da',
  base: '#eff1f5', mantle: '#e6e9ef', crust: '#dce0e8',
};

/* ---------- Semántica Catppuccin → tokens de la app ---------- */

function catppuccinVars(p, light) {
  return {
    'bg': p.mantle,
    'surface': p.base,
    'surface-alt': p.surface0,
    'surface-hover': withAlpha(p.surface1, light ? 0.5 : 0.4),
    'border': p.surface1,
    'border-strong': p.overlay0,

    'text': p.text,
    'text-muted': p.subtext0,
    'text-faint': p.overlay0,

    'link': p.blue,
    'accent': p.mauve,
    'accent-hover': darken(p.mauve, 0.15),
    'accent-text': light ? '#ffffff' : p.base,
    'tab-active': p.peach,

    'nav-bg': p.crust,
    'nav-text': p.text,
    'nav-hover': withAlpha(p.text, 0.1),

    'shadow': light ? 'rgba(65, 70, 90, 0.18)' : 'rgba(0, 0, 0, 0.45)',
    'overlay': light ? 'rgba(50, 54, 70, 0.35)' : 'rgba(0, 0, 0, 0.55)',

    'sidebar-bg': p.mantle,
    'sidebar-hover': withAlpha(p.surface1, light ? 0.45 : 0.4),
    'sidebar-active': withAlpha(p.mauve, light ? 0.16 : 0.18),
    'sidebar-active-text': light ? darken(p.mauve, 0.25) : p.mauve,

    'badge-bg': p.surface0,
    'badge-text': p.subtext1,

    'error-bg': withAlpha(p.red, light ? 0.12 : 0.15),
    'error-text': light ? darken(p.red, 0.2) : p.red,
    'error-border': withAlpha(p.red, 0.45),
    'success-bg': withAlpha(p.green, light ? 0.14 : 0.15),
    'success-text': light ? darken(p.green, 0.25) : p.green,

    'code-bg': p.base,
    'code-gutter-bg': p.mantle,
    'code-gutter-text': p.overlay0,

    'syn-comment': p.overlay0,
    'syn-keyword': p.mauve,
    'syn-string': p.green,
    'syn-number': p.peach,
    'syn-title': p.blue,
    'syn-attr': p.sky,
    'syn-built-in': p.yellow,
    'syn-tag': p.teal,
    'syn-add': p.green,
    'syn-del': p.red,

    'diff-add-bg': withAlpha(p.green, light ? 0.16 : 0.14),
    'diff-del-bg': withAlpha(p.red, light ? 0.15 : 0.14),
    'diff-add-border': p.green,
    'diff-del-border': p.red,
    'diff-gutter-bg': light ? withAlpha(p.surface1, 0.25) : withAlpha(p.surface0, 0.5),
  };
}

/* El tema por defecto define el conjunto completo de claves; los demás se
   fusionan sobre él para que nunca falte ninguna variable. */
const DEFAULT_VARS = catppuccinVars(MOCHA, false);

function makeTheme(id, name, scheme, vars) {
  return { id, name, scheme, vars: { ...DEFAULT_VARS, ...vars } };
}

/* ---------- Temas estilo GitLab ---------- */

const GITLAB_LIGHT_VARS = {
  'bg': '#eef0f4',
  'surface': '#ffffff',
  'surface-alt': '#f4f5f7',
  'surface-hover': '#f0f1f4',
  'border': '#dbdce2',
  'border-strong': '#b6b8c2',
  'text': '#303030',
  'text-muted': '#666a73',
  'text-faint': '#9699a3',
  'link': '#1f75cb',
  'accent': '#6d49cb',
  'accent-hover': '#5a3ba7',
  'accent-text': '#ffffff',
  'tab-active': '#fc6d26',
  'nav-bg': '#292961',
  'nav-text': '#ffffff',
  'nav-hover': 'rgba(255, 255, 255, 0.1)',
  'shadow': 'rgba(40, 44, 60, 0.16)',
  'overlay': 'rgba(30, 32, 48, 0.45)',
  'sidebar-bg': '#ffffff',
  'sidebar-hover': '#f0f1f4',
  'sidebar-active': 'rgba(109, 73, 203, 0.12)',
  'sidebar-active-text': '#5a3ba7',
  'badge-bg': '#e9eaee',
  'badge-text': '#4b4d57',
  'error-bg': 'rgba(210, 15, 57, 0.1)',
  'error-text': '#c00f39',
  'error-border': 'rgba(210, 15, 57, 0.4)',
  'success-bg': 'rgba(33, 118, 69, 0.1)',
  'success-text': '#1e6e42',
  'code-bg': '#ffffff',
  'code-gutter-bg': '#f7f7f9',
  'code-gutter-text': '#9aa0ab',
  'syn-comment': '#7a8088',
  'syn-keyword': '#cf222e',
  'syn-string': '#0a3069',
  'syn-number': '#0550ae',
  'syn-title': '#8250df',
  'syn-attr': '#0550ae',
  'syn-built-in': '#953800',
  'syn-tag': '#116329',
  'syn-add': '#1a7f37',
  'syn-del': '#cf222e',
  'diff-add-bg': '#e6ffed',
  'diff-del-bg': '#ffeef0',
  'diff-add-border': '#2da44e',
  'diff-del-border': '#cf222e',
  'diff-gutter-bg': '#f6f8fa',
};

const GITLAB_DARK_VARS = {
  'bg': '#1f1f27',
  'surface': '#262637',
  'surface-alt': '#2e2e42',
  'surface-hover': '#2e2e42',
  'border': '#3b3b4f',
  'border-strong': '#55556b',
  'text': '#d0d0dd',
  'text-muted': '#9a9aad',
  'text-faint': '#7a7a8f',
  'link': '#8cb4ff',
  'accent': '#a371f7',
  'accent-hover': '#b48cff',
  'accent-text': '#17122a',
  'tab-active': '#fc6d26',
  'nav-bg': '#292961',
  'nav-text': '#ffffff',
  'nav-hover': 'rgba(255, 255, 255, 0.1)',
  'shadow': 'rgba(0, 0, 0, 0.5)',
  'overlay': 'rgba(0, 0, 0, 0.6)',
  'sidebar-bg': '#1f1f27',
  'sidebar-hover': '#2e2e42',
  'sidebar-active': 'rgba(163, 113, 247, 0.18)',
  'sidebar-active-text': '#a371f7',
  'badge-bg': '#33334a',
  'badge-text': '#c5c5d4',
  'error-bg': 'rgba(248, 81, 73, 0.15)',
  'error-text': '#ff7b72',
  'error-border': 'rgba(248, 81, 73, 0.4)',
  'success-bg': 'rgba(63, 185, 80, 0.15)',
  'success-text': '#3fb950',
  'code-bg': '#262637',
  'code-gutter-bg': '#1f1f27',
  'code-gutter-text': '#7a7a8f',
  'syn-comment': '#8b949e',
  'syn-keyword': '#ff7b72',
  'syn-string': '#a5d6ff',
  'syn-number': '#79c0ff',
  'syn-title': '#d2a8ff',
  'syn-attr': '#79c0ff',
  'syn-built-in': '#ffa657',
  'syn-tag': '#7ee787',
  'syn-add': '#3fb950',
  'syn-del': '#f85149',
  'diff-add-bg': 'rgba(63, 185, 80, 0.14)',
  'diff-del-bg': 'rgba(248, 81, 73, 0.14)',
  'diff-add-border': '#3fb950',
  'diff-del-border': '#f85149',
  'diff-gutter-bg': '#1f1f27',
};

/* ---------- Catálogo ---------- */

export const THEMES = [
  makeTheme('catppuccin-mocha', 'Catppuccin Mocha', 'dark', catppuccinVars(MOCHA, false)),
  makeTheme('catppuccin-macchiato', 'Catppuccin Macchiato', 'dark', catppuccinVars(MACCHIATO, false)),
  makeTheme('catppuccin-frappe', 'Catppuccin Frappé', 'dark', catppuccinVars(FRAPPE, false)),
  makeTheme('catppuccin-latte', 'Catppuccin Latte', 'light', catppuccinVars(LATTE, true)),
  makeTheme('gitlab-light', 'GitLab Clásico', 'light', GITLAB_LIGHT_VARS),
  makeTheme('gitlab-dark', 'GitLab Oscuro', 'dark', GITLAB_DARK_VARS),
];

export const DEFAULT_THEME = 'catppuccin-mocha';

export function themeById(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

/* Aplica el tema escribiendo sus variables sobre :root. */
export function applyTheme(id) {
  const theme = themeById(id);
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  root.dataset.scheme = theme.scheme;
  root.style.colorScheme = theme.scheme;
  for (const [key, value] of Object.entries(theme.vars)) {
    root.style.setProperty(`--${key}`, value);
  }
  return theme;
}

/* Colores de muestra para el selector de temas. */
export function themeSwatches(theme) {
  const v = theme.vars;
  return [v['nav-bg'], v.bg, v.accent, v.link, v['tab-active']];
}
