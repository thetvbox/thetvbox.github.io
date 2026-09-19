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

**The one deliberate trade-off**: the *very first* passkey for each of
this app's existing users is still bootstrapped by email alone (the
client looks the user up by email via `webauthn-authentication-options`;
a `no_credentials` response means it's safe to call
`webauthn-registration-options` for that user's id). That's exactly the
same trust level the app already had for every sign-in until now -- not
a regression -- but it does mean there's a one-time window, per existing
user, before they've set up their own passkey, during which someone who
knows their email could set one up first. If that matters for this
friend group, the fix is operational, not code: everyone should set up
their passkey promptly after this ships. New accounts don't have this
exposure at all -- a username is chosen and a passkey registered in the
very same step, atomically from the attacker's perspective (there's no
account that exists without a passkey for more than the time between
those two calls).

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
