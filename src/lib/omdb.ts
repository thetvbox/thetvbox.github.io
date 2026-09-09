import type { ExternalRatings } from '../types'

const API_BASE = 'https://www.omdbapi.com/'
const API_KEY = import.meta.env.VITE_OMDB_API_KEY

export const isOmdbConfigured = Boolean(API_KEY)

interface OmdbRating {
  Source: string
  Value: string
}

interface OmdbResponse {
  Response: 'True' | 'False'
  imdbRating?: string
  Ratings?: OmdbRating[]
}

/** Parses OMDb's imdbRating string (e.g. "8.4", or "N/A" if unrated) into a number. */
function parseImdbRating(value: string | undefined): number | null {
  if (!value || value === 'N/A') return null
  const num = Number.parseFloat(value)
  return Number.isNaN(num) ? null : num
}

/** Parses OMDb's Rotten Tomatoes entry (e.g. { Source: "Rotten Tomatoes", Value: "92%" }). */
function parseRottenTomatoes(ratings: OmdbRating[] | undefined): number | null {
  const entry = ratings?.find((r) => r.Source === 'Rotten Tomatoes')
  if (!entry) return null
  const num = Number.parseInt(entry.Value, 10)
  return Number.isNaN(num) ? null : num
}

const ratingsByImdbId = new Map<string, ExternalRatings | null>()

/**
 * Fetches IMDb rating + Rotten Tomatoes score from OMDb (omdbapi.com) by IMDb id,
 * session-cached. OMDb is the one free, legally licensable (CC BY-NC 4.0) source that
 * exposes both scores from a single lookup -- neither IMDb nor Rotten Tomatoes offers a
 * public API of their own. Returns null if OMDb isn't configured, there's no IMDb id to
 * look up (TMDB doesn't always have one), or the lookup fails/finds nothing -- these
 * scores are a nice-to-have, so callers just hide the row rather than showing an error.
 */
export async function getExternalRatings(imdbId: string | null | undefined): Promise<ExternalRatings | null> {
  if (!isOmdbConfigured || !imdbId) return null
  const cached = ratingsByImdbId.get(imdbId)
  if (cached !== undefined) return cached

  let result: ExternalRatings | null = null
  try {
    const url = new URL(API_BASE)
    url.searchParams.set('apikey', API_KEY)
    url.searchParams.set('i', imdbId)
    const res = await fetch(url.toString())
    if (res.ok) {
      const data = (await res.json()) as OmdbResponse
      if (data.Response === 'True') {
        const imdbRating = parseImdbRating(data.imdbRating)
        const rottenTomatoesScore = parseRottenTomatoes(data.Ratings)
        if (imdbRating !== null || rottenTomatoesScore !== null) {
          result = { imdbRating, rottenTomatoesScore }
        }
      }
    }
  } catch {
    result = null
  }
  ratingsByImdbId.set(imdbId, result)
  return result
}
