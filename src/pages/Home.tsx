import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { fetchRecentShowRatings } from '../lib/showRatings'
import { fetchRecentWatched } from '../lib/watched'
import { fetchStartedForUser } from '../lib/showStarted'
import { fetchDismissedForUser } from '../lib/showDismissed'
import { fetchDroppedForUser } from '../lib/showDropped'
import { fetchWatchlist } from '../lib/watchlist'
import { fetchListsForUser } from '../lib/lists'
import { summarizeShowActivity, nowWatching } from '../lib/showActivity'
import {
  computeSeasonProgress,
  countWatchedBySeason,
  fetchNextEpisode,
  fetchSeasonBreakdowns,
} from '../lib/seasonProgress'
import type { NextEpisode, SeasonProgress } from '../lib/seasonProgress'
import { useStreamingPlatforms } from '../hooks/useStreamingPlatforms'
import { formatShortDate } from '../lib/date'
import { PAGE_HEADER_MOTION, staggerTileMotion } from '../lib/motion'
import { ACTIVITY_FETCH_LIMIT, PROFILE_LISTS_TAB_QUERY } from '../lib/constants'
import { listDetailRoute, showRoute } from '../lib/routes'
import SeasonProgressBar from '../components/SeasonProgressBar'
import StreamingBadge from '../components/StreamingBadge'
import UpcomingRow from '../components/UpcomingRow'
import type { UpcomingItem } from '../components/UpcomingRow'
import { ShowGridSkeleton } from '../components/Skeletons'
import EmptyState from '../components/EmptyState'
import PosterTile, { POSTER_GRID_CLASSES } from '../components/PosterTile'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'
import type {
  EpisodeWatched,
  ShowDropped,
  ShowListWithCount,
  ShowRating,
  ShowStarted,
  ShowWatchingDismissed,
  WatchlistItem,
} from '../types'

/** Returns a time-of-day greeting for the header. */
function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Home() {
  const { user } = useAuth()
  const [ratings, setRatings] = useState<ShowRating[]>([])
  const [watched, setWatched] = useState<EpisodeWatched[]>([])
  const [started, setStarted] = useState<ShowStarted[]>([])
  const [dismissed, setDismissed] = useState<ShowWatchingDismissed[]>([])
  const [dropped, setDropped] = useState<ShowDropped[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [lists, setLists] = useState<ShowListWithCount[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    // Genuinely synchronizing with an external system (a network fetch); known false positive
    // for this pattern, see https://github.com/facebook/react/issues/34743
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRecentShowRatings(user.id, ACTIVITY_FETCH_LIMIT),
      fetchRecentWatched(user.id, ACTIVITY_FETCH_LIMIT),
      fetchStartedForUser(user.id),
      fetchDismissedForUser(user.id),
      fetchDroppedForUser(user.id),
      fetchWatchlist(user.id),
      fetchListsForUser(user.id),
    ])
      .then(([ratingRows, watchedRows, startedRows, dismissedRows, droppedRows, watchlistRows, listRows]) => {
        if (!cancelled) {
          setRatings(ratingRows)
          setWatched(watchedRows)
          setStarted(startedRows)
          setDismissed(dismissedRows)
          setDropped(droppedRows)
          setWatchlist(watchlistRows)
          setLists(listRows)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load your shows.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  const activity = useMemo(
    () => summarizeShowActivity(ratings, watched, started, dismissed, dropped),
    [ratings, watched, started, dismissed, dropped],
  )
  const watching = useMemo(() => nowWatching(activity), [activity])

  const watchedBySeasonByShow = useMemo(() => {
    const byShow = new Map<number, EpisodeWatched[]>()
    for (const w of watched) {
      const rows = byShow.get(w.show_id)
      if (rows) rows.push(w)
      else byShow.set(w.show_id, [w])
    }
    return new Map(Array.from(byShow, ([showId, rows]) => [showId, countWatchedBySeason(rows)]))
  }, [watched])

  const [seasonProgress, setSeasonProgress] = useState<Map<number, SeasonProgress>>(new Map())
  const watchingIds = useMemo(() => watching.map((s) => s.showId), [watching])
  const watchingKey = watchingIds.join(',')
  const { platforms } = useStreamingPlatforms(watchingIds)

  useEffect(() => {
    if (!watchingKey) {
      // Nothing to fetch for an empty watching list -- resets to match, same reasoning as the
      // fetch effect below.
      // oxlint-disable-next-line react/set-state-in-effect
      setSeasonProgress(new Map())
      return
    }
    let cancelled = false
    const showIds = watchingKey.split(',').map(Number)
    fetchSeasonBreakdowns(showIds)
      .then((breakdowns) => {
        if (cancelled) return
        const next = new Map<number, SeasonProgress>()
        for (const id of showIds) {
          const seasons = breakdowns.get(id)
          if (!seasons) continue
          const progress = computeSeasonProgress(seasons, watchedBySeasonByShow.get(id) ?? {})
          if (progress) next.set(id, progress)
        }
        setSeasonProgress(next)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [watchingKey, watchedBySeasonByShow])

  const [nextEpisodes, setNextEpisodes] = useState<Map<number, NextEpisode>>(new Map())

  useEffect(() => {
    if (seasonProgress.size === 0) {
      // Nothing to fetch with no in-progress seasons -- resets to match, same reasoning as the
      // fetch effect below.
      // oxlint-disable-next-line react/set-state-in-effect
      setNextEpisodes(new Map())
      return
    }
    let cancelled = false
    Promise.all(
      Array.from(seasonProgress.entries()).map(async ([showId, progress]) => {
        const next = await fetchNextEpisode(showId, progress.currentSeasonNumber)
        return [showId, next] as const
      }),
    ).then((results) => {
      if (cancelled) return
      const map = new Map<number, NextEpisode>()
      for (const [showId, next] of results) {
        if (next) map.set(showId, next)
      }
      setNextEpisodes(map)
    }).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [seasonProgress])

  const upcoming = useMemo<UpcomingItem[]>(() => {
    const items: UpcomingItem[] = []
    for (const s of watching) {
      const next = nextEpisodes.get(s.showId)
      if (!next) continue
      items.push({
        showId: s.showId,
        showName: s.showName,
        showPosterPath: s.showPosterPath,
        seasonNumber: next.seasonNumber,
        episodeNumber: next.episodeNumber,
        airDate: next.airDate,
      })
    }
    return items.sort((a, b) => a.airDate.localeCompare(b.airDate))
  }, [watching, nextEpisodes])

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <motion.div {...PAGE_HEADER_MOTION} className="mb-6">
        <p className="text-sm font-medium text-accent-400">
          {greeting()}
          {user ? `, @${user.username}` : ''}
        </p>
        <h1 className="font-display mt-0.5 text-xl font-semibold text-base-100 sm:text-2xl">
          Now Watching
        </h1>
        <p className="mt-1 text-sm text-base-500">
          Shows you&apos;ve started but haven&apos;t finished, most recently watched first.
        </p>
      </motion.div>

      {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

      {loading ? (
        <ShowGridSkeleton count={5} progress />
      ) : watching.length === 0 ? (
        <EmptyState icon="📺" className="mt-4">
          <p className="max-w-xs text-sm text-base-500">
            Nothing in progress. Mark an episode watched on any show and it&apos;ll show up here.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Link
              to="/search"
              className="rounded-lg border border-hairline-strong px-4 py-2 text-sm text-base-200 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
            >
              Find a show
            </Link>
            <Link to="/members" className="text-sm text-accent-400 hover:underline">
              Find people to follow
            </Link>
          </div>
        </EmptyState>
      ) : (
        <div className={POSTER_GRID_CLASSES}>
          {watching.map((s, i) => {
            const progress = seasonProgress.get(s.showId)
            const isMultiSeason = Boolean(progress && progress.segments.length > 1)
            const watchedNum = isMultiSeason ? progress!.currentSeasonWatched : s.watchedCount
            const totalNum = isMultiSeason ? progress!.currentSeasonTotal : s.totalEpisodes
            const nextEpisode = nextEpisodes.get(s.showId)
            return (
              <motion.div key={s.showId} {...staggerTileMotion(i)}>
                <Link
                  to={showRoute(s.showId)}
                  state={{ jumpToProgress: true }}
                  className="group block"
                >
                  <PosterTile posterPath={s.showPosterPath} name={s.showName}>
                    <StreamingBadge provider={platforms.get(s.showId)} />
                  </PosterTile>
                  <p className="mt-2 truncate text-sm font-medium text-base-100">{s.showName}</p>
                  <p className="text-xs text-base-400">
                    {isMultiSeason && `Season ${progress!.currentSeasonNumber} · `}
                    {watchedNum}
                    {totalNum ? `/${totalNum}` : ''}
                    {s.lastWatchedAt
                      ? ` · ${s.lastWatchedAtUnknown ? 'a while ago' : formatShortDate(s.lastWatchedAt)}`
                      : ''}
                  </p>
                  {nextEpisode && (
                    <p className="text-[11px] text-accent-400">
                      New episode {formatShortDate(nextEpisode.airDate)}
                    </p>
                  )}
                  <div className="mt-1.5">
                    <SeasonProgressBar
                      segments={
                        progress?.segments ??
                        (s.totalEpisodes
                          ? [{ seasonNumber: 1, watched: s.watchedCount, total: s.totalEpisodes }]
                          : [])
                      }
                    />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-base-100">Upcoming</h2>
          </div>
          <div className="space-y-2">
            {upcoming.map((item) => (
              <UpcomingRow key={item.showId} item={item} />
            ))}
          </div>
        </div>
      )}

      {!loading && watchlist.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-base-100">Your Watchlist</h2>
            <Link
              to="/profile"
              className="inline-flex min-h-11 items-center text-xs font-medium text-accent-400 hover:underline"
            >
              See all &rarr;
            </Link>
          </div>
          <div className={POSTER_GRID_CLASSES}>
            {watchlist.map((w, i) => (
              <motion.div key={w.id} {...staggerTileMotion(i)}>
                <Link to={showRoute(w.show_id)} className="group block">
                  <PosterTile posterPath={w.show_poster_path} name={w.show_name} />
                  <p className="mt-2 truncate text-sm font-medium text-base-100">{w.show_name}</p>
                  <p className="text-xs text-base-400">Added {formatShortDate(w.added_at)}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {!loading && lists.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-base-100">Your Lists</h2>
            <Link
              to={`/profile?${PROFILE_LISTS_TAB_QUERY}`}
              className="inline-flex min-h-11 items-center text-xs font-medium text-accent-400 hover:underline"
            >
              See all &rarr;
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {lists.map((l) => (
              <Link
                key={l.id}
                to={listDetailRoute(user?.username ?? '', l.id)}
                className="rounded-full border border-hairline-strong bg-base-850/60 px-3.5 py-2 text-sm text-base-200 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
              >
                {l.name} <span className="text-base-500">· {l.itemCount}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
