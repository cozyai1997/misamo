$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$indexPath = Join-Path $root "index.html"
$jsPath = Join-Path $root "js/main.js"
$buttonsCssPath = Join-Path $root "css/buttons.css"
$iconsCssPath = Join-Path $root "css/icons.css"
$sidebarCssPath = Join-Path $root "css/sidebar.css"
$contentCssPath = Join-Path $root "css/content.css"
$rightRailCssPath = Join-Path $root "css/right-rail.css"
$responsiveCssPath = Join-Path $root "css/responsive.css"
$index = Get-Content -LiteralPath $indexPath -Raw
$js = Get-Content -LiteralPath $jsPath -Raw
$buttonsCss = Get-Content -LiteralPath $buttonsCssPath -Raw
$iconsCss = Get-Content -LiteralPath $iconsCssPath -Raw
$sidebarCss = Get-Content -LiteralPath $sidebarCssPath -Raw
$contentCss = Get-Content -LiteralPath $contentCssPath -Raw
$rightRailCss = Get-Content -LiteralPath $rightRailCssPath -Raw
$responsiveCss = Get-Content -LiteralPath $responsiveCssPath -Raw
$failures = @()

$requiredHtmlMarkers = @(
  "data-hero-carousel",
  "data-hero-prev",
  "data-hero-next",
  "data-slide-to",
  "data-feed-filter",
  "data-category",
  "data-search-input",
  "data-sort-toggle",
  "data-action-count",
  "data-comment-modal",
  "data-comment-dialog",
  "data-comment-close",
  "data-comment-count",
  "data-comment-post-title",
  "data-comment-post-body",
  "data-comment-post-image",
  "data-comment-form",
  "data-comment-input",
  "data-comment-submit",
  "data-comment-list",
  "data-comment-sort",
  "data-empty-state",
  "data-nav-target",
  "data-section",
  "data-page-target",
  "data-view=`"home`"",
  "data-view=`"explore`"",
  "data-view=`"post`"",
  "data-nav-target=`"post`"",
  "data-post-composer",
  "data-post-type",
  "data-post-settings",
  "data-rail-view=`"post`"",
  "data-explore-search",
  "data-explore-keyword",
  "data-explore-category",
  "data-explore-recommendation",
  "data-explore-resource",
  "data-explore-open",
  "data-explore-detail",
  "data-explore-detail-close",
  "data-explore-detail-title",
  "data-topic-query",
  "data-resource-metric",
  "data-feedback",
  "data-toast-region",
  "data-profile-toggle",
  "data-profile-menu",
  "data-notification-toggle",
  "data-rail-view=`"home`"",
  "data-rail-view=`"explore`"",
  "data-sidebar-view=`"home`"",
  "data-sidebar-view=`"explore`"",
  "data-sidebar-view=`"post`"",
  "data-hero-pc-art",
  "hero-pc-art",
  "data-explore-topic",
  "data-explore-expert",
  "mobile-hero-art",
  "mobile-recommendations"
)

foreach ($marker in $requiredHtmlMarkers) {
  if ($index -notmatch [regex]::Escape($marker)) {
    $failures += "index.html is missing interaction marker: $marker"
  }
}

$requiredJsMarkers = @(
  "initHeroCarousel",
  "renderHeroSlide",
  "initFeedControls",
  "applyFeedState",
  "initActionButtons",
  "initCommentModal",
  "openCommentModal",
  "closeCommentModal",
  "renderCommentItem",
  "submitComment",
  "initNavigationState",
  "initExploreControls",
  "initButtonFeedback",
  "initProfileMenu",
  "openExploreDetail",
  "closeExploreDetail",
  "showToast",
  "addEventListener",
  "setInterval"
  "initMobileRecommendationScroller"
)

foreach ($marker in $requiredJsMarkers) {
  if ($js -notmatch [regex]::Escape($marker)) {
    $failures += "js/main.js is missing interaction code: $marker"
  }
}

if ($js -match "no JavaScript behavior is required") {
  $failures += "js/main.js still says no JavaScript behavior is required"
}

if ($contentCss -notmatch "\.hero-panel\s*\{[\s\S]*height:\s*254px") {
  $failures += "Hero banner must have a fixed desktop height"
}

if ($contentCss -notmatch "\.hero-arrow\s*\{[\s\S]*opacity:\s*0[\s\S]*pointer-events:\s*none") {
  $failures += "Hero carousel arrows should be hidden until the banner is hovered or focused"
}

if ($contentCss -notmatch "\.hero-panel:hover\s+\.hero-arrow") {
  $failures += "Hero carousel arrows should unhide on banner hover"
}

if ($contentCss -match "\.hero-panel:focus-within\s+\.hero-arrow") {
  $failures += "Hero carousel arrows should not remain visible only because a clicked arrow keeps focus"
}

if ($contentCss -notmatch "\.post-image\s*\{[\s\S]*height:\s*190px") {
  $failures += "Post images must use a fixed height for consistent card sizing"
}

if ($rightRailCss -notmatch "\.side-card h2\s*\{[\s\S]*display:\s*inline-flex[\s\S]*align-items:\s*center") {
  $failures += "Right rail card headings should align inline icons beside the title"
}

if ($rightRailCss -notmatch "\.icon-inline\s*\{[\s\S]*display:\s*inline-flex[\s\S]*vertical-align:\s*middle") {
  $failures += "Inline icons should keep their own line box aligned with heading text"
}

if ($contentCss -notmatch "@keyframes\s+storyRingSpin" -or $contentCss -notmatch "\.story-ring:hover::after") {
  $failures += "Story rings should animate the gradient stroke on hover"
}

if ($contentCss -notmatch "\.logo-story button\s*\{[\s\S]*--story-add-anchor:\s*85\.35%" -or
  $contentCss -notmatch "\.logo-story button\s*\{[\s\S]*top:\s*var\(--story-add-anchor\)[\s\S]*left:\s*var\(--story-add-anchor\)" -or
  $contentCss -notmatch "\.logo-story button\s*\{[\s\S]*translate:\s*-50%\s+-50%" -or
  $contentCss -notmatch "\.logo-story button::before" -or
  $contentCss -notmatch "\.logo-story button::after") {
  $failures += "Story add button should sit on the ring edge with a centered CSS plus mark"
}

if ($rightRailCss -notmatch "\.popular-card small\s*\{[\s\S]*display:\s*flex[\s\S]*margin-top:\s*4px" -or $rightRailCss -notmatch "\.popular-card li > span\s*\{[\s\S]*white-space:\s*normal") {
  $failures += "Popular card like metrics should align below titles without crowding the text"
}

if ($sidebarCss -notmatch "\.explore-promo-card\s+\.promo-media\s*\{[\s\S]*width:\s*154px[\s\S]*height:\s*124px") {
  $failures += "Explore promo magnifier image should use the larger editable media slot"
}

if ($responsiveCss -notmatch "\.mobile-recommendations\s*\{[\s\S]*display:\s*block") {
  $failures += "Mobile home should include the horizontal recommendation section"
}

if ($index -match "mobile-consult-strip" -or $responsiveCss -match "mobile-consult-strip") {
  $failures += "Mobile consultation strip should be removed for now"
}

if ($responsiveCss -notmatch "\.mobile-hero-art\s*\{[\s\S]*display:\s*block") {
  $failures += "Mobile hero should use a dedicated editable visual asset"
}

if ($index -notmatch "data-hero-mobile-art" -or $js -notmatch "mobileImage") {
  $failures += "Mobile hero artwork should change together with the hero slide"
}

if ($index -notmatch 'data-hero-pc-art[^>]*src="\./img/hero-pc-home\.svg"' -or
  $js -notmatch "desktopImage" -or
  $js -notmatch "pcArt\.src\s*=\s*slide\.desktopImage" -or
  $contentCss -notmatch "\.hero-pc-art\s*\{[\s\S]*object-fit:\s*contain") {
  $failures += "Desktop hero artwork should use editable SVG image files and update with each slide"
}

if ($responsiveCss -match "\.hero-scene\s*\{[\s\S]*right:\s*-") {
  $failures += "Desktop hero artwork should not be pushed outside the banner in responsive layouts"
}

if ($index -match 'class="window"' -or
  $index -match 'class="lamp"' -or
  $index -match 'class="plant"' -or
  $index -match 'class="desk"' -or
  $index -match 'class="laptop"' -or
  $index -match 'class="cup"') {
  $failures += "Desktop hero artwork should no longer rely on nested CSS-only illustration elements"
}

if ($responsiveCss -notmatch "\.mobile-recommend-track\s*\{[\s\S]*cursor:\s*grab" -or $js -notmatch "pointerdown" -or $js -notmatch "scrollLeft") {
  $failures += "Mobile recommendations should support horizontal drag scrolling"
}

if ($index -notmatch 'class="[^"]*mobile-recommend-like[^"]*"[^>]*data-action="like"') {
  $failures += "Mobile recommendation cards should have active like buttons"
}

if ($responsiveCss -notmatch "\.feed-tabs\s*\{[\s\S]*display:\s*none") {
  $failures += "Mobile home should hide desktop feed tabs"
}

if ($responsiveCss -notmatch "\.right-rail\s*\{[^}]*display:\s*none") {
  $failures += "Mobile home should hide the desktop right rail"
}

if ($responsiveCss -notmatch "\.search input\s*\{[\s\S]*opacity:\s*0") {
  $failures += "Mobile topbar should collapse the full search field into an icon button"
}

$postCount = [regex]::Matches($index, '\sdata-post(?:\s|>)').Count
$postActionCount = [regex]::Matches($index, 'class="post-actions"').Count
if ($postCount -ne $postActionCount) {
  $failures += "Every feed post must include the same post-actions footer"
}

foreach ($target in @("home", "feed", "explore")) {
  if ($index -notmatch "data-nav-target=`"$target`"") {
    $failures += "Navigation is missing target: $target"
  }
  if ($index -notmatch "data-section=`"$target`"") {
    $failures += "Page is missing section target: $target"
  }
}

if ($index -notmatch 'data-nav-target="post"[^>]*data-page-target="post"' -or $index -notmatch 'data-section="post"') {
  $failures += "Top plus and mobile writing controls should open the post composer page"
}

if ($index -notmatch 'class="[^"]*post-page[^"]*"[^>]*data-view="post"' -and $index -notmatch 'data-view="post"[^>]*class="[^"]*post-page') {
  $failures += "Post composer should be implemented as its own post-page view"
}

if ($index -notmatch 'data-post-settings' -or $index -notmatch 'data-post-setting="category"' -or $index -notmatch 'data-post-setting="visibility"') {
  $failures += "Post settings rail should include category and visibility settings"
}

if ($js -notmatch "showPage" -or $js -notmatch "initPageNavigation" -or $js -notmatch "syncNavigationState") {
  $failures += "Navigation clicks must switch page views and sync active states"
}

if ($js -match "addEventListener\('mouseenter',\s*stopHeroTimer\)" -or $js -match "addEventListener\('focusin',\s*stopHeroTimer\)") {
  $failures += "Hero carousel hover/focus should reveal controls without pausing autoplay"
}

if ($index -notmatch 'data-page-target="explore"') {
  $failures += "Explore navigation must open the explore page"
}

if ($index -notmatch 'class="page-view[^"]*active"[^>]*data-view="home"' -and $index -notmatch 'data-view="home"[^>]*class="page-view[^"]*active"') {
  $failures += "Home page view must be active by default"
}

if ($index -notmatch 'data-view="explore"[^>]*hidden' -and $index -notmatch 'hidden[^>]*data-view="explore"') {
  $failures += "Explore page view must be hidden by default"
}

$exploreCategoryCount = [regex]::Matches($index, 'data-explore-category').Count
if ($exploreCategoryCount -lt 9) {
  $failures += "Explore page should include the nine category tiles shown in the reference"
}

$exploreRecommendationCount = [regex]::Matches($index, 'data-explore-recommendation').Count
if ($exploreRecommendationCount -lt 4) {
  $failures += "Explore page should include four customized recommendation cards"
}

$exploreResourceCount = [regex]::Matches($index, 'data-explore-resource').Count
if ($exploreResourceCount -lt 4) {
  $failures += "Explore page should include four popular resource items"
}

$exploreOpenCount = [regex]::Matches($index, 'data-explore-open').Count
if ($exploreOpenCount -lt 11) {
  $failures += "Explore recommendation, resource, and expert items should open a detail panel"
}

$resourceMetricCount = [regex]::Matches($index, 'data-resource-metric').Count
if ($resourceMetricCount -lt 8) {
  $failures += "Each popular resource should group view and like metrics with its icon"
}

$feedbackButtonCount = [regex]::Matches($index, 'data-feedback').Count
if ($feedbackButtonCount -lt 12) {
  $failures += "Non-navigation buttons should expose visible click feedback"
}

$likeToggleCount = [regex]::Matches($index, 'data-action="like"').Count
if ($likeToggleCount -lt 10) {
  $failures += "Feed, recommendation, and resource like buttons should be active"
}

if ($index -notmatch 'data-action="comment"' -or
  $js -notmatch "openCommentModal" -or
  $js -match "if\s*\(action\s*===\s*'comment'\)\s*\{\s*showToast" -or
  $contentCss -notmatch "\.comment-layer\s*\{[\s\S]*position:\s*fixed" -or
  $contentCss -notmatch "\.comment-dialog\s*\{[\s\S]*max-height:\s*min\(82vh,\s*760px\)" -or
  $contentCss -notmatch "\.comment-compose\s*\{[\s\S]*display:\s*grid" -or
  $contentCss -notmatch "\.comment-list\s*\{[\s\S]*display:\s*grid") {
  $failures += "Comment buttons should open a functional centered comment modal"
}

if ($js -notmatch "openReplyComposer" -or
  $js -notmatch "submitReply" -or
  $js -notmatch "data-comment-reply" -or
  $js -notmatch "data-reply-form" -or
  $js -notmatch "data-reply-input" -or
  $contentCss -notmatch "\.comment-reply-form\s*\{[\s\S]*display:\s*grid" -or
  $contentCss -notmatch "\.comment-replies\s*\{[\s\S]*display:\s*grid" -or
  $contentCss -notmatch "\.comment-reply-item\s*\{") {
  $failures += "Comment reply buttons should open an inline reply composer and render replies"
}

if ($js -match 'input\.value\s*=\s*`@\$\{comment\.author\}' -or
  $js -notmatch "data-reply-target" -or
  $contentCss -notmatch "\.comment-reply-target\s*\{") {
  $failures += "Reply composer should keep the input empty and show the reply target outside the field"
}

$replyActionCount = [regex]::Matches($js, "setAttribute\('data-comment-reply'").Count
if ($replyActionCount -lt 2 -or
  $js -notmatch "activeReplyTarget" -or
  $js -notmatch "closeReplyComposer" -or
  $js -notmatch "syncReplySubmitState" -or
  $js -notmatch "replyToId" -or
  $js -notmatch "replyToAuthor" -or
  $js -notmatch "data-reply-cancel" -or
  $js -notmatch "data-reply-context" -or
  $js -notmatch "scrollReplyComposerIntoView" -or
  $contentCss -notmatch "\.comment-reply-context\s*\{" -or
  $contentCss -notmatch "\.comment-reply-cancel\s*\{" -or
  $contentCss -notmatch "\.comment-reply-submit:disabled\s*\{" -or
  $contentCss -notmatch "\.comment-reply-to\s*\{" -or
  $js -match "reply-emoji" -or
  $contentCss -match "\.reply-emoji\s*\{" -or
  $contentCss -match "\.comment-reply-form\s*\{[\s\S]*?background:\s*#20232a") {
  $failures += "Reply UX should support two-level targets, blank input, cancel and light responsive composer styling"
}

if ($js -notmatch "findCommentReactionTarget" -or
  $js -notmatch "reaction\.liked\s*=\s*isLiked" -or
  $js -notmatch "Boolean\(comment\.liked\)" -or
  $js -notmatch "Boolean\(reply\.liked\)" -or
  $contentCss -notmatch "\.comment-reply-to\s*\{[\s\S]*?display:\s*block" -or
  $contentCss -notmatch "\.comment-reply-item\s*>\s*div\s*\{[\s\S]*?min-width:\s*0" -or
  $contentCss -notmatch "\.comment-reply-item\s+header\s+strong\s*\{[\s\S]*?text-overflow:\s*ellipsis") {
  $failures += "Reply likes should persist through rerenders and long reply names should stay inside the modal"
}

if ($js -match "reaction\.likes\s*=\s*Math\.max\([\s\S]{0,180}renderCommentList\(\)") {
  $failures += "Comment likes should update in place without closing an active reply composer"
}

if ($js -notmatch "commentThreads:\s*new WeakMap\(\)" -or
  $js -notmatch "activeThread" -or
  $js -notmatch "getCommentThread" -or
  $js -notmatch "triggerButton" -or
  $js -notmatch "restoreFocus\s*=\s*true" -or
  $js -notmatch "aria-describedby" -or
  $js -notmatch "closeReplyComposer\(\{\s*restoreFocus:\s*false\s*\}\)" -or
  $contentCss -notmatch "\.comment-item\s+header\s+strong\s*\{[\s\S]*?text-overflow:\s*ellipsis" -or
  $contentCss -notmatch "\.comment-item\s+p,[\s\S]*?\.comment-reply-item\s+p\s*\{[\s\S]*?overflow-wrap:\s*anywhere") {
  $failures += "Comment threads should be isolated per post and reply composers should clear accessibly on rerender"
}

if ($js -notmatch "focusSubmittedReply" -or
  $js -notmatch "focusSubmittedReply\(newReply\.id\)") {
  $failures += "Submitting a reply should keep keyboard focus inside the comment dialog"
}

if ($iconsCss -notmatch "heart-red\.svg") {
  $failures += "Heart-red icon asset should be registered in the icon CSS"
}

if ($buttonsCss -notmatch "heart-red\.svg" -or $buttonsCss -notmatch "\.action-button\.liked\s+\.icon-heart") {
  $failures += "Liked buttons should swap the heart icon image to heart-red.svg"
}

$saveToggleCount = [regex]::Matches($index, 'data-action="save"').Count
if ($saveToggleCount -lt 10) {
  $failures += "Feed, recommendation, and resource bookmark buttons should be active"
}

$exploreTopicCount = [regex]::Matches($index, 'data-explore-topic').Count
if ($exploreTopicCount -lt 8) {
  $failures += "Explore right rail should include eight popular topic rows"
}

$exploreExpertCount = [regex]::Matches($index, 'data-explore-expert').Count
if ($exploreExpertCount -lt 3) {
  $failures += "Explore right rail should include three recommended expert rows"
}

if ($failures.Count -gt 0) {
  $failures | ForEach-Object { Write-Error $_ }
  exit 1
}

Write-Host "Interaction checks passed"
