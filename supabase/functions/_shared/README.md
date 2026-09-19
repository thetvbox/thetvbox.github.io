# _shared/webauthn.ts

Helpers shared by the four `webauthn-*` Edge Functions (passkey sign-in).
See `../webauthn-registration-options/README.md` for the full design
notes -- origin/RP ID handling, the account-takeover trade-off this app
accepts, and why none of these four functions verify a Supabase JWT.

This file has no independent deployment of its own; it's uploaded
alongside each function's `index.ts` as a relative dependency (`../_shared/webauthn.ts`).
