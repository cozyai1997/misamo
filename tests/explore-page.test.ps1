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

Assert-True ($index -match 'data-view-target="explore"') "Explore navigation target is missing."
Assert-True ($index -match 'data-page="explore"') "Explore page view is missing."
Assert-True ($index -match 'data-rail="explore"') "Explore right rail is missing."
Assert-True ($index -match 'data-sidebar-panel="explore"') "Explore sidebar promo is missing."
Assert-True ($index -match 'class="explore-search"') "Explore search block is missing."
Assert-True ($index -match 'class="category-grid"') "Explore category grid is missing."
Assert-True ($index -match 'class="recommend-grid"') "Explore recommendation grid is missing."
Assert-True ($index -match 'class="resource-strip"') "Explore resource strip is missing."
Assert-True ($index -match 'class="topic-list"') "Trending topics rail is missing."
Assert-True ($index -match 'class="expert-list"') "Expert recommendation rail is missing."
Assert-True ($script -match 'initViewNavigation') "View navigation initializer is missing."
Assert-True ($script -match 'data-view-link') "View navigation links are not wired."
Assert-True ($styles -match '\.explore-view') "Explore page styles are missing."
Assert-True ($styles -match '\.explore-card') "Explore content card styles are missing."

"Explore page contract OK"
