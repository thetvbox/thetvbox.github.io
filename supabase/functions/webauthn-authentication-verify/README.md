# webauthn-authentication-verify

Second half of the passkey sign-in ceremony -- verifies the browser's
WebAuthn assertion response against the challenge issued by
`../webauthn-authentication-options` and the stored credential's public
key, then bumps the signature counter (clone detection) and returns the
signed-in user. See `../webauthn-registration-options/README.md` for the
full shared design notes (why four functions, origin/RP ID handling, the
account-takeover trade-off, table RLS posture, deploy instructions).
`verify_jwt` is off for the same reason as its sibling functions.
