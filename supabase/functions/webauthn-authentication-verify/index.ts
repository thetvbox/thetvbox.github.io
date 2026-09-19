// Supabase Edge Function: verifies a WebAuthn passkey sign-in response
// against the stored credential's public key. Pairs with
// ../webauthn-authentication-options; see
// ../webauthn-registration-options/README.md for the shared design
// notes. verify_jwt is off for the same reason as its sibling functions.

import { verifyAuthenticationResponse } from 'npm:@simplewebauthn/server@14'
import { base64UrlToBytes, consumeChallenge, CORS_HEADERS, jsonResponse, resolveRelyingParty, serviceClient } from '../_shared/webauthn.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const rp = resolveRelyingParty(req)
  if (!rp) return jsonResponse({ error: 'Request origin not allowed' }, 403)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  const body = payload as Record<string, unknown> | null
  const email = body?.email
  const response = body?.response as { id?: string } | undefined
  if (typeof email !== 'string' || !email.trim() || !response || typeof response.id !== 'string') {
    return jsonResponse({ error: 'email and response are required' }, 400)
  }

  const supabase = serviceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  if (userError) {
    console.error('User lookup failed', userError)
    return jsonResponse({ error: 'Failed to look up account' }, 500)
  }
  if (!user) return jsonResponse({ error: 'No account found for that email.' }, 404)

  const challenge = await consumeChallenge(supabase, user.id, 'authentication')
  if (!challenge) {
    return jsonResponse({ error: 'Sign-in session expired. Try again.' }, 400)
  }

  const { data: credentialRow, error: credError } = await supabase
    .from('webauthn_credentials')
    .select('*')
    .eq('user_id', user.id)
    .eq('credential_id', response.id)
    .maybeSingle()
  if (credError) {
    console.error('Credential lookup failed', credError)
    return jsonResponse({ error: 'Failed to verify passkey' }, 500)
  }
  if (!credentialRow) {
    return jsonResponse({ error: 'Passkey not recognized for this account.' }, 401)
  }

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      // deno-lint-ignore no-explicit-any
      response: response as any,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
      credential: {
        id: credentialRow.credential_id,
        publicKey: base64UrlToBytes(credentialRow.public_key),
        counter: credentialRow.counter,
        transports: credentialRow.transports ?? undefined,
      },
    })
  } catch (err) {
    console.error('Authentication verification threw', err)
    return jsonResponse({ error: 'Could not verify the passkey. Try again.' }, 401)
  }

  if (!verification.verified) {
    return jsonResponse({ error: 'Could not verify the passkey. Try again.' }, 401)
  }

  await supabase
    .from('webauthn_credentials')
    .update({ counter: verification.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
    .eq('id', credentialRow.id)

  return jsonResponse({ user }, 200)
})
