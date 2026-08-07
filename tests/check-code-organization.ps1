$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$stylesPath = Join-Path $root "styles.css"
$jsPath = Join-Path $root "js/main.js"
$cssDir = Join-Path $root "css"

$index = Get-Content -LiteralPath $indexPath -Raw
$styles = Get-Content -LiteralPath $stylesPath -Raw
$failures = @()

$expectedCssFiles = @(
  "tokens.css",
  "base.css",
  "icons.css",
  "layout.css",
  "buttons.css",
  "sidebar.css",
  "content.css",
  "right-rail.css",
  "responsive.css"
)

if (-not (Test-Path -LiteralPath $cssDir -PathType Container)) {
  $failures += "Missing css directory"
}

foreach ($file in $expectedCssFiles) {
  $path = Join-Path $cssDir $file
  $importPath = "./css/$file"

  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    $failures += "Missing split CSS file: $file"
    continue
  }

  if ($styles -notmatch [regex]::Escape("@import url(`"$importPath`");")) {
    $failures += "styles.css does not import $importPath"
  }

  $content = Get-Content -LiteralPath $path -Raw
  if ($content -notmatch "/\*" -or $content -notmatch "EDIT:") {
    $failures += "$file is missing edit-friendly comments"
  }
}

if ($styles -match ":root\s*\{" -or $styles -match "\.topbar\s*\{") {
  $failures += "styles.css still contains implementation styles instead of acting as an import map"
}

if (-not (Test-Path -LiteralPath $jsPath -PathType Leaf)) {
  $failures += "Missing js/main.js"
} else {
  $js = Get-Content -LiteralPath $jsPath -Raw
  if ($js -notmatch "EDIT:") {
    $failures += "js/main.js is missing edit-friendly comments"
  }
}

if ($index -notmatch '<script src="./js/main.js"></script>') {
  $failures += "index.html does not load js/main.js"
}

if ($index -match '<script src="./script.js"></script>') {
  $failures += "index.html still loads the old script.js"
}

$expectedHtmlComments = @(
  "EDIT: topbar",
  "EDIT: sidebar",
  "EDIT: main content",
  "EDIT: right rail",
  "EDIT: mobile nav"
)

foreach ($comment in $expectedHtmlComments) {
  if ($index -notmatch [regex]::Escape($comment)) {
    $failures += "index.html is missing comment: $comment"
  }
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "Code organization checks passed"
