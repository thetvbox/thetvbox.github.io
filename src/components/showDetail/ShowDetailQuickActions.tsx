import { AnimatePresence } from 'framer-motion'
import AddToListPicker from '../AddToListPicker'
import { ListGlyph, PlayGlyph, BookmarkGlyph, DropGlyph } from '../ShowDetailGlyphs'
import { pluralSuffix } from '../../lib/format'
import { ICON_PILL_ACTIVE_CLASSES, ICON_PILL_BASE_CLASSES, ICON_PILL_INACTIVE_CLASSES } from '../../lib/iconPill'
import type { AppUser, ShowDropped, ShowWatchingDismissed, TmdbShowDetail, WatchlistItem } from '../../types'

interface ShowDetailQuickActionsProps {
  show: TmdbShowDetail
  user: AppUser | null
  canTrackNowWatching: boolean
  inNowWatching: boolean
  dismissedItem: ShowWatchingDismissed | null
  savingNowWatching: boolean
  onToggleNowWatching: () => void
  canDropShow: boolean
  droppedItem: ShowDropped | null
  savingDropped: boolean
  onToggleDropped: () => void
  watchlistItem: WatchlistItem | null
  savingWatchlist: boolean
  onToggleWatchlist: () => void
  listMembership: Set<string>
  onListMembershipChange: (memberOf: Set<string>) => void
  listPickerOpen: boolean
  onToggleListPicker: () => void
  onCloseListPicker: () => void
}

/** Now Watching / watchlist / list toggles, independent of each other, plus the list picker panel. */
export default function ShowDetailQuickActions({
  show,
  user,
  canTrackNowWatching,
  inNowWatching,
  dismissedItem,
  savingNowWatching,
  onToggleNowWatching,
  canDropShow,
  droppedItem,
  savingDropped,
  onToggleDropped,
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
            className={`${ICON_PILL_BASE_CLASSES} disabled:opacity-60 ${inNowWatching ? ICON_PILL_ACTIVE_CLASSES : ICON_PILL_INACTIVE_CLASSES}`}
          >
            <PlayGlyph filled={inNowWatching} />
            {inNowWatching ? 'Remove from Now Watching' : dismissedItem ? 'Add to Now Watching' : 'Start watching'}
          </button>
        )}

        {canDropShow && (
          <button
            type="button"
            onClick={onToggleDropped}
            disabled={savingDropped}
            aria-pressed={Boolean(droppedItem)}
            className={`${ICON_PILL_BASE_CLASSES} disabled:opacity-60 ${droppedItem ? ICON_PILL_ACTIVE_CLASSES : ICON_PILL_INACTIVE_CLASSES}`}
          >
            <DropGlyph filled={Boolean(droppedItem)} />
            {droppedItem ? 'Resume watching' : 'Drop this show'}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleWatchlist}
          disabled={savingWatchlist}
          aria-pressed={Boolean(watchlistItem)}
          className={`${ICON_PILL_BASE_CLASSES} disabled:opacity-60 ${watchlistItem ? ICON_PILL_ACTIVE_CLASSES : ICON_PILL_INACTIVE_CLASSES}`}
        >
          <BookmarkGlyph filled={Boolean(watchlistItem)} />
          {watchlistItem ? 'On your watchlist' : 'Add to watchlist'}
        </button>

        <button
          type="button"
          onClick={onToggleListPicker}
          aria-pressed={listMembership.size > 0}
          className={`${ICON_PILL_BASE_CLASSES} ${listMembership.size > 0 ? ICON_PILL_ACTIVE_CLASSES : ICON_PILL_INACTIVE_CLASSES}`}
        >
          <ListGlyph />
          {listMembership.size > 0 ? `On ${listMembership.size} list${pluralSuffix(listMembership.size)}` : 'Add to a list'}
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
