// Shared helpers for the webauthn-* Edge Functions. See ../webauthn-registration-options/README.md for the full design notes.

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

/** The account of the signed-in person making the request, or null for the anon key or a login without an account. */
async function callerAccountId(req: Request): Promise<string | null> {
  const authorization = req.headers.get('authorization')
  if (!authorization) return null
  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await asCaller.rpc('current_app_user_id')
  return error || typeof data !== 'string' ? null : data
}

/** Whether the request comes from the account's own signed-in owner; only they may add its passkey. */
export async function isAccountOwner(req: Request, accountId: string): Promise<boolean> {
  return (await callerAccountId(req)) === accountId
}

/** Whether the account already has a passkey, or null when the lookup failed. */
export async function hasPasskey(supabase: ReturnType<typeof serviceClient>, userId: string): Promise<boolean | null> {
  const { count, error } = await supabase
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
  if (error) {
    console.error('Credential count failed', error)
    return null
  }
  return (count ?? 0) > 0
}

export const PASSKEY_NEEDS_SIGN_IN = 'Confirm your email first, then set up your passkey.'
export const PASSKEY_ALREADY_SET = 'This account already has a passkey. Sign in with it instead.'

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

/** Takes (single-use) the newest pending challenge for a user in one statement, or null if there is none or it expired. */
export async function consumeChallenge(
  supabase: ReturnType<typeof serviceClient>,
  userId: string,
  type: ChallengeType,
): Promise<string | null> {
  const { data } = await supabase
    .from('webauthn_challenges')
    .delete()
    .eq('user_id', userId)
    .eq('type', type)
    .select('challenge, expires_at, created_at')
  const newest = (data ?? [])
    .filter((row: { expires_at: string }) => new Date(row.expires_at).getTime() >= Date.now())
    .sort((x: { created_at: string }, y: { created_at: string }) => y.created_at.localeCompare(x.created_at))[0]
  return newest ? newest.challenge : null
}

/** Base64url-encodes raw bytes (no padding), for storing a credential's public key as text. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Reverses bytesToBase64Url, decoding stored public key text back into raw bytes. */
export function base64UrlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const padded = b64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(b64url.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

/** Converts a UUID string into its raw 16 bytes, for use as a WebAuthn userID handle. */
export function uuidToBytes(uuid: string): Uint8Array<ArrayBuffer> {
  const hex = uuid.replace(/-/g, '')
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16)
  return bytes
}
