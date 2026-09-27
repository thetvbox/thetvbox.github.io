// Supabase Edge Function: suggests which show to watch next, for the
// "What should I watch next" Siri App Intent (mobile/modules/siri-app-intents).
// Walks the user's own shows by most recent activity (skipping ones they've
// dropped or dismissed from Home's now-watching section) and returns the
// first one that still has an unwatched episode per TMDB -- this sidesteps
// reimplementing the app's client-side "finished" calculation server-side:
// a fully-watched show just falls through to the next candidate.
// PAT-authenticated the same way as log-episode-watched, and -- like
// log-next-episode-watched -- needs a TMDB_API_KEY function secret.

import { bearerToken, jsonResponse, resolveUserFromToken, serviceClient, CORS_HEADERS } from '../_shared/personalAccessToken.ts'
import { resolveNextEpisode } from '../_shared/nextEpisode.ts'

const CANDIDATE_LIMIT = 10

interface ShowActivityRow {
  show_id: number
  show_name: string
  show_poster_path: string | null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST' && req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405)

  const token = bearerToken(req)
  if (!token) return jsonResponse({ error: 'Missing bearer token' }, 401)

  const supabase = serviceClient()
  const userId = await resolveUserFromToken(supabase, token)
  if (!userId) return jsonResponse({ error: 'Invalid or revoked token' }, 401)

  const [{ data: watched }, { data: started }, { data: dropped }, { data: dismissed }] = await Promise.all([
    supabase
      .from('episode_watched')
      .select('show_id, show_name, show_poster_path, watched_at')
      .eq('user_id', userId),
    supabase.from('show_started').select('show_id, show_name, show_poster_path, started_at').eq('user_id', userId),
    supabase.from('show_dropped').select('show_id').eq('user_id', userId),
    supabase.from('show_watching_dismissed').select('show_id').eq('user_id', userId),
  ])

  const excluded = new Set<number>([
    ...(dropped ?? []).map((r: { show_id: number }) => r.show_id),
    ...(dismissed ?? []).map((r: { show_id: number }) => r.show_id),
  ])

  const lastActivity = new Map<number, ShowActivityRow & { at: string }>()
  for (const row of (watched ?? []) as (ShowActivityRow & { watched_at: string })[]) {
    const existing = lastActivity.get(row.show_id)
    if (!existing || row.watched_at > existing.at) {
      lastActivity.set(row.show_id, { ...row, at: row.watched_at })
    }
  }
  for (const row of (started ?? []) as (ShowActivityRow & { started_at: string })[]) {
    if (!lastActivity.has(row.show_id)) {
      lastActivity.set(row.show_id, { ...row, at: row.started_at })
    }
  }

  const candidates = Array.from(lastActivity.values())
    .filter((row) => !excluded.has(row.show_id))
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, CANDIDATE_LIMIT)

  for (const candidate of candidates) {
    try {
      const next = await resolveNextEpisode(supabase, userId, candidate.show_id)
      if (next) {
        return jsonResponse(
          { show_name: candidate.show_name, season_number: next.seasonNumber, episode_number: next.episodeNumber },
          200,
        )
      }
    } catch (err) {
      console.error('Next-episode lookup failed for', candidate.show_id, err)
    }
  }

  return jsonResponse({ error: 'Nothing in progress to suggest right now' }, 404)
})
