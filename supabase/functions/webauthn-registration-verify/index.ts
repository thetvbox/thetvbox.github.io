// Supabase Edge Function: verifies a WebAuthn passkey-registration response and stores the credential. See ../webauthn-registration-options/README.md for the full design notes.

import { verifyRegistrationResponse } from 'npm:@simplewebauthn/server@14'
import {
  bytesToBase64Url,
  consumeChallenge,
  CORS_HEADERS,
  hasPasskey,
  isAccountOwner,
  PASSKEY_ALREADY_SET,
  PASSKEY_NEEDS_SIGN_IN,
  jsonResponse,
  resolveRelyingParty,
  serviceClient,
} from '../_shared/webauthn.ts'
import { startSession, supabaseSessionDeps } from '../_shared/session.ts'

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
  const userId = body?.user_id
  const response = body?.response
  if (typeof userId !== 'string' || !userId || !response || typeof response !== 'object') {
    return jsonResponse({ error: 'user_id and response are required' }, 400)
  }

  const supabase = serviceClient()

  const { data: user, error: userError } = await supabase.from('users').select('*').eq('id', userId).maybeSingle()
  if (userError) {
    console.error('User lookup failed', userError)
    return jsonResponse({ error: 'Failed to look up account' }, 500)
  }
  if (!user) return jsonResponse({ error: 'Account not found' }, 404)
  if (!(await isAccountOwner(req, user.id))) return jsonResponse({ error: PASSKEY_NEEDS_SIGN_IN }, 403)

  const existing = await hasPasskey(supabase, user.id)
  if (existing === null) return jsonResponse({ error: 'Failed to check existing passkeys' }, 500)
  if (existing) return jsonResponse({ error: PASSKEY_ALREADY_SET }, 403)

  const challenge = await consumeChallenge(supabase, userId, 'registration')
  if (!challenge) {
    return jsonResponse({ error: 'Registration session expired. Try again.' }, 400)
  }

  let verification
  try {
    // deno-lint-ignore no-explicit-any
    verification = await verifyRegistrationResponse({
      response: response as any,
      expectedChallenge: challenge,
      expectedOrigin: rp.origin,
      expectedRPID: rp.rpID,
    })
  } catch (err) {
    console.error('Registration verification threw', err)
    return jsonResponse({ error: 'Could not verify the passkey. Try again.' }, 400)
  }

  if (!verification.verified || !verification.registrationInfo) {
    return jsonResponse({ error: 'Could not verify the passkey. Try again.' }, 400)
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

  const { error: insertError } = await supabase.from('webauthn_credentials').insert({
    user_id: userId,
    credential_id: credential.id,
    public_key: bytesToBase64Url(credential.publicKey),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports ?? [],
  })
  if (insertError) {
    console.error('Credential insert failed', insertError)
    if (insertError.code === '23505') {
      return jsonResponse({ error: 'This passkey is already registered.' }, 409)
    }
    return jsonResponse({ error: 'Failed to save the passkey. Try again.' }, 500)
  }

  const session = await startSession(supabaseSessionDeps(supabase), user)
  if ('error' in session) return jsonResponse({ error: session.error }, session.status)
  return jsonResponse({ user, session: session.tokens }, 200)
})
