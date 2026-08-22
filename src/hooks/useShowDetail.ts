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
import { deleteRewatch, fetchRewatchesForShow, logRewatch, restoreRewatch, sortRewatchesDesc } from '../lib/rewatches'
import { fetchListMembershipForShow } from '../lib/lists'
import { computeSeasonProgress } from '../lib/seasonProgress'
import { getCorrectedAirDates, tvmazeEpisodeKey } from '../lib/tvmaze'
import { isFutureDate } from '../lib/date'
import { useToast } from './useToast'
import type {
  AppUser,
  EpisodeWatched,
  SeasonRatingWithUser,
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

/** Splits a batch of (season, episode) targets into ones that already had a
 * watched row (captured in full, so undo can restore their exact prior date)
 * and ones that don't exist yet (captured as keys, so undo just deletes them). */
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

/** All data loading, derived state, and mutation handlers for the ShowDetail
 * page. Kept as one hook (rather than several) since nearly every handler
 * needs `show`/`user` plus a mix of the other pieces of state -- splitting
 * further would mostly just move the same coupling into extra parameters. */
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
  const [override, setOverride] = useState<StreamingOverride | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [savingNowWatching, setSavingNowWatching] = useState(false)
  const [started, setStarted] = useState<ShowStarted | null>(null)
  const [dismissedItem, setDismissedItem] = useState<ShowWatchingDismissed | null>(null)
  const { toast, showUndo, showError, dismiss } = useToast()
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null)
  const [savingWatchlist, setSavingWatchlist] = useState(false)
  const [rewatches, setRewatches] = useState<ShowRewatch[]>([])
  const [listMembership, setListMembership] = useState<Set<string>>(new Set())
  const [listPickerOpen, setListPickerOpen] = useState(false)
  const [correctedAirDates, setCorrectedAirDates] = useState<Map<string, string>>(new Map())

  // Load show detail + my watch progress + everyone's show/season ratings, in parallel.
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
        // Default to whichever season you're actually on (same "current
        // season" logic as Home's Now Watching card), not always Season 1.
        const firstRealSeason = showData.seasons.find((s) => s.season_number > 0) ?? showData.seasons[0]
        const watchedBySeasonCount: Record<number, number> = {}
        for (const row of Object.values(watchedMap)) {
          watchedBySeasonCount[row.season_number] = (watchedBySeasonCount[row.season_number] ?? 0) + 1
        }
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

  // Load episodes whenever the active season changes.
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

  // Where-to-watch is a nice-to-have -- fetch separately so a hiccup here
  // never blocks or errors out the rest of the page.
  useEffect(() => {
    if (Number.isNaN(showId)) return
    let cancelled = false
    getWatchProviders(showId)
      .then((data) => {
        if (!cancelled) setProviders(data)
      })
      .catch(() => {
        // Silently skip the section rather than surfacing an error for this.
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

  // Air-date correction is also a nice-to-have -- see lib/tvmaze.ts. Waits on
  // `show` (not showId directly) since it needs external_ids from the show fetch.
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

  /** TVmaze's correction for one episode's air date, or its own TMDB date
   * unchanged if there's no match -- shared by the "next episode" banner and
   * every EpisodeRow so the two can never disagree. */
  function effectiveAirDate(ep: { season_number: number; episode_number: number; air_date: string | null }): string | null {
    if (!ep.air_date) return null
    return correctedAirDates.get(tvmazeEpisodeKey(ep.season_number, ep.episode_number)) ?? ep.air_date
  }

  const region = useMemo(() => detectRegion(), [])
  const regionProviders = providers?.results[region] ?? null

  // The single best-guess "free to you" answer -- shared with the History/
  // Activity "sort by platform" grouping so the two never disagree.
  const bestFreeProvider = useMemo(() => pickBestFreeProvider(regionProviders), [regionProviders])

  // A manual correction always wins over the automatic guess.
  const effectiveProvider: { provider_name: string; logo_path: string | null } | null = override
    ? { provider_name: override.provider_name, logo_path: override.provider_logo_path }
    : bestFreeProvider

  const watchedCount = Object.keys(watched).length
  const totalEpisodes = show?.number_of_episodes ?? null

  // Mirrors nowWatching()'s own filter in lib/showActivity.ts -- kept as a
  // simple boolean here since this only ever needs the one show already loaded.
  const isFinished = totalEpisodes !== null && watchedCount >= totalEpisodes
  const inNowWatching = (started !== null || watchedCount > 0) && !dismissedItem && !isFinished
  const canTrackNowWatching = totalEpisodes !== null && totalEpisodes > 0 && !isFinished

  const seasonWatchedCount = useMemo(() => {
    if (!season) return null
    return season.episodes.filter((ep) => watched[watchedKey(ep.season_number, ep.episode_number)]).length
  }, [season, watched])

  // The active season's episode list is already loaded (has air_date), so
  // this is just a client-side scan. "Is it upcoming" still goes by TMDB's
  // own date -- only the *displayed* date gets TVmaze's correction.
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

  /** Best-effort "un-hide from Now Watching", fired after any action meaning
   * the person is actively picking this show back up. Not worth a loading
   * state or error toast -- worst case the show stays hidden until removed
   * and re-added another way. */
  function clearDismissed() {
    if (!user || !show) return
    undismissShow(user.id, show.id)
      .then(() => setDismissedItem(null))
      .catch(() => {
        // Best-effort, see comment above -- fail silently.
      })
  }

  async function handleToggleWatched(episodeNumber: number, episodeName: string, runtimeMinutes: number | null) {
    if (!user || !show || activeSeason === null) return
    const key = watchedKey(activeSeason, episodeNumber)

    if (watched[key]) {
      // Snapshot so a failed unmark can be put back exactly as it was.
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

    // Optimistic placeholder, swapped for the real row once the write resolves.
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
    } catch {
      setWatched((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
      showError('Failed to mark this episode watched. Try again.')
    }
  }

  /** Undoes a bulk mark-watched action: restores episodes that were already
   * watched to their exact prior date, and deletes episodes the action itself
   * created. Owns its own error reporting since the toast fires it un-awaited. */
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

  async function handleMarkAllWatched(input: { watchedAt: string; unknownDate: boolean }) {
    if (!user || !show) return
    const realSeasons = show.seasons.filter((s) => s.season_number > 0)
    // Fetch every season's episode list so each row can carry its real
    // runtime -- without it, a show logged this way would silently
    // contribute 0 to "hours watched" forever. One extra TMDB call per
    // season, but this action only runs once per show.
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
          // Falls back to null only if that season's fetch itself failed above.
          runtimeMinutes: runtimeByKey.get(watchedKey(s.season_number, episodeNumber)) ?? null,
        }
      }),
    )
    // Snapshot what's about to change before the write, so a mis-tap can be
    // undone instead of requiring a manual fix.
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
      showUndo(
        previousRows.length > 0
          ? `Marked ${saved.length} episodes watched (${previousRows.length} overwritten)`
          : `Marked ${saved.length} episodes watched`,
        () => undoBulkMark(previousRows, addedKeys),
      )
    } catch {
      // Nothing was applied locally, so there's nothing to roll back.
      showError('Failed to mark episodes watched. Try again.')
    }
  }

  /** "Start watching" -- the manual add-to-Now-Watching entry point for a
   * show you haven't logged any episodes for yet. Records a standalone
   * "started" declaration (show_started) rather than faking progress by
   * marking episode 1, so Now Watching shows 0/x until a real episode is
   * marked watched. One tap, stamped "now" -- unlike the bulk actions it
   * skips the date picker entirely. */
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
    } catch {
      showError('Failed to start watching. Try again.')
    } finally {
      setSavingNowWatching(false)
    }
  }

  /** Un-hides a show that already has real progress or a "started"
   * declaration but was previously removed from Now Watching. Deliberate
   * user action, so unlike clearDismissed this reports failure. */
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

  /** "Remove from Now Watching" -- hides the show without touching
   * show_started/episode_watched; resuming the show brings it back
   * automatically via clearDismissed. A soft "not right now," not a reset. */
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

  /** Single entry point for the Now Watching pill -- picks the right handler
   * above based on current state, so the button doesn't need to know the model. */
  function handleToggleNowWatching() {
    if (inNowWatching) handleRemoveFromNowWatching()
    else if (dismissedItem) handleAddBackToNowWatching()
    else handleStartWatching()
  }

  /** Same idea as handleToggleWatched, but for logging a single episode on a
   * specific past date instead of always stamping "now". */
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
      }
    } catch {
      showError('Failed to mark this episode watched. Try again.')
    }
  }

  async function handleMarkSeasonWatched(input: { watchedAt: string; unknownDate: boolean }) {
    if (!user || !show || !season) return
    // Skip TMDB's not-yet-aired placeholder episodes -- same check as EpisodeRow.tsx.
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

  /** Logs a rewatch -- a separate, append-only event, not a change to
   * episode_watched. Only ever offered once a show is finished. */
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
      // sortRewatchesDesc, not a plain prepend -- rewatchedAt can be backdated.
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
      // Poster badges on Home/History/Search read from a cached answer --
      // without this they'd keep showing the old provider until a hard reload.
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

  /** Same shape as handleRateShow, but scoped to whichever season tab is
   * active -- a separate, independent rating rather than a component of the
   * show-level one. */
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
