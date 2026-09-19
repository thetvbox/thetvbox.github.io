// Shared helpers for the webauthn-* Edge Functions. See
// supabase/functions/webauthn-registration-options/README.md (and its
// siblings) for the full design notes this supports -- origin/RP ID
// handling, the account-takeover trade-off, and why this app has no
// verify_jwt on any of these four functions.

import { createClient } from 'jsr:@supabase/supabase-js@2'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ALLOWED_ORIGINS = ['https://thetvbox.github.io', 'http://localhost:5173']

const CHALLENGE_TTL_MS = 5 * 60 * 1000

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Validates the request's Origin header against the app's known origins, deriving the matching RP ID. */
export function resolveRelyingParty(req: Request): { origin: string; rpID: string } | null {
  const origin = req.headers.get('origin')
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) return null
  return { origin, rpID: new URL(origin).hostname }
}

/** A Supabase client authenticated with the service role key -- bypasses RLS, used only server-side. */
export function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

export type ChallengeType = 'registration' | 'authentication'

/** Stores a fresh, short-lived challenge for a user, replacing any earlier one of the same type. */
export async function storeChallenge(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
  type: ChallengeType,
  challenge: string,
): Promise<void> {
  await supabase.from('webauthn_challenges').delete().eq('user_id', userId).eq('type', type)
  await supabase.from('webauthn_challenges').insert({
    user_id: userId,
    type,
    challenge,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  })
}

/** Fetches and deletes (single-use) the pending, non-expired challenge for a user, or null if there isn't one. */
export async function consumeChallenge(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
  type: ChallengeType,
): Promise<string | null> {
  const { data } = await supabase
    .from('webauthn_challenges')
    .select('id, challenge, expires_at')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) return null
  await supabase.from('webauthn_challenges').delete().eq('id', data.id)
  if (new Date(data.expires_at).getTime() < Date.now()) return null
  return data.challenge
}

/** Base64url-encodes raw bytes (no padding), for storing a credential's public key as text. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Reverses bytesToBase64Url, decoding stored public key text back into raw bytes. */
export function base64UrlToBytes(b64url: string): Uint8Array {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Converts a UUID string into its raw 16 bytes, for use as a WebAuthn userID handle. */
export function uuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  return bytes
}
