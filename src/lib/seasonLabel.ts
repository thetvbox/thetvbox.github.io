/** A season's display name: TMDB's own name when the show uses one (e.g. Lupin's "Part 4"), else "Season N" or "Specials". */
export function seasonLabel(season: { season_number: number; name?: string | null }): string {
  const fallback = season.season_number === 0 ? 'Specials' : `Season ${season.season_number}`
  const name = season.name?.trim()
  return name ? name : fallback
}
