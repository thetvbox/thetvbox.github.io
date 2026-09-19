// Supabase Edge Function: issues a WebAuthn passkey sign-in challenge for
// an email, or reports why sign-in with a passkey isn't possible yet
// (no account, or an account that hasn't set up a passkey). See
// ../webauthn-registration-options/README.md for the shared design
// notes; verify_jwt is off for the same reason as its sibling functions.

import { generateAuthenticationOptions } from 'npm:@simplewebauthn/server@14'
import { CORS_HEADERS, jsonResponse, resolveRelyingParty, serviceClient, storeChallenge } from '../_shared/webauthn.ts'

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
  const email = (payload as Record<string, unknown> | null)?.email
  if (typeof email !== 'string' || !email.trim()) {
    return jsonResponse({ error: 'email is required' }, 400)
  }

  const supabase = serviceClient()

  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, username')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()
  if (userError) {
    console.error('User lookup failed', userError)
    return jsonResponse({ error: 'Failed to look up account' }, 500)
  }
  if (!user) {
    return jsonResponse({ error: 'No account found for that email.', reason: 'no_user' }, 404)
  }

  const { data: credentials, error: credError } = await supabase
    .from('webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', user.id)
  if (credError) {
    console.error('Credential lookup failed', credError)
    return jsonResponse({ error: 'Failed to look up passkeys' }, 500)
  }
  if (!credentials || credentials.length === 0) {
    return jsonResponse(
      {
        error: "This account hasn't set up a passkey yet.",
        reason: 'no_credentials',
        user: { id: user.id, username: user.username },
      },
      404,
    )
  }

  const options = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: 'preferred',
    allowCredentials: credentials.map((c) => ({
      id: c.credential_id as string,
      transports: (c.transports ?? undefined) as string[] | undefined,
    })),
  })

  await storeChallenge(supabase, user.id, 'authentication', options.challenge)

  return jsonResponse({ options }, 200)
})
