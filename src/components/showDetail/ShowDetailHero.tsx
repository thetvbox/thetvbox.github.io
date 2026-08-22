import { motion } from 'framer-motion'
import { posterUrl, yearFromDate } from '../../lib/tmdb'
import RatingSummary from '../RatingSummary'
import type { ShowRatingWithUser, TmdbShowDetail } from '../../types'

interface ShowDetailHeroProps {
  show: TmdbShowDetail | null
  loadingShow: boolean
  showRatings: ShowRatingWithUser[]
  myRating: number
  savingRating: boolean
  currentUserId?: string
  onRateShow: (value: number) => void
}

/** Poster, title/meta, and the show-level rating summary. Rendered inside
 * the page's own backdrop + max-width container, not its own. */
export default function ShowDetailHero({
  show,
  loadingShow,
  showRatings,
  myRating,
  savingRating,
  currentUserId,
  onRateShow,
}: ShowDetailHeroProps) {
  return (
    <>
      <div className="flex items-start gap-4 sm:gap-6">
        <div className="aspect-[2/3] w-32 shrink-0 self-start overflow-hidden rounded-xl bg-base-800 shadow-2xl shadow-black/50 ring-1 ring-hairline-strong sm:w-44 lg:w-52">
          {show?.poster_path && (
            <img src={posterUrl(show.poster_path) ?? undefined} alt={show.name} className="h-full w-full object-cover" />
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="min-w-0 flex-1 self-end pb-1"
        >
          {loadingShow ? (
            <div className="animate-pulse space-y-2">
              <div className="h-6 w-2/3 rounded bg-base-800" />
              <div className="h-3 w-1/3 rounded bg-base-800" />
            </div>
          ) : (
            show && (
              <>
                <h1 className="font-display text-xl font-semibold text-base-100 sm:text-3xl">{show.name}</h1>
                <p className="mt-1 text-xs text-base-400 sm:text-sm">
                  {yearFromDate(show.first_air_date)} · {show.number_of_seasons} season
                  {show.number_of_seasons === 1 ? '' : 's'} · {show.status}
                </p>
              </>
            )
          )}
        </motion.div>
      </div>

      {show && !loadingShow && (
        <div className="mt-5">
          <RatingSummary
            ratings={showRatings}
            myRating={myRating}
            onChange={onRateShow}
            saving={savingRating}
            currentUserId={currentUserId}
            size="lg"
            ratingLabel="Rate this show"
          />
        </div>
      )}
    </>
  )
}
