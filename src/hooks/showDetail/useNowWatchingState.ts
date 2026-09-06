import { useState } from 'react'
import { dismissShow, undismissShow } from '../../lib/showDismissed'
import { dropShow, undropShow } from '../../lib/showDropped'
import { startShow } from '../../lib/showStarted'
import type { AppUser, ShowDropped, ShowStarted, ShowWatchingDismissed, TmdbShowDetail } from '../../types'

/** Tracks a show's Now-Watching / Dismissed / Dropped state and the transitions between them. */
export function useNowWatchingState(
  user: AppUser | null,
  show: TmdbShowDetail | null,
  watchedCount: number,
  showError: (message: string) => void,
  showUndo: (message: string, onUndo: () => void) => void,
  onStarted: () => void,
) {
  const [started, setStarted] = useState<ShowStarted | null>(null)
  const [dismissedItem, setDismissedItem] = useState<ShowWatchingDismissed | null>(null)
  const [droppedItem, setDroppedItem] = useState<ShowDropped | null>(null)
  const [savingNowWatching, setSavingNowWatching] = useState(false)
  const [savingDropped, setSavingDropped] = useState(false)

  const totalEpisodes = show?.number_of_episodes ?? null
  const isFinished = totalEpisodes !== null && watchedCount >= totalEpisodes
  const inNowWatching = (started !== null || watchedCount > 0) && !dismissedItem && !droppedItem && !isFinished
  const canTrackNowWatching = totalEpisodes !== null && totalEpisodes > 0 && !isFinished
  const canDropShow = canTrackNowWatching && (started !== null || watchedCount > 0 || droppedItem !== null)

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
      onStarted()
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

  return {
    started,
    setStarted,
    dismissedItem,
    setDismissedItem,
    droppedItem,
    setDroppedItem,
    savingNowWatching,
    savingDropped,
    inNowWatching,
    canTrackNowWatching,
    canDropShow,
    handleToggleNowWatching,
    handleToggleDropped,
    clearDismissed,
    clearDropped,
  }
}
