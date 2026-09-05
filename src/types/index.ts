// --- TMDB API shapes (only the fields we use) ---

export interface TmdbShowSummary {
  id: number
  name: string
  poster_path: string | null
  first_air_date: string | null
  vote_average: number
}

export interface TmdbSeasonSummary {
  id: number
  season_number: number
  name: string
  episode_count: number
  poster_path: string | null
  air_date: string | null
}

export interface TmdbShowDetail {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string | null
  genres: { id: number; name: string }[]
  number_of_seasons: number
  number_of_episodes: number
  status: string
  /** ISO 3166-1 country code, powers the History filters' Country facet. */
  origin_country: string[]
  /** ISO 639-1 language code, powers the History filters' Language facet. */
  original_language: string
  seasons: TmdbSeasonSummary[]
  /** Fetched via append_to_response=external_ids, used to cross-reference TVmaze; see lib/tvmaze.ts. */
  external_ids?: { imdb_id: string | null }
}

export interface TmdbEpisode {
  id: number
  episode_number: number
  season_number: number
  name: string
  overview: string
  still_path: string | null
  air_date: string | null
  runtime: number | null
}

export interface TmdbSeasonDetail {
  id: number
  season_number: number
  name: string
  episodes: TmdbEpisode[]
}

// --- TMDB watch providers (sourced from JustWatch via TMDB's API) ---

export interface TmdbWatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
}

export interface TmdbWatchProviderRegion {
  /** TMDB's own watch page for this title/region. */
  link: string
  flatrate?: TmdbWatchProvider[]
  free?: TmdbWatchProvider[]
  ads?: TmdbWatchProvider[]
  rent?: TmdbWatchProvider[]
  buy?: TmdbWatchProvider[]
}

/** Keyed by ISO 3166-1 country code, e.g. results.US, results.GB. */
export interface TmdbWatchProviders {
  id: number
  results: Record<string, TmdbWatchProviderRegion>
}

/** One entry from the full /watch/providers/tv list. */
export interface TmdbProviderListItem {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
  display_priorities: Record<string, number>
}

// --- Manual "where to watch" correction (shared across the group) ---

export interface StreamingOverride {
  id: string
  show_id: number
  provider_id: number | null
  provider_name: string
  provider_logo_path: string | null
  updated_by: string | null
  updated_at: string
}

// --- App / Supabase shapes ---

/** A registered TV Box user. No password/verification -- see AuthContext. */
export interface AppUser {
  id: string
  email: string
  username: string
  created_at: string
}

/** One "follower_id follows followed_id" edge; see lib/follows.ts. */
export interface Follow {
  id: string
  follower_id: string
  followed_id: string
  created_at: string
}

/** One entry in the notifications feed -- fanned out server-side by triggers
 * on follow/show_ratings/episode_watched; see lib/notifications.ts. Fields
 * beyond show_id are only populated for the notification types that need
 * them (rating for 'show_rated', episode_count for 'show_finished'). */
export interface Notification {
  id: string
  user_id: string
  actor_id: string
  actor_username: string
  type: 'follow' | 'show_finished' | 'show_rated'
  show_id: number | null
  show_name: string | null
  show_poster_path: string | null
  rating: number | null
  episode_count: number | null
  created_at: string
  seen_at: string | null
}

/** One person's single rating for an entire show (replaces per-episode rating). */
export interface ShowRating {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  rating: number
  rated_at: string
}

/** A show_ratings row joined with the rater's username (crowd view). */
export interface ShowRatingWithUser extends ShowRating {
  users: { username: string } | null
}

/** One person's rating for a single season, independent of ShowRating above. */
export interface SeasonRating {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  season_number: number
  season_name: string | null
  rating: number
  rated_at: string
}

/** A season_ratings row joined with the rater's username (crowd view). */
export interface SeasonRatingWithUser extends SeasonRating {
  users: { username: string } | null
}

/** One episode a person has marked watched. Presence = watched; no value/score. */
export interface EpisodeWatched {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  /** Snapshot of the show's total episode count as of this watch, for progress badges. */
  show_total_episodes: number | null
  season_number: number
  episode_number: number
  episode_name: string | null
  watched_at: string
  /** True when the actual date wasn't known and watched_at is just a placeholder. */
  watched_at_unknown: boolean
  /** Snapshot of the episode's runtime (minutes) for the "hours watched" stat; null if unavailable. */
  runtime_minutes: number | null
  /** Row-creation time (defaults to now() at insert) -- distinct from watched_at,
   * which is the user-facing "when I watched this" date and may be a placeholder.
   * Used only to order multiple undated ("watched a while ago") entries by the
   * order they were actually added, never shown to the user. */
  created_at: string
}

/** Keyed lookup: "season-episode" -> watched row, for one user's progress on one show. */
export type WatchedMap = Record<string, EpisodeWatched>

/** An episode_watched row joined with the watcher's username (group activity view). */
export interface EpisodeWatchedWithUser extends EpisodeWatched {
  users: { username: string } | null
}

/** One row of the episode_watched_show_summary Postgres view (see
 * schema.sql) -- one user's whole watch history for one show, pre-reduced
 * server-side instead of shipping every individual episode row to compute
 * this same rollup in JS. Powers ProfileActivity's stat cards and History
 * tab via summarizeFromWatchSummary in lib/showActivity.ts. */
export interface ShowWatchSummary {
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  watched_count: number
  total_episodes: number | null
  last_watched_at: string
  last_watched_at_unknown: boolean
  runtime_minutes_sum: number
}

/** One row of the episode_watched_undated_summary Postgres view (see
 * schema.sql) -- one user's "watched a while ago" rows for one show,
 * pre-reduced server-side. Powers the diary's undated bucket via
 * buildUndatedDiaryEntriesFromSummary in lib/showActivity.ts. */
export interface UndatedShowWatchSummary {
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  episode_count: number
  seasons: number[]
  /** Set only when episode_count is 1 -- the single episode's own season/number. */
  sole_season_number: number | null
  sole_episode_number: number | null
  added_at: string
}

/** A show someone wants to watch but hasn't started; see EpisodeWatched for actual progress. */
export interface WatchlistItem {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  added_at: string
}

/** An explicit "I'm starting this" declaration -- covers the 0/x gap in Now
 * Watching before any episode is marked watched. Independent of EpisodeWatched. */
export interface ShowStarted {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  show_total_episodes: number | null
  started_at: string
}

/** A "hide this from Now Watching" marker -- suppresses a show from Home until
 * resumed (see lib/showDismissed.ts). Only ever used as a lookup set, so no
 * denormalized name/poster. */
export interface ShowWatchingDismissed {
  id: string
  user_id: string
  show_id: number
  dismissed_at: string
}

/** One "I rewatched this" log entry, independent of EpisodeWatched (first-time
 * progress only). Append-only: logging a rewatch never edits an earlier one. */
export interface ShowRewatch {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  rewatched_at: string
}

/** A user-curated list of shows (e.g. "Comfort shows"). Readable by anyone, like everything else here. */
export interface ShowList {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

/** One show inside a list. */
export interface ShowListItem {
  id: string
  list_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  added_at: string
}

/** A show_lists row plus how many shows are on it, for the "My Lists" overview. */
export interface ShowListWithCount extends ShowList {
  itemCount: number
}
