import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2'

const TMDB_API_BASE = 'https://api.themoviedb.org/3'

interface TmdbSeason {
  season_number: number
  episode_count: number
}

/** Fetches a show's season list (season_number + episode_count per season) from TMDB. */
async function fetchTmdbSeasons(showId: number): Promise<TmdbSeason[]> {
  const apiKey = Deno.env.get('TMDB_API_KEY')
  if (!apiKey) throw new Error('TMDB_API_KEY is not configured')
  const url = new URL(`${TMDB_API_BASE}/tv/${showId}`)
  url.searchParams.set('api_key', apiKey)
  url.searchParams.set('language', 'en-US')
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB request failed (${res.status}) for show ${showId}`)
  const data = (await res.json()) as { seasons?: TmdbSeason[] }
  return data.seasons ?? []
}

export interface NextEpisodeResult {
  seasonNumber: number
  episodeNumber: number
}

/** Works out a user's next unwatched episode of a show: the first season TMDB lists that isn't fully watched yet, at watched-count + 1 -- the same rule mobile/src/lib/seasonProgress.ts's progress bar uses. Null when every real season is fully watched. */
export async function resolveNextEpisode(
  supabase: SupabaseClient,
  userId: string,
  showId: number,
): Promise<NextEpisodeResult | null> {
  const { data: watchedRows, error } = await supabase
    .from('episode_watched')
    .select('season_number')
    .eq('user_id', userId)
    .eq('show_id', showId)
  if (error) throw error

  const watchedBySeason = new Map<number, number>()
  for (const row of watchedRows ?? []) {
    watchedBySeason.set(row.season_number, (watchedBySeason.get(row.season_number) ?? 0) + 1)
  }

  const seasons = (await fetchTmdbSeasons(showId))
    .filter((s) => s.season_number > 0 && s.episode_count > 0)
    .sort((a, b) => a.season_number - b.season_number)

  for (const season of seasons) {
    const watched = Math.min(watchedBySeason.get(season.season_number) ?? 0, season.episode_count)
    if (watched < season.episode_count) {
      return { seasonNumber: season.season_number, episodeNumber: watched + 1 }
    }
  }
  return null
}
