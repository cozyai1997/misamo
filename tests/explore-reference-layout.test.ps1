$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$index = Get-Content -LiteralPath (Join-Path $root "index.html") -Raw -Encoding UTF8
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

Assert-True ($styles -match 'grid-template-columns:\s*232px minmax\(0,\s*860px\) minmax\(300px,\s*326px\)') "Desktop explore layout should keep the reference three-column structure."
Assert-True ($styles -match 'max-width:\s*1536px') "Desktop layout should match the 1536px reference canvas."
Assert-True ($styles -notmatch '@media\s*\(max-width:\s*1540px\)[\s\S]*?\.right-rail\s*\{[\s\S]*?grid-column:\s*2') "Right rail should not collapse at the 1536px reference width."
Assert-True ($styles -match '@media\s*\(max-width:\s*1280px\)[\s\S]*?\.right-rail\s*\{[\s\S]*?grid-column:\s*2') "Right rail should only collapse below desktop reference widths."
Assert-True ($index -match 'assets/explore-cost-template\.png') "Reference-style pink cost template visual is missing."
Assert-True ($index -match 'assets/explore-advisor\.png') "Reference-style advisor visual is missing."
Assert-True ($styles -match '\.category-grid button:nth-child\(3\)\s*\{[\s\S]*?color:\s*var\(--pink\)') "Cost category button should use the reference pink emphasis."
Assert-True ($styles -match '\.recommend-card footer\s*\{[\s\S]*?border-top:\s*1px solid var\(--line\)') "Recommendation card footer should match the separated reference meta row."
Assert-True ($styles -match '\.resource-strip small\s*\{[\s\S]*?display:\s*inline-flex') "Popular resource metrics should use inline icon counters."

"Explore reference layout contract OK"
