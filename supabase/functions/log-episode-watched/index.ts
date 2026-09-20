// Supabase Edge Function: logs an episode watched via a personal access token (for iOS Shortcuts). See README.md next to this file for setup notes.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface LogEpisodePayload {
  show_id: number
  show_name: string
  show_poster_path?: string | null
  season_number: number
  episode_number: number
  episode_name?: string | null
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Hex-encodes a SHA-256 digest of the given string. */
async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** True when every required field of a log-episode payload is present with the right type. */
function isValidPayload(payload: unknown): payload is LogEpisodePayload {
  if (!payload || typeof payload !== 'object') return false
  const p = payload as Record<string, unknown>
  return (
    typeof p.show_id === 'number' &&
    typeof p.show_name === 'string' &&
    p.show_name.trim().length > 0 &&
    typeof p.season_number === 'number' &&
    typeof p.episode_number === 'number' &&
    (p.show_poster_path === undefined || p.show_poster_path === null || typeof p.show_poster_path === 'string') &&
    (p.episode_name === undefined || p.episode_name === null || typeof p.episode_name === 'string')
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return jsonResponse({ error: 'Missing bearer token' }, 401)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  if (!isValidPayload(payload)) {
    return jsonResponse(
      { error: 'show_id, show_name, season_number, and episode_number are required' },
      400,
    )
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const tokenHash = await sha256Hex(token)
  const { data: tokenRow, error: tokenError } = await supabase
    .from('personal_access_tokens')
    .select('id, user_id')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (tokenError) {
    console.error('Token lookup failed', tokenError)
    return jsonResponse({ error: 'Failed to verify token' }, 500)
  }
  if (!tokenRow) return jsonResponse({ error: 'Invalid or revoked token' }, 401)

  const { error: insertError } = await supabase.from('episode_watched').insert({
    user_id: tokenRow.user_id,
    show_id: payload.show_id,
    show_name: payload.show_name.trim(),
    show_poster_path: payload.show_poster_path ?? null,
    season_number: payload.season_number,
    episode_number: payload.episode_number,
    episode_name: payload.episode_name?.trim() || null,
  })

  if (insertError) {
    console.error('Episode insert failed', insertError)
    return jsonResponse({ error: 'Failed to log the episode' }, 500)
  }

  await supabase
    .from('personal_access_tokens')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', tokenRow.id)
    .then(undefined, () => {})

  return jsonResponse({ ok: true }, 200)
})
