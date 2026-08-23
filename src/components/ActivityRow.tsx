import { Link } from 'react-router-dom'
import { posterUrl } from '../lib/tmdb'
import { formatShortDate } from '../lib/date'
import { POSTER_THUMB_SIZE } from '../lib/constants'
import type { GroupActivityEvent } from '../lib/showActivity'
import Avatar from './Avatar'
import StarGlyph from './StarGlyph'

/** One "who did what" row -- shared by the Home teaser and the full Activity feed. */
export default function ActivityRow({ event }: { event: GroupActivityEvent }) {
  return (
    <Link
      to={`/u/${event.username}/shows/${event.showId}`}
      className="flex items-center gap-3 rounded-xl border border-hairline bg-base-850/60 p-2.5 transition-colors duration-200 hover:bg-base-800/70"
    >
      <Avatar username={event.username} size="sm" />
      <div className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-base-800">
        {event.showPosterPath && (
          <img
            src={posterUrl(event.showPosterPath, POSTER_THUMB_SIZE) ?? undefined}
            alt=""
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-base-200">
          <span className="font-medium text-base-100">@{event.username}</span>{' '}
          {event.finished ? (
            <>
              finished <span className="font-medium">{event.showName}</span>
            </>
          ) : event.seasonNumber !== null ? (
            <>
              rated <span className="font-medium">{event.showName}</span> Season {event.seasonNumber}
            </>
          ) : (
            <>
              rated <span className="font-medium">{event.showName}</span>
            </>
          )}
        </p>
        <p className="text-xs text-base-500">
          {event.atUnknown ? 'a while ago' : formatShortDate(event.at)}
          {event.finished && event.episodeCount ? ` · ${event.episodeCount} episodes` : ''}
        </p>
      </div>
      {event.rating !== null && (
        <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-star">
          {event.rating.toFixed(1)}
          <StarGlyph size={11} />
        </div>
      )}
    </Link>
  )
}
