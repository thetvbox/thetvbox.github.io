# _shared/webauthn.ts

Helpers shared by the four `webauthn-*` Edge Functions (passkey sign-in).
See `../webauthn-registration-options/README.md` for the full design
notes -- origin/RP ID handling, the account-takeover trade-off this app
accepts, and why none of these four functions verify a Supabase JWT.

This file has no independent deployment of its own; it's uploaded
alongside each function's `index.ts` as a relative dependency (`../_shared/webauthn.ts`).

# _shared/personalAccessToken.ts, _shared/nextEpisode.ts

Helpers shared by the two Siri App Intent functions, `log-next-episode-watched`
and `whats-next` -- PAT lookup/auth, and the "first not-fully-watched
season, watched+1" next-episode rule (calls TMDB, needs `TMDB_API_KEY`; see
either function's README). Same non-deployment note as `webauthn.ts` above:
uploaded alongside each function's `index.ts` as a relative dependency.
`log-episode-watched` predates `personalAccessToken.ts` and keeps its own
inline copy of the token-auth logic rather than being retrofitted onto it.
