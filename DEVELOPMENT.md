# Developing TV Box

**Stack:** React 19 + TypeScript, Vite, Tailwind CSS 4, react-router (HashRouter), framer-motion, Supabase (Postgres + client SDK), TMDB API for show/episode data, TVmaze as a secondary source for air-date corrections.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your own values:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from your Supabase project's API settings.
   - `VITE_TMDB_API_KEY` — a TMDB v3 API key.
   - `VITE_OMDB_API_KEY` — optional; a free omdbapi.com key. Powers the IMDb/Rotten Tomatoes badges on Show Detail. Leave unset to just hide those.
   - `VITE_SITE_PASSCODE` — optional; leave unset to disable the passcode gate.
3. Run `supabase/schema.sql` once in your Supabase project's SQL Editor to create the tables and RLS policies.
4. Deploy the Edge Functions sign-in and push notifications depend on — see [Edge Functions](#edge-functions) below. Without these, the app loads but no one can sign in (passkeys are the only auth mechanism).
5. `npm run dev`

## Scripts

- `npm run dev` — local dev server.
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`.
- `npm run lint` — oxlint.
- `npm run preview` — serve the production build locally.
- `npm test` — run the test suite once (Vitest + React Testing Library).
- `npm run test:watch` — run tests in watch mode.
- `npm run test:coverage` — run tests with a coverage report.

## Edge Functions

Six Edge Functions live in `supabase/functions/`; each folder has its own README with deploy instructions (via the Supabase CLI or, for `report-bug`, the Dashboard editor). Four are required for the app to work at all, since passkeys are the only sign-in path:

- `webauthn-registration-options`, `webauthn-registration-verify`, `webauthn-authentication-options`, `webauthn-authentication-verify` — passkey sign-in. See [supabase/functions/webauthn-registration-options/README.md](./supabase/functions/webauthn-registration-options/README.md) for the shared design (covers all four).
- `send-push` — sends a Web Push notification for every new row in `notifications`, via a Postgres trigger set up in `schema.sql`. Needs `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` set as function secrets ([supabase/functions/send-push/README.md](./supabase/functions/send-push/README.md)); the public key also goes in `src/lib/constants.ts`. Without it deployed, push subscriptions just silently don't deliver — everything else works.

Two are optional — the app works fine without them, just missing that one feature:

- `report-bug` — files a GitHub issue from the in-app "Report a bug" form. See [supabase/functions/report-bug/README.md](./supabase/functions/report-bug/README.md).
- `log-episode-watched` — lets an iOS Shortcut (and Siri) log an episode as watched via a personal access token. See [supabase/functions/log-episode-watched/README.md](./supabase/functions/log-episode-watched/README.md).

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, and builds with the `VITE_*` variables above (set as repository secrets) before publishing `dist/` to GitHub Pages. A failing lint or test run blocks the deploy. The Edge Functions above are deployed separately (Supabase, not GitHub Pages) and aren't part of this workflow.

## Project structure

- `src/pages/` — one component per route.
- `src/components/` — shared UI (cards, rows, pickers, toasts, empty states); `src/components/showDetail/` holds the subcomponents composing the show detail page specifically.
- `src/lib/` — data access (Supabase queries, TMDB/TVmaze clients) and pure business logic (activity/diary building, date handling, streaming-provider resolution), no React.
- `src/hooks/` — reusable hooks (toasts, scroll restoration, escape-to-close, streaming-platform resolution) and page-level state hooks that own a single page's data loading and mutations (e.g. `useShowDetail`).
- `src/contexts/` — auth and theme, provided at the app root.
- `supabase/schema.sql` — full schema + RLS policies, safe to re-run (`create table if not exists`, `drop policy if exists` before every `create policy`).
- `supabase/functions/` — Edge Functions; see [Edge Functions](#edge-functions) above.
- `scripts/backfill-runtime.mjs` — one-off maintenance script for backfilling episode runtime data on existing rows.
