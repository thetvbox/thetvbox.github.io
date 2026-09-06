import { useMemo } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { getSeasonDetail } from '../../lib/tmdb'
import { bulkMarkWatched, bulkUnmarkWatched, markWatched, restoreWatched, unmarkWatched, watchedKey } from '../../lib/watched'
import { isFutureDate } from '../../lib/date'
import type { AppUser, EpisodeWatched, TmdbSeasonDetail, TmdbShowDetail, WatchedMap } from '../../types'

/** Splits bulk mark-watched targets into ones to snapshot-and-restore vs. ones to delete on undo. */
function snapshotBulkTargets(
  watched: WatchedMap,
  episodes: { seasonNumber: number; episodeNumber: number }[],
): { previousRows: EpisodeWatched[]; addedKeys: { seasonNumber: number; episodeNumber: number }[] } {
  const previousRows: EpisodeWatched[] = []
  const addedKeys: { seasonNumber: number; episodeNumber: number }[] = []
  for (const ep of episodes) {
    const existing = watched[watchedKey(ep.seasonNumber, ep.episodeNumber)]
    if (existing) previousRows.push(existing)
    else addedKeys.push(ep)
  }
  return { previousRows, addedKeys }
}

/** Marking, unmarking, and bulk-marking episodes watched for the active show/season. */
export function useEpisodeWatchHandlers(
  watched: WatchedMap,
  setWatched: Dispatch<SetStateAction<WatchedMap>>,
  user: AppUser | null,
  show: TmdbShowDetail | null,
  activeSeason: number | null,
  season: TmdbSeasonDetail | null,
  showError: (message: string) => void,
  showUndo: (message: string, onUndo: () => void) => void,
  onProgress: () => void,
) {
  const seasonWatchedCount = useMemo(() => {
    if (!season) return null
    return season.episodes.filter((ep) => watched[watchedKey(ep.season_number, ep.episode_number)]).length
  }, [season, watched])

  async function handleToggleWatched(episodeNumber: number, episodeName: string, runtimeMinutes: number | null) {
    if (!user || !show || activeSeason === null) return
    const key = watchedKey(activeSeason, episodeNumber)

    if (watched[key]) {
      const previous = watched[key]
      setWatched((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      try {
        await unmarkWatched(user.id, show.id, activeSeason, episodeNumber)
      } catch {
        setWatched((prev) => ({ ...prev, [key]: previous }))
        showError('Failed to unmark this episode. Try again.')
      }
      return
    }

    const optimisticRow: EpisodeWatched = {
      id: `optimistic-${key}`,
      user_id: user.id,
      show_id: show.id,
      show_name: show.name,
      show_poster_path: show.poster_path,
      show_total_episodes: show.number_of_episodes,
      season_number: activeSeason,
      episode_number: episodeNumber,
      episode_name: episodeName,
      watched_at: new Date().toISOString(),
      watched_at_unknown: false,
      runtime_minutes: runtimeMinutes,
      created_at: new Date().toISOString(),
    }
    setWatched((prev) => ({ ...prev, [key]: optimisticRow }))

    try {
      const saved = await markWatched({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        showTotalEpisodes: show.number_of_episodes,
        seasonNumber: activeSeason,
        episodeNumber,
        episodeName,
        runtimeMinutes,
      })
      setWatched((prev) => ({ ...prev, [key]: saved }))
      onProgress()
    } catch {
      setWatched((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      showError('Failed to mark this episode watched. Try again.')
    }
  }

  /** Undoes a bulk mark-watched action, restoring overwritten rows and deleting newly-created ones. */
  async function undoBulkMark(
    previousRows: EpisodeWatched[],
    addedKeys: { seasonNumber: number; episodeNumber: number }[],
  ) {
    if (!user || !show) return
    try {
      const [restored] = await Promise.all([
        restoreWatched(previousRows),
        addedKeys.length > 0 ? bulkUnmarkWatched(user.id, show.id, addedKeys) : Promise.resolve(),
      ])
      setWatched((prev) => {
        const next = { ...prev }
        for (const key of addedKeys) delete next[watchedKey(key.seasonNumber, key.episodeNumber)]
        for (const row of restored) next[watchedKey(row.season_number, row.episode_number)] = row
        return next
      })
    } catch {
      showError('Failed to undo. Your watch history wasn’t changed back — try again.')
    }
  }

  /** Marks every real-season episode of the show watched in one action. */
  async function handleMarkAllWatched(input: { watchedAt: string; unknownDate: boolean }) {
    if (!user || !show) return
    const realSeasons = show.seasons.filter((s) => s.season_number > 0)
    const seasonDetails = await Promise.all(
      realSeasons.map((s) => getSeasonDetail(show.id, s.season_number).catch(() => null)),
    )
    const runtimeByKey = new Map<string, number | null>()
    for (const detail of seasonDetails) {
      if (!detail) continue
      for (const ep of detail.episodes) {
        runtimeByKey.set(watchedKey(ep.season_number, ep.episode_number), ep.runtime ?? null)
      }
    }
    const episodes = realSeasons.flatMap((s) =>
      Array.from({ length: s.episode_count }, (_, i) => {
        const episodeNumber = i + 1
        return {
          seasonNumber: s.season_number,
          episodeNumber,
          runtimeMinutes: runtimeByKey.get(watchedKey(s.season_number, episodeNumber)) ?? null,
        }
      }),
    )
    const { previousRows, addedKeys } = snapshotBulkTargets(watched, episodes)
    try {
      const saved = await bulkMarkWatched({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        showTotalEpisodes: show.number_of_episodes,
        episodes,
        watchedAt: input.watchedAt,
        watchedAtUnknown: input.unknownDate,
      })
      setWatched((prev) => {
        const next = { ...prev }
        for (const row of saved) next[watchedKey(row.season_number, row.episode_number)] = row
        return next
      })
      onProgress()
      showUndo(
        previousRows.length > 0
          ? `Marked ${saved.length} episodes watched (${previousRows.length} overwritten)`
          : `Marked ${saved.length} episodes watched`,
        () => undoBulkMark(previousRows, addedKeys),
      )
    } catch {
      showError('Failed to mark episodes watched. Try again.')
    }
  }

  /** Same idea as handleToggleWatched, but logs a single episode on a specific past date. */
  async function handleMarkWatchedWithDate(
    episodeNumber: number,
    episodeName: string,
    runtimeMinutes: number | null,
    input: { watchedAt: string; unknownDate: boolean },
  ) {
    if (!user || !show || activeSeason === null) return
    const key = watchedKey(activeSeason, episodeNumber)
    try {
      const saved = await bulkMarkWatched({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        showTotalEpisodes: show.number_of_episodes,
        episodes: [{ seasonNumber: activeSeason, episodeNumber, episodeName, runtimeMinutes }],
        watchedAt: input.watchedAt,
        watchedAtUnknown: input.unknownDate,
      })
      if (saved[0]) {
        setWatched((prev) => ({ ...prev, [key]: saved[0] }))
        onProgress()
      }
    } catch {
      showError('Failed to mark this episode watched. Try again.')
    }
  }

  /** Marks every aired episode of the active season watched in one action. */
  async function handleMarkSeasonWatched(input: { watchedAt: string; unknownDate: boolean }) {
    if (!user || !show || !season) return
    const episodes = season.episodes
      .filter((ep) => !(ep.air_date && isFutureDate(ep.air_date)))
      .map((ep) => ({
        seasonNumber: ep.season_number,
        episodeNumber: ep.episode_number,
        episodeName: ep.name,
        runtimeMinutes: ep.runtime,
      }))
    const { previousRows, addedKeys } = snapshotBulkTargets(watched, episodes)
    try {
      const saved = await bulkMarkWatched({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        showTotalEpisodes: show.number_of_episodes,
        episodes,
        watchedAt: input.watchedAt,
        watchedAtUnknown: input.unknownDate,
      })
      setWatched((prev) => {
        const next = { ...prev }
        for (const row of saved) next[watchedKey(row.season_number, row.episode_number)] = row
        return next
      })
      onProgress()
      showUndo(
        previousRows.length > 0
          ? `Marked ${saved.length} episodes watched (${previousRows.length} overwritten)`
          : `Marked ${saved.length} episodes watched`,
        () => undoBulkMark(previousRows, addedKeys),
      )
    } catch {
      showError('Failed to mark season watched. Try again.')
    }
  }

  return {
    seasonWatchedCount,
    handleToggleWatched,
    handleMarkWatchedWithDate,
    handleMarkAllWatched,
    handleMarkSeasonWatched,
  }
}
