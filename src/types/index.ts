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
  origin_country: string[]
  original_language: string
  seasons: TmdbSeasonSummary[]
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

export interface TmdbWatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
}

export interface TmdbWatchProviderRegion {
  link: string
  flatrate?: TmdbWatchProvider[]
  free?: TmdbWatchProvider[]
  ads?: TmdbWatchProvider[]
  rent?: TmdbWatchProvider[]
  buy?: TmdbWatchProvider[]
}

export interface TmdbWatchProviders {
  id: number
  results: Record<string, TmdbWatchProviderRegion>
}

export interface TmdbProviderListItem {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority: number
  display_priorities: Record<string, number>
}

export interface StreamingOverride {
  id: string
  show_id: number
  provider_id: number | null
  provider_name: string
  provider_logo_path: string | null
  updated_by: string | null
  updated_at: string
}

export interface AppUser {
  id: string
  email: string
  username: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  followed_id: string
  created_at: string
}

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

export interface ShowRating {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  rating: number
  rated_at: string
}

export interface ShowRatingWithUser extends ShowRating {
  users: { username: string } | null
}

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

export interface SeasonRatingWithUser extends SeasonRating {
  users: { username: string } | null
}

export interface EpisodeWatched {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  show_total_episodes: number | null
  season_number: number
  episode_number: number
  episode_name: string | null
  watched_at: string
  watched_at_unknown: boolean
  runtime_minutes: number | null
  created_at: string
}

export type WatchedMap = Record<string, EpisodeWatched>

export interface EpisodeWatchedWithUser extends EpisodeWatched {
  users: { username: string } | null
}

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

export interface UndatedShowWatchSummary {
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  episode_count: number
  seasons: number[]
  sole_season_number: number | null
  sole_episode_number: number | null
  added_at: string
}

export interface WatchlistItem {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  added_at: string
}

export interface ShowStarted {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  show_total_episodes: number | null
  started_at: string
}

export interface ShowWatchingDismissed {
  id: string
  user_id: string
  show_id: number
  dismissed_at: string
}

export interface ShowDropped {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  dropped_at: string
}

export interface ShowRewatch {
  id: string
  user_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  rewatched_at: string
}

export interface ShowList {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface ShowListItem {
  id: string
  list_id: string
  show_id: number
  show_name: string
  show_poster_path: string | null
  added_at: string
}

export interface ShowListWithCount extends ShowList {
  itemCount: number
}
