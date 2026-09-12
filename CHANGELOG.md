# Changelog

All notable changes to TV Box are documented here. Format loosely follows
[Keep a Changelog](https://keepachangelog.com/en/1.0.0/); dates are
`YYYY-MM-DD`.

## [Unreleased]

### Added

- Show Detail now shows the IMDb rating and Rotten Tomatoes score next to
  a show's year/seasons/status, sourced from OMDb -- requires an optional
  free OMDb API key (see .env.example); scores just don't show up without
  one, or for the rare show OMDb has no data for.
- A show you've rated one or more seasons of, but haven't rated overall,
  now shows a live estimate (the average of just those seasons) next to
  "Rate this show" -- click it to see which seasons and how they were
  rated. It's never saved as your actual rating of the show; it disappears
  the moment you do rate the show yourself.

### Changed

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
  and the per-person filter moved behind a single "Person" button that
  opens a dropdown listing each name with their avatar -- same filtering,
  one row instead of two. The dropdown floats over the page and closes on
  an outside click, instead of an early version that pushed the feed down
  like a full-width filter panel.
- Profile: "Year in review", "Public view", and "Sign out" were three
  equal-weight buttons next to your name; they're now one "More" button
  that opens a small dropdown menu, since they're occasional actions next
  to the activity you're actually there to see. The menu floats over the
  page and closes on an outside click, instead of an early version that
  pushed your activity feed down like a full-width panel. Your stat cards
  and rating chart are now grouped into one card instead of two
  separately-spaced blocks, and the Watchlist/Dropped/Lists tabs show a
  count once they have anything in them. The Finished and Episodes
  watched stat cards are now shortcuts to the History and Diary tabs.
- Every centered overlay (Report a bug, What's new, followers/following,
  the rating breakdown) now shares the same frosted-glass panel as the
  notification/person/more dropdowns, instead of a flat solid background
  -- one consistent look for every popup in the app instead of two
  slightly different ones. All overlays and dropdowns also now trap Tab
  within themselves while open, instead of letting keyboard focus tab out
  to the page underneath.

### Fixed

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
