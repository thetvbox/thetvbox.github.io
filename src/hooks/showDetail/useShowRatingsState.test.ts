import { useState } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/showRatings', () => ({ deleteShowRating: vi.fn(), upsertShowRating: vi.fn() }))
vi.mock('../../lib/seasonRatings', () => ({ deleteSeasonRating: vi.fn(), upsertSeasonRating: vi.fn() }))

import { deleteShowRating, upsertShowRating } from '../../lib/showRatings'
import { deleteSeasonRating, upsertSeasonRating } from '../../lib/seasonRatings'
import { useShowRatingsState } from './useShowRatingsState'
import type {
  AppUser,
  SeasonRating,
  SeasonRatingWithUser,
  ShowRating,
  ShowRatingWithUser,
  TmdbSeasonDetail,
  TmdbShowDetail,
} from '../../types'

const user: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

const show: TmdbShowDetail = {
  id: 100,
  name: 'Show',
  overview: '',
  poster_path: null,
  backdrop_path: null,
  first_air_date: '2020-01-01',
  genres: [],
  number_of_seasons: 2,
  number_of_episodes: 20,
  status: 'Ended',
  origin_country: ['US'],
  original_language: 'en',
  seasons: [
    { id: 1, season_number: 1, name: 'Season 1', episode_count: 10, poster_path: null, air_date: '2020-01-01' },
    { id: 2, season_number: 2, name: 'Season 2', episode_count: 10, poster_path: null, air_date: '2021-01-01' },
  ],
}

function season(overrides: Partial<TmdbSeasonDetail> = {}): TmdbSeasonDetail {
  return { id: 1, season_number: 1, name: 'Season 1', air_date: null, episodes: [], ...overrides }
}

function showRating(overrides: Partial<ShowRatingWithUser> = {}): ShowRatingWithUser {
  return {
    id: 'sr1',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: null,
    rating: 8,
    rated_at: '2026-01-01T00:00:00Z',
    users: { username: 'me' },
    ...overrides,
  }
}

function seasonRating(overrides: Partial<SeasonRatingWithUser> = {}): SeasonRatingWithUser {
  return {
    id: 'sea1',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: null,
    season_number: 1,
    season_name: 'Season 1',
    rating: 7,
    rated_at: '2026-01-01T00:00:00Z',
    users: { username: 'me' },
    ...overrides,
  }
}

function savedShowRating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'sr-new',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: null,
    rating: 8,
    rated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  }
}

function savedSeasonRating(overrides: Partial<SeasonRating> = {}): SeasonRating {
  return {
    id: 'sea-new',
    user_id: 'u1',
    show_id: 100,
    show_name: 'Show',
    show_poster_path: null,
    season_number: 1,
    season_name: 'Season 1',
    rating: 8,
    rated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  }
}

function useHarness(
  opts: {
    user?: AppUser | null
    show?: TmdbShowDetail | null
    activeSeason?: number | null
    season?: TmdbSeasonDetail | null
    showError?: (message: string) => void
  } = {},
) {
  const [defaults] = useState(() => ({ showError: vi.fn() }))
  return useShowRatingsState(
    opts.user === undefined ? user : opts.user,
    opts.show === undefined ? show : opts.show,
    opts.activeSeason === undefined ? 1 : opts.activeSeason,
    opts.season === undefined ? season() : opts.season,
    opts.showError ?? defaults.showError,
  )
}

beforeEach(() => {
  vi.mocked(upsertShowRating).mockReset().mockResolvedValue(savedShowRating())
  vi.mocked(deleteShowRating).mockReset().mockResolvedValue(undefined)
  vi.mocked(upsertSeasonRating).mockReset().mockResolvedValue(savedSeasonRating())
  vi.mocked(deleteSeasonRating).mockReset().mockResolvedValue(undefined)
})

describe('useShowRatingsState', () => {
  describe('myShowRating', () => {
    it('finds the current user row among showRatings', () => {
      const mine = showRating({ id: 'mine', user_id: 'u1' })
      const theirs = showRating({ id: 'theirs', user_id: 'u2', users: { username: 'other' } })
      const { result } = renderHook(() => useHarness())

      act(() => result.current.setShowRatings([theirs, mine]))

      expect(result.current.myShowRating).toEqual(mine)
    })

    it('is null when the current user has no show rating', () => {
      const theirs = showRating({ id: 'theirs', user_id: 'u2', users: { username: 'other' } })
      const { result } = renderHook(() => useHarness())

      act(() => result.current.setShowRatings([theirs]))

      expect(result.current.myShowRating).toBeNull()
    })

    it('is null when there is no signed-in user', () => {
      const mine = showRating({ id: 'mine', user_id: 'u1' })
      const { result } = renderHook(() => useHarness({ user: null }))

      act(() => result.current.setShowRatings([mine]))

      expect(result.current.myShowRating).toBeNull()
    })
  })

  describe('estimatedShowRating', () => {
    it('is null when the user already has an explicit show rating', () => {
      const { result } = renderHook(() => useHarness())

      act(() => {
        result.current.setShowRatings([showRating({ id: 'mine', user_id: 'u1', rating: 5 })])
        result.current.setSeasonRatings([
          seasonRating({ id: 's1', user_id: 'u1', season_number: 1, rating: 6 }),
          seasonRating({ id: 's2', user_id: 'u1', season_number: 2, rating: 8 }),
        ])
      })

      expect(result.current.estimatedShowRating).toBeNull()
    })

    it('is null when the user has no season ratings', () => {
      const { result } = renderHook(() => useHarness())

      expect(result.current.estimatedShowRating).toBeNull()
    })

    it('averages only the current user own season ratings', () => {
      const { result } = renderHook(() => useHarness())
      const mine1 = seasonRating({ id: 's1', user_id: 'u1', season_number: 1, rating: 6 })
      const mine2 = seasonRating({ id: 's2', user_id: 'u1', season_number: 2, rating: 8, season_name: 'Season 2' })
      const theirs = seasonRating({ id: 's3', user_id: 'u2', season_number: 1, rating: 10, users: { username: 'other' } })

      act(() => result.current.setSeasonRatings([mine1, mine2, theirs]))

      expect(result.current.estimatedShowRating).toEqual({ average: 7, seasons: [mine1, mine2] })
    })
  })

  describe('handleRateShow', () => {
    it('upserts and replaces any prior row for the user, leaving other users rows alone', async () => {
      const previousMine = showRating({ id: 'old', user_id: 'u1', rating: 5 })
      const theirs = showRating({ id: 'theirs', user_id: 'u2', rating: 9, users: { username: 'other' } })
      vi.mocked(upsertShowRating).mockResolvedValue(savedShowRating({ id: 'new', rating: 8 }))
      const { result } = renderHook(() => useHarness())
      act(() => result.current.setShowRatings([previousMine, theirs]))

      await act(() => result.current.handleRateShow(8))

      expect(upsertShowRating).toHaveBeenCalledWith({
        userId: 'u1',
        showId: 100,
        showName: 'Show',
        showPosterPath: null,
        rating: 8,
      })
      expect(result.current.showRatings).toEqual([
        theirs,
        { ...savedShowRating({ id: 'new', rating: 8 }), users: { username: 'me' } },
      ])
    })

    it('does nothing when there is no signed-in user', async () => {
      const { result } = renderHook(() => useHarness({ user: null }))

      await act(() => result.current.handleRateShow(8))

      expect(upsertShowRating).not.toHaveBeenCalled()
      expect(result.current.showRatings).toEqual([])
    })

    it('does nothing when the show has not loaded', async () => {
      const { result } = renderHook(() => useHarness({ show: null }))

      await act(() => result.current.handleRateShow(8))

      expect(upsertShowRating).not.toHaveBeenCalled()
      expect(result.current.showRatings).toEqual([])
    })

    it('value 0 optimistically clears the rating and calls deleteShowRating', async () => {
      const mine = showRating({ id: 'mine', user_id: 'u1' })
      const theirs = showRating({ id: 'theirs', user_id: 'u2', users: { username: 'other' } })
      const { result } = renderHook(() => useHarness())
      act(() => result.current.setShowRatings([mine, theirs]))

      await act(() => result.current.handleRateShow(0))

      expect(deleteShowRating).toHaveBeenCalledWith('u1', 100)
      expect(result.current.showRatings).toEqual([theirs])
      expect(result.current.savingRating).toBe(false)
    })

    it('value 0 rolls back and shows an error when deleteShowRating fails', async () => {
      const mine = showRating({ id: 'mine', user_id: 'u1' })
      const theirs = showRating({ id: 'theirs', user_id: 'u2', users: { username: 'other' } })
      vi.mocked(deleteShowRating).mockRejectedValue(new Error('network down'))
      const showError = vi.fn()
      const { result } = renderHook(() => useHarness({ showError }))
      act(() => result.current.setShowRatings([mine, theirs]))

      await act(() => result.current.handleRateShow(0))

      expect(result.current.showRatings).toEqual([mine, theirs])
      expect(showError).toHaveBeenCalledWith('Failed to clear your rating. Try again.')
    })

    it('shows an error and leaves showRatings untouched when upsertShowRating fails', async () => {
      const mine = showRating({ id: 'mine', user_id: 'u1', rating: 5 })
      vi.mocked(upsertShowRating).mockRejectedValue(new Error('network down'))
      const showError = vi.fn()
      const { result } = renderHook(() => useHarness({ showError }))
      act(() => result.current.setShowRatings([mine]))

      await act(() => result.current.handleRateShow(8))

      expect(result.current.showRatings).toEqual([mine])
      expect(showError).toHaveBeenCalledWith('Failed to save your rating. Try again.')
      expect(result.current.savingRating).toBe(false)
    })
  })

  describe('seasonRatingsForActive / mySeasonRating', () => {
    it('scopes to the active season and the current user', () => {
      const mine = seasonRating({ id: 'mine', user_id: 'u1', season_number: 1, rating: 7 })
      const theirsSameSeason = seasonRating({ id: 'theirs', user_id: 'u2', season_number: 1, rating: 9, users: { username: 'other' } })
      const mineOtherSeason = seasonRating({ id: 'mine-2', user_id: 'u1', season_number: 2, rating: 5 })
      const { result } = renderHook(() => useHarness({ activeSeason: 1 }))

      act(() => result.current.setSeasonRatings([mine, theirsSameSeason, mineOtherSeason]))

      expect(result.current.seasonRatingsForActive).toEqual([mine, theirsSameSeason])
      expect(result.current.mySeasonRating).toEqual(mine)
    })

    it('is empty/null when there is no active season', () => {
      const mine = seasonRating({ id: 'mine', user_id: 'u1', season_number: 1, rating: 7 })
      const { result } = renderHook(() => useHarness({ activeSeason: null }))

      act(() => result.current.setSeasonRatings([mine]))

      expect(result.current.seasonRatingsForActive).toEqual([])
      expect(result.current.mySeasonRating).toBeNull()
    })
  })

  describe('handleRateSeason', () => {
    it('upserts with seasonName from season.name when season matches activeSeason, and dedupes for the user', async () => {
      const previousMine = seasonRating({ id: 'old', user_id: 'u1', season_number: 1, rating: 5 })
      const theirs = seasonRating({ id: 'theirs', user_id: 'u2', season_number: 1, rating: 9, users: { username: 'other' } })
      vi.mocked(upsertSeasonRating).mockResolvedValue(
        savedSeasonRating({ id: 'new', season_number: 1, season_name: 'Season 1', rating: 8 }),
      )
      const { result } = renderHook(() => useHarness({ activeSeason: 1, season: season({ season_number: 1, name: 'Season 1' }) }))
      act(() => result.current.setSeasonRatings([previousMine, theirs]))

      await act(() => result.current.handleRateSeason(8))

      expect(upsertSeasonRating).toHaveBeenCalledWith({
        userId: 'u1',
        showId: 100,
        showName: 'Show',
        showPosterPath: null,
        seasonNumber: 1,
        seasonName: 'Season 1',
        rating: 8,
      })
      expect(result.current.seasonRatings).toEqual([
        theirs,
        { ...savedSeasonRating({ id: 'new', season_number: 1, season_name: 'Season 1', rating: 8 }), users: { username: 'me' } },
      ])
    })

    it('upserts with seasonName null when the loaded season does not match activeSeason', async () => {
      vi.mocked(upsertSeasonRating).mockResolvedValue(
        savedSeasonRating({ id: 'new', season_number: 2, season_name: null, rating: 9 }),
      )
      // season detail still describes season 1 (e.g. mid-navigation) while activeSeason is already 2
      const { result } = renderHook(() => useHarness({ activeSeason: 2, season: season({ season_number: 1, name: 'Season 1' }) }))

      await act(() => result.current.handleRateSeason(9))

      expect(upsertSeasonRating).toHaveBeenCalledWith(
        expect.objectContaining({ seasonNumber: 2, seasonName: null }),
      )
    })

    it('does nothing when there is no signed-in user', async () => {
      const { result } = renderHook(() => useHarness({ user: null }))

      await act(() => result.current.handleRateSeason(8))

      expect(upsertSeasonRating).not.toHaveBeenCalled()
      expect(result.current.seasonRatings).toEqual([])
    })

    it('does nothing when the show has not loaded', async () => {
      const { result } = renderHook(() => useHarness({ show: null }))

      await act(() => result.current.handleRateSeason(8))

      expect(upsertSeasonRating).not.toHaveBeenCalled()
    })

    it('does nothing when there is no active season', async () => {
      const { result } = renderHook(() => useHarness({ activeSeason: null }))

      await act(() => result.current.handleRateSeason(8))

      expect(upsertSeasonRating).not.toHaveBeenCalled()
      expect(result.current.seasonRatings).toEqual([])
    })

    it('refuses to rate a season that has not aired yet, and leaves seasonRatings untouched', async () => {
      const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
      const showError = vi.fn()
      const { result } = renderHook(() =>
        useHarness({ activeSeason: 1, season: season({ season_number: 1, air_date: farFuture }), showError }),
      )

      await act(() => result.current.handleRateSeason(8))

      expect(upsertSeasonRating).not.toHaveBeenCalled()
      expect(result.current.seasonRatings).toEqual([])
      expect(showError).toHaveBeenCalledWith("You can't rate a season that hasn't aired yet.")
    })

    it('still allows clearing (value 0) a season rating even if the season air date has since moved to the future', async () => {
      const farFuture = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10)
      const mine = seasonRating({ id: 'mine', user_id: 'u1', season_number: 1, rating: 7 })
      const { result } = renderHook(() =>
        useHarness({ activeSeason: 1, season: season({ season_number: 1, air_date: farFuture }) }),
      )
      act(() => result.current.setSeasonRatings([mine]))

      await act(() => result.current.handleRateSeason(0))

      expect(deleteSeasonRating).toHaveBeenCalledWith('u1', 100, 1)
      expect(result.current.seasonRatings).toEqual([])
    })

    it('value 0 optimistically clears only the user active-season row and calls deleteSeasonRating', async () => {
      const mine = seasonRating({ id: 'mine', user_id: 'u1', season_number: 1, rating: 7 })
      const mineOtherSeason = seasonRating({ id: 'mine-2', user_id: 'u1', season_number: 2, rating: 5 })
      const theirs = seasonRating({ id: 'theirs', user_id: 'u2', season_number: 1, rating: 9, users: { username: 'other' } })
      const { result } = renderHook(() => useHarness({ activeSeason: 1 }))
      act(() => result.current.setSeasonRatings([mine, mineOtherSeason, theirs]))

      await act(() => result.current.handleRateSeason(0))

      expect(deleteSeasonRating).toHaveBeenCalledWith('u1', 100, 1)
      expect(result.current.seasonRatings).toEqual([mineOtherSeason, theirs])
      expect(result.current.savingSeasonRating).toBe(false)
    })

    it('value 0 rolls back and shows an error when deleteSeasonRating fails', async () => {
      const mine = seasonRating({ id: 'mine', user_id: 'u1', season_number: 1, rating: 7 })
      const theirs = seasonRating({ id: 'theirs', user_id: 'u2', season_number: 1, rating: 9, users: { username: 'other' } })
      vi.mocked(deleteSeasonRating).mockRejectedValue(new Error('network down'))
      const showError = vi.fn()
      const { result } = renderHook(() => useHarness({ activeSeason: 1, showError }))
      act(() => result.current.setSeasonRatings([mine, theirs]))

      await act(() => result.current.handleRateSeason(0))

      expect(result.current.seasonRatings).toEqual([mine, theirs])
      expect(showError).toHaveBeenCalledWith('Failed to clear your season rating. Try again.')
    })

    it('shows an error and leaves seasonRatings untouched when upsertSeasonRating fails', async () => {
      const mine = seasonRating({ id: 'mine', user_id: 'u1', season_number: 1, rating: 5 })
      vi.mocked(upsertSeasonRating).mockRejectedValue(new Error('network down'))
      const showError = vi.fn()
      const { result } = renderHook(() => useHarness({ activeSeason: 1, showError }))
      act(() => result.current.setSeasonRatings([mine]))

      await act(() => result.current.handleRateSeason(8))

      expect(result.current.seasonRatings).toEqual([mine])
      expect(showError).toHaveBeenCalledWith('Failed to save your season rating. Try again.')
      expect(result.current.savingSeasonRating).toBe(false)
    })
  })
})
