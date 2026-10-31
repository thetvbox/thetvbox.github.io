# webauthn-registration-options / webauthn-registration-verify / webauthn-authentication-options / webauthn-authentication-verify

Four Edge Functions implement passkey sign-in, replacing this app's old
"type your email, you're in" login (see `src/contexts/AuthContext.tsx`
and `src/pages/Login.tsx`). This README covers the shared design; each
function's own folder has a one-paragraph README pointing back here.

## Why four functions

- **webauthn-registration-options** / **webauthn-registration-verify** --
  the "create a passkey" ceremony (WebAuthn attestation).
- **webauthn-authentication-options** / **webauthn-authentication-verify**
  -- the "sign in with a passkey" ceremony (WebAuthn assertion).

Each ceremony is a two-step round trip (options -> browser prompt ->
verify) by the nature of WebAuthn, so this is the standard SimpleWebAuthn
4-endpoint shape, not something split up unnecessarily.

## Library, not hand-rolled crypto

These import `npm:@simplewebauthn/server@14` directly -- Supabase's Deno
Edge Runtime supports `npm:` specifiers natively, no bundling step
needed. Parsing CBOR attestation objects, COSE public keys, and verifying
ECDSA/RSA signatures by hand is exactly the kind of security-critical
code that should lean on a well-audited library instead of a first
attempt written for this app.

## Origin / RP ID handling

WebAuthn ties every credential to a Relying Party ID (RP ID), which must
exactly match the domain serving the page. This app is served from
`https://thetvbox.github.io` in production and `http://localhost:5173` in
local dev (`npm run dev`). `_shared/webauthn.ts`'s `resolveRelyingParty()`
validates the request's `Origin` header against exactly those two and
derives `expectedRPID` from *that* origin -- never hardcoded to one or
the other -- so both environments work and a request from any other
origin is rejected outright (403) before anything else runs.

## The account-takeover question, and how it's closed

The old login trusted email alone -- anyone who knew (or guessed) a
friend's email could sign in as them, no verification at all. Passkeys
are a real security upgrade, but only if registering a *new* passkey onto
an *existing* account requires proving you already own it -- otherwise an
attacker could email-bootstrap a passkey onto someone else's account and
end up with a much stronger, harder-to-revoke foothold than before.

`webauthn-registration-options` refuses (403) to issue registration
options for any user that already has at least one passkey (checked via
a `webauthn_credentials` count). That closes the door permanently, right
after a user's first passkey is registered -- from then on, the *only*
way into that account is a valid WebAuthn assertion against a credential
physically held on one of their own devices (Face ID, Touch ID, Windows
Hello, or a security key).

**Only the signed-in owner can add a passkey.** Both registration
functions (options and verify) require the caller's own Supabase session
(sent as the bearer token) to resolve to the account
(`isAccountOwner` in `_shared/webauthn.ts`, through
`current_app_user_id()`). There is no anonymous path. New members first
confirm their email with a one-time code and redeem the invite code,
which creates the account. Then they add their passkey. Anyone with an
account but no passkey confirms their email the same way.

## Sessions

Both verify functions (`webauthn-authentication-verify` and
`webauthn-registration-verify`) finish by starting a real Supabase Auth
session for the account (`_shared/session.ts`) and return it next to
the user row. The browser installs it with `supabase.auth.setSession`.

- If the account already has a linked login (`user_auth_links`, or the
  older app's `users.auth_user_id`), that login is used.
- Otherwise a login is created with the account's email and linked as
  `passkey`.
- If that email already belongs to a login that isn't linked to any
  account, that login is linked. If it's linked to a different account,
  sign-in stops with a 409.

## Tables

`webauthn_credentials` (one row per registered passkey: credential ID,
public key, signature counter, transports, device type) and
`webauthn_challenges` (short-lived, single-use challenges issued by the
`*-options` functions and consumed by `*-verify`) both have Row Level
Security enabled with **no policies at all** -- unlike the rest of this
app's wide-open "Anyone can ..." tables. Only the service-role key these
functions use can touch them; the client anon key has no legitimate
reason to read a stored public key or signature counter directly.

## Deploying

Written and committed as source of truth (deployed directly via the
Supabase MCP tools during development; each function bundles its own
`index.ts` plus `../_shared/webauthn.ts` as a relative dependency in the
same deploy call). To redeploy after a code change, either ask Claude to
redeploy via those same tools, or use the Supabase CLI:

```sh
supabase login
supabase link --project-ref fuitioxkdagmfnvpteys
supabase functions deploy webauthn-registration-options --no-verify-jwt
supabase functions deploy webauthn-registration-verify --no-verify-jwt
supabase functions deploy webauthn-authentication-options --no-verify-jwt
supabase functions deploy webauthn-authentication-verify --no-verify-jwt
```

`--no-verify-jwt` matters for all four -- they do their own auth via the
WebAuthn ceremony and a short-lived, single-use challenge, not a Supabase
JWT (this app has no real Supabase Auth sessions to begin with).
