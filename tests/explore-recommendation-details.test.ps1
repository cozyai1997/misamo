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

Assert-True ($index -match 'class="recommend-author"') "Recommendation cards should include a separate author row."
Assert-True ($styles -match '\.recommend-card\s*>\s*img') "Recommendation thumbnail styling should only target the direct card image."
Assert-True ($styles -match '\.recommend-card\s*\{[\s\S]*?display:\s*grid') "Recommendation cards should use internal grid rows so right-side GUI aligns."
Assert-True ($styles -match '\.recommend-card\s*\{[\s\S]*?grid-template-rows:\s*auto auto minmax\(40px,\s*auto\) minmax\(48px,\s*1fr\) auto auto') "Recommendation card rows should pin author and action GUI to the bottom."
Assert-True ($styles -match '\.recommend-card\s*>\s*span\s*\{[\s\S]*?justify-self:\s*start') "Recommendation category badges should not stretch across grid rows."
Assert-True ($styles -match '\.recommend-author\s*\{[\s\S]*?grid-template-columns:\s*18px minmax\(0,\s*1fr\)') "Author rows should use compact avatar and name alignment."
Assert-True ($styles -match '\.recommend-card footer\s*\{[\s\S]*?grid-template-columns:\s*auto auto 1fr 18px') "Recommendation metrics should use the reference-like heart, eye, spacer, bookmark layout."
Assert-True ($styles -match '\.resource-strip article\s*\{[\s\S]*?grid-template-columns:\s*22px 54px minmax\(0,\s*1fr\)') "Popular resource rows should keep compact reference spacing."
Assert-True ($styles -match '\.resource-strip img\s*\{[\s\S]*?width:\s*54px[\s\S]*?height:\s*64px') "Popular resource thumbnails should match the compact reference image size."

"Explore recommendation details contract OK"
