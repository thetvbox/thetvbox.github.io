import { formatShortDate } from '../../lib/date'
import EmptyState from '../EmptyState'
import ShowRowItem from './ShowRowItem'
import type { ShowDropped } from '../../types'

interface DroppedTabProps {
  items: ShowDropped[]
  isMe: boolean
  onResume: (item: ShowDropped) => void
}

/** Dropped tab body: deliberately-stopped shows with a resume action. */
export default function DroppedTab({ items, isMe, onResume }: DroppedTabProps) {
  if (items.length === 0) {
    return (
      <EmptyState icon="🚫">
        <p className="max-w-xs text-sm text-base-500">
          {isMe ? "Nothing dropped. Shows you drop from a show's own page show up here." : 'Nothing here yet.'}
        </p>
      </EmptyState>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map((d, i) => (
        <ShowRowItem
          key={d.id}
          index={i}
          showId={d.show_id}
          showName={d.show_name}
          posterPath={d.show_poster_path}
          subtitle={`Dropped ${formatShortDate(d.dropped_at)}`}
          action={isMe ? { label: 'Resume', tone: 'accent', onClick: () => onResume(d) } : undefined}
        />
      ))}
    </ul>
  )
}
