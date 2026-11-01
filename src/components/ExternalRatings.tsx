import type { ReactNode } from 'react'
import IMDbGlyph from './IMDbGlyph'
import RottenTomatoGlyph from './RottenTomatoGlyph'
import RottenTomatoesLogo from './RottenTomatoesLogo'
import { rottenTomatoesSearchUrl } from '../lib/rottenTomatoes'
import type { ExternalRatings as ExternalRatingsData } from '../types'

interface ExternalRatingsProps {
  /** undefined while OMDb is still loading; null when it has nothing for this show. */
  ratings: ExternalRatingsData | null | undefined
  imdbId?: string | null
  showName?: string | null
}

const ROTTEN_TOMATOES_FRESH_THRESHOLD = 60
const ENTRY_CLASSES = 'flex items-center gap-1.5 text-base-300'
const LINK_CLASSES = `${ENTRY_CLASSES} transition-colors duration-150 hover:text-base-100`

/** "Not available" in place of a score, so a missing rating reads as missing rather than broken. */
function NotAvailable() {
  return <span className="text-xs text-base-500">Not available</span>
}

/** One rating entry: a link when there is somewhere real to go, plain text otherwise. */
function RatingEntry({ href, title, children }: { href: string | null; title: string; children: ReactNode }) {
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" title={title} className={LINK_CLASSES}>
      {children}
    </a>
  ) : (
    <span title={title} className={ENTRY_CLASSES}>
      {children}
    </span>
  )
}

/** IMDb rating and Rotten Tomatoes score from OMDb, with a plain "Not available" for any score OMDb doesn't have. */
export default function ExternalRatings({ ratings, imdbId, showName }: ExternalRatingsProps) {
  if (ratings === undefined) return null
  const imdbRating = ratings?.imdbRating ?? null
  const rottenTomatoesScore = ratings?.rottenTomatoesScore ?? null
  const imdbHref = imdbRating !== null && imdbId ? `https://www.imdb.com/title/${imdbId}/` : null
  const rottenTomatoesHref = rottenTomatoesScore !== null && showName ? rottenTomatoesSearchUrl(showName) : null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-4">
      <RatingEntry href={imdbHref} title="IMDb">
        <span
          className={`flex items-center justify-center rounded bg-[#f5c518] p-0.5 text-black ${imdbRating === null ? 'opacity-50' : ''}`}
        >
          <IMDbGlyph className="h-3.5 w-3.5" />
        </span>
        {imdbRating !== null ? <span className="text-sm font-medium">{imdbRating.toFixed(1)}</span> : <NotAvailable />}
      </RatingEntry>
      <RatingEntry href={rottenTomatoesHref} title="Rotten Tomatoes">
        <RottenTomatoesLogo className={`h-5 w-5 text-[#fa320a] ${rottenTomatoesScore === null ? 'opacity-50' : ''}`} />
        {rottenTomatoesScore !== null ? (
          <>
            <RottenTomatoGlyph fresh={rottenTomatoesScore >= ROTTEN_TOMATOES_FRESH_THRESHOLD} size={20} />
            <span className="text-sm font-medium">{rottenTomatoesScore}%</span>
          </>
        ) : (
          <NotAvailable />
        )}
      </RatingEntry>
    </div>
  )
}
