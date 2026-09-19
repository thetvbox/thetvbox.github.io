# webauthn-registration-verify

Second half of the passkey-registration ceremony -- verifies the browser's
WebAuthn attestation response against the challenge issued by
`../webauthn-registration-options`, then stores the new credential in
`webauthn_credentials`. See `../webauthn-registration-options/README.md`
for the full shared design notes (why four functions, origin/RP ID
handling, the account-takeover trade-off, table RLS posture, deploy
instructions). `verify_jwt` is off for the same reason as its sibling
functions -- this app has no real Supabase Auth JWTs.
