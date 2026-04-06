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

Write-Host "== Steam plugin dev-link ==" -ForegroundColor Cyan
Write-Host "Repo root     : $repoRoot"
Write-Host "Repo name     : $repoName"
Write-Host "Plugin link   : $pluginTarget -> $repoRoot"
Write-Host "JS link       : $jsTarget -> $($jsSource.FullName)"
Write-Host ""

Remove-TargetIfExists -PathToRemove $pluginTarget
Remove-TargetIfExists -PathToRemove $jsTarget

try {
    New-Item -ItemType SymbolicLink -Path $pluginTarget -Target $repoRoot | Out-Null
    New-Item -ItemType SymbolicLink -Path $jsTarget -Target $jsSource.FullName | Out-Null
}
catch {
    throw @"
Не удалось создать symbolic links.

Что проверить:
1. PowerShell запущен от имени администратора
2. Или в Windows включён Developer Mode
3. У тебя есть права на запись в: $SteamPath

Исходная ошибка:
$($_.Exception.Message)
"@
}

Write-Host "Готово. Симлинки созданы." -ForegroundColor Green
Write-Host "Теперь правишь файлы в репе, а Steam использует их напрямую."
Write-Host "Если Steam уже запущен — перезапусти его или переинициализируй плагин."