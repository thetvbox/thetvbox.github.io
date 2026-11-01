// Seasons that TMDB lumps together but streamers split, e.g. Lupin's TMDB season 1 is Netflix's Parts 1 and 2.
// The app shows (and stores) the streamer's numbering; these pure helpers convert between the two.
// The same rules live in SQL (season_split_to_display/to_tmdb) and in supabase/functions/_shared/seasonSplits.ts.
import type { TmdbSeasonDetail, TmdbShowDetail } from '../types'

/** One TMDB season that is really several streamer seasons, with each part's episode count. */
export interface SeasonSplit {
  tmdbSeason: number
  partSizes: number[]
}

interface SeasonCount {
  season_number: number
  episode_count: number
}

interface EpisodeNumber {
  season: number
  episode: number
}

const byTmdbSeason = (a: SeasonSplit, b: SeasonSplit) => a.tmdbSeason - b.tmdbSeason

/** Finds TMDB seasons whose episodes add up exactly to two or more consecutive streamer seasons, walking both in order and stopping where they disagree. */
export function detectSeasonSplits(tmdbSeasons: SeasonCount[], streamerSeasonSizes: number[]): SeasonSplit[] {
  const regular = tmdbSeasons.filter((s) => s.season_number > 0).sort((a, b) => a.season_number - b.season_number)
  const splits: SeasonSplit[] = []
  let next = 0
  for (const season of regular) {
    const parts: number[] = []
    let total = 0
    while (total < season.episode_count && next < streamerSeasonSizes.length) {
      parts.push(streamerSeasonSizes[next])
      total += streamerSeasonSizes[next]
      next += 1
    }
    if (season.episode_count === 0 || total !== season.episode_count) break
    if (parts.length >= 2) splits.push({ tmdbSeason: season.season_number, partSizes: parts })
  }
  return splits
}

/** The streamer's season and episode for a TMDB one; episodes past a split's last part stay in that part. */
export function toDisplayEpisode(splits: SeasonSplit[], season: number, episode: number): EpisodeNumber {
  let shift = 0
  for (const split of [...splits].sort(byTmdbSeason)) {
    if (split.tmdbSeason > season) break
    if (split.tmdbSeason === season) {
      let preceding = 0
      for (const [index, size] of split.partSizes.entries()) {
        if (episode <= preceding + size || index === split.partSizes.length - 1) {
          return { season: season + shift + index, episode: episode - preceding }
        }
        preceding += size
      }
    }
    shift += split.partSizes.length - 1
  }
  return { season: season + shift, episode }
}

/** Which TMDB season a streamer season comes from, the episode it starts at, and its size when it is a split part (null means "the rest of the season"). */
export function tmdbSeasonPart(
  splits: SeasonSplit[],
  displaySeason: number,
): { tmdbSeason: number; episodeOffset: number; size: number | null } {
  let shift = 0
  for (const split of [...splits].sort(byTmdbSeason)) {
    const first = split.tmdbSeason + shift
    if (displaySeason < first) break
    const last = first + split.partSizes.length - 1
    if (displaySeason <= last) {
      const index = displaySeason - first
      const episodeOffset = split.partSizes.slice(0, index).reduce((sum, size) => sum + size, 0)
      const isLast = index === split.partSizes.length - 1
      return { tmdbSeason: split.tmdbSeason, episodeOffset, size: isLast ? null : split.partSizes[index] }
    }
    shift += split.partSizes.length - 1
  }
  return { tmdbSeason: displaySeason - shift, episodeOffset: 0, size: null }
}

/** The TMDB season and episode for a streamer one -- the inverse of toDisplayEpisode. */
export function toTmdbEpisode(splits: SeasonSplit[], season: number, episode: number): EpisodeNumber {
  const part = tmdbSeasonPart(splits, season)
  return { season: part.tmdbSeason, episode: episode + part.episodeOffset }
}

/** A show's season list in the streamer's numbering, each split part a season of its own named "Season N". */
export function splitShowDetail(show: TmdbShowDetail, splits: SeasonSplit[]): TmdbShowDetail {
  if (splits.length === 0) return show
  const splitBySeason = new Map(splits.map((s) => [s.tmdbSeason, s]))
  const seasons = [...show.seasons]
    .sort((a, b) => a.season_number - b.season_number)
    .flatMap((season) => {
      if (season.season_number === 0) return [season]
      const first = toDisplayEpisode(splits, season.season_number, 1).season
      const split = splitBySeason.get(season.season_number)
      if (!split) return [{ ...season, season_number: first, name: `Season ${first}` }]
      const listed = split.partSizes.slice(0, -1).reduce((sum, size) => sum + size, 0)
      return split.partSizes.map((size, index) => ({
        ...season,
        id: Number(`${season.id}${index}`),
        season_number: first + index,
        name: `Season ${first + index}`,
        episode_count: index === split.partSizes.length - 1 ? Math.max(season.episode_count - listed, 0) : size,
        air_date: index === 0 ? season.air_date : null,
      }))
    })
  return { ...show, seasons, number_of_seasons: seasons.filter((s) => s.season_number > 0).length }
}

/** One streamer season cut from its TMDB season, with every episode renumbered to match. */
export function splitSeasonDetail(detail: TmdbSeasonDetail, splits: SeasonSplit[], displaySeason: number): TmdbSeasonDetail {
  if (splits.length === 0) return detail
  const part = tmdbSeasonPart(splits, displaySeason)
  const episodes = detail.episodes
    .filter((ep) => ep.episode_number > part.episodeOffset && (part.size === null || ep.episode_number <= part.episodeOffset + part.size))
    .map((ep) => ({ ...ep, season_number: displaySeason, episode_number: ep.episode_number - part.episodeOffset }))
  const isWholeSeason = part.episodeOffset === 0 && part.size === null
  return {
    ...detail,
    id: isWholeSeason ? detail.id : Number(`${detail.id}${displaySeason}`),
    season_number: displaySeason,
    name: `Season ${displaySeason}`,
    air_date: episodes[0]?.air_date ?? (isWholeSeason ? detail.air_date : null),
    episodes,
  }
}
