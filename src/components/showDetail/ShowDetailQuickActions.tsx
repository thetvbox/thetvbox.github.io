import { AnimatePresence } from 'framer-motion'
import AddToListPicker from '../AddToListPicker'
import { ListGlyph, PlayGlyph, BookmarkGlyph } from '../ShowDetailGlyphs'
import type { AppUser, ShowWatchingDismissed, TmdbShowDetail, WatchlistItem } from '../../types'

interface ShowDetailQuickActionsProps {
  show: TmdbShowDetail
  user: AppUser | null
  canTrackNowWatching: boolean
  inNowWatching: boolean
  dismissedItem: ShowWatchingDismissed | null
  savingNowWatching: boolean
  onToggleNowWatching: () => void
  watchlistItem: WatchlistItem | null
  savingWatchlist: boolean
  onToggleWatchlist: () => void
  listMembership: Set<string>
  onListMembershipChange: (memberOf: Set<string>) => void
  listPickerOpen: boolean
  onToggleListPicker: () => void
  onCloseListPicker: () => void
}

const pillBase = 'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors duration-200'
const pillActive = 'border-accent-500/40 bg-accent-500/15 text-accent-300'
const pillInactive = 'border-hairline-strong text-base-400 hover:border-accent-500/40 hover:text-base-200'

/** Now Watching / watchlist / list toggles -- independent of each other and
 * available regardless of watch progress -- plus the list picker panel. */
export default function ShowDetailQuickActions({
  show,
  user,
  canTrackNowWatching,
  inNowWatching,
  dismissedItem,
  savingNowWatching,
  onToggleNowWatching,
  watchlistItem,
  savingWatchlist,
  onToggleWatchlist,
  listMembership,
  onListMembershipChange,
  listPickerOpen,
  onToggleListPicker,
  onCloseListPicker,
}: ShowDetailQuickActionsProps) {
  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {canTrackNowWatching && (
          <button
            type="button"
            onClick={onToggleNowWatching}
            disabled={savingNowWatching}
            aria-pressed={inNowWatching}
            className={`${pillBase} disabled:opacity-60 ${inNowWatching ? pillActive : pillInactive}`}
          >
            <PlayGlyph filled={inNowWatching} />
            {inNowWatching ? 'Remove from Now Watching' : dismissedItem ? 'Add to Now Watching' : 'Start watching'}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleWatchlist}
          disabled={savingWatchlist}
          aria-pressed={Boolean(watchlistItem)}
          className={`${pillBase} disabled:opacity-60 ${watchlistItem ? pillActive : pillInactive}`}
        >
          <BookmarkGlyph filled={Boolean(watchlistItem)} />
          {watchlistItem ? 'On your watchlist' : 'Add to watchlist'}
        </button>

        <button
          type="button"
          onClick={onToggleListPicker}
          aria-pressed={listMembership.size > 0}
          className={`${pillBase} ${listMembership.size > 0 ? pillActive : pillInactive}`}
        >
          <ListGlyph />
          {listMembership.size > 0 ? `On ${listMembership.size} list${listMembership.size === 1 ? '' : 's'}` : 'Add to a list'}
        </button>
      </div>

      <AnimatePresence>
        {listPickerOpen && user && (
          <AddToListPicker
            key="list-picker"
            userId={user.id}
            showId={show.id}
            showName={show.name}
            showPosterPath={show.poster_path}
            memberOf={listMembership}
            onChange={onListMembershipChange}
            onClose={onCloseListPicker}
          />
        )}
      </AnimatePresence>
    </>
  )
}
