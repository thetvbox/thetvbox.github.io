import { useState } from 'react'
import { deleteRewatch, logRewatch, restoreRewatch, sortRewatchesDesc } from '../../lib/rewatches'
import type { AppUser, ShowRewatch, TmdbShowDetail } from '../../types'

/** Append-only log of rewatch events for a show, offered once it's finished. */
export function useRewatchState(
  user: AppUser | null,
  show: TmdbShowDetail | null,
  showError: (message: string) => void,
  showUndo: (message: string, onUndo: () => void) => void,
) {
  const [rewatches, setRewatches] = useState<ShowRewatch[]>([])

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

  return { rewatches, setRewatches, handleLogRewatch, handleDeleteRewatch }
}
