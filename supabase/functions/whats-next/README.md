# whats-next Edge Function

Suggests one show to watch next, for the "What should I watch next" Siri
App Intent (`mobile/modules/siri-app-intents`). Same personal-access-token
auth as `log-episode-watched` -- see that function's README for how a user
gets a token.

**Not deployed yet**, for the same reason as `log-next-episode-watched`
(blocked by the environment's "Production Deploy" auto-mode classifier),
and it needs the same `TMDB_API_KEY` function secret -- see that function's
README for both.

## How it picks

Looks at the user's own `episode_watched`/`show_started` rows, excludes
anything in `show_dropped` or `show_watching_dismissed`, and walks what's
left ordered by most recent activity. For each candidate it asks TMDB
whether there's an unwatched episode left in the current season; the first
one that has one wins. This deliberately doesn't try to reproduce the
app's own "finished" flag (which needs a show's *total* episode count, not
just its current season) -- a fully-watched show just has no next episode
to offer, and the loop moves on to the next candidate instead.

## Calling it

```
POST /functions/v1/whats-next
Authorization: Bearer <your personal access token>
```

No body needed. Returns `{ "show_name", "season_number", "episode_number" }`
for the top suggestion, or a 404 if nothing's in progress.

## Redeploying after a code change

```sh
supabase functions deploy whats-next --no-verify-jwt
```
