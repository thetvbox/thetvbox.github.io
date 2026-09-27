# log-next-episode-watched Edge Function

Logs the next unwatched episode of a show as watched, given just the show's
name -- the counterpart to `log-episode-watched` for the "Log that I
watched the next episode of [show]" Siri App Intent
(`mobile/modules/siri-app-intents`), where the caller only knows a spoken
show name, not an exact episode. Same personal-access-token auth as
`log-episode-watched` -- see that function's README for how a user gets a
token (Profile -> Shortcuts & Siri in the app).

**Not deployed yet.** This was written and gated on the mobile/TypeScript
side, but applying it needs the Supabase MCP `deploy_edge_function` call,
which this environment's auto-mode classifier blocks as a "Production
Deploy" action -- the same restriction that blocked the `expo_push_tokens`
migration and the `send-push` update earlier in this phase.

## Needs a secret this project doesn't have yet

Unlike every other function in this app, this one calls TMDB to know how
many episodes are in a show's current season (so "next episode" rolls over
into the next season correctly). It needs a `TMDB_API_KEY` function secret
-- the same v3 API key the app itself already uses client-side (see
`mobile/.env.example`). Set it with:

```sh
supabase secrets set TMDB_API_KEY=<your key> --project-ref fuitioxkdagmfnvpteys
```

`whats-next` needs the same secret.

## Calling it

```
POST /functions/v1/log-next-episode-watched
Authorization: Bearer <your personal access token>
Content-Type: application/json

{ "show_name": "Severance" }
```

Matches against shows in your own `episode_watched` history (a fuzzy,
case-insensitive substring match, since Siri's transcription of a title
won't always be exact), picking the most recently-watched match. Returns
`{ "show_name", "season_number", "episode_number" }` for the episode it just
logged, or a 404 if nothing matches, or a 409 if that show has nothing left
unwatched per TMDB.

## Redeploying after a code change

Same as `log-episode-watched` -- either ask Claude to redeploy via the
Supabase MCP tools, or:

```sh
supabase functions deploy log-next-episode-watched --no-verify-jwt
```
