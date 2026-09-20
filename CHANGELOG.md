# Changelog

All notable changes to TV Box are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); dates are
`YYYY-MM-DD`.

## [Unreleased]

### Added

- App chrome redesigned to match the native iOS Apple TV app: the bottom
  tab bar (mobile) is now a floating glass pill inset from the screen
  edges instead of a full-width bar, and the top bar is stripped down to
  just a single notifications icon floating over content -- the app logo,
  nav links, theme toggle, and bug-report trigger that used to live there
  are gone on mobile (nav links and logo remain on desktop, which has no
  bottom tab bar). Each page's own large title now fades and slides away
  entirely as you scroll, instead of just shrinking slightly, matching
  the reference app's collapsing-header behavior.
- Glass transparency is now adjustable from Profile > Appearance: "System"
  (the default) follows your device's own Reduce Transparency setting,
  while "Reduced" and "Full" explicitly force chrome to always render
  solid or always render as blurred glass, overriding the OS setting
  either way. Theme (Dark/Light) moved to the same Appearance section.
- Report a bug moved from a top-bar icon into Profile's More menu, next
  to Shortcuts & Siri and Push Notifications -- tucked behind the account
  screen the way native apps handle settings/support, instead of sitting
  as a persistent icon in the chrome.

- Activity now has a "Now Watching" section showing what people you follow
  (or everyone, via the same Following/Everyone toggle the rest of the page
  uses) are currently in the middle of -- their poster, episode progress,
  and who's watching it. Capped to a preview with a "Show all" toggle so a
  long list doesn't push the feed below it far down the page, and
  filterable by genre from a "Filter by genre" dropdown -- the same
  floating-overlay pattern as the "Filter by person" control next to it,
  rather than an always-visible row of chips. Your own shows are left out
  since Home already covers those.
- Show Detail now shows the IMDb rating and Rotten Tomatoes score next to
  a show's year/seasons/status, sourced from OMDb -- requires an optional
  free OMDb API key (see .env.example); scores just don't show up without
  one, or for the rare show OMDb has no data for.
- Show Detail's Rotten Tomatoes icon is now always there (not just when
  OMDb has a score), and clicking it opens the show's actual RT page --
  e.g. Ted Lasso links straight to rottentomatoes.com/tv/ted_lasso,
  the way the IMDb rating already links to IMDb. No free, ToS-compliant
  API hands back a show's real RT page or score for most shows, so the
  link is a fast, purely client-side guess from the title (verified
  against a spread of real shows first) rather than a live lookup --
  the rare wrong guess lands on RT's own page instead of anything
  broken. Until/unless OMDb also has an actual score, the icon shows a
  small red "RT" badge (same as IMDb's own yellow one) with a "Click to
  see score" hint -- the fresh/rotten tomato glyph only appears once
  there's an actual score for it to color, rather than as an
  unrecognizable blank circle next to the hint text.
- Search now has a "Filters" dropdown (next to the search box, same
  floating-overlay pattern as Activity's "Filter by person"/"Filter by
  genre") for narrowing results by streaming platform and by genre --
  works on both the "Trending this week" grid and live search results,
  and only appears once there's actually something to filter by. Shown
  as "Filters · N", where N counts the two facets (platform, genre)
  independently, matching how History's filter count already works.
- A show you've rated one or more seasons of, but haven't rated overall,
  now shows a live estimate (the average of just those seasons) next to
  "Rate this show" -- click it to see which seasons and how they were
  rated. It's never saved as your actual rating of the show; it disappears
  the moment you do rate the show yourself.
- The episode list on Show Detail now marks the next episode you haven't
  watched with an "Up next" badge and a highlighted border, so returning
  to a long-running show mid-season doesn't mean scanning row by row to
  find your place. The season tabs badge any season you've fully watched
  with a small checkmark, and the "X/Y watched" count next to them now
  has a progress bar alongside it (reusing the same bar already used for
  shows on Home) instead of being text-only.
- Search now offers a "Trending this week" grid of shows to browse before
  you've typed anything, instead of a bare empty state -- the same TMDB
  trending feed used elsewhere, with poster art and streaming badges just
  like search results. It disappears the moment you start typing and
  quietly doesn't show up at all if the trending fetch fails.
- Every page now sets its own browser tab title (e.g. "Activity · TV Box",
  or a show/person's name on their detail page) instead of every tab
  reading the same static "TV Box", so it's actually possible to tell
  pages apart when several are open at once.
- Sign-in now uses passkeys (Face ID, Touch ID, Windows Hello, or a
  security key) instead of trusting an email address alone, which had no
  real verification at all -- anyone who knew a friend's email could sign
  in as them. A new account picks a username and registers a passkey in
  one step; an existing account signs in with the passkey already on its
  device. The very first passkey for each of the app's existing users is
  still bootstrapped by email (the same trust level sign-in always had),
  but registering a passkey closes that door for good the moment it
  exists -- from then on, only a device that actually holds the
  credential can get in.
- TV Box can now send Web Push notifications -- a new follower, a rating,
  someone finishing a show -- to your phone or desktop even when the app
  isn't open, once you turn it on from Profile's new "Push Notifications"
  menu item. The first time you sign in on a device, the app offers to
  turn it on right there, the way native apps ask for permissions on
  first launch, instead of waiting for you to find the setting yourself;
  it only asks once per device.

### Changed

- Every pill-shaped filter/select control -- Chip (Search and History's
  platform/genre filter chips), SegmentedControl (Activity's
  Following/Everyone toggle), and the "Filter by person"/"Filter by
  genre"/"Filters" trigger buttons on Activity, Search, and History --
  is now a size step bigger (more horizontal and vertical padding,
  text-sm instead of text-xs) for an easier-to-tap, more modern feel.
  The sizing and color classes for these are now shared constants
  (PILL_SIZE_CLASSES/PILL_ACTIVE_CLASSES/PILL_INACTIVE_CLASSES in
  Chip.tsx) instead of being repeated at each call site, so the whole
  set stays in sync going forward.
- Scrollbars are hidden app-wide (no visible track/thumb, on any
  scrollable element) rather than just on a few explicitly-marked
  horizontal-scroll rows -- scrolling itself is unaffected, matching how
  Apple TV and other native-feeling apps never show scrollbar chrome.
  The now-redundant `.no-scrollbar` utility class and its two call sites
  were removed.
- Profile's stats grid had a standalone "Avg rating" tile that duplicated
  the number already shown, bigger and in context, at the top of the
  ratings chart right below it -- the tile is gone and the chart header
  now reads e.g. "4.5 avg" next to "Ratings", leaving four evenly-sized
  stat cards instead of five with an awkward gap on mobile.
- Home's "Your Watchlist" and "Your Lists" sections now show at most 6
  items each, with "See all" only appearing when there's actually more
  to see -- previously the link always read "See all" even for a single
  item, with nothing more to show. When nothing's hidden, the link now
  reads "Manage" instead.
- On Home, a Now Watching tile's season/episode count and "New episode"
  date used to pop in a beat after the tile's initial paint (two
  separate data fetches landing at different times). Both now load
  together, so the skeleton stays up until a tile has everything it'll
  show, instead of rendering once plain and again fully detailed.
- The Diary tab now loads 40 entries at a time with a "Show more" button
  instead of rendering a heavy watcher's entire history at once, which
  could mean thousands of animated, image-bearing rows in the DOM on
  first open.
- The "Report a bug" and Search results poster grid now match the rest
  of the app's motion/interaction conventions: the bug-report close
  button uses the same shared header as every other panel (and is a
  proper 44px touch target, not 32px), and search results cascade in
  one-by-one instead of popping in as a flat block.
- Poster grids that show a "where to watch" badge (Home, Search, History)
  now resolve every card's manual streaming override in a single request
  instead of one request per card.
- Activity used to stack two full rows of buttons above the feed
  (Following/Everyone, then All plus one chip per person). The
  Following/Everyone toggle now stays as the one always-visible control,
  and the per-person filter moved behind a single "Filter by person"
  button that opens a dropdown listing each name with their avatar --
  same filtering, one row instead of two. The dropdown floats over the
  page and closes on an outside click, Escape, or re-clicking the
  trigger; there's no separate "All" option -- clicking the already-
  selected person again clears the filter instead.
- Profile: "Year in review", "Public view", and "Sign out" were three
  equal-weight buttons next to your name; they're now one "More" button
  that opens a small dropdown menu, since they're occasional actions next
  to the activity you're actually there to see. The menu floats over the
  page and closes on an outside click, Escape, or re-clicking the
  trigger -- no separate header or close button inside it, just the three
  items. Your stat cards
  and rating chart are now grouped into one card instead of two
  separately-spaced blocks, and the Watchlist/Dropped/Lists tabs show a
  count once they have anything in them. The Finished and Episodes
  watched stat cards are now shortcuts to the History and Diary tabs.
- The IMDb rating and Rotten Tomatoes score on Show Detail were hard to
  read at 10-12px; both are now a size up. The fresh/rotten Rotten
  Tomatoes icon itself was bumped twice this pass and is now noticeably
  bigger than where it started.
- The IMDb and Rotten Tomatoes badges on Show Detail now use each
  service's actual logo mark instead of a hand-built text pill -- a real
  yellow-and-black IMDb bug, and RT's tomato-splat mark (the exact
  CC0-licensed vector traces Simple Icons maintains for both public
  brand marks), so they read as authentic rather than an approximation.
  The fresh/rotten score dot next to the RT mark is unchanged.
- Every centered overlay (Report a bug, What's new, followers/following,
  the rating breakdown) now shares the same frosted-glass panel as the
  notification/person/more dropdowns, instead of a flat solid background
  -- one consistent look for every popup in the app instead of two
  slightly different ones. All overlays and dropdowns also now trap Tab
  within themselves while open, instead of letting keyboard focus tab out
  to the page underneath.
- A fully-watched season's checkmark badge is now the same solid,
  filled accent circle used everywhere else in the app to mean "watched"
  (previously a small hand-drawn outline), and hovering any season tab
  shows its watched count as a tooltip, not just the fully-watched ones.
  The "Click to see score" hint next to an unscored Rotten Tomatoes
  entry is now a proper accent-colored pill instead of plain grey text,
  and brightens on hover like the rest of the app's clickable badges.
  An episode with no still image now shows a small icon alongside "No
  image" instead of bare text on an empty tile. The "Next: airs" banner
  is now "New episode: airs" and the per-season watched count now reads
  "X/Y watched this season" -- both were easy to confuse with the
  similarly-worded "Up next" episode badge and the whole-show watched
  count elsewhere on the page.
- App-wide contrast pass: base text and UI colors are brighter against the
  app's glass panels now that their blur is actually rendering (see the
  backdrop-filter fix below), and body text is a shade bolder throughout.
- Activity's "Filter by genre" dropdown is now a vertical checkable list
  matching "Filter by person" exactly, instead of a wrapped row of chips.
- The notifications panel is wider -- a longer description no longer feels
  cramped -- and its scroll area is now capped instead of a fixed height,
  so a short list sits at its natural size instead of an oversized empty
  box.
- The Push Notifications and Shortcuts & Siri panels now have more
  generous padding and a leading icon next to their title, instead of a
  bare heading cramped in the corner.
- Back navigation -- previously four different patterns across the app (a
  text arrow link, an icon-only circular button, a plain link, an
  underlined link) -- is now one consistent chevron-and-label control
  everywhere, with a floating icon-only variant for Show Detail's photo
  backdrop where a text link wouldn't stay legible.

### Fixed

- The previous app-chrome redesign removed the theme toggle from the top bar
  entirely (it only lived in Profile > Appearance), and separately `body`'s
  `overflow-x: hidden` was silently turning it into a scroll container --
  per the CSS spec, pairing `overflow-x: hidden` with the default
  `overflow-y: visible` computes `overflow-y` as `auto` -- which broke the
  notifications bell's `position: sticky` positioning so it scrolled away
  with the page instead of staying pinned. The theme toggle is back next to
  the notifications bell in the top bar (Profile > Appearance keeps the
  fuller control too), and `body` now uses `overflow-x: clip`, which
  doesn't trigger that scroll-container side effect.
- The bottom tab bar's active-item indicator was a small 4px dot instead of
  the sliding pill-shaped highlight used everywhere else selection needs to
  animate (`SegmentedControl`, filter chips). It's now a full `layoutId`-
  based pill background behind the active tab's icon and label, matching
  the rest of the app.
- Search's Filters panel had no height cap, so opening it with several
  platforms and genres selected could push its contents down past the
  bottom nav bar and overlap it. It's now a Platform/Genre switcher (via
  `SegmentedControl`) showing one category's chips at a time inside a
  scroll-capped list, instead of stacking every platform and every genre in
  one unbounded column. Activity's genre filter switched from a
  single-column list of rows to the same wrapping-chip layout, which uses
  the panel's full width instead of leaving most of it empty next to short
  genre names. Every capped-height filter/notification list in the app
  (Search Filters, Activity's genre filter, History's filter panel, the
  notifications bell dropdown) now fades its bottom edge when there's more
  to scroll to, instead of cutting off with no visual hint.
- Glass surfaces (`glass-surface`/`glass-surface-strong`) are now more
  translucent and more blurred than the previous redesign pass landed on,
  closer to visionOS/Apple TV's "Liquid Glass" material.
- Every page felt slower to navigate to than it should: the page-transition
  fade was written so the outgoing page had to fully finish animating out
  before the incoming page even started mounting (and firing its data
  fetches), adding a fixed delay to every single navigation in the app for
  no visual benefit over letting both cross-fade at once. Separately, Home
  kept its entire "Now Watching" section behind a loading skeleton until a
  third-party air-date correction had finished for every show with an
  upcoming episode, even though only the "New episode" badge actually
  needed that data -- posters, titles, and watched counts now appear as
  soon as your own data loads, and the badge fades in a moment later
  instead of holding the whole section hostage to a slow external API.
- Opening Activity's "Filter by person" dropdown on a narrow screen could
  push the whole page's viewport wider and shove the trigger row to the
  left, with the dropdown itself overflowing off the right edge. It's now
  anchored to the trigger's own right edge like every other dropdown in
  the app, instead of a broken center-alignment mode that only this one
  dropdown used. The trigger button is also now the same height as the
  Following/Everyone chips next to it, instead of 4px shorter.
- The "Upcoming" episode date on Home (and the "New episode" badge on Now
  Watching, and the "Next: airs" line on Show Detail) could jump straight
  to a later episode's date a day or more before the actual next episode
  had aired -- TMDB's raw air dates are occasionally wrong, and the app
  already fetches TVmaze's corrected dates for display, but was still
  picking *which* episode counts as "next" using TMDB's raw date instead
  of the corrected one. All three now agree on the corrected date when
  deciding what's next, not just when displaying it.
- A full pass for consistency and polish: a close button shared by
  several panels (and one hand-rolled one on "Report a bug") was 32px,
  under the app's usual 44px minimum touch target. A handful of
  animations (the mobile tab bar, an episode row, the show title on
  Show Detail, Login's step transition) were missing the app's standard
  easing curve, giving them a slightly different feel from everything
  else. A streaming-platform icon in History wasn't lazy-loaded like
  every other list image.
- Recap's year-selector buttons could briefly flash as unselected right
  after the page finished loading.
- The whole-show star rating didn't announce which rating was currently
  selected to screen readers.
- The main "Continue" button on Login/the passcode gate was a few pixels
  under the minimum recommended touch target on mobile.
- Profile's Diary/History/Watchlist/Dropped/Lists tabs could overflow the
  screen and make the whole page scroll sideways on mobile.
- The followers/following list visibly resized once its loading skeleton
  was replaced by the real list, and a fixed-height fix for that then
  made short lists sit in an oversized empty box -- it's now capped, not
  fixed: sized to the count already shown on the profile page, so small
  lists stay small and large ones scroll within a sensible max height.
- "Report a bug" closed itself the instant you clicked into the title or
  description field, instead of letting you type.
- Protected pages (Home, Profile, etc.) briefly showed a loading spinner
  on every load before deciding whether you were signed in, even though
  the check itself is instant -- it now resolves in the same render, so
  the spinner no longer appears at all for that step.
- Compare was the only page in the app whose loading state replaced the
  entire page with a bare skeleton -- opening it showed a blank flash
  with no title before "You vs @username" and the rest of the layout
  appeared. The header now stays up front while the comparison loads
  underneath it, like every other page.
- A list's remove button (the × on a poster in List Detail) was only
  ever shown on hover, with no equivalent for keyboard focus -- tabbing
  to it on desktop landed an invisible focus ring on a button you
  couldn't see. It now also appears on keyboard focus, not just hover.
- Search's "Trending this week" row sat below a tall, heavily-padded
  prompt card, pushing it mostly off-screen on first load (especially
  on mobile) even though it's the most useful thing on the page before
  you've typed anything. The prompt is now a plain line of text instead
  of a bordered card, so Trending appears much closer to the top;
  the search box and prompt spacing were further tightened so there's
  noticeably less empty space above Trending now.
- Another consistency pass: Home, Activity, and a show's Diary page now
  use the same collapsing large-title header every other page already
  had, and that collapse now respects "reduce motion" instead of
  animating regardless. Navigating between pages uses the browser's
  native View Transitions where supported, for a smoother cross-fade.
  Profile pages, Compare, Recap, and Show Detail -- the only pages with
  no way back except the OS/browser back button -- now all have one,
  falling back to a sensible page instead of leaving the app entirely
  when there's no in-app history to go back to. Activity's
  Following/Everyone toggle is now fully keyboard-operable (arrow keys,
  Home/End) instead of mouse/touch only.
- Show Detail's poster now requests an image sized for how it's actually
  displayed instead of always the same fixed size regardless of screen,
  and a "where to watch" provider logo that was missing lazy-loading
  (unlike every other logo image in the app) now has it. The unread-
  notifications check no longer keeps polling every minute while the app
  is in the background -- it skips the request while hidden and catches
  up immediately as soon as you come back.
- Every frosted-glass panel in the app -- the header, bottom nav,
  dropdowns, sheets, and modals -- was rendering with no blur at all in
  the deployed app; a CSS-minification quirk stripped it during the
  production build only, so it looked fine locally and broken for
  everyone actually using it. They're glass again.
- Profile's "More" menu could get stuck fading out but never actually
  closing, if you opened one of its sub-panels (like Push Notifications)
  in the same tap that opened the menu.
- Haptic feedback (the light tap on iOS Safari) never actually fired
  anywhere it was wired up -- star ratings, season tabs, the bottom nav,
  Follow buttons, toggles, the theme switch -- because of how the
  underlying trick was built. It now fires correctly everywhere it's
  used.
- The notifications panel's follow "+" badge showed up on a "started
  following you" notification even when you already followed that
  person back, and descriptions in the panel could get cut off
  mid-sentence instead of wrapping onto a second line.
- Toggling one episode watched on a long season could visibly lag --
  every row in the season was quietly re-rendering along with the one
  you tapped. Only the row you actually toggle updates now.
- Undoing a bulk "mark all/season watched" that had overwritten some
  already-logged episodes with a different runtime could leave the
  wrong runtime in place even after the undo, quietly skewing your
  "hours watched" stat -- Undo now restores the original runtime along
  with everything else.
- Clearing all notifications was the one destructive action in the app
  with no way to undo it -- it now offers the same Undo toast as every
  other bulk/destructive action.
- Two toasts with identical text shown back-to-back (e.g. clearing
  notifications twice in a row) could share one timer, so the second
  one's auto-dismiss never actually restarted.
- The episode watched-toggle button didn't announce its state to screen
  readers, and Show Detail's share button was a touch under the app's
  usual minimum tap-target size.

## [1.2.0] - 2026-09-07

### Added

- "Dropped" as a third watch status alongside Now Watching and Watchlist,
  for shows you've stopped partway through — its own Profile tab, and it
  resumes automatically the moment you mark another episode watched.
- Notifications rebuilt into a real activity feed: new followers, ratings,
  and finishes from people you follow, not just follow alerts.
- Clicking a bar in the rating histogram reveals which shows make it up.
- Watchlist entries are removed automatically once you actually start
  watching that show.

### Changed

- Followers/following, the rating breakdown, and "What's new" now open as
  centered overlays instead of an inline panel, matching "Report a bug" --
  the whole page used to shift down and visibly resize as each one loaded.
- "Report a bug" now opens as a centered modal instead of a dropdown,
  fixing clipping on mobile.
- Profile stats load in a fraction of the time — moved the heaviest
  aggregation into two Postgres views instead of paginating raw rows
  client-side.
- Desktop navbar widened to feel less boxed-in on wide screens.
- Modernized the notifications panel and every other dropdown/inline panel
  (add to list, filters, followers/following, changelog, "where to watch",
  rating breakdown): softer rounded corners, real elevation, a frosted-glass
  background on the notifications dropdown, and a consistent icon close
  button instead of a bare "Close" link.
- Navigating between pages now cross-fades instead of cutting instantly.
- Every inline error message (forms, panels, page banners) and the toast
  are now announced to screen readers immediately instead of relying on
  sighted users noticing new text on the page.

### Fixed

- Profile stats no longer silently truncate at 1,000 rows for users with
  large watch histories (a Supabase/PostgREST response cap).
- Undated diary entries now keep the order you added them in, instead of
  resorting alphabetically.
- Fixed screen offsetting on mobile when marking a season or show fully
  watched.
- "Jump to progress" from Now Watching no longer does nothing once you're
  caught up on every aired episode.
- Fixed the notifications panel resizing awkwardly right after opening.

## [1.1.0] - 2026-08-22

### Added

- Followers/following, replacing the old flat member directory: a Follow
  button everywhere someone's profile shows up, follower/following counts
  and lists on every profile, and a "Follows you" badge.
- Activity now defaults to a Following feed (with a one-tap switch back to
  Everyone), and includes "X started following Y" alongside the usual
  rated/finished events.
- In-app notifications for new followers, with an unread count on a new
  bell icon in the top bar.

### Fixed

- FollowButton no longer gets stuck showing "Unfollow" styling after a tap
  on touch devices (was reacting to a synthetic hover event with no
  matching hover-out).
- Follower/following counts on your own profile now update immediately
  when you follow or unfollow someone from the followers/following list,
  instead of only after a reload.
- Failed follow/unfollow attempts on a profile page now show an error
  message instead of failing silently.
- The bell and bug-report dropdowns in the top bar now close when you
  navigate to a different page, instead of staying open over whatever
  loads next.
- Login no longer hard-crashes if the browser blocks local storage access
  (e.g. some private-browsing modes) -- it now just falls back to a
  logged-out state.
- The "Report a bug" dropdown on mobile web no longer gets squeezed into
  the corner -- it was sized to only look right as the rightmost icon in
  the top bar, which stopped being true once the notifications bell was
  added after it.
- The notifications and bug-report dropdowns now open and close with a
  quick fade/scale instead of snapping in and out instantly.
- The star rating control was announcing itself as "Rate this episode" to
  screen readers everywhere it's actually used (rating a show or a season,
  never an episode) -- it now says which one it actually is.
- Every toggle-style button (Following/Everyone, sort and filter chips, the
  season tabs, Now Watching/watchlist/list quick actions, profile tabs,
  year picker) now reports its selected state to screen readers via
  `aria-pressed`, not just visually.
- Consolidated seven near-identical hand-rolled avatar circles, eight copies
  of the star icon, and three copies of the stat-card tile into shared
  `Avatar`/`StarGlyph`/`StatCard` components -- same look everywhere, one
  place to change it.
- Switching profiles without a specific tab in the URL no longer gets stuck
  showing whatever tab the previous profile was on.
- Toast notifications now reset their auto-dismiss timer when a new one
  replaces a still-visible one, and animate out instead of disappearing
  instantly.
- Fixed a race condition where following/unfollowing two people back-to-back
  on Members or a followers list could leave the wrong row's saving spinner
  stuck.
- A show with unexpectedly incomplete data from TMDB (missing genre or
  country info) no longer crashes the whole app when you open History's
  filters -- and if something similar ever does slip through, navigating to
  a different page now recovers instead of staying stuck on the error
  screen.
- Bumped a couple of undersized tap targets (the "See all" links on Home,
  the logo in the top bar) up to the app's usual minimum.

## [1.0.0] - 2026-08-22

First version-tracked release. TV Box has been in daily use by the group
since 2026-08-13 -- this snapshot is everything it does as of today.

### Added

- Simple email + username sign-in, with an optional shared passcode gate.
- Per-episode watch tracking, show and season ratings, and a Now Watching
  home page with per-season progress.
- Watchlist, custom shareable lists, and a yearly recap.
- Diary: a unified, chronological log of everything watched, rated, and
  rewatched.
- Rewatch logging as its own append-only event, separate from first-time
  watch progress.
- Activity feed of what the group's been finishing and rating, plus
  member directory and public profiles.
- Bulk "mark all/season watched" with a date picker, for backfilling shows
  watched before TV Box existed.
- An "Upcoming" section aggregating next air dates across everything
  currently being watched.
- One clear streaming answer per show (where to watch it), correctable by
  anyone in the group.
- Light and dark themes, following system preference by default.
- Installable as a home-screen app on iOS, with a custom app icon that
  adapts to light/dark mode.

### Fixed

Numerous rounds of hardening since launch: timezone-correct air dates and
date pickers, mobile layout/keyboard/scroll bugs, error handling and
optimistic-UI rollback, reduced-motion support, and accessibility
(focus/escape handling, touch targets).

[Unreleased]: https://github.com/thetvbox/thetvbox.github.io/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/thetvbox/thetvbox.github.io/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/thetvbox/thetvbox.github.io/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/thetvbox/thetvbox.github.io/releases/tag/v1.0.0
