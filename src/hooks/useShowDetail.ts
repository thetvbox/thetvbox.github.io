import { useEffect, useState } from 'react'
import { getSeasonDetail, getShowDetail } from '../lib/tmdb'
import { fetchAllShowRatings } from '../lib/showRatings'
import { fetchAllSeasonRatingsForShow } from '../lib/seasonRatings'
import { fetchWatchedForShow } from '../lib/watched'
import { fetchWatchlistItem } from '../lib/watchlist'
import { fetchStartedItem } from '../lib/showStarted'
import { fetchDismissedItem } from '../lib/showDismissed'
import { fetchDroppedItem } from '../lib/showDropped'
import { fetchRewatchesForShow } from '../lib/rewatches'
import { fetchListMembershipForShow } from '../lib/lists'
import { computeSeasonProgress, countWatchedBySeason } from '../lib/seasonProgress'
import { errorMessage } from '../lib/format'
import { useToast } from './useToast'
import { useStreamingProvider } from './showDetail/useStreamingProvider'
import { useCorrectedAirDates } from './showDetail/useCorrectedAirDates'
import { useWatchlistState } from './showDetail/useWatchlistState'
import { useNowWatchingState } from './showDetail/useNowWatchingState'
import { useEpisodeWatchHandlers } from './showDetail/useEpisodeWatchHandlers'
import { useShowRatingsState } from './showDetail/useShowRatingsState'
import { useRewatchState } from './showDetail/useRewatchState'
import type { AppUser, TmdbSeasonDetail, TmdbShowDetail, WatchedMap } from '../types'

/** All data loading, derived state, and mutation handlers for the ShowDetail page. */
export function useShowDetail(showId: number, user: AppUser | null) {
  const [show, setShow] = useState<TmdbShowDetail | null>(null)
  const [season, setSeason] = useState<TmdbSeasonDetail | null>(null)
  const [activeSeason, setActiveSeason] = useState<number | null>(null)
  const [watched, setWatched] = useState<WatchedMap>({})
  const [loadingShow, setLoadingShow] = useState(true)
  const [loadingSeason, setLoadingSeason] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [listMembership, setListMembership] = useState<Set<string>>(new Set())
  const [listPickerOpen, setListPickerOpen] = useState(false)

  const { toast, showUndo, showError, dismiss } = useToast()
  const streaming = useStreamingProvider(showId, show, user, showError)
  const airDates = useCorrectedAirDates(show, season)
  const watchlist = useWatchlistState(user, show, showError, showUndo)
  const watchedCount = Object.keys(watched).length
  const nowWatching = useNowWatchingState(user, show, watchedCount, showError, showUndo, watchlist.clearWatchlist)
  const ratings = useShowRatingsState(user, show, activeSeason, season, showError)
  const rewatchState = useRewatchState(user, show, showError, showUndo)

  /** Runs after any action that adds real progress: resumes a dismissed/dropped/watchlisted show. */
  function onProgress() {
    nowWatching.clearDismissed()
    nowWatching.clearDropped()
    watchlist.clearWatchlist()
  }

  const episodeWatch = useEpisodeWatchHandlers(
    watched,
    setWatched,
    user,
    show,
    activeSeason,
    season,
    showError,
    showUndo,
    onProgress,
  )

  useEffect(() => {
    let cancelled = false
    setLoadingShow(true)
    setError(null)

    async function load() {
      try {
        const [
          showData,
          watchedMap,
          ratingRows,
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
        ratings.setShowRatings(ratingRows)
        ratings.setSeasonRatings(seasonRatingRows)
        watchlist.setWatchlistItem(watchlistRow)
        rewatchState.setRewatches(rewatchRows)
        setListMembership(listMembershipSet)
        nowWatching.setStarted(startedRow)
        nowWatching.setDismissedItem(dismissedRow)
        nowWatching.setDroppedItem(droppedRow)
        const firstRealSeason = showData.seasons.find((s) => s.season_number > 0) ?? showData.seasons[0]
        const watchedBySeasonCount = countWatchedBySeason(Object.values(watchedMap))
        const progress = computeSeasonProgress(showData.seasons, watchedBySeasonCount)
        const defaultSeason = progress?.currentSeasonNumber ?? firstRealSeason?.season_number ?? null
        setActiveSeason(defaultSeason)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Failed to load show.'))
      } finally {
        if (!cancelled) setLoadingShow(false)
      }
    }

    if (!Number.isNaN(showId)) load()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setters from sub-hooks are stable; only showId/user should retrigger the fetch
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
        if (!cancelled) setError(errorMessage(err, 'Failed to load season.'))
      })
      .finally(() => {
        if (!cancelled) setLoadingSeason(false)
      })

    return () => {
      cancelled = true
    }
  }, [showId, activeSeason])

  return {
    show,
    season,
    activeSeason,
    setActiveSeason,
    loadingShow,
    loadingSeason,
    error,
    region: streaming.region,
    regionProviders: streaming.regionProviders,
    effectiveProvider: streaming.effectiveProvider,
    loadingProviders: streaming.loadingProviders,
    override: streaming.override,
    pickerOpen: streaming.pickerOpen,
    setPickerOpen: streaming.setPickerOpen,
    handlePickProvider: streaming.handlePickProvider,
    handleClearOverride: streaming.handleClearOverride,
    watched,
    watchedCount,
    totalEpisodes: show?.number_of_episodes ?? null,
    seasonWatchedCount: episodeWatch.seasonWatchedCount,
    inNowWatching: nowWatching.inNowWatching,
    canTrackNowWatching: nowWatching.canTrackNowWatching,
    dismissedItem: nowWatching.dismissedItem,
    savingNowWatching: nowWatching.savingNowWatching,
    handleToggleNowWatching: nowWatching.handleToggleNowWatching,
    canDropShow: nowWatching.canDropShow,
    droppedItem: nowWatching.droppedItem,
    savingDropped: nowWatching.savingDropped,
    handleToggleDropped: nowWatching.handleToggleDropped,
    handleToggleWatched: episodeWatch.handleToggleWatched,
    handleMarkWatchedWithDate: episodeWatch.handleMarkWatchedWithDate,
    handleMarkAllWatched: episodeWatch.handleMarkAllWatched,
    handleMarkSeasonWatched: episodeWatch.handleMarkSeasonWatched,
    watchlistItem: watchlist.watchlistItem,
    savingWatchlist: watchlist.savingWatchlist,
    handleToggleWatchlist: watchlist.handleToggleWatchlist,
    listMembership,
    setListMembership,
    listPickerOpen,
    setListPickerOpen,
    rewatches: rewatchState.rewatches,
    handleLogRewatch: rewatchState.handleLogRewatch,
    handleDeleteRewatch: rewatchState.handleDeleteRewatch,
    nextUpcomingEpisode: airDates.nextUpcomingEpisode,
    effectiveAirDate: airDates.effectiveAirDate,
    showRatings: ratings.showRatings,
    myShowRating: ratings.myShowRating,
    estimatedShowRating: ratings.estimatedShowRating,
    savingRating: ratings.savingRating,
    handleRateShow: ratings.handleRateShow,
    seasonRatingsForActive: ratings.seasonRatingsForActive,
    mySeasonRating: ratings.mySeasonRating,
    savingSeasonRating: ratings.savingSeasonRating,
    handleRateSeason: ratings.handleRateSeason,
    toast,
    dismissToast: dismiss,
  }
}
