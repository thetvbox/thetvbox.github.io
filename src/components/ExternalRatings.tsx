import IMDbGlyph from './IMDbGlyph'
import RottenTomatoGlyph from './RottenTomatoGlyph'
import RottenTomatoesLogo from './RottenTomatoesLogo'
import { rottenTomatoesUrl } from '../lib/rottenTomatoes'
import type { ExternalRatings as ExternalRatingsData } from '../types'

interface ExternalRatingsProps {
  ratings: ExternalRatingsData | null
  imdbId?: string | null
  showName?: string | null
}

const ROTTEN_TOMATOES_FRESH_THRESHOLD = 60

/** IMDb rating + Rotten Tomatoes score/link for a show, sourced from OMDb with graceful degradation. */
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
        <span className="rounded-full border border-accent-500/30 bg-accent-500/10 px-2.5 py-1 text-xs font-medium text-accent-300 transition-colors duration-150 group-hover:border-accent-500/50 group-hover:bg-accent-500/15">
          Click to see score
        </span>
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
            className="group flex items-center gap-1.5 text-base-300 transition-colors duration-150 hover:text-base-100"
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
