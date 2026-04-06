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
        Write-Host "Удалено: $PathToRemove" -ForegroundColor Yellow
    }
    else {
        Write-Host "Не найдено, пропускаю: $PathToRemove" -ForegroundColor DarkYellow
    }
}

$repoRoot = Get-RepoRoot
$repoName = Get-RepoName -RepoRoot $repoRoot
$jsSource = Get-JsSourceFile -RepoRoot $repoRoot

$pluginTarget = Join-Path (Join-Path $SteamPath "plugins") $repoName
$jsTarget = Join-Path (Join-Path $SteamPath "steamui") $jsSource.Name

Write-Host "== Steam plugin uninstall ==" -ForegroundColor Cyan
Write-Host "Repo name     : $repoName"
Write-Host "Plugin target : $pluginTarget"
Write-Host "JS target     : $jsTarget"
Write-Host ""

Remove-TargetIfExists -PathToRemove $pluginTarget
Remove-TargetIfExists -PathToRemove $jsTarget

Write-Host ""
Write-Host "Готово. Плагин удалён." -ForegroundColor Green
Write-Host "Перезапусти Steam."