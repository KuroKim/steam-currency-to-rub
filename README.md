# Steam Currency to RUB

Displays approximate RUB prices next to supported Steam prices in the Steam client and in the in-game overlay.

Originally built for accounts/store pages showing prices in **KZT**, with an additional **RUB** price shown next to the original price for quick comparison.

## What it does

- detects the current Steam store currency
- supports:
  - KZT
  - TRY
  - EUR
  - GBP
  - ARS
  - UAH
  - USD
- shows approximate RUB value next to the original Steam price
- works in the Steam client browser
- works in the in-game overlay
- caches exchange rates locally for 6 hours

## Important note

This plugin shows an **approximate currency conversion**, not an official Steam regional RUB price.

Steam regional pricing can differ from raw exchange-rate conversion.

## Tested on

- Steam client for Windows
- Steam in-game overlay
- store pages with KZT pricing
- various dynamic Steam price blocks

## Repository structure

```text
plugin.json
backend/main.lua
steamui/steam_currency_to_rub.js
scripts/install.ps1
scripts/uninstall.ps1
scripts/dev-link.ps1
LICENSE
````

## Installation

### Option 1: dev mode via symlink

Recommended for development and local maintenance.

Run PowerShell as Administrator, then from the repository root:

```powershell
.\scripts\dev-link.ps1
```

This will:

* create a symbolic link from this repo to `C:\Program Files (x86)\Steam\plugins\steam-currency-to-rub`
* create a symbolic link for the JS file in `C:\Program Files (x86)\Steam\steamui\`

After that, restart Steam or disable/enable the plugin in Millennium settings.

### Option 2: regular install via copy

From the repository root:

```powershell
.\scripts\install.ps1
```

This copies the plugin files into the Steam directory.

## Uninstall

```powershell
.\scripts\uninstall.ps1
```

## How it works

The plugin injects a browser JS module through Millennium.

The JS module:

* detects the current Steam currency using multiple fallbacks
* fetches exchange-rate data
* caches rates in local storage
* scans supported Steam price elements
* appends approximate RUB prices next to the original values

## Attribution

This plugin is adapted from the userscript by **CJMAXiK**:

* original gist: [https://gist.github.com/cjmaxik/7ce493d08958eecd56a78c01482e49fa](https://gist.github.com/cjmaxik/7ce493d08958eecd56a78c01482e49fa)

The original userscript is published under the **MIT License**.

## Notes

* this is an unofficial plugin
* not affiliated with Valve
* not affiliated with Millennium / Steambrew
* this plugin performs approximate exchange-rate conversion only

## License

MIT
