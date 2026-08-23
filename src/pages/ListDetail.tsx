import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { fetchUserByUsername } from '../lib/users'
import { addShowToList, deleteList, fetchList, fetchListItems, removeShowFromList } from '../lib/lists'
import Toast from '../components/Toast'
import CenteredMessage from '../components/CenteredMessage'
import EmptyState from '../components/EmptyState'
import PosterTile, { POSTER_GRID_CLASSES } from '../components/PosterTile'
import { useToast } from '../hooks/useToast'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import { PAGE_HEADER_MOTION, staggerTileMotion } from '../lib/motion'
import { PROFILE_LISTS_TAB_QUERY } from '../lib/constants'
import type { AppUser, ShowList, ShowListItem } from '../types'

export default function ListDetail() {
  const { username, listId } = useParams<{ username: string; listId: string }>()
  const { user: me } = useAuth()
  const navigate = useNavigate()

  const [profile, setProfile] = useState<AppUser | null | undefined>(undefined)
  const [list, setList] = useState<ShowList | null | undefined>(undefined)
  const [items, setItems] = useState<ShowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  // Deleting a list is permanent and takes every item on it with it -- an
  // inline "are you sure" step (no native confirm(), same reasoning as
  // DateMarkControl) is the guard against one mis-tap wiping it out.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast, showUndo, showError, dismiss } = useToast()

  useEscapeAndFocusReturn(confirmingDelete, () => setConfirmingDelete(false))

  useEffect(() => {
    if (!username || !listId) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchUserByUsername(username), fetchList(listId), fetchListItems(listId)])
      .then(([userRow, listRow, itemRows]) => {
        if (cancelled) return
        setProfile(userRow)
        // A list's URL is scoped to a username, but listId is looked up on
        // its own -- without this check, a mismatched URL (list from one
        // user's page, ID from another's) would render as if it belonged to
        // the wrong owner, and that owner's "isMine" controls (delete list,
        // remove show) would act on someone else's list.
        if (listRow && userRow && listRow.user_id !== userRow.id) {
          setList(null)
          setItems([])
          return
        }
        setList(listRow)
        setItems(itemRows)
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Failed to load this list.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [username, listId])

  const isMine = Boolean(me && profile && me.id === profile.id)

  async function handleRemove(item: ShowListItem) {
    if (!listId) return
    setItems((prev) => prev.filter((i) => i.show_id !== item.show_id))
    try {
      await removeShowFromList(listId, item.show_id)
    } catch {
      setItems((prev) => [item, ...prev])
      showError(`Failed to remove ${item.show_name}. Try again.`)
      return
    }
    // The × button sits right next to the poster with no separate confirm
    // step, so a mis-tap is easy -- give it the same recoverable undo as
    // every other removal in the app instead of a silent, permanent drop.
    showUndo(`Removed ${item.show_name} from this list`, async () => {
      if (!listId) return
      try {
        const saved = await addShowToList({
          listId,
          showId: item.show_id,
          showName: item.show_name,
          showPosterPath: item.show_poster_path,
        })
        setItems((prev) => [saved, ...prev])
      } catch {
        showError('Failed to undo. Try adding it back manually.')
      }
    })
  }

  async function handleDeleteList() {
    if (!listId || !username) return
    setDeleting(true)
    try {
      await deleteList(listId)
      navigate(`/u/${username}`)
    } catch {
      setDeleting(false)
      setConfirmingDelete(false)
      showError('Failed to delete this list. Try again.')
    }
  }

  if (!loading && (loadError || profile === null || list === null)) {
    return <CenteredMessage message={loadError ?? 'List not found.'} />
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <Link
        to={`/u/${username}?${PROFILE_LISTS_TAB_QUERY}`}
        className="mb-4 inline-block text-xs text-base-500 hover:text-base-300"
      >
        &larr; {isMine ? 'Your' : `@${username}'s`} lists
      </Link>

      {loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-6 w-48 rounded bg-base-800" />
          <div className="h-3 w-64 rounded bg-base-800" />
        </div>
      ) : (
        list && (
          <>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
              <div>
                <motion.h1 {...PAGE_HEADER_MOTION} className="font-display text-xl font-semibold text-base-100 sm:text-2xl">
                  {list.name}
                </motion.h1>
                {list.description && <p className="mt-1 text-sm text-base-400">{list.description}</p>}
                <p className="mt-1 text-xs text-base-500">
                  {items.length} show{items.length === 1 ? '' : 's'}
                </p>
              </div>
              {isMine &&
                (confirmingDelete ? (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="text-xs text-base-500">Delete this list?</span>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDeleteList}
                      className="rounded-lg bg-danger/15 px-2.5 py-1.5 text-xs font-medium text-danger ring-1 ring-danger/40 transition-opacity duration-150 disabled:opacity-60"
                    >
                      {deleting ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setConfirmingDelete(false)}
                      className="text-xs text-base-500 hover:text-base-300"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="shrink-0 rounded-lg border border-hairline-strong px-3 py-1.5 text-xs text-base-400 transition-colors duration-200 hover:border-danger/40 hover:text-danger"
                  >
                    Delete list
                  </button>
                ))}
            </div>

            {items.length === 0 ? (
              <EmptyState icon="📋">
                <p className="max-w-xs text-sm text-base-500">
                  Nothing on this list yet. Add shows from any show&apos;s page.
                </p>
              </EmptyState>
            ) : (
              <div className={POSTER_GRID_CLASSES}>
                {items.map((item, i) => (
                  <motion.div key={item.id} {...staggerTileMotion(i)} className="group relative">
                    <Link to={`/show/${item.show_id}`} className="block">
                      <PosterTile posterPath={item.show_poster_path} name={item.show_name} />
                      <p className="mt-2 truncate text-sm font-medium text-base-100">{item.show_name}</p>
                    </Link>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        // Always visible on touch (no hover state to reveal it there), hover-gated from sm: up.
                        className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white backdrop-blur-sm transition-opacity duration-200 sm:h-6 sm:w-6 sm:text-xs sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label={`Remove ${item.show_name} from this list`}
                      >
                        ×
                      </button>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}
