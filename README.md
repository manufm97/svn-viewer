# SVN Viewer

Aplicación de escritorio (Electron + Vue 3) para explorar repositorios SVN con una
interfaz estilo GitLab. Usa el cliente **`svn` de la línea de comandos** del sistema
como backend: sin servidores intermedios, sin dependencias de WebDAV propias.

---

## Características

- **Navegador de ficheros**: árbol lateral con carga diferida, breadcrumbs y tabla
  con tamaño, último commit y fecha relativa.
- **Visor de código** con resaltado de sintaxis (22 lenguajes), números de línea,
  codificación UTF-8/ISO-8859-1 y detección de binarios.
- **Historial de revisiones** paginado («Cargar más»), a nivel de repositorio,
  carpeta o fichero, de más reciente a más antiguo por defecto. El botón de
  orden **vuelve a consultar a SVN** con el otro sentido de rango (no reordena
  en cliente lo ya cargado).
- **Diff** entre cualquier par de revisiones: unificado con colapso de contexto o
  lado a lado, multi-fichero, con estadísticas (+/−). Cada fichero se puede
  **colapsar** en la vista de revisiones; si dos revisiones no difieren no se
  pinta el fichero completo, sólo el aviso de «sin cambios».
- **Blame/anotaciones**: autor y revisión por línea, con enlace a los cambios.
- **Selector de proyectos**: el chip del proyecto (y `?open=projects`) abre
  «Abrir proyecto» con los **proyectos recientes** y un **explorador del
  servidor** con buscador (lista los repositorios de la raíz con `svn ls`).
- **UTF-8 en toda la aplicación**: la salida del CLI (que en Windows puede
  venir en CP1252) se decodifica con detección automática de codificación.
- **Temas**: Catppuccin Mocha (por defecto), Macchiato, Frappé, Latte, GitLab
  Clásico y GitLab Oscuro.
- **Multiidioma**: español e inglés, con «Sistema» como valor por defecto (detecta
  el idioma de Windows). Ajustable en Ajustes → Idioma.
- Ventana *frameless* con controles propios, barra de progreso durante las
  peticiones y banner global de errores.

## Capturas

**Navegador de ficheros** — tabla con nombre, último commit (revisión y autor) y tiempo relativo:

![Vista de árbol](docs/screenshots/arbol.png)

**Visor de código** — resaltado de sintaxis, números de línea y cabecera con revisión y autor:

![Visor de código](docs/screenshots/visor.png)

**Blame** — autor y revisión por línea:

![Blame](docs/screenshots/blame.png)

**Historial del repositorio** — mensaje, autor, fecha y revisión de cada commit:

![Historial](docs/screenshots/historial.png)

**Diff lado a lado** entre dos revisiones:

![Diff lado a lado](docs/screenshots/diff-lado-a-lado.png)

**Diff unificado** con colapso de contexto:

![Diff unificado](docs/screenshots/diff-unificado.png)

**Tema GitLab Clásico** (idioma inglés):

![Árbol con tema GitLab Clásico](docs/screenshots/arbol-gitlab-light.png)

## Requisitos

| Requisito | Detalle |
|-----------|---------|
| Node.js | ≥ 22.12 (probado con Node 24) |
| pnpm | ≥ 12 (se gestiona con corepack: `corepack enable pnpm`) |
| Cliente SVN | `svn` y `svnadmin` en el PATH — [SlikSVN](https://sliksvn.com/) o TortoiseSVN con «command line client tools» |

Comprueba la instalación con:

```powershell
svn --version
```

## Instalación y uso

```powershell
# 1. Dependencias (baja también el binario de Electron)
pnpm install

# 2. Desarrollo (Vite + Electron con HMR)
pnpm dev

# 3. Build de producción del renderer
pnpm build

# 4. Ejecutar sobre el build
pnpm start

# 5. Empaquetado: carpeta con `SVN Viewer.exe` (icono `app.ico`)
pnpm dist             # release\SVN Viewer-win32-x64\SVN Viewer.exe (portable)
pnpm dist:nsis        # release\SVN Viewer Setup <versión>.exe (instalador NSIS)
pnpm dist:dir         # sólo la carpeta desempaquetada, vía electron-builder
```

`pnpm dist` empaqueta en un directorio temporal **fuera** del proyecto (evita el
EBUSY de CrowdStrike) y copia el resultado con `robocopy /MIR` a `release/`. La
versión sale de `package.json`: actualízala antes de generar una release nueva.
La carpeta `release/` está en `.gitignore`.

### Smoke test (captura automática)

Crea un repositorio SVN de prueba local en `.smoke/`, lanza la aplicación contra
él, captura una imagen y sale:

```powershell
pnpm smoke                                          # vista de árbol
node scripts/smoke.js --route "/blob?path=src/app.js"
node scripts/smoke.js --route "/diff?path=&r1=1&r2=2&view=sbs"
node scripts/smoke.js --lang en --theme gitlab-light --out captura.png
```

Variables que consume el script de smoke: `SMOKE_SHOT`, `SMOKE_ROUTE`,
`SMOKE_DEBUG` (vuelca el texto de la UI a consola), `SVN_REPO_URL`, `SVN_LANG`,
`SVN_THEME`.

Las capturas de `docs/screenshots/` se regeneran con `pnpm build` seguido de
`node scripts/smoke.js` con `--out` apuntando a la carpeta. Los smoke test de
`--route /tree` y `--route "/blob?path=src/app.js"` necesitan el mismo
repositorio de prueba que crea el script.

Las vistas de **Abrir proyecto** y **Explorador** se capturaron a mano: el smoke
no abre esos diálogos.

## Configuración

La configuración se guarda en `settings.json` dentro del directorio `userData`
de la app (`%APPDATA%/svn-viewer/` en Windows):

```json
{
  "repoUrl": "https://svn.example.com/proyecto",
  "username": "",
  "password": "",
  "trustCert": false,
  "theme": "catppuccin-mocha",
  "lang": "system",
  "recent": ["https://svn.example.com/proyecto"]
}
```

- **Proyectos recientes**: cada URL usada pasa al principio de `recent`
  (máx. 10); se muestran en la pantalla de conexión y en «Abrir proyecto».

- **Usuario/contraseña opcionales**: si se dejan vacíos se usan las credenciales
  cacheadas por el propio cliente SVN. Para cachearlas una vez:
  `svn ls <url>`.
- **Override por variables de entorno** (útil para pruebas):
  `SVN_REPO_URL`, `SVN_USER`, `SVN_PASS`, `SVN_TRUST_CERT`, `SVN_THEME`,
  `SVN_LANG`.

## Idioma

- Por defecto se detecta el idioma del sistema (`es*` → español, resto → inglés).
- Selector en **Ajustes → Idioma**: Sistema / Español / English; el cambio es
  inmediato y persistente.
- Los mensajes de error del proceso principal (`electron/`) se traducen con el
  mismo catálogo que la interfaz.

## Estructura

```
electron/          Proceso principal (IPC, ventana frameless, servicio SVN CLI)
  main.js          Ventana + handlers IPC
  svn.js           Ejecuta `svn ... --non-interactive` y parsea la salida --xml
  config.js        Lectura/escritura de settings.json
  i18n.js          Traducción de errores del backend
  preload.js       Puente expuesto como window.api
shared/
  messages.json    Catálogo de textos ES/EN (fuente única)
src/               Renderer Vue 3 + Vite
  themes.js        Catálogo de temas (tokens de color → variables CSS)
  i18n.js          t() reactivo del renderer
  diff-utils.js    Parser del diff unificado + jsdiff para fichero único
  views/           TreeView, BlobView, BlameView, LogView, DiffView
  styles.css       Estilos (sólo usa variables de los temas)
docs/screenshots/  Capturas usadas en este README
scripts/
  dev.js           Arranque Vite + Electron
  smoke.js         Captura automática contra un repo de prueba
  build.ps1        Empaquetado .exe (electron-packager + app.ico, patrón
                   tomcat-launcher: temporal fuera del proyecto + robocopy)
```

## Solución de problemas

- **«No se encontró el comando `svn`»**: instala SlikSVN o TortoiseSVN con los
  «command line client tools» y reinicia la aplicación (el PATH se lee al
  arrancar).
- **Certificados autofirmados**: activa «Confiar en certificados autofirmados» en
  Ajustes.
- **Autenticación**: para repositorios privados autentícate una vez con la CLI
  (`svn ls <url>`); quedará cacheada. O bien indica usuario/contraseña en
  Ajustes (se guardan en claro en `settings.json`).
- **Página abierta en el navegador**: sin Electron no hay puente `window.api`;
  usa `pnpm dev` o `pnpm start`.

## Licencia

MIT
