$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$imgDir = Join-Path $root "img"
$iconDir = Join-Path $root "icon"
$index = Get-Content -LiteralPath $indexPath -Raw

$failures = @()

if (-not (Test-Path -LiteralPath $imgDir -PathType Container)) {
  $failures += "Missing img directory"
}

if (-not (Test-Path -LiteralPath $iconDir -PathType Container)) {
  $failures += "Missing icon directory"
}

$iconFiles = @()
if (Test-Path -LiteralPath $iconDir -PathType Container) {
  $iconFiles = Get-ChildItem -LiteralPath $iconDir -File -Filter "*.svg"
  foreach ($iconFile in $iconFiles) {
    $svg = Get-Content -LiteralPath $iconFile.FullName -Raw
    if ($svg -match 'stroke="currentColor"') {
      $failures += "Icon SVG is not mask-friendly because it uses currentColor: $($iconFile.Name)"
    }
  }
}

if ($index -match "https://images\.unsplash\.com/") {
  $failures += "index.html still references remote Unsplash images"
}

if ($index -match "unpkg\.com/lucide") {
  $failures += "index.html still references the remote Lucide script"
}

if ($index -match "data-lucide=") {
  $failures += "index.html still uses data-lucide placeholders"
}

$localImages = [regex]::Matches($index, 'src="(\./img/[^"]+)"') | ForEach-Object { $_.Groups[1].Value }
if ($localImages.Count -eq 0) {
  $failures += "index.html does not reference local img assets"
}

foreach ($src in $localImages) {
  $assetPath = Join-Path $root ($src -replace "^\./", "")
  if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
    $failures += "Missing local image asset: $src"
  }
}

$expectedPromoImages = @(
  "hero-pc-home.svg",
  "hero-pc-info.svg",
  "hero-pc-community.svg",
  "promo-home.svg",
  "promo-explore.svg",
  "promo-post.svg",
  "mobile-hero-home.svg",
  "mobile-hero-info.svg",
  "mobile-hero-community.svg"
)

if ($index -notmatch "data-promo-image") {
  $failures += "Sidebar promo cards do not expose editable data-promo-image slots"
}

foreach ($imageName in $expectedPromoImages) {
  $imagePath = Join-Path $imgDir $imageName
  if (-not (Test-Path -LiteralPath $imagePath -PathType Leaf)) {
    $failures += "Missing local promo image asset: $imageName"
  }
}

foreach ($heroImage in Get-ChildItem -LiteralPath $imgDir -File -Filter "hero-pc-*.svg") {
  $svg = Get-Content -LiteralPath $heroImage.FullName -Raw
  foreach ($match in [regex]::Matches($svg, '<text[^>]*\sx="([0-9.]+)"')) {
    $textX = [double]$match.Groups[1].Value
    if ($textX -gt 300) {
      $failures += "PC hero SVG text starts too close to the right edge and can be clipped: $($heroImage.Name)"
    }
  }
}

$cssFiles = Get-ChildItem -LiteralPath $root -Recurse -File -Filter "*.css" |
  Where-Object { $_.FullName -notmatch "\\.git\\" }

$localIcons = @()
$iconCssUsesBackground = $false
foreach ($cssFile in $cssFiles) {
  $css = Get-Content -LiteralPath $cssFile.FullName -Raw
  if ($css -match 'background:\s*var\(--icon\)') {
    $iconCssUsesBackground = $true
  }
  if ($css -match 'mask:\s*var\(--icon\)' -or $css -match '-webkit-mask:\s*var\(--icon\)') {
    $failures += "Icon CSS still uses mask-based rendering, which can hide local SVG icons"
  }
  foreach ($match in [regex]::Matches($css, 'url\("((?:\.\./|\./)?icon/[^"]+\.svg)"\)')) {
    $src = $match.Groups[1].Value
    $localIcons += $src
    $assetPath = [System.IO.Path]::GetFullPath((Join-Path $cssFile.DirectoryName $src))
    if (-not (Test-Path -LiteralPath $assetPath -PathType Leaf)) {
      $failures += "Missing local icon asset: $src"
    }
  }
}

if ($localIcons.Count -eq 0) {
  $failures += "CSS does not reference local icon assets"
}

$expectedExtractedIcons = @(
  "building-2.svg",
  "clipboard-list.svg",
  "flame.svg",
  "heart-red.svg",
  "map-pin.svg",
  "megaphone.svg",
  "scale.svg",
  "star.svg",
  "store.svg",
  "wallet.svg"
)

foreach ($iconName in $expectedExtractedIcons) {
  $iconPath = Join-Path $iconDir $iconName
  if (-not (Test-Path -LiteralPath $iconPath -PathType Leaf)) {
    $failures += "Missing extracted local icon asset: $iconName"
  }
}

if (-not $iconCssUsesBackground) {
  $failures += "Icon CSS does not use background-image rendering"
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "Asset checks passed"
