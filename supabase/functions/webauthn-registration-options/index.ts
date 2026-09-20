// Supabase Edge Function: issues a WebAuthn passkey-registration challenge for an existing user. See README.md next to this file for the full design notes.

import { generateRegistrationOptions } from 'npm:@simplewebauthn/server@14'
import {
  CORS_HEADERS,
  jsonResponse,
  resolveRelyingParty,
  serviceClient,
  storeChallenge,
  uuidToBytes,
} from '../_shared/webauthn.ts'

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
  const userId = (payload as Record<string, unknown> | null)?.user_id
  if (typeof userId !== 'string' || !userId) {
    return jsonResponse({ error: 'user_id is required' }, 400)
  }

  const supabase = serviceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username')
    .eq('id', userId)
    .maybeSingle()
  if (userError) {
    console.error('User lookup failed', userError)
    return jsonResponse({ error: 'Failed to look up account' }, 500)
  }
  if (!user) return jsonResponse({ error: 'Account not found' }, 404)

  const { count, error: countError } = await supabase
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (countError) {
    console.error('Credential count failed', countError)
    return jsonResponse({ error: 'Failed to check existing passkeys' }, 500)
  }
  if (count && count > 0) {
    return jsonResponse({ error: 'This account already has a passkey. Sign in with it instead.' }, 403)
  }

  const options = await generateRegistrationOptions({
    rpName: 'TV Box',
    rpID: rp.rpID,
    userName: user.username,
    userID: uuidToBytes(user.id),
    userDisplayName: user.username,
    attestationType: 'none',
    excludeCredentials: [],
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  })

  await storeChallenge(supabase, user.id, 'registration', options.challenge)

  return jsonResponse({ options }, 200)
})
