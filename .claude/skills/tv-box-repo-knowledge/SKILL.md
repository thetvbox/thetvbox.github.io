---
name: tv-box-repo-knowledge
description: Reference for how TV Box (this repo) is built -- its features, architecture, data model, and house conventions. Use this whenever you're about to make a non-trivial change here, aren't sure where something lives, or need to know an established pattern (comment style, motion, error handling, testing, commit discipline) before writing new code. Consult it before guessing at file locations or re-deriving conventions from scratch.
---

# TV Box repo knowledge

TV Box is "Letterboxd, but for TV shows": a small-group app for tracking, rating, and discussing TV shows episode by episode. It's a static single-page app (GitHub Pages) with no backend server of its own -- everything talks directly to Supabase and TMDB from the browser.

Read this before making changes so you don't re-derive things that are already established, and so new code lands in the pattern the rest of the repo already follows. If something here looks stale (a file moved, a convention changed), trust the actual repo state over this document and consider updating this file.

## Stack

React 19 + TypeScript, Vite, Tailwind CSS 4, react-router v6 (`HashRouter`, since GitHub Pages has no server-side routing), framer-motion, Supabase (Postgres 17 + `@supabase/supabase-js`, permissive RLS, no real auth -- email+username sign-in only), TMDB API for show/episode data, TVmaze as a secondary source for air-date corrections. Vitest + React Testing Library + jsdom for tests, oxlint for linting.

## Directory map

- `src/pages/` -- one component per route. See `src/lib/routes.ts` for the `ROUTES` map and route-builder helpers (`showRoute`, `profileRoute`, etc.) -- always build hrefs through these, never hand-write a path string.
- `src/components/` -- shared UI. `src/components/showDetail/` holds the subcomponents composing the show detail page specifically (`ShowDetailHero`, `ShowDetailQuickActions`, `ShowDetailProgress`, `ShowDetailStreaming`, `ShowDetailSeasons`). `src/components/profileActivity/` holds the Profile page's tab contents (`DiaryTab`, `WatchlistTab`, `DroppedTab`, `ListsTab`).
- `src/lib/` -- data access (Supabase queries, TMDB/TVmaze clients) and pure business logic (activity/diary building, date handling, streaming-provider resolution). No React here -- this is what makes `showActivity.ts`, `pagination.ts`, `date.ts`, `seasonProgress.ts` etc. straightforward to unit test.
- `src/hooks/` -- reusable hooks (`useToast`, `useScrollRestoration`, `useEscapeAndFocusReturn`, `useStreamingPlatforms`) and page-level state hooks that own a single page's data loading and mutations (`useShowDetail` is the big one, backing `ShowDetail.tsx`).
- `src/contexts/` -- `AuthContext` (the logged-in `AppUser`, backed by localStorage, no real session/token) and `ThemeContext` (light/dark, follows system by default), provided at the app root.
- `src/test/` -- test-only infrastructure: `setup.ts` (registers RTL's `cleanup()`), `supabaseMock.ts` (chainable Supabase query-builder mock), `framerMotionMock.tsx` (synchronous framer-motion test double -- see Testing below for *why* this exists).
- `supabase/schema.sql` -- full schema + RLS policies. Idempotent and safe to re-run (`create table if not exists`, `drop policy if exists` before every `create policy`). This is the source of truth for the data model -- read it directly rather than trusting a summary, including this one.
- `scripts/backfill-runtime.mjs` -- one-off maintenance script, not run by CI or the app.

## Data model, at a glance

Core tables: `users`, `episode_watched` (the per-episode watch log; `show_total_episodes` is a denormalized snapshot used to compute "finished"), `show_ratings`, `season_ratings`, `show_started`, `show_watching_dismissed`, `show_dropped`, `show_rewatches`, `watchlist`, `show_lists` + `show_list_items`, `show_streaming_overrides`, `follows`, `notifications`. Two Postgres views, `episode_watched_show_summary` and `episode_watched_undated_summary`, pre-aggregate per-show watch totals so Profile stats don't have to paginate and sum raw rows client-side (see the Performance section below).

A show's state is a composition of independent, orthogonal flags, not a single enum: it can be started, have N episodes watched, be on the watchlist, be dismissed from Now Watching, and be dropped, all at once or in various combinations. `src/lib/showActivity.ts`'s `summarizeShowActivity` is where these get merged into one `ShowActivity` row per show, and `nowWatching` / `watchHistory` are the filters that turn that into "what shows on Home" vs. "what shows in History". If you're adding a new per-show status, this is the file to extend, and it already has a `.test.ts` covering all the derived-state edge cases -- use it as a reference for what "finished" logic and Now Watching eligibility currently mean before changing them.

## Established conventions

**Comments.** Only functions/methods get a doc comment, and it's exactly one line describing what the function does -- no paragraph comments, no inline reasoning comments, no comments on type/interface fields, no section-divider comments. `eslint-disable-next-line` directives are the one exception (they're compiler directives, not documentation, and are preserved). This was a deliberate, repo-wide decision, not an oversight -- don't reintroduce explanatory paragraph comments even for a genuinely tricky piece of logic; if it needs explaining, either the one-line doc captures the "what," or the code itself should be made clearer.

**Never `window.confirm()`.** Destructive/bulk actions use an inline expand-to-confirm pattern instead (see `DateMarkControl.tsx`, `InlineConfirmCancel.tsx`) -- the confirm step is a second click revealed inline, not a native dialog.

**Motion.** All framer-motion variants/durations/easings live in `src/lib/motion.ts` as named exports (e.g. `TRIGGER_SWAP_MOTION`, `DROPDOWN_PANEL_INITIAL/ANIMATE/EXIT`, `staggerRowMotion`) -- new animated UI should reuse or extend these rather than inlining ad hoc `transition={{...}}` objects, so timing stays consistent across the app. `scrollBehavior()` and `prefersReducedMotion()` gate direct `window.scrollTo` calls; `MotionConfig reducedMotion="user"` at the app root handles framer-motion's own animations.

**Error handling.** Optimistic UI updates roll back on failure and surface an error via the shared `useToast` hook (`showError`/`showUndo`), not a silent catch. Bulk mutations that can overwrite existing data offer an "Undo" toast action backed by a pre-mutation snapshot (see `handleMarkAllWatched`/`undoBulkMark` in `useShowDetail.ts`) rather than requiring a confirmation dialog up front.

**Accessibility.** Toggle-style buttons report state via `aria-pressed`, not just a visual class swap. Panels/modals use `useEscapeAndFocusReturn` for Escape-to-close and returning focus to the trigger element. Touch targets follow a ~44px minimum.

**No fabricated data.** Don't invent plausible-looking placeholder values for a real user's row to "fix" a display bug -- use the app's actual "unknown" state (e.g. `watched_at_unknown`, `UNKNOWN_WATCHED_AT`) instead of guessing a date.

**No local staging database.** There's one Supabase project. Any DB-level testing or live-browser QA against real data must clean up the fake rows/follows/notifications it creates -- shared feeds (Activity, notifications) are visible to the whole group, so test pollution is a real user-facing bug, not just noise.

**Commit discipline.** Always `git commit` locally; never `git push`. The user pushes when ready. Prefer several small, logically-scoped commits over one large one for a multi-part change.

## Performance patterns already in place

- `src/lib/pagination.ts`'s `fetchPaginated` works around PostgREST's 1000-row-per-request cap by paging with parallel `.range()` requests -- use it (or `supabase.range()` directly with awareness of the cap) rather than assuming a single `.select()` returns everything for a user with a large history.
- Profile stats are served from the two aggregation views mentioned above instead of summing raw `episode_watched` rows client-side -- this took a ~1.2s load down to ~90ms. If you're adding a new stat, check whether it can be added to one of those views before reaching for a client-side reduce over paginated raw rows.
- TMDB/TVmaze lookups are session-cached at module scope (`showDetailCache` in `tmdb.ts`, `seasonCache`/`nextEpisodeCache` in `seasonProgress.ts`, `showIdByImdbId`/`airDatesByTvmazeShowId` in `tvmaze.ts`) -- these caches are why `fetchSeasonBreakdowns`/`fetchNextEpisode` tests use distinct show IDs per test case, to avoid one test's cached result leaking into another's assertions.

## Testing

Vitest + React Testing Library + jsdom, configured in `vite.config.ts`'s `test` block. Run with `npm test` (single run), `npm run test:watch`, or `npm run test:coverage`. `src/test/setup.ts` wires up jest-dom matchers and RTL's `cleanup()`.

Two gotchas worth knowing before writing a new test:

1. **framer-motion's `AnimatePresence mode="wait"`** never resolves its exit transition under jsdom, so a component that swaps between two `motion.*` children via `AnimatePresence` (like `DateMarkControl`'s trigger-vs-form swap) will appear stuck on the old child forever in a naive test. Mock `framer-motion` with `src/test/framerMotionMock.tsx` (`vi.mock('framer-motion', () => framerMotionMock)`) in any test that renders a component using `AnimatePresence` for conditional swapping. That mock's `motion.*` proxy caches each tag's component by name deliberately -- an uncached version returns a new component identity on every property access, which makes React treat every re-render as a full remount and silently detaches DOM nodes you queried earlier in the test.
2. **Supabase's chained query builder** (`.from().select().eq().order()...`) is mocked via `src/test/supabaseMock.ts`'s `createQueryBuilder`, which returns an object where every chain method returns itself and the object itself is thenable -- so it resolves correctly regardless of which method happens to be last in a given call (`.range()`, `.single()`, `.maybeSingle()`, or none of those). Mock `../lib/supabase` at the top of the test file and set `vi.mocked(supabase.from).mockReturnValue(builder)` per test.

CI (`.github/workflows/deploy.yml`) runs lint, then test, then build, before the GitHub Pages deploy job -- a failing test or lint error blocks deploy.

## Where things are documented

`README.md` is the user-facing feature list (what the app does, from the user's point of view -- keep it in sync when you ship a user-visible feature). `DEVELOPMENT.md` is the contributor setup/scripts/structure reference. `CHANGELOG.md` follows Keep a Changelog format, with an `[Unreleased]` section for shipped-but-not-tagged work.
