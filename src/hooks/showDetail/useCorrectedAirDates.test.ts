import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/tvmaze', async () => {
  const actual = await vi.importActual<typeof import('../../lib/tvmaze')>('../../lib/tvmaze')
  return { ...actual, getCorrectedAirDates: vi.fn() }
})

import { getCorrectedAirDates } from '../../lib/tvmaze'
import { useCorrectedAirDates } from './useCorrectedAirDates'
import type { TmdbEpisode, TmdbSeasonDetail, TmdbShowDetail } from '../../types'

/** A local YYYY-MM-DD date `daysOffset` days from now, built from local date components (not toISOString). */
function localDateStr(daysOffset: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysOffset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const show = { external_ids: { imdb_id: 'tt123' } } as TmdbShowDetail

function episode(overrides: Partial<TmdbEpisode> = {}): TmdbEpisode {
  return {
    id: 1,
    episode_number: 1,
    season_number: 1,
    name: 'E1',
    overview: '',
    still_path: null,
    air_date: null,
    runtime: 30,
    ...overrides,
  }
}

function season(episodes: TmdbEpisode[]): TmdbSeasonDetail {
  return { id: 1, season_number: 1, name: 'Season 1', episodes }
}

beforeEach(() => {
  vi.mocked(getCorrectedAirDates).mockReset().mockResolvedValue(new Map())
})

describe('useCorrectedAirDates', () => {
  it('returns null nextUpcomingEpisode when nothing is upcoming', async () => {
    const { result } = renderHook(() =>
      useCorrectedAirDates(show, season([episode({ episode_number: 1, air_date: '2020-01-01' })])),
    )
    await waitFor(() => expect(getCorrectedAirDates).toHaveBeenCalled())
    expect(result.current.nextUpcomingEpisode).toBeNull()
  })

  it('does not skip an episode whose corrected date is still upcoming just because its raw TMDB date already looks past', async () => {
    vi.mocked(getCorrectedAirDates).mockResolvedValue(new Map([['1-5', localDateStr(1)]]))
    const { result } = renderHook(() =>
      useCorrectedAirDates(
        show,
        season([
          episode({ episode_number: 5, air_date: localDateStr(-1) }),
          episode({ episode_number: 6, air_date: '2099-12-25' }),
        ]),
      ),
    )

    await waitFor(() => expect(result.current.nextUpcomingEpisode?.episode_number).toBe(5))
    expect(result.current.nextUpcomingEpisode?.air_date).toBe(localDateStr(1))
  })

  it('effectiveAirDate prefers the TVmaze correction over the raw TMDB date', async () => {
    vi.mocked(getCorrectedAirDates).mockResolvedValue(new Map([['1-1', '2099-12-25']]))
    const { result } = renderHook(() => useCorrectedAirDates(show, season([])))
    await waitFor(() =>
      expect(result.current.effectiveAirDate(episode({ air_date: '2000-01-01' }))).toBe('2099-12-25'),
    )
  })
})
