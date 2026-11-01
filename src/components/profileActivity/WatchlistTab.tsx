import { Link } from 'react-router-dom'
import { formatShortDate } from '../../lib/date'
import EmptyState from '../EmptyState'
import { ROUTES } from '../../lib/routes'
import ShowRowItem from './ShowRowItem'
import type { WatchlistItem } from '../../types'

interface WatchlistTabProps {
  items: WatchlistItem[]
  isMe: boolean
  onRemove: (item: WatchlistItem) => void
}

/** Watchlist tab body -- shows saved for later, with a remove action for the owner. */
export default function WatchlistTab({ items, isMe, onRemove }: WatchlistTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="🔖">
        <p className="max-w-xs text-sm text-base-500">
          {isMe ? 'Nothing on your watchlist yet. ' : 'Nothing here yet. '}
          {isMe && (
            <>
              <Link to={ROUTES.search} className="text-accent-400 hover:underline">
                Find a show
              </Link>{' '}
              to save one for later.
            </>
          )}
        </p>
      </EmptyState>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((w, i) => (
        <ShowRowItem
          key={w.id}
          index={i}
          showId={w.show_id}
          showName={w.show_name}
          posterPath={w.show_poster_path}
          subtitle={`Added ${formatShortDate(w.added_at)}`}
          action={isMe ? { label: 'Remove', tone: 'danger', onClick: () => onRemove(w) } : undefined}
        />
      ))}
    </ul>
  )
}
