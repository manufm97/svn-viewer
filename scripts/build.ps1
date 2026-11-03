# build.ps1
# Empaquetado del .exe:
# 1. electron-packager con --icon app.ico a un directorio temporal FUERA del
#    proyecto (evita el EBUSY de CrowdStrike sobre node_modules)
# 2. robocopy /MIR sobreescribe los archivos SIN borrar el directorio destino
# 3. Limpia el temporal
#
# Uso:  pnpm dist   (vite build && powershell -ExecutionPolicy Bypass -File scripts/build.ps1)

$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $PSScriptRoot
$finalDir = Join-Path $rootDir "release\SVN Viewer-win32-x64"
$tempDir = Join-Path $env:TEMP "svn-viewer-build"

Write-Host "=== Build de SVN Viewer ===" -ForegroundColor Cyan

# Limpiar temporal previo
if (Test-Path $tempDir) {
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Build a directorio temporal FUERA del proyecto.
# Los --ignore son regex sobre la ruta relativa (con / inicial) y van sin
# caracteres especiales (| ( )) para que el CLI no los rompa al pasarlos por
# shell: sólo entran dist/ (renderer), electron/, shared/, package.json e index.html.
Write-Host "Empaquetando en directorio temporal..." -ForegroundColor Yellow
& (Join-Path $rootDir "node_modules\.bin\electron-packager.cmd") `
    $rootDir "SVN Viewer" `
    --platform=win32 --arch=x64 `
    --icon (Join-Path $rootDir "app.ico") `
    --out $tempDir `
    --overwrite `
    --ignore=node_modules `
    --ignore=/src `
    --ignore=/scripts `
    --ignore=/.smoke `
    --ignore=/release `
    --ignore=pnpm-lock.yaml `
    --ignore=pnpm-workspace.yaml `
    --ignore=vite.config.mjs `
    --ignore=README.md `
    --ignore=/.gitignore

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: electron-packager fallo." -ForegroundColor Red
    exit 1
}

$tempApp = Join-Path $tempDir "SVN Viewer-win32-x64"

# Sobreescribir usando robocopy (no necesita borrar el destino)
if (Test-Path $finalDir) {
    Write-Host "Sobreescribiendo build anterior con robocopy..." -ForegroundColor Yellow
    robocopy $tempApp $finalDir /MIR /NFL /NDL /NJH /NJS /NC /NS /NP
} else {
    Write-Host "Copiando build al directorio final..." -ForegroundColor Yellow
    Copy-Item -Path $tempApp -Destination $finalDir -Recurse -Force
}

# Limpiar temporal
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=== Build completado ===" -ForegroundColor Green
Write-Host "Salida: $finalDir" -ForegroundColor Cyan
