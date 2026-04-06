[CmdletBinding()]
param(
    [string]$SteamPath = "C:\Program Files (x86)\Steam"
)

$ErrorActionPreference = "Stop"

function Get-RepoRoot {
    return (Split-Path -Path $PSScriptRoot -Parent)
}

function Get-RepoName {
    param([string]$RepoRoot)
    return (Split-Path -Path $RepoRoot -Leaf)
}

function Get-JsSourceFile {
    param([string]$RepoRoot)

    $steamUiDir = Join-Path $RepoRoot "steamui"
    if (-not (Test-Path $steamUiDir)) {
        throw "Не найдена папка steamui: $steamUiDir"
    }

    $jsFiles = Get-ChildItem -Path $steamUiDir -Filter *.js -File
    if ($jsFiles.Count -eq 0) {
        throw "В папке steamui нет ни одного .js файла"
    }
    if ($jsFiles.Count -gt 1) {
        throw "В папке steamui больше одного .js файла. Оставь один."
    }

    return $jsFiles[0]
}

function Remove-TargetIfExists {
    param([string]$PathToRemove)

    if (Test-Path $PathToRemove) {
        Remove-Item -Path $PathToRemove -Recurse -Force
    }
}

$repoRoot = Get-RepoRoot
$repoName = Get-RepoName -RepoRoot $repoRoot
$jsSource = Get-JsSourceFile -RepoRoot $repoRoot

$pluginJson = Join-Path $repoRoot "plugin.json"
$backendDir = Join-Path $repoRoot "backend"

if (-not (Test-Path $pluginJson)) {
    throw "Не найден plugin.json: $pluginJson"
}
if (-not (Test-Path $backendDir)) {
    throw "Не найдена папка backend: $backendDir"
}

$pluginsDir = Join-Path $SteamPath "plugins"
$steamUiDir = Join-Path $SteamPath "steamui"

if (-not (Test-Path $pluginsDir)) {
    throw "Не найдена папка Steam plugins: $pluginsDir"
}
if (-not (Test-Path $steamUiDir)) {
    throw "Не найдена папка Steam steamui: $steamUiDir"
}

$pluginTarget = Join-Path $pluginsDir $repoName
$jsTarget = Join-Path $steamUiDir $jsSource.Name

Write-Host "== Steam plugin install ==" -ForegroundColor Cyan
Write-Host "Repo root     : $repoRoot"
Write-Host "Repo name     : $repoName"
Write-Host "Plugin target : $pluginTarget"
Write-Host "JS source     : $($jsSource.FullName)"
Write-Host "JS target     : $jsTarget"
Write-Host ""

Remove-TargetIfExists -PathToRemove $pluginTarget
Remove-TargetIfExists -PathToRemove $jsTarget

New-Item -ItemType Directory -Path $pluginTarget -Force | Out-Null

# Копируем всё содержимое репы в папку плагина Steam.
# Скрытые .git-папки через wildcard обычно не копируются, и это нам на руку.
Copy-Item -Path (Join-Path $repoRoot "*") -Destination $pluginTarget -Recurse -Force

# Отдельно копируем JS-модуль туда, где его реально ищет Millennium.
Copy-Item -Path $jsSource.FullName -Destination $jsTarget -Force

Write-Host ""
Write-Host "Готово. Плагин установлен." -ForegroundColor Green
Write-Host "Перезапусти Steam или выключи/включи плагин в Millennium Settings -> Plugins."