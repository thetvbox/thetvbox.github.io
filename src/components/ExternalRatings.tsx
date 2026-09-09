import RottenTomatoGlyph from './RottenTomatoGlyph'
import type { ExternalRatings as ExternalRatingsData } from '../types'

interface ExternalRatingsProps {
  ratings: ExternalRatingsData | null
  imdbId?: string | null
}

/** Rotten Tomatoes scores of 60% and up are "Fresh"; below that, "Rotten". */
const ROTTEN_TOMATOES_FRESH_THRESHOLD = 60

/**
 * IMDb rating + Rotten Tomatoes score, sourced from OMDb. Renders nothing until both the
 * show and its OMDb lookup have resolved, and nothing at all if OMDb has neither score for
 * this show (unconfigured, no IMDb id, or genuinely no data) -- these are a bonus, not core
 * functionality, so there's no loading/error state to show in their place.
 */
export default function ExternalRatings({ ratings, imdbId }: ExternalRatingsProps) {
  if (!ratings) return null
  const { imdbRating, rottenTomatoesScore } = ratings
  if (imdbRating === null && rottenTomatoesScore === null) return null

  const imdbContent = (
    <>
      <span className="rounded bg-[#f5c518] px-1 py-0.5 text-[10px] font-bold leading-none text-black">IMDb</span>
      {imdbRating?.toFixed(1)}
    </>
  )

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3">
      {imdbRating !== null &&
        (imdbId ? (
          <a
            href={`https://www.imdb.com/title/${imdbId}/`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-base-300 transition-colors duration-150 hover:text-base-100"
          >
            {imdbContent}
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-xs text-base-300">{imdbContent}</span>
        ))}
      {rottenTomatoesScore !== null && (
        <span className="flex items-center gap-1.5 text-xs text-base-300" title="Rotten Tomatoes">
          <RottenTomatoGlyph fresh={rottenTomatoesScore >= ROTTEN_TOMATOES_FRESH_THRESHOLD} size={13} />
          {rottenTomatoesScore}%
        </span>
      )}
    </div>
  )
}
