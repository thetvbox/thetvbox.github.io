import assert from 'node:assert/strict'
import { applySeasonSplits } from './seasonSplits.ts'

Deno.test("splits Lupin's TMDB season 1 into the streamer's first two seasons and shifts the rest", () => {
  const seasons = [
    { season_number: 0, episode_count: 2 },
    { season_number: 3, episode_count: 8 },
    { season_number: 1, episode_count: 10 },
    { season_number: 2, episode_count: 7 },
  ]
  assert.deepEqual(applySeasonSplits(seasons, [{ tmdb_season: 1, part_sizes: [5, 5] }]), [
    { season_number: 1, episode_count: 5 },
    { season_number: 2, episode_count: 5 },
    { season_number: 3, episode_count: 7 },
    { season_number: 4, episode_count: 8 },
  ])
})

Deno.test('gives the last part any episodes beyond the recorded sizes, and leaves unsplit shows alone', () => {
  assert.deepEqual(applySeasonSplits([{ season_number: 1, episode_count: 11 }], [{ tmdb_season: 1, part_sizes: [5, 5] }]), [
    { season_number: 1, episode_count: 5 },
    { season_number: 2, episode_count: 6 },
  ])
  assert.deepEqual(applySeasonSplits([{ season_number: 1, episode_count: 6 }], []), [{ season_number: 1, episode_count: 6 }])
})
