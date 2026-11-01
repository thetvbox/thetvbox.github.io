import { describe, expect, it } from 'vitest'
import { seasonLabel } from './seasonLabel'

describe('seasonLabel', () => {
  it("uses TMDB's own season name, so a show split into parts reads the way the streamer labels it", () => {
    expect(seasonLabel({ season_number: 3, name: 'Part 4' })).toBe('Part 4')
  })

  it('keeps the standard "Season N" name as is', () => {
    expect(seasonLabel({ season_number: 2, name: 'Season 2' })).toBe('Season 2')
  })

  it('falls back to "Season N", or "Specials" for season 0, when TMDB gives no name', () => {
    expect(seasonLabel({ season_number: 4, name: '  ' })).toBe('Season 4')
    expect(seasonLabel({ season_number: 0 })).toBe('Specials')
  })
})
