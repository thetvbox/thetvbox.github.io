# webauthn-authentication-options

First half of the passkey sign-in ceremony. Given an email, reports one
of three outcomes: no account exists (`reason: "no_user"`), the account
exists but hasn't registered a passkey yet (`reason: "no_credentials"`,
used by the client to offer the registration bootstrap flow instead), or
a WebAuthn assertion challenge to hand to the browser. See
`../webauthn-registration-options/README.md` for the full shared design
notes (why four functions, origin/RP ID handling, the account-takeover
trade-off, table RLS posture, deploy instructions). `verify_jwt` is off
for the same reason as its sibling functions.
