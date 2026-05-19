$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
$script = Get-Content -LiteralPath (Join-Path $root "script.js") -Raw -Encoding UTF8
$styles = Get-Content -LiteralPath (Join-Path $root "styles.css") -Raw -Encoding UTF8

function Assert-True {
  param(
    [bool] $Condition,
    [string] $Message
  )

  if (-not $Condition) {
    throw $Message
  }
}

$slideCount = ([regex]::Matches($index, 'class="hero-slide')).Count

Assert-True ($index -match 'data-hero-carousel') "Hero carousel root is missing."
Assert-True ($slideCount -ge 3) "Hero carousel needs at least three slides."
Assert-True ($index -match 'data-hero-prev') "Previous button is missing."
Assert-True ($index -match 'data-hero-next') "Next button is missing."
Assert-True ($index -match 'data-hero-dot') "Slide dots are not interactive."
Assert-True ($script -match 'initHeroCarousel') "Hero carousel initializer is missing."
Assert-True ($script -match 'data-hero-prev') "Previous button handler is missing."
Assert-True ($script -match 'data-hero-next') "Next button handler is missing."
Assert-True ($script -match 'keydown') "Keyboard navigation is missing."
Assert-True ($styles -match '\.hero-nav') "Hero navigation button styles are missing."

"Hero carousel contract OK"
