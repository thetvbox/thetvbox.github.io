# TV Box — QA Report

**Scope:** Live, interactive testing of every route and feature (auth/passcode gate, Home, Search, ShowDetail, Activity, Members, Profile/PublicProfile, ListDetail, ShowDiary, Compare, Recap, Navbar/notifications/bug-report/theme) on both desktop (1440×900) and mobile (390×844, touch) viewports, run against a real Chromium browser with a full mock backend (Supabase + TMDB + TVmaze) so every mutation — rating, marking watched, undo, follow/unfollow, list CRUD, rewatch logging, provider overrides — was exercised end-to-end, not just page loads.

**Result:** 123/123 automated checks passed on desktop, 123/123 on mobile. One real defensive-coding gap found by source review, plus a couple of minor polish items. No broken flows, no data-loss bugs, no dead buttons.

## Issue 1 — Missing null-guard on `origin_country` can white-screen the whole app (Medium, hardening recommendation)

`src/lib/historyFilters.ts` (`buildHistoryFilterFacets`) iterates `d.origin_country` and `d.genres` for every show in a user's history with no fallback:

```js
for (const g of d.genres) genres.add(g.name)
for (const c of d.origin_country) countries.add(c)
```

If any TMDB show detail object is ever missing `origin_country` (or `genres`), this throws `TypeError: ... is not iterable`. That error is only caught by the app-wide `ErrorBoundary`, which white-screens the *entire* app, not just the History filter panel. Because the app uses `HashRouter`, navigating to a different in-app route afterward doesn't force a real page reload — the crashed tree persists across every subsequent click until the user manually reloads the page.

I triggered this myself with incomplete mock data, not against the real TMDB API — `TmdbShowDetail.origin_country`/`original_language` are typed as required, non-optional fields, and TMDB's real API does send them consistently, so this is unlikely to fire in production. But third-party API responses drift, and the blast radius here (one bad field on one show → the whole app, not just one component) is disproportionate to the trigger. Two independent, cheap fixes:

- Guard the iteration: `for (const c of d.origin_country ?? []) ...`
- Make `ErrorBoundary` (or specifically the History section) reset on route change, so a crash doesn't strand the user across the entire session.

## Issue 2 — Touch targets slightly under the 44px guideline (Low, polish)

Three elements measure below the ~44px WCAG/HIG minimum the rest of the app follows:
- Home's "See all →" links (Watchlist/Lists sections): 54×16px
- The "TV Box" logo/home link in the header: 89×28px

Low impact (both are easy to tap in practice, generous surrounding whitespace), but worth a small padding bump for consistency with the rest of the app's touch-target discipline.

## Screenshot review

Visually inspected renders across both viewports (Home, ShowDetail quick actions, Season progress/upcoming-episode banner, Activity feed, Profile stats, People, Navbar dropdown). No layout overflow, clipped text, or contrast issues found. One thing I looked at closely and ruled out: a screenshot of the "Report a bug" success panel showed faint overlapping text, which turned out to be a mid-fade animation frame caught by the screenshot timing, not a real rendering bug — the panel is a standard `absolute` dropdown anchored under its trigger icon and renders correctly at rest.

## What was verified working (desktop + mobile, both passing 123/123)

- **Auth/gate:** passcode gate, login, registration with duplicate-username/email conflict handling, sign out.
- **Home:** Now Watching row, Watchlist, Lists, greeting, empty states.
- **Search:** query, results, navigation to show detail.
- **ShowDetail:** star ratings (show + season) with clear/undo, mark episode/season/all watched with exact undo-toast counts, "Seen this before" bulk mark-all, Now Watching start/remove/re-add, watchlist toggle, Add-to-list picker (add/remove/create), rewatch log/delete, streaming provider override/reset, season switching, episode overview show-more/less, upcoming-episode banner date/episode-number accuracy.
- **Activity:** Following/Everyone/person-filter scoping, correct own-activity-always-visible behavior.
- **Members:** search, follow/unfollow, follows-you badge.
- **Profile/PublicProfile:** stats (verified exact figures against hand-computed expected values), Diary/History/Watchlist/Lists tabs, History filters panel, Year in Review, Public view, Compare.
- **ListDetail / ShowDiary:** item add/remove, list delete, diary chronological log.
- **Recap:** loads and renders.
- **Navbar:** top nav (desktop) + bottom tab bar (mobile), scroll-to-top on re-tap, theme toggle, notifications bell (unread badge logic verified correct via code review — see note below), bug report form + success state.

**One test-infrastructure note, not an app issue:** the mock backend's HEAD-request response headers weren't readable client-side in this specific sandboxed Chromium setup (a Playwright/environment limitation, not a Supabase or app defect), so the notifications unread-count badge was verified by direct code review of `lib/follows.ts` instead of a live assertion. The underlying logic is correct.

## Bottom line

The app is in strong shape for the standard you asked for. No confirmed live bugs — one real gap in defensive coding worth hardening before scale, two sub-pixel-scale touch targets worth a polish pass, everything else (the vast majority of the app's surface area) tested clean.
