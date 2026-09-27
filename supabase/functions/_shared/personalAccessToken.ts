// Shared PAT-auth helpers for the Siri/App-Intents functions
// (log-next-episode-watched, whats-next). log-episode-watched predates
// this file and keeps its own inline copy of the same idea -- it's left
// alone rather than retrofitted, since it's already deployed and working.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** A Supabase client authenticated with the service role key -- bypasses RLS, used only server-side. */
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

/** Hex-encodes a SHA-256 digest of the given string. */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Extracts the bearer token from a request's Authorization header, or null if there isn't one. */
export function bearerToken(req: Request): string | null {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  return token || null
}

/** Resolves a personal access token to its owning user id and marks it used; null if invalid or revoked. */
export async function resolveUserFromToken(supabase: SupabaseClient, token: string): Promise<string | null> {
  const tokenHash = await sha256Hex(token)
  const { data: tokenRow, error } = await supabase
    .from('personal_access_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()
  if (error || !tokenRow) return null

  await supabase
    .from('personal_access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
    .then(undefined, () => {})

  return tokenRow.user_id
}
