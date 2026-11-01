// Season splits for the Edge Functions: TMDB seasons that streamers split (Lupin's TMDB season 1 is
// Netflix's Parts 1 and 2). Mirrors splitShowDetail in src/lib/seasonSplits.ts, which the app uses.

export interface SeasonCount {
  season_number: number
  episode_count: number
}

export interface SeasonSplitRow {
  tmdb_season: number
  part_sizes: number[]
}

/** A show's regular seasons in the streamer's numbering, each split part a season of its own; a split's last part gets any extra episodes. */
export function applySeasonSplits(seasons: SeasonCount[], splits: SeasonSplitRow[]): SeasonCount[] {
  const splitBySeason = new Map(splits.map((s) => [s.tmdb_season, s.part_sizes]))
  const result: SeasonCount[] = []
  let shift = 0
  for (const season of [...seasons].filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number)) {
    const parts = splitBySeason.get(season.season_number)
    if (!parts) {
      result.push({ season_number: season.season_number + shift, episode_count: season.episode_count })
      continue
    }
    const listed = parts.slice(0, -1).reduce((sum, size) => sum + size, 0)
    parts.forEach((size, index) => {
      const isLast = index === parts.length - 1
      result.push({
        season_number: season.season_number + shift + index,
        episode_count: isLast ? Math.max(season.episode_count - listed, 0) : size,
      })
    })
    shift += parts.length - 1
  }
  return result
}
