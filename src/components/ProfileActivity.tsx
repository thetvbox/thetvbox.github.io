import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fetchRecentShowRatings } from '../lib/showRatings'
import { fetchRecentDatedWatched } from '../lib/watched'
import { fetchRecentRewatches } from '../lib/rewatches'
import { fetchShowWatchSummary, fetchUndatedShowWatchSummary } from '../lib/showWatchSummary'
import {
  buildDiaryEntries,
  buildUndatedDiaryEntriesFromSummary,
  summarizeFromWatchSummary,
  watchHistory,
} from '../lib/showActivity'
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from '../lib/watchlist'
import { dropShow, fetchDroppedForUser, undropShow } from '../lib/showDropped'
import { createList, fetchListsForUser } from '../lib/lists'
import { dayKey, formatDiaryHeading } from '../lib/date'
import { ACTIVITY_FETCH_LIMIT, SKELETON_ROWS } from '../lib/constants'
import { useAuth } from '../contexts/AuthContext'
import HistorySection from './HistorySection'
import RatingDistribution from './RatingDistribution'
import Toast from './Toast'
import StatCard from './StatCard'
import DiaryTab from './profileActivity/DiaryTab'
import type { DiaryDayGroup } from './profileActivity/DiaryTab'
import WatchlistTab from './profileActivity/WatchlistTab'
import DroppedTab from './profileActivity/DroppedTab'
import ListsTab from './profileActivity/ListsTab'
import { useToast } from '../hooks/useToast'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import type {
  EpisodeWatched,
  ShowDropped,
  ShowListWithCount,
  ShowRating,
  ShowRewatch,
  ShowWatchSummary,
  UndatedShowWatchSummary,
  WatchlistItem,
} from '../types'

interface ProfileActivityProps {
  userId: string
  username: string
}

type Tab = 'diary' | 'history' | 'watchlist' | 'dropped' | 'lists'
const TABS: Tab[] = ['diary', 'history', 'watchlist', 'dropped', 'lists']

export default function ProfileActivity({ userId, username }: ProfileActivityProps) {
  const { user: me } = useAuth()
  const isMe = me?.id === userId
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: Tab = tabParam && TABS.includes(tabParam as Tab) ? (tabParam as Tab) : 'diary'

  function setTab(next: Tab) {
    setSearchParams(
      (prev) => {
        const nextParams = new URLSearchParams(prev)
        if (next === 'diary') nextParams.delete('tab')
        else nextParams.set('tab', next)
        return nextParams
      },
      { replace: true },
    )
  }
  const [ratings, setRatings] = useState<ShowRating[]>([])
  const [datedWatched, setDatedWatched] = useState<EpisodeWatched[]>([])
  const [showSummaries, setShowSummaries] = useState<ShowWatchSummary[]>([])
  const [undatedSummaries, setUndatedSummaries] = useState<UndatedShowWatchSummary[]>([])
  const [rewatches, setRewatches] = useState<ShowRewatch[]>([])
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [dropped, setDropped] = useState<ShowDropped[]>([])
  const [lists, setLists] = useState<ShowListWithCount[]>([])
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [savingList, setSavingList] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast, showUndo, showError, dismiss } = useToast()

  useEscapeAndFocusReturn(creatingList, () => setCreatingList(false))

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([
      fetchRecentShowRatings(userId, ACTIVITY_FETCH_LIMIT),
      fetchRecentDatedWatched(userId, ACTIVITY_FETCH_LIMIT),
      fetchShowWatchSummary(userId),
      fetchUndatedShowWatchSummary(userId),
      fetchRecentRewatches(userId, ACTIVITY_FETCH_LIMIT),
      fetchWatchlist(userId),
      fetchDroppedForUser(userId),
      fetchListsForUser(userId),
    ])
      .then(
        ([
          ratingRows,
          datedWatchedRows,
          showSummaryRows,
          undatedSummaryRows,
          rewatchRows,
          watchlistRows,
          droppedRows,
          listRows,
        ]) => {
          if (!cancelled) {
            setRatings(ratingRows)
            setDatedWatched(datedWatchedRows)
            setShowSummaries(showSummaryRows)
            setUndatedSummaries(undatedSummaryRows)
            setRewatches(rewatchRows)
            setWatchlist(watchlistRows)
            setDropped(droppedRows)
            setLists(listRows)
          }
        },
      )
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load activity.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  async function handleRemoveFromWatchlist(item: WatchlistItem) {
    setWatchlist((prev) => prev.filter((w) => w.show_id !== item.show_id))
    try {
      await removeFromWatchlist(userId, item.show_id)
    } catch {
      setWatchlist((prev) => [item, ...prev])
      showError(`Failed to remove ${item.show_name}. Try again.`)
      return
    }
    showUndo(`Removed ${item.show_name} from watchlist`, async () => {
      try {
        const saved = await addToWatchlist({
          userId,
          showId: item.show_id,
          showName: item.show_name,
          showPosterPath: item.show_poster_path,
        })
        setWatchlist((prev) => [saved, ...prev])
      } catch {
        showError('Failed to undo. Try adding it back manually.')
      }
    })
  }

  async function handleResumeFromDropped(item: ShowDropped) {
    setDropped((prev) => prev.filter((d) => d.show_id !== item.show_id))
    try {
      await undropShow(userId, item.show_id)
    } catch {
      setDropped((prev) => [item, ...prev])
      showError(`Failed to resume ${item.show_name}. Try again.`)
      return
    }
    showUndo(`Resumed ${item.show_name}`, async () => {
      try {
        const saved = await dropShow({
          userId,
          showId: item.show_id,
          showName: item.show_name,
          showPosterPath: item.show_poster_path,
        })
        setDropped((prev) => [saved, ...prev])
      } catch {
        showError('Failed to undo. Try dropping it again from the show page.')
      }
    })
  }

  async function handleCreateList() {
    const name = newListName.trim()
    if (!name) return
    setSavingList(true)
    try {
      const list = await createList(userId, name)
      setLists((prev) => [{ ...list, itemCount: 0 }, ...prev])
      setNewListName('')
      setCreatingList(false)
    } catch {
      showError('Failed to create list. Try again.')
    } finally {
      setSavingList(false)
    }
  }

  const activity = useMemo(() => summarizeFromWatchSummary(ratings, showSummaries), [ratings, showSummaries])

  const stats = useMemo(() => {
    const totalShows = ratings.length
    const finished = activity.filter((s) => s.finished).length
    const avg = totalShows === 0 ? null : ratings.reduce((sum, r) => sum + r.rating, 0) / totalShows
    const episodesWatched = showSummaries.reduce((sum, s) => sum + s.watched_count, 0)
    const hoursWatched = Math.round(showSummaries.reduce((sum, s) => sum + s.runtime_minutes_sum, 0) / 60)
    return { totalShows, finished, episodesWatched, avg, hoursWatched }
  }, [ratings, showSummaries, activity])

  const diaryEntries = useMemo(
    () => buildDiaryEntries(ratings, datedWatched, rewatches),
    [ratings, datedWatched, rewatches],
  )
  const undatedDiaryEntries = useMemo(
    () => buildUndatedDiaryEntriesFromSummary(undatedSummaries),
    [undatedSummaries],
  )

  const diaryGroups = useMemo<DiaryDayGroup[]>(() => {
    const groups: DiaryDayGroup[] = []
    let currentKey = ''
    for (const entry of diaryEntries) {
      const key = dayKey(entry.at)
      if (key !== currentKey) {
        groups.push({ heading: formatDiaryHeading(entry.at), entries: [entry] })
        currentKey = key
      } else {
        groups[groups.length - 1].entries.push(entry)
      }
    }
    return groups
  }, [diaryEntries])

  const history = useMemo(() => watchHistory(activity), [activity])

  return (
    <div>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Shows rated" value={stats.totalShows} />
        <StatCard label="Finished" value={stats.finished} />
        <StatCard label="Episodes watched" value={stats.episodesWatched} />
        <StatCard label="Hours watched" value={stats.hoursWatched} />
        <StatCard label="Avg rating" value={stats.avg !== null ? stats.avg.toFixed(1) : '—'} />
      </div>

      <RatingDistribution ratings={ratings} />

      <div className="mb-4 flex items-center gap-1">
        <TabButton active={tab === 'diary'} onClick={() => setTab('diary')}>
          Diary
        </TabButton>
        <TabButton active={tab === 'history'} onClick={() => setTab('history')}>
          History
        </TabButton>
        <TabButton active={tab === 'watchlist'} onClick={() => setTab('watchlist')}>
          Watchlist
        </TabButton>
        <TabButton active={tab === 'dropped'} onClick={() => setTab('dropped')}>
          Dropped
        </TabButton>
        <TabButton active={tab === 'lists'} onClick={() => setTab('lists')}>
          Lists
        </TabButton>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-base-850/70" />
          ))}
        </div>
      ) : tab === 'diary' ? (
        <DiaryTab groups={diaryGroups} undatedEntries={undatedDiaryEntries} username={username} />
      ) : tab === 'history' ? (
        <HistorySection
          activity={history}
          username={username}
          emptyMessage="Nothing finished yet. Shows show up here once every episode is watched, or once they're rated."
        />
      ) : tab === 'watchlist' ? (
        <WatchlistTab items={watchlist} isMe={isMe} onRemove={handleRemoveFromWatchlist} />
      ) : tab === 'dropped' ? (
        <DroppedTab items={dropped} isMe={isMe} onResume={handleResumeFromDropped} />
      ) : (
        <ListsTab
          lists={lists}
          isMe={isMe}
          username={username}
          creatingList={creatingList}
          newListName={newListName}
          onNewListNameChange={setNewListName}
          savingList={savingList}
          onStartCreating={() => setCreatingList(true)}
          onCancelCreating={() => setCreatingList(false)}
          onCreateList={handleCreateList}
        />
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-200 ${
        active ? 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40' : 'text-base-400 hover:text-base-200'
      }`}
    >
      {children}
    </button>
  )
}
