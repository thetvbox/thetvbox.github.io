# log-episode-watched Edge Function

Logs an episode as watched on behalf of a user, authenticated by a personal
access token instead of a Supabase session -- built so an iOS Shortcut (and
therefore Siri) can log an episode without opening the app.

Unlike `report-bug`, this function needs no secrets: it only reads and
writes this project's own database, using the service role key Supabase
already injects into every Edge Function automatically. It's deployed and
live at:

```
https://fuitioxkdagmfnvpteys.supabase.co/functions/v1/log-episode-watched
```

## Getting a token

In the app, go to **Profile -> Shortcuts & Siri** and create a token. The
raw token is shown once -- copy it immediately, since only its hash is ever
stored. Revoking a token from that same screen makes it stop working
immediately.

## Calling it

```
POST /functions/v1/log-episode-watched
Authorization: Bearer <your personal access token>
Content-Type: application/json

{
  "show_id": 1396,
  "show_name": "Breaking Bad",
  "show_poster_path": "/ineLOMcxAeUUYZzZ2C7ZeUpJHOb.jpg",
  "season_number": 3,
  "episode_number": 7,
  "episode_name": "One Minute"
}
```

`show_poster_path` and `episode_name` are optional. A successful call
returns `{ "ok": true }`; the same episode shows up in the app's diary/watch
history right away.

### Setting this up as an iOS Shortcut

1. Shortcuts app -> **+** -> Add Action -> **Get Contents of URL**.
2. URL: the endpoint above. Method: **POST**.
3. Headers: `Authorization` = `Bearer <your token>`, `Content-Type` =
   `application/json`.
4. Request Body: **JSON**, with the fields above filled in for whichever
   show/episode this Shortcut is for.
5. Name the Shortcut something like "Log Breaking Bad S3E7" and optionally
   add it to Siri (Shortcut Details -> **Add to Siri**, record a phrase).

Since the body is fixed per-Shortcut, this works best as one Shortcut per
"next episode" you're about to watch, or duplicated per show with the
episode numbers bumped as you go. `season_number`/`episode_number` can also
be wired to a Shortcuts variable if you want to increment it yourself
between runs.

## Redeploying after a code change

This function was deployed directly (via the Supabase MCP tools), with
`supabase/functions/log-episode-watched/index.ts` in this repo as the
source of truth. To push a future change to `index.ts`, either:

- Ask Claude to redeploy it (same MCP tool), or
- Use the Supabase CLI:

  ```sh
  supabase login
  supabase link --project-ref fuitioxkdagmfnvpteys
  supabase functions deploy log-episode-watched --no-verify-jwt
  ```

  (`--no-verify-jwt` matters here -- this function does its own auth via
  the personal access token, not a Supabase JWT.)

- Or paste the file into the Dashboard editor, the same way described in
  `supabase/functions/report-bug/README.md`, making sure "Verify JWT with
  legacy secret" / JWT verification is turned **off** for this function.
