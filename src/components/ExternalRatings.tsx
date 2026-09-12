import IMDbGlyph from './IMDbGlyph'
import RottenTomatoGlyph from './RottenTomatoGlyph'
import RottenTomatoesLogo from './RottenTomatoesLogo'
import { rottenTomatoesUrl } from '../lib/rottenTomatoes'
import type { ExternalRatings as ExternalRatingsData } from '../types'

interface ExternalRatingsProps {
  ratings: ExternalRatingsData | null
  imdbId?: string | null
  /** Show title. Used to link straight to the show's Rotten Tomatoes page -- there's no free
   *  API that hands back an actual RT page for a show, so this is guessed from the title (see
   *  rottenTomatoesUrl) rather than looked up. Also lets the RT badge render before OMDb
   *  resolves, or even when OMDb has no score for this show at all. */
  showName?: string | null
}

/** Rotten Tomatoes scores of 60% and up are "Fresh"; below that, "Rotten". */
const ROTTEN_TOMATOES_FRESH_THRESHOLD = 60

/**
 * IMDb rating + Rotten Tomatoes score, sourced from OMDb. The IMDb rating only appears once
 * OMDb resolves one, since there's no other source for it here. The Rotten Tomatoes badge
 * appears as soon as the show itself has loaded, with a "Click to see score" hint linking to a
 * guessed RT page, and swaps in the fresh/rotten glyph and percentage if/when OMDb has an
 * actual score for this show -- these are a bonus, not core functionality, so there's no error
 * state, just less detail.
 */
export default function ExternalRatings({ ratings, imdbId, showName }: ExternalRatingsProps) {
  const imdbRating = ratings?.imdbRating ?? null
  const rottenTomatoesScore = ratings?.rottenTomatoesScore ?? null
  if (imdbRating === null && rottenTomatoesScore === null && !showName) return null

  const imdbContent = (
    <>
      <span className="flex items-center justify-center rounded bg-[#f5c518] p-0.5 text-black">
        <IMDbGlyph className="h-3.5 w-3.5" />
      </span>
      <span className="text-sm font-medium">{imdbRating?.toFixed(1)}</span>
    </>
  )

  const rtScoreKnown = rottenTomatoesScore !== null
  const rtContent = (
    <>
      <RottenTomatoesLogo className="h-5 w-5 text-[#fa320a]" />
      {rtScoreKnown ? (
        <>
          <RottenTomatoGlyph fresh={rottenTomatoesScore >= ROTTEN_TOMATOES_FRESH_THRESHOLD} size={20} />
          <span className="text-sm font-medium">{rottenTomatoesScore}%</span>
        </>
      ) : (
        <span className="text-sm text-base-400">Click to see score</span>
      )}
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
      {(rtScoreKnown || showName) &&
        (showName ? (
          <a
            href={rottenTomatoesUrl(showName)}
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
