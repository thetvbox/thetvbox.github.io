/**
 * Small fresh (red) / rotten (green) dot standing in for a Rotten Tomatoes score.
 * fresh is null when we only have a guessed link to RT, not an actual score -- renders
 * as a neutral outline (inheriting the surrounding text color) rather than claiming
 * fresh or rotten with no data to back it up.
 */
export default function RottenTomatoGlyph({ fresh, size = 12 }: { fresh: boolean | null; size?: number }) {
  if (fresh === null) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="13" r="9" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fresh ? '#fa320a' : '#6a8f3d'}>
      <circle cx="12" cy="13" r="9" />
      {fresh && <path d="M9 4.7c.9-1.4 2.6-2.1 4.1-1.5-.7 1.5-2.1 2.4-3.6 2.4L9 4.7z" fill="#3f8a3f" />}
    </svg>
  )
}
