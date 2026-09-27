import { useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'

import { Chip } from '@/components/chip'
import { ErrorText } from '@/components/error-text'
import { HistorySection } from '@/components/history-section'
import { DiaryTab } from '@/components/profile-activity/diary-tab'
import type { DiaryDayGroup } from '@/components/profile-activity/diary-tab'
import { DroppedTab } from '@/components/profile-activity/dropped-tab'
import { ListsTab } from '@/components/profile-activity/lists-tab'
import { WatchlistTab } from '@/components/profile-activity/watchlist-tab'
import { RatingDistribution } from '@/components/rating-distribution'
import { StatCard } from '@/components/stat-card'
import { Toast } from '@/components/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { ACTIVITY_FETCH_LIMIT, SKELETON_ROWS } from '@/lib/constants'
import { groupByDay } from '@/lib/date'
import { errorMessage } from '@/lib/format'
import { createList, fetchListsForUser } from '@/lib/lists'
import { fetchRecentRewatches } from '@/lib/rewatches'
import { buildDiaryEntries, buildUndatedDiaryEntriesFromSummary, summarizeFromWatchSummary, watchHistory } from '@/lib/showActivity'
import { dropShow, fetchDroppedForUser, undropShow } from '@/lib/showDropped'
import { fetchRecentShowRatings } from '@/lib/showRatings'
import { fetchShowWatchSummary, fetchUndatedShowWatchSummary } from '@/lib/showWatchSummary'
import { fetchRecentDatedWatched } from '@/lib/watched'
import { addToWatchlist, fetchWatchlist, removeFromWatchlist } from '@/lib/watchlist'
import type {
  EpisodeWatched,
  ShowDropped,
  ShowListWithCount,
  ShowRating,
  ShowRewatch,
  ShowWatchSummary,
  UndatedShowWatchSummary,
  WatchlistItem,
} from '@/types'

type Tab = 'diary' | 'history' | 'watchlist' | 'dropped' | 'lists'

interface ProfileActivityProps {
  userId: string
  username: string
  initialTab?: Tab
}

/** Stats + rating histogram + the 5-tab activity switcher (Diary/History/Watchlist/Dropped/Lists) -- shared by Profile (own settings page) and PublicProfile. */
export function ProfileActivity({ userId, username, initialTab = 'diary' }: ProfileActivityProps) {
  const { user: me } = useAuth()
  const isMe = me?.id === userId
  const [tab, setTab] = useState<Tab>(initialTab)
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

  useEffect(() => {
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          if (cancelled) return
          setRatings(ratingRows)
          setDatedWatched(datedWatchedRows)
          setShowSummaries(showSummaryRows)
          setUndatedSummaries(undatedSummaryRows)
          setRewatches(rewatchRows)
          setWatchlist(watchlistRows)
          setDropped(droppedRows)
          setLists(listRows)
        },
      )
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load activity.'))
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
    const episodesWatched = showSummaries.reduce((sum, s) => sum + s.watched_count, 0)
    const hoursWatched = Math.round(showSummaries.reduce((sum, s) => sum + s.runtime_minutes_sum, 0) / 60)
    return { totalShows, finished, episodesWatched, hoursWatched }
  }, [ratings, showSummaries, activity])

  const diaryEntries = useMemo(
    () => buildDiaryEntries(ratings, datedWatched, rewatches),
    [ratings, datedWatched, rewatches],
  )
  const undatedDiaryEntries = useMemo(() => buildUndatedDiaryEntriesFromSummary(undatedSummaries), [undatedSummaries])

  const diaryGroups = useMemo<DiaryDayGroup[]>(
    () => groupByDay(diaryEntries, (entry) => entry.at).map((g) => ({ heading: g.heading, entries: g.items })),
    [diaryEntries],
  )

  const history = useMemo(() => watchHistory(activity), [activity])

  return (
    <View>
      <View className="rounded-2xl border border-hairline bg-base-900/40 p-4">
        <View className="gap-3">
          <View className="flex-row gap-3">
            <View className="flex-1">
              <StatCard label="Shows rated" value={stats.totalShows} />
            </View>
            <View className="flex-1">
              <StatCard label="Finished" value={stats.finished} onPress={() => setTab('history')} />
            </View>
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <StatCard label="Episodes watched" value={stats.episodesWatched} onPress={() => setTab('diary')} />
            </View>
            <View className="flex-1">
              <StatCard label="Hours watched" value={stats.hoursWatched} />
            </View>
          </View>
        </View>

        <RatingDistribution ratings={ratings} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
        className="mb-4 mt-4"
      >
        <Chip active={tab === 'diary'} onPress={() => setTab('diary')}>
          Diary
        </Chip>
        <Chip active={tab === 'history'} onPress={() => setTab('history')}>
          History
        </Chip>
        <Chip active={tab === 'watchlist'} onPress={() => setTab('watchlist')}>
          Watchlist{watchlist.length > 0 ? ` · ${watchlist.length}` : ''}
        </Chip>
        <Chip active={tab === 'dropped'} onPress={() => setTab('dropped')}>
          Dropped{dropped.length > 0 ? ` · ${dropped.length}` : ''}
        </Chip>
        <Chip active={tab === 'lists'} onPress={() => setTab('lists')}>
          Lists{lists.length > 0 ? ` · ${lists.length}` : ''}
        </Chip>
      </ScrollView>

      {error && <ErrorText className="mb-4 text-sm">{error}</ErrorText>}

      {loading ? (
        <View className="gap-2">
          {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
            <View key={i} className="h-16 rounded-xl bg-base-850/70" />
          ))}
        </View>
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
    </View>
  )
}
