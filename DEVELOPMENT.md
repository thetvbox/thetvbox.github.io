# Developing TV Box

**Stack:** React 19 + TypeScript, Vite, Tailwind CSS 4, react-router (HashRouter), framer-motion, Supabase (Postgres + client SDK), TMDB API for show/episode data, TVmaze as a secondary source for air-date corrections.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your own values:
   - `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — from your Supabase project's API settings.
   - `VITE_TMDB_API_KEY` — a TMDB v3 API key.
   - `VITE_SITE_PASSCODE` — optional; leave unset to disable the passcode gate.
3. Run `supabase/schema.sql` once in your Supabase project's SQL Editor to create the tables and RLS policies.
4. `npm run dev`
5. Optional: the in-app "Report a bug" button needs the `report-bug` edge function deployed — see [supabase/functions/report-bug/README.md](./supabase/functions/report-bug/README.md). The app works fine without it; that button just won't file anything.

## Scripts

- `npm run dev` — local dev server.
- `npm run build` — typecheck (`tsc -b`) then production build to `dist/`.
- `npm run lint` — oxlint.
- `npm run preview` — serve the production build locally.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds with the four `VITE_*` variables above (set as repository secrets) and publishes `dist/` to GitHub Pages.

## Project structure

- `src/pages/` — one component per route.
- `src/components/` — shared UI (cards, rows, pickers, toasts, empty states); `src/components/showDetail/` holds the subcomponents composing the show detail page specifically.
- `src/lib/` — data access (Supabase queries, TMDB/TVmaze clients) and pure business logic (activity/diary building, date handling, streaming-provider resolution), no React.
- `src/hooks/` — reusable hooks (toasts, scroll restoration, escape-to-close, streaming-platform resolution) and page-level state hooks that own a single page's data loading and mutations (e.g. `useShowDetail`).
- `src/contexts/` — auth and theme, provided at the app root.
- `supabase/schema.sql` — full schema + RLS policies, safe to re-run (`create table if not exists`, `drop policy if exists` before every `create policy`).
- `scripts/backfill-runtime.mjs` — one-off maintenance script for backfilling episode runtime data on existing rows.
