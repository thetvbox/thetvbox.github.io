import RottenTomatoGlyph from './RottenTomatoGlyph'
import type { ExternalRatings as ExternalRatingsData } from '../types'

interface ExternalRatingsProps {
  ratings: ExternalRatingsData | null
  imdbId?: string | null
  /** Show title, used to link the Rotten Tomatoes score to its search results -- OMDb doesn't
   *  give us a direct RT page slug, so a search link is the only reliably-correct destination. */
  showName?: string | null
}

/** Rotten Tomatoes scores of 60% and up are "Fresh"; below that, "Rotten". */
const ROTTEN_TOMATOES_FRESH_THRESHOLD = 60

/**
 * IMDb rating + Rotten Tomatoes score, sourced from OMDb. Renders nothing until both the
 * show and its OMDb lookup have resolved, and nothing at all if OMDb has neither score for
 * this show (unconfigured, no IMDb id, or genuinely no data) -- these are a bonus, not core
 * functionality, so there's no loading/error state to show in their place.
 */
export default function ExternalRatings({ ratings, imdbId, showName }: ExternalRatingsProps) {
  if (!ratings) return null
  const { imdbRating, rottenTomatoesScore } = ratings
  if (imdbRating === null && rottenTomatoesScore === null) return null

  const imdbContent = (
    <>
      <span className="rounded bg-[#f5c518] px-1 py-0.5 text-xs font-bold leading-none text-black">IMDb</span>
      <span className="text-sm font-medium">{imdbRating?.toFixed(1)}</span>
    </>
  )

  const rtContent = (
    <>
      <RottenTomatoGlyph fresh={rottenTomatoesScore! >= ROTTEN_TOMATOES_FRESH_THRESHOLD} size={16} />
      <span className="text-sm font-medium">{rottenTomatoesScore}%</span>
    </>
  )

  return (
    <div className="mt-2 flex flex-wrap items-center gap-4">
      {imdbRating !== null &&
        (imdbId ? (
          <a
            href={`https://www.imdb.com/title/${imdbId}/`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-base-300 transition-colors duration-150 hover:text-base-100"
          >
            {imdbContent}
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-base-300">{imdbContent}</span>
        ))}
      {rottenTomatoesScore !== null &&
        (showName ? (
          <a
            href={`https://www.rottentomatoes.com/search?search=${encodeURIComponent(showName)}`}
            target="_blank"
            rel="noreferrer"
            title="Rotten Tomatoes"
            className="flex items-center gap-1.5 text-base-300 transition-colors duration-150 hover:text-base-100"
          >
            {rtContent}
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-base-300" title="Rotten Tomatoes">
            {rtContent}
          </span>
        ))}
    </div>
  )
}
