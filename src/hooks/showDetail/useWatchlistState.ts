import { useState } from 'react'
import { addToWatchlist, removeFromWatchlist } from '../../lib/watchlist'
import type { AppUser, TmdbShowDetail, WatchlistItem } from '../../types'

/** Tracks one show's "want to watch" state, independent of actual watch progress. */
export function useWatchlistState(
  user: AppUser | null,
  show: TmdbShowDetail | null,
  showError: (message: string) => void,
  showUndo: (message: string, onUndo: () => void) => void,
) {
  const [watchlistItem, setWatchlistItem] = useState<WatchlistItem | null>(null)
  const [savingWatchlist, setSavingWatchlist] = useState(false)

  /** Best-effort removal from the watchlist, fired after any action that resumes a show. */
  function clearWatchlist() {
    if (!user || !show || !watchlistItem) return
    removeFromWatchlist(user.id, show.id)
      .then(() => setWatchlistItem(null))
      .catch(() => {})
  }

  /** Toggle for "want to watch", with undo either direction. */
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

  return { watchlistItem, setWatchlistItem, savingWatchlist, handleToggleWatchlist, clearWatchlist }
}
