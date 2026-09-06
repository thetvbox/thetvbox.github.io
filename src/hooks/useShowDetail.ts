import { useEffect, useMemo, useState } from 'react'
import {
  detectRegion,
  getSeasonDetail,
  getShowDetail,
  getWatchProviders,
} from '../lib/tmdb'
import { fetchAllShowRatings, upsertShowRating, deleteShowRating } from '../lib/showRatings'
import { fetchAllSeasonRatingsForShow, upsertSeasonRating, deleteSeasonRating } from '../lib/seasonRatings'
import {
  bulkMarkWatched,
  bulkUnmarkWatched,
  fetchWatchedForShow,
  markWatched,
  restoreWatched,
  unmarkWatched,
  watchedKey,
} from '../lib/watched'
import { clearStreamingOverride, fetchStreamingOverride, setStreamingOverride } from '../lib/streamingOverrides'
import { invalidatePlatformCache, pickBestFreeProvider } from '../lib/streamingProvider'
import { addToWatchlist, fetchWatchlistItem, removeFromWatchlist } from '../lib/watchlist'
import { fetchStartedItem, startShow } from '../lib/showStarted'
import { dismissShow, fetchDismissedItem, undismissShow } from '../lib/showDismissed'
import { dropShow, fetchDroppedItem, undropShow } from '../lib/showDropped'
import { deleteRewatch, fetchRewatchesForShow, logRewatch, restoreRewatch, sortRewatchesDesc } from '../lib/rewatches'
import { fetchListMembershipForShow } from '../lib/lists'
import { computeSeasonProgress, countWatchedBySeason } from '../lib/seasonProgress'
import { getCorrectedAirDates, tvmazeEpisodeKey } from '../lib/tvmaze'
import { isFutureDate } from '../lib/date'
import { useToast } from './useToast'
import type {
  AppUser,
  EpisodeWatched,
  SeasonRatingWithUser,
  ShowDropped,
  ShowRatingWithUser,
  ShowRewatch,
  ShowStarted,
  ShowWatchingDismissed,
  StreamingOverride,
  TmdbProviderListItem,
  TmdbSeasonDetail,
  TmdbShowDetail,
  TmdbWatchProviders,
  WatchedMap,
  WatchlistItem,
} from '../types'

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

/** All data loading, derived state, and mutation handlers for the ShowDetail page. */
export function useShowDetail(showId: number, user: AppUser | null) {
  const [show, setShow] = useState<TmdbShowDetail | null>(null)
  const [season, setSeason] = useState<TmdbSeasonDetail | null>(null)
  const [activeSeason, setActiveSeason] = useState<number | null>(null)
  const [watched, setWatched] = useState<WatchedMap>({})
  const [showRatings, setShowRatings] = useState<ShowRatingWithUser[]>([])
  const [seasonRatings, setSeasonRatings] = useState<SeasonRatingWithUser[]>([])
  const [loadingShow, setLoadingShow] = useState(true)
  const [loadingSeason, setLoadingSeason] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingRating, setSavingRating] = useState(false)
  const [savingSeasonRating, setSavingSeasonRating] = useState(false)
  const [providers, setProviders] = useState<TmdbWatchProviders | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [override, setOverride] = useState<StreamingOverride | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingNowWatching, setSavingNowWatching] = useState(false)
  const [started, setStarted] = useState<ShowStarted | null>(null)
  const [dismissedItem, setDismissedItem] = useState<ShowWatchingDismissed | null>(null)
  const [droppedItem, setDroppedItem] = useState<ShowDropped | null>(null)
  const [savingDropped, setSavingDropped] = useState(false)
  const { toast, showUndo, showError, dismiss } = useToast()
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null)
  const [savingWatchlist, setSavingWatchlist] = useState(false)
  const [rewatches, setRewatches] = useState<ShowRewatch[]>([])
  const [listMembership, setListMembership] = useState<Set<string>>(new Set())
  const [listPickerOpen, setListPickerOpen] = useState(false)
  const [correctedAirDates, setCorrectedAirDates] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    let cancelled = false
    setLoadingShow(true)
    setError(null)

    async function load() {
      try {
        const [
          showData,
          watchedMap,
          ratings,
          seasonRatingRows,
          watchlistRow,
          rewatchRows,
          listMembershipSet,
          startedRow,
          dismissedRow,
          droppedRow,
        ] = await Promise.all([
          getShowDetail(showId),
          user ? fetchWatchedForShow(user.id, showId) : Promise.resolve({} as WatchedMap),
          fetchAllShowRatings(showId),
          fetchAllSeasonRatingsForShow(showId),
          user ? fetchWatchlistItem(user.id, showId) : Promise.resolve(null),
          user ? fetchRewatchesForShow(user.id, showId) : Promise.resolve([]),
          user ? fetchListMembershipForShow(user.id, showId) : Promise.resolve(new Set<string>()),
          user ? fetchStartedItem(user.id, showId) : Promise.resolve(null),
          user ? fetchDismissedItem(user.id, showId) : Promise.resolve(null),
          user ? fetchDroppedItem(user.id, showId) : Promise.resolve(null),
        ])
        if (cancelled) return
        setShow(showData)
        setWatched(watchedMap)
        setShowRatings(ratings)
        setSeasonRatings(seasonRatingRows)
        setWatchlistItem(watchlistRow)
        setRewatches(rewatchRows)
        setListMembership(listMembershipSet)
        setStarted(startedRow)
        setDismissedItem(dismissedRow)
        setDroppedItem(droppedRow)
        const firstRealSeason = showData.seasons.find((s) => s.season_number > 0) ?? showData.seasons[0]
        const watchedBySeasonCount = countWatchedBySeason(Object.values(watchedMap))
        const progress = computeSeasonProgress(showData.seasons, watchedBySeasonCount)
        const defaultSeason = progress?.currentSeasonNumber ?? firstRealSeason?.season_number ?? null
        setActiveSeason(defaultSeason)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load show.')
      } finally {
        if (!cancelled) setLoadingShow(false)
      }
    }

    if (!Number.isNaN(showId)) load()
    return () => {
      cancelled = true
    }
  }, [showId, user])

  useEffect(() => {
    if (activeSeason === null) return
    let cancelled = false
    setLoadingSeason(true)

    getSeasonDetail(showId, activeSeason)
      .then((data) => {
        if (!cancelled) setSeason(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load season.')
      })
      .finally(() => {
        if (!cancelled) setLoadingSeason(false)
      })

    return () => {
      cancelled = true
    }
  }, [showId, activeSeason])

  useEffect(() => {
    if (Number.isNaN(showId)) return
    let cancelled = false
    setLoadingProviders(true)
    getWatchProviders(showId)
      .then((data) => {
        if (!cancelled) setProviders(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProviders(false)
      })
    fetchStreamingOverride(showId)
      .then((data) => {
        if (!cancelled) setOverride(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [showId])

  useEffect(() => {
    if (!show) return
    let cancelled = false
    getCorrectedAirDates(show.external_ids?.imdb_id)
      .then((dates) => {
        if (!cancelled) setCorrectedAirDates(dates)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [show])

  /** Returns TVmaze's correction for one episode's air date, or its own TMDB date unchanged. */
  function effectiveAirDate(ep: { season_number: number; episode_number: number; air_date: string | null }): string | null {
    if (!ep.air_date) return null
    return correctedAirDates.get(tvmazeEpisodeKey(ep.season_number, ep.episode_number)) ?? ep.air_date
  }

  const region = useMemo(() => detectRegion(), [])
  const regionProviders = providers?.results[region] ?? null

  const bestFreeProvider = useMemo(() => pickBestFreeProvider(regionProviders), [regionProviders])

  const effectiveProvider: { provider_name: string; logo_path: string | null } | null = override
    ? { provider_name: override.provider_name, logo_path: override.provider_logo_path }
    : bestFreeProvider

  const watchedCount = Object.keys(watched).length
  const totalEpisodes = show?.number_of_episodes ?? null

  const isFinished = totalEpisodes !== null && watchedCount >= totalEpisodes
  const inNowWatching = (started !== null || watchedCount > 0) && !dismissedItem && !droppedItem && !isFinished
  const canTrackNowWatching = totalEpisodes !== null && totalEpisodes > 0 && !isFinished
  const canDropShow = canTrackNowWatching && (started !== null || watchedCount > 0 || droppedItem !== null)

  const seasonWatchedCount = useMemo(() => {
    if (!season) return null
    return season.episodes.filter((ep) => watched[watchedKey(ep.season_number, ep.episode_number)]).length
  }, [season, watched])

  const nextUpcomingEpisode = useMemo(() => {
    if (!season) return null
    const ep = season.episodes.find((e) => e.air_date && isFutureDate(e.air_date)) ?? null
    if (!ep) return null
    return { ...ep, air_date: effectiveAirDate(ep) }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- effectiveAirDate closes over correctedAirDates, already a dep below
  }, [season, correctedAirDates])

  const myShowRating = useMemo(() => showRatings.find((r) => r.user_id === user?.id) ?? null, [showRatings, user])

  const seasonRatingsForActive = useMemo(
    () => (activeSeason === null ? [] : seasonRatings.filter((r) => r.season_number === activeSeason)),
    [seasonRatings, activeSeason],
  )
  const mySeasonRating = useMemo(
    () => seasonRatingsForActive.find((r) => r.user_id === user?.id) ?? null,
    [seasonRatingsForActive, user],
  )

  /** Best-effort un-hide from Now Watching, fired after any action that resumes a show. */
  function clearDismissed() {
    if (!user || !show) return
    undismissShow(user.id, show.id)
      .then(() => setDismissedItem(null))
      .catch(() => {})
  }

  /** Same idea as clearDismissed, but auto-resumes a dropped show once new progress is logged. */
  function clearDropped() {
    if (!user || !show) return
    undropShow(user.id, show.id)
      .then(() => setDroppedItem(null))
      .catch(() => {})
  }

  /** Same idea again, but graduates a show off the watchlist once real progress exists. */
  function clearWatchlist() {
    if (!user || !show || !watchlistItem) return
    removeFromWatchlist(user.id, show.id)
      .then(() => setWatchlistItem(null))
      .catch(() => {})
  }

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
      clearDismissed()
      clearDropped()
      clearWatchlist()
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
      clearDismissed()
      clearDropped()
      clearWatchlist()
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

  /** Records a standalone "started watching" declaration for a show with no logged episodes yet. */
  async function handleStartWatching() {
    if (!user || !show) return
    setSavingNowWatching(true)
    try {
      const row = await startShow({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        showTotalEpisodes: show.number_of_episodes,
      })
      setStarted(row)
      clearDismissed()
      clearDropped()
      clearWatchlist()
    } catch {
      showError('Failed to start watching. Try again.')
    } finally {
      setSavingNowWatching(false)
    }
  }

  /** Un-hides a show that was previously removed from Now Watching. */
  async function handleAddBackToNowWatching() {
    if (!user || !show) return
    setSavingNowWatching(true)
    const previous = dismissedItem
    setDismissedItem(null)
    try {
      await undismissShow(user.id, show.id)
    } catch {
      setDismissedItem(previous)
      showError('Failed to add back to Now Watching. Try again.')
    } finally {
      setSavingNowWatching(false)
    }
  }

  /** Hides the show from Now Watching without touching its progress. */
  async function handleRemoveFromNowWatching() {
    if (!user || !show) return
    setSavingNowWatching(true)
    const previous = dismissedItem
    setDismissedItem({
      id: `optimistic-${show.id}`,
      user_id: user.id,
      show_id: show.id,
      dismissed_at: new Date().toISOString(),
    })
    try {
      const row = await dismissShow(user.id, show.id)
      setDismissedItem(row)
    } catch {
      setDismissedItem(previous)
      showError('Failed to remove from Now Watching. Try again.')
      return
    } finally {
      setSavingNowWatching(false)
    }
    showUndo('Removed from Now Watching', async () => {
      try {
        await undismissShow(user.id, show.id)
        setDismissedItem(null)
      } catch {
        showError('Failed to undo. Try again.')
      }
    })
  }

  /** Single entry point for the Now Watching pill; picks the right handler for the current state. */
  function handleToggleNowWatching() {
    if (inNowWatching) handleRemoveFromNowWatching()
    else if (dismissedItem) handleAddBackToNowWatching()
    else handleStartWatching()
  }

  /** Marks the show as deliberately dropped, with an undo offered via toast. */
  async function handleDropShow() {
    if (!user || !show) return
    setSavingDropped(true)
    const previous = droppedItem
    setDroppedItem({
      id: `optimistic-${show.id}`,
      user_id: user.id,
      show_id: show.id,
      show_name: show.name,
      show_poster_path: show.poster_path,
      dropped_at: new Date().toISOString(),
    })
    try {
      const row = await dropShow({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
      })
      setDroppedItem(row)
    } catch {
      setDroppedItem(previous)
      showError('Failed to drop this show. Try again.')
      return
    } finally {
      setSavingDropped(false)
    }
    showUndo('Dropped this show', async () => {
      try {
        await undropShow(user.id, show.id)
        setDroppedItem(null)
      } catch {
        showError('Failed to undo. Try again.')
      }
    })
  }

  /** Explicit "Resume watching" from the Dropped pill/tab. */
  async function handleResumeFromDropped() {
    if (!user || !show) return
    setSavingDropped(true)
    const previous = droppedItem
    setDroppedItem(null)
    try {
      await undropShow(user.id, show.id)
    } catch {
      setDroppedItem(previous)
      showError('Failed to resume this show. Try again.')
    } finally {
      setSavingDropped(false)
    }
  }

  /** Single entry point for the Drop pill; mirrors handleToggleNowWatching. */
  function handleToggleDropped() {
    if (droppedItem) handleResumeFromDropped()
    else handleDropShow()
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
        clearDismissed()
        clearDropped()
        clearWatchlist()
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
      clearDismissed()
      clearDropped()
      clearWatchlist()
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

  /** Toggle for "want to watch", independent of watch progress. */
  async function handleToggleWatchlist() {
    if (!user || !show) return
    setSavingWatchlist(true)
    try {
      if (watchlistItem) {
        const previous = watchlistItem
        setWatchlistItem(null)
        try {
          await removeFromWatchlist(user.id, show.id)
        } catch {
          setWatchlistItem(previous)
          showError('Failed to remove from watchlist. Try again.')
          return
        }
        showUndo('Removed from watchlist', async () => {
          try {
            const saved = await addToWatchlist({
              userId: user.id,
              showId: show.id,
              showName: show.name,
              showPosterPath: show.poster_path,
            })
            setWatchlistItem(saved)
          } catch {
            showError('Failed to undo. Try adding it to your watchlist again.')
          }
        })
      } else {
        try {
          const saved = await addToWatchlist({
            userId: user.id,
            showId: show.id,
            showName: show.name,
            showPosterPath: show.poster_path,
          })
          setWatchlistItem(saved)
        } catch {
          showError('Failed to add to watchlist. Try again.')
        }
      }
    } finally {
      setSavingWatchlist(false)
    }
  }

  /** Logs a rewatch as a separate, append-only event, offered only once a show is finished. */
  async function handleLogRewatch(rewatchedAt: string) {
    if (!user || !show) return
    try {
      const saved = await logRewatch({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        rewatchedAt,
      })
      setRewatches((prev) => sortRewatchesDesc([saved, ...prev]))
    } catch {
      showError('Failed to log this rewatch. Try again.')
    }
  }

  async function handleDeleteRewatch(id: string) {
    const removed = rewatches.find((r) => r.id === id)
    setRewatches((prev) => prev.filter((r) => r.id !== id))
    try {
      await deleteRewatch(id)
    } catch {
      if (removed) setRewatches((prev) => sortRewatchesDesc([removed, ...prev]))
      showError('Failed to remove this rewatch. Try again.')
      return
    }
    if (removed) {
      showUndo('Rewatch removed', async () => {
        try {
          const restored = await restoreRewatch(removed)
          setRewatches((prev) => sortRewatchesDesc([restored, ...prev]))
        } catch {
          showError('Failed to undo. Try logging the rewatch again.')
        }
      })
    }
  }

  async function handlePickProvider(p: TmdbProviderListItem) {
    if (!user || !show) return
    try {
      const saved = await setStreamingOverride({
        showId: show.id,
        providerId: p.provider_id,
        providerName: p.provider_name,
        providerLogoPath: p.logo_path,
        updatedBy: user.id,
      })
      setOverride(saved)
      setPickerOpen(false)
      invalidatePlatformCache(show.id)
    } catch {
      showError('Failed to set streaming provider. Try again.')
    }
  }

  async function handleClearOverride() {
    if (!show) return
    try {
      await clearStreamingOverride(show.id)
      setOverride(null)
      invalidatePlatformCache(show.id)
    } catch {
      showError('Failed to reset streaming provider. Try again.')
    }
  }

  async function handleRateShow(value: number) {
    if (!user || !show) return
    setSavingRating(true)
    try {
      if (value === 0) {
        const previous = showRatings
        setShowRatings((prev) => prev.filter((r) => r.user_id !== user.id))
        try {
          await deleteShowRating(user.id, show.id)
        } catch {
          setShowRatings(previous)
          showError('Failed to clear your rating. Try again.')
        }
        return
      }
      const saved = await upsertShowRating({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        rating: value,
      })
      setShowRatings((prev) => [
        ...prev.filter((r) => r.user_id !== user.id),
        { ...saved, users: { username: user.username } },
      ])
    } catch {
      showError('Failed to save your rating. Try again.')
    } finally {
      setSavingRating(false)
    }
  }

  /** Same shape as handleRateShow, but scoped to whichever season tab is active. */
  async function handleRateSeason(value: number) {
    if (!user || !show || activeSeason === null) return
    setSavingSeasonRating(true)
    try {
      if (value === 0) {
        const previous = seasonRatings
        setSeasonRatings((prev) => prev.filter((r) => !(r.user_id === user.id && r.season_number === activeSeason)))
        try {
          await deleteSeasonRating(user.id, show.id, activeSeason)
        } catch {
          setSeasonRatings(previous)
          showError('Failed to clear your season rating. Try again.')
        }
        return
      }
      const saved = await upsertSeasonRating({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        seasonNumber: activeSeason,
        seasonName: season?.season_number === activeSeason ? season.name : null,
        rating: value,
      })
      setSeasonRatings((prev) => [
        ...prev.filter((r) => !(r.user_id === user.id && r.season_number === activeSeason)),
        { ...saved, users: { username: user.username } },
      ])
    } catch {
      showError('Failed to save your season rating. Try again.')
    } finally {
      setSavingSeasonRating(false)
    }
  }

  return {
    show,
    season,
    activeSeason,
    setActiveSeason,
    loadingShow,
    loadingSeason,
    error,
    region,
    regionProviders,
    effectiveProvider,
    loadingProviders,
    override,
    pickerOpen,
    setPickerOpen,
    handlePickProvider,
    handleClearOverride,
    watched,
    watchedCount,
    totalEpisodes,
    seasonWatchedCount,
    inNowWatching,
    canTrackNowWatching,
    dismissedItem,
    savingNowWatching,
    handleToggleNowWatching,
    canDropShow,
    droppedItem,
    savingDropped,
    handleToggleDropped,
    handleToggleWatched,
    handleMarkWatchedWithDate,
    handleMarkAllWatched,
    handleMarkSeasonWatched,
    watchlistItem,
    savingWatchlist,
    handleToggleWatchlist,
    listMembership,
    setListMembership,
    listPickerOpen,
    setListPickerOpen,
    rewatches,
    handleLogRewatch,
    handleDeleteRewatch,
    nextUpcomingEpisode,
    effectiveAirDate,
    showRatings,
    myShowRating,
    savingRating,
    handleRateShow,
    seasonRatingsForActive,
    mySeasonRating,
    savingSeasonRating,
    handleRateSeason,
    toast,
    dismissToast: dismiss,
  }
}
