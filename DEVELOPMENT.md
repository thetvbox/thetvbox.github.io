# Developing TV Box

**Stack:** React 19 + TypeScript, Vite, Tailwind CSS 4, react-router (HashRouter), framer-motion, Supabase (Postgres + client SDK), TMDB API for show/episode data, TVmaze as a secondary source for air-date corrections.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your own values:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from your Supabase project's API settings.
   - `VITE_TMDB_API_KEY` — a TMDB v3 API key.
   - `VITE_OMDB_API_KEY` — optional; a free omdbapi.com key. Powers the IMDb/Rotten Tomatoes badges on Show Detail. Leave unset to just hide those.
   - `VITE_SITE_PASSCODE` — optional; leave unset to disable the passcode gate.
3. Run `supabase/schema.sql` once in your Supabase project's SQL Editor to create the tables. Database changes for this app's own tables, views, functions and indexes go in `schema.sql` (written to be safe to re-run) and are applied to production by hand. Changes to the shared auth layer (real Supabase Auth sessions, invites, members-only access) are migrations in the `tv-box-native` repo's `supabase/migrations/`.
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

Edge Functions live in `supabase/functions/`; each folder has a README with deploy notes. Required for the app to work:

- `webauthn-registration-options`, `webauthn-registration-verify`, `webauthn-authentication-options`, `webauthn-authentication-verify` — passkey sign-in; the verify functions also start the Supabase session the app sends with every request. Shared design: [webauthn-registration-options/README.md](./supabase/functions/webauthn-registration-options/README.md).
- `send-push` — sends Web Push for new `notifications` rows, called by a database trigger with just the row id. Needs `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` function secrets ([send-push/README.md](./supabase/functions/send-push/README.md)); the public key also goes in `src/lib/constants.ts`.

Optional:

- `report-bug` — files a GitHub issue from the in-app "Report a bug" form.
- `log-episode-watched`, `log-next-episode-watched`, `whats-next` — Shortcuts and Siri endpoints authenticated with a personal access token. The last two need a `TMDB_API_KEY` function secret.

Shared code is in `supabase/functions/_shared/`; Deno tests sit next to it as `*_test.ts` (`deno test supabase/functions/_shared/`).

## Database tests

`supabase/tests/*.sql` run in one transaction each and roll back: `psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/season_splits.sql`.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which lints, tests, and builds with the `VITE_*` variables above (set as repository secrets) before publishing `dist/` to GitHub Pages. A failing lint or test run blocks the deploy. The Edge Functions above are deployed separately (Supabase, not GitHub Pages) and aren't part of this workflow.

## Project structure

- `src/pages/` — one component per route.
- `src/components/` — shared UI (cards, rows, pickers, toasts, empty states); `src/components/showDetail/` holds the subcomponents composing the show detail page specifically.
- `src/lib/` — data access (Supabase queries, TMDB/TVmaze clients) and pure business logic (activity/diary building, date handling, streaming-provider resolution), no React. Screens read TMDB shows through `src/lib/shows.ts`, which applies season splits.
- `src/hooks/` — reusable hooks (toasts, scroll restoration, escape-to-close, streaming-platform resolution) and page-level state hooks that own a single page's data loading and mutations (e.g. `useShowDetail`).
- `src/contexts/` — auth and theme, provided at the app root.
- `supabase/schema.sql` — this app's schema, safe to re-run (`create table if not exists`, `drop policy if exists` before every `create policy`).
- `supabase/tests/` — database tests.
- `supabase/functions/` — Edge Functions; see [Edge Functions](#edge-functions) above.
