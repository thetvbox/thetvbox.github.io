import { dayKey } from './date'
import type {
  EpisodeWatched,
  EpisodeWatchedWithUser,
  Follow,
  SeasonRatingWithUser,
  ShowDropped,
  ShowRating,
  ShowRatingWithUser,
  ShowRewatch,
  ShowStarted,
  ShowWatchingDismissed,
  ShowWatchSummary,
  UndatedShowWatchSummary,
} from '../types'

export interface ShowActivity {
  showId: number
  showName: string
  showPosterPath: string | null
  rating: number | null
  ratedAt: string | null
  watchedCount: number
  totalEpisodes: number | null
  lastWatchedAt: string | null
  lastWatchedAtUnknown: boolean
  finished: boolean
  finishedAt: string | null
  finishedAtUnknown: boolean
  started: boolean
  startedAt: string | null
  dismissed: boolean
  dropped: boolean
  droppedAt: string | null
}

/** Returns a fresh, all-empty ShowActivity row. */
function emptyShowActivity(showId: number, showName: string, showPosterPath: string | null): ShowActivity {
  return {
    showId,
    showName,
    showPosterPath,
    rating: null,
    ratedAt: null,
    watchedCount: 0,
    totalEpisodes: null,
    lastWatchedAt: null,
    lastWatchedAtUnknown: false,
    finished: false,
    finishedAt: null,
    finishedAtUnknown: false,
    started: false,
    startedAt: null,
    dismissed: false,
    dropped: false,
    droppedAt: null,
  }
}

/** Merges show_ratings + episode_watched (+ optional started/dismissed/dropped) rows for one user into one summary per show. */
export function summarizeShowActivity(
  ratings: ShowRating[],
  watched: EpisodeWatched[],
  started: ShowStarted[] = [],
  dismissed: ShowWatchingDismissed[] = [],
  dropped: ShowDropped[] = [],
): ShowActivity[] {
  const map = new Map<number, ShowActivity>()

  function entryFor(showId: number, showName: string, showPosterPath: string | null): ShowActivity {
    let entry = map.get(showId)
    if (!entry) {
      entry = emptyShowActivity(showId, showName, showPosterPath)
      map.set(showId, entry)
    }
    return entry
  }

  for (const r of ratings) {
    const entry = entryFor(r.show_id, r.show_name, r.show_poster_path)
    entry.rating = r.rating
    entry.ratedAt = r.rated_at
  }

  for (const s of started) {
    const entry = entryFor(s.show_id, s.show_name, s.show_poster_path)
    entry.started = true
    entry.startedAt = s.started_at
    entry.totalEpisodes = s.show_total_episodes
  }

  const watchedByShow = new Map<number, EpisodeWatched[]>()
  for (const w of watched) {
    const list = watchedByShow.get(w.show_id)
    if (list) list.push(w)
    else watchedByShow.set(w.show_id, [w])
  }

  for (const [showId, rows] of watchedByShow) {
    const entry = entryFor(showId, rows[0].show_name, rows[0].show_poster_path)
    entry.watchedCount = rows.length
    entry.totalEpisodes = rows.reduce<number | null>((max, r) => {
      if (r.show_total_episodes == null) return max
      return max === null ? r.show_total_episodes : Math.max(max, r.show_total_episodes)
    }, null)
    for (const r of rows) {
      if (!entry.lastWatchedAt || r.watched_at > entry.lastWatchedAt) {
        entry.lastWatchedAt = r.watched_at
        entry.lastWatchedAtUnknown = r.watched_at_unknown
      }
    }
    entry.finished = entry.totalEpisodes !== null && entry.watchedCount >= entry.totalEpisodes
    entry.finishedAt = entry.finished ? entry.lastWatchedAt : null
    entry.finishedAtUnknown = entry.finished ? entry.lastWatchedAtUnknown : false
  }

  for (const d of dismissed) {
    const entry = map.get(d.show_id)
    if (entry) entry.dismissed = true
  }

  for (const d of dropped) {
    const entry = map.get(d.show_id)
    if (entry) {
      entry.dropped = true
      entry.droppedAt = d.dropped_at
    }
  }

  return Array.from(map.values())
}

/** Same output shape as summarizeShowActivity, built from pre-aggregated per-show totals instead of raw episode rows. */
export function summarizeFromWatchSummary(ratings: ShowRating[], summaries: ShowWatchSummary[]): ShowActivity[] {
  const map = new Map<number, ShowActivity>()

  function entryFor(showId: number, showName: string, showPosterPath: string | null): ShowActivity {
    let entry = map.get(showId)
    if (!entry) {
      entry = emptyShowActivity(showId, showName, showPosterPath)
      map.set(showId, entry)
    }
    return entry
  }

  for (const r of ratings) {
    const entry = entryFor(r.show_id, r.show_name, r.show_poster_path)
    entry.rating = r.rating
    entry.ratedAt = r.rated_at
  }

  for (const s of summaries) {
    const entry = entryFor(s.show_id, s.show_name, s.show_poster_path)
    entry.watchedCount = s.watched_count
    entry.totalEpisodes = s.total_episodes
    entry.lastWatchedAt = s.last_watched_at
    entry.lastWatchedAtUnknown = s.last_watched_at_unknown
    entry.finished = entry.totalEpisodes !== null && entry.watchedCount >= entry.totalEpisodes
    entry.finishedAt = entry.finished ? entry.lastWatchedAt : null
    entry.finishedAtUnknown = entry.finished ? entry.lastWatchedAtUnknown : false
  }

  return Array.from(map.values())
}

/** Returns in-progress shows, most recently watched or started first. */
export function nowWatching(summaries: ShowActivity[]): ShowActivity[] {
  return summaries
    .filter((s) => (s.watchedCount > 0 || s.started) && !s.finished && !s.dismissed && !s.dropped)
    .sort((a, b) => (b.lastWatchedAt ?? b.startedAt ?? '').localeCompare(a.lastWatchedAt ?? a.startedAt ?? ''))
}

/** Returns "done with it" shows: finished, or rated without ever tracking episodes. */
export function watchHistory(summaries: ShowActivity[]): ShowActivity[] {
  return summaries.filter((s) => s.finished || (s.rating !== null && s.watchedCount === 0 && !s.started))
}

export type HistorySort = 'recent' | 'rating' | 'finished' | 'name' | 'platform'

/** Sorts history entries by the given HistorySort key. */
export function sortHistory(entries: ShowActivity[], sort: HistorySort): ShowActivity[] {
  const sorted = entries.slice()
  if (sort === 'rating') {
    sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1))
  } else if (sort === 'name') {
    sorted.sort((a, b) => a.showName.localeCompare(b.showName))
  } else if (sort === 'finished') {
    sorted.sort((a, b) => {
      if (a.finishedAt && b.finishedAt) return b.finishedAt.localeCompare(a.finishedAt)
      if (a.finishedAt) return -1
      if (b.finishedAt) return 1
      return a.showName.localeCompare(b.showName)
    })
  } else {
    sorted.sort((a, b) => {
      const aDate = a.finishedAt ?? a.ratedAt ?? ''
      const bDate = b.finishedAt ?? b.ratedAt ?? ''
      return bDate.localeCompare(aDate)
    })
  }
  return sorted
}

export type DiaryEntryKind = 'watched' | 'rated' | 'rewatched'

export interface DiaryEntry {
  id: string
  kind: DiaryEntryKind
  showId: number
  showName: string
  showPosterPath: string | null
  at: string
  rating?: number
  episodeCount?: number
  seasonLabel?: string
  episodeLabel?: string
}

/** Formats a set of season numbers as "Season N" or "S1–S3". */
export function seasonLabelFor(seasonNumbers: number[]): string {
  const sorted = Array.from(new Set(seasonNumbers)).sort((a, b) => a - b)
  if (sorted.length === 1) return `Season ${sorted[0]}`
  return `S${sorted[0]}–S${sorted[sorted.length - 1]}`
}

/** Formats a same-day episode group as "S2E4-E6", or undefined if it spans seasons or is too scattered. */
function episodeRangeLabel(rows: EpisodeWatched[]): string | undefined {
  const seasons = new Set(rows.map((r) => r.season_number))
  if (seasons.size > 1) return undefined
  const season = rows[0].season_number
  const nums = Array.from(new Set(rows.map((r) => r.episode_number))).sort((a, b) => a - b)
  const isContiguous = nums[nums.length - 1] - nums[0] + 1 === nums.length
  if (isContiguous) return `S${season}E${nums[0]}-E${nums[nums.length - 1]}`
  if (nums.length <= 4) return `S${season}E${nums.join(', E')}`
  return undefined
}

/** Merges one user's ratings, watched episodes, and rewatches into a single reverse-chronological diary. */
export function buildDiaryEntries(
  ratings: ShowRating[],
  watched: EpisodeWatched[],
  rewatches: ShowRewatch[],
): DiaryEntry[] {
  const entries: DiaryEntry[] = []
  const mergeTarget = new Map<string, DiaryEntry>()

  const watchedGroups = new Map<string, EpisodeWatched[]>()
  for (const w of watched) {
    if (w.watched_at_unknown) continue
    const key = `${w.show_id}-${dayKey(w.watched_at)}`
    const list = watchedGroups.get(key)
    if (list) list.push(w)
    else watchedGroups.set(key, [w])
  }
  for (const [key, rows] of watchedGroups) {
    const latest = rows.reduce((a, b) => (b.watched_at > a.watched_at ? b : a))
    const range = rows.length > 1 ? episodeRangeLabel(rows) : undefined
    const entry: DiaryEntry = {
      id: `watched-${latest.show_id}-${dayKey(latest.watched_at)}`,
      kind: 'watched',
      showId: latest.show_id,
      showName: latest.show_name,
      showPosterPath: latest.show_poster_path,
      at: latest.watched_at,
      episodeCount: rows.length,
      seasonLabel: rows.length > 1 && !range ? seasonLabelFor(rows.map((r) => r.season_number)) : undefined,
      episodeLabel:
        rows.length === 1
          ? `S${latest.season_number}E${latest.episode_number}${latest.episode_name ? ` · ${latest.episode_name}` : ''}`
          : range,
    }
    entries.push(entry)
    mergeTarget.set(key, entry)
  }

  for (const rw of rewatches) {
    const entry: DiaryEntry = {
      id: `rewatched-${rw.id}`,
      kind: 'rewatched',
      showId: rw.show_id,
      showName: rw.show_name,
      showPosterPath: rw.show_poster_path,
      at: rw.rewatched_at,
    }
    entries.push(entry)
    const key = `${rw.show_id}-${dayKey(rw.rewatched_at)}`
    if (!mergeTarget.has(key)) mergeTarget.set(key, entry)
  }

  for (const r of ratings) {
    const key = `${r.show_id}-${dayKey(r.rated_at)}`
    const target = mergeTarget.get(key)
    if (target) {
      target.rating = r.rating
    } else {
      entries.push({
        id: `rated-${r.id}`,
        kind: 'rated',
        showId: r.show_id,
        showName: r.show_name,
        showPosterPath: r.show_poster_path,
        at: r.rated_at,
        rating: r.rating,
      })
    }
  }

  entries.sort((a, b) => b.at.localeCompare(a.at))
  return entries
}

/** Builds diary entries for watched episodes with no real date, ordered by when they were added. */
export function buildUndatedDiaryEntriesFromSummary(summaries: UndatedShowWatchSummary[]): DiaryEntry[] {
  return summaries
    .map((s) => ({
      id: `watched-undated-${s.show_id}`,
      kind: 'watched' as const,
      showId: s.show_id,
      showName: s.show_name,
      showPosterPath: s.show_poster_path,
      at: '',
      addedAt: s.added_at,
      episodeCount: s.episode_count,
      seasonLabel: s.episode_count > 1 ? seasonLabelFor(s.seasons) : undefined,
      episodeLabel:
        s.episode_count === 1 && s.sole_season_number != null && s.sole_episode_number != null
          ? `S${s.sole_season_number}E${s.sole_episode_number}`
          : undefined,
    }))
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.showName.localeCompare(b.showName))
    .map(({ addedAt: _addedAt, ...entry }) => entry)
}

export interface GroupActivityEvent {
  kind: 'show'
  key: string
  userId: string
  username: string
  showId: number
  showName: string
  showPosterPath: string | null
  rating: number | null
  finished: boolean
  episodeCount: number | null
  seasonNumber: number | null
  at: string
  atUnknown: boolean
}

/** Merges every member's ratings + watched rows into one reverse-chronological "who finished/rated what" feed. */
export function buildGroupActivity(
  ratings: ShowRatingWithUser[],
  watched: EpisodeWatchedWithUser[],
  seasonRatings: SeasonRatingWithUser[] = [],
): GroupActivityEvent[] {
  interface UserBucket {
    username: string
    ratings: ShowRating[]
    watched: EpisodeWatched[]
  }
  const byUser = new Map<string, UserBucket>()

  function bucketFor(userId: string, username: string | undefined): UserBucket {
    let bucket = byUser.get(userId)
    if (!bucket) {
      bucket = { username: username ?? 'unknown', ratings: [], watched: [] }
      byUser.set(userId, bucket)
    } else if (username) {
      bucket.username = username
    }
    return bucket
  }

  for (const r of ratings) bucketFor(r.user_id, r.users?.username).ratings.push(r)
  for (const w of watched) bucketFor(w.user_id, w.users?.username).watched.push(w)

  const events: GroupActivityEvent[] = []
  for (const [userId, bucket] of byUser) {
    const history = watchHistory(summarizeShowActivity(bucket.ratings, bucket.watched))
    for (const s of history) {
      const at = s.finishedAt ?? s.ratedAt
      if (!at) continue
      events.push({
        kind: 'show',
        key: `${userId}-${s.showId}`,
        userId,
        username: bucket.username,
        showId: s.showId,
        showName: s.showName,
        showPosterPath: s.showPosterPath,
        rating: s.rating,
        finished: s.finished,
        episodeCount: s.finished ? s.totalEpisodes : null,
        seasonNumber: null,
        at,
        atUnknown: s.finished ? s.finishedAtUnknown : false,
      })
    }
  }

  for (const sr of seasonRatings) {
    events.push({
      kind: 'show',
      key: `${sr.user_id}-${sr.show_id}-season-${sr.season_number}`,
      userId: sr.user_id,
      username: sr.users?.username ?? 'unknown',
      showId: sr.show_id,
      showName: sr.show_name,
      showPosterPath: sr.show_poster_path,
      rating: sr.rating,
      finished: false,
      episodeCount: null,
      seasonNumber: sr.season_number,
      at: sr.rated_at,
      atUnknown: false,
    })
  }

  events.sort((a, b) => b.at.localeCompare(a.at))
  return events
}

export interface FollowActivityEvent {
  kind: 'follow'
  key: string
  followerId: string
  followerUsername: string
  followedId: string
  followedUsername: string
  at: string
  atUnknown: false
}

/** Turns raw follow edges into feed-ready events, resolving usernames against a shared lookup. */
export function buildFollowActivity(follows: Follow[], usernameById: Map<string, string>): FollowActivityEvent[] {
  const events: FollowActivityEvent[] = []
  for (const f of follows) {
    const followerUsername = usernameById.get(f.follower_id)
    const followedUsername = usernameById.get(f.followed_id)
    if (!followerUsername || !followedUsername) continue
    events.push({
      kind: 'follow',
      key: `follow-${f.id}`,
      followerId: f.follower_id,
      followerUsername,
      followedId: f.followed_id,
      followedUsername,
      at: f.created_at,
      atUnknown: false,
    })
  }
  return events
}

export type ActivityFeedItem = GroupActivityEvent | FollowActivityEvent

/** Merges show events and follow events into one reverse-chronological feed. */
export function mergeActivityFeed(
  showEvents: GroupActivityEvent[],
  followEvents: FollowActivityEvent[],
): ActivityFeedItem[] {
  return [...showEvents, ...followEvents].sort((a, b) => b.at.localeCompare(a.at))
}
