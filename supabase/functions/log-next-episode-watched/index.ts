// Supabase Edge Function: logs the next unwatched episode of a show as
// watched, resolving the show by name against the user's own watch
// history. Built for the "Log that I watched the next episode of..." Siri
// App Intent (mobile/modules/siri-app-intents) -- unlike log-episode-watched,
// the caller here only has a spoken show name, not an exact episode, so the
// resolution that a Shortcut used to do by hand happens server-side instead.
// PAT-authenticated the same way as log-episode-watched; see that
// function's README for how a user gets a token.
//
// Needs a TMDB_API_KEY function secret (the same v3 API key the app itself
// uses client-side, see mobile/.env.example) to look up season lengths --
// unlike log-episode-watched and send-push, this one won't work until that
// secret is set.

import { bearerToken, jsonResponse, resolveUserFromToken, serviceClient, CORS_HEADERS } from '../_shared/personalAccessToken.ts'
import { resolveNextEpisode } from '../_shared/nextEpisode.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const token = bearerToken(req)
  if (!token) return jsonResponse({ error: 'Missing bearer token' }, 401)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  const showName = (payload as { show_name?: unknown } | null)?.show_name
  if (typeof showName !== 'string' || !showName.trim()) {
    return jsonResponse({ error: 'show_name is required' }, 400)
  }

  const supabase = serviceClient()
  const userId = await resolveUserFromToken(supabase, token)
  if (!userId) return jsonResponse({ error: 'Invalid or revoked token' }, 401)

  const { data: matches, error: matchError } = await supabase
    .from('episode_watched')
    .select('show_id, show_name, show_poster_path, watched_at')
    .eq('user_id', userId)
    .ilike('show_name', `%${showName.trim()}%`)
    .order('watched_at', { ascending: false })
    .limit(1)
  if (matchError) {
    console.error('Show match lookup failed', matchError)
    return jsonResponse({ error: 'Failed to look up your shows' }, 500)
  }
  const match = matches?.[0]
  if (!match) {
    return jsonResponse({ error: `No show matching "${showName}" found in your watch history` }, 404)
  }

  let next
  try {
    next = await resolveNextEpisode(supabase, userId, match.show_id)
  } catch (err) {
    console.error('Next-episode lookup failed', err)
    return jsonResponse({ error: 'Failed to work out the next episode' }, 500)
  }
  if (!next) {
    return jsonResponse({ error: `${match.show_name} has no unwatched episodes left` }, 409)
  }

  const { error: insertError } = await supabase.from('episode_watched').insert({
    user_id: userId,
    show_id: match.show_id,
    show_name: match.show_name,
    show_poster_path: match.show_poster_path,
    season_number: next.seasonNumber,
    episode_number: next.episodeNumber,
  })
  if (insertError) {
    console.error('Episode insert failed', insertError)
    return jsonResponse({ error: 'Failed to log the episode' }, 500)
  }

  return jsonResponse(
    { show_name: match.show_name, season_number: next.seasonNumber, episode_number: next.episodeNumber },
    200,
  )
})
