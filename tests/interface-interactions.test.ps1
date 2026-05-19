$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
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

Assert-True ($styles -match '\.recommend-card\s*\{[\s\S]*?cursor:\s*pointer[\s\S]*?transition:') "Recommendation cards should visibly react to mouse hover."
Assert-True ($styles -match '\.recommend-card:hover,[\s\S]*?\.recommend-card:focus-within') "Recommendation cards need hover and focus-within states."
Assert-True ($styles -match '\.recommend-card:active') "Recommendation cards need a pressed active state."
Assert-True ($styles -match '\.resource-strip article\s*\{[\s\S]*?cursor:\s*pointer[\s\S]*?transition:') "Popular resource items should visibly react to mouse hover."
Assert-True ($styles -match '\.resource-strip article:hover,[\s\S]*?\.resource-strip article:focus-within') "Popular resource items need hover and focus-within states."
Assert-True ($styles -match '\.topic-list a\s*\{[\s\S]*?transition:') "Trending topic links should animate on hover."
Assert-True ($styles -match '\.topic-list a:hover,[\s\S]*?\.topic-list a:focus-visible') "Trending topic links need hover and focus-visible states."
Assert-True ($styles -match '\.explore-search button:hover,[\s\S]*?\.explore-search button:focus-visible') "Explore search button needs hover and focus-visible states."
Assert-True ($styles -match '\.explore-search button:active') "Explore search button needs a pressed active state."

"Interface interaction contract OK"
