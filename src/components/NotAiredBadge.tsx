import { formatShortDate, isFutureDate } from '../lib/date'

/** Stands in for a rating control on a show or season that hasn't aired: its premiere date when known. */
export default function NotAiredBadge({ airDate }: { airDate: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline-strong px-3 py-1.5 text-xs font-medium text-base-500">
      {airDate && isFutureDate(airDate) ? `Airs ${formatShortDate(airDate)}` : 'Not aired yet'}
    </span>
  )
}
