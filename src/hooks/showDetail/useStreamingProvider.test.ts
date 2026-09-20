import { useState } from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/tmdb', async () => {
  const actual = await vi.importActual<typeof import('../../lib/tmdb')>('../../lib/tmdb')
  return { ...actual, detectRegion: vi.fn(), getWatchProviders: vi.fn() }
})
vi.mock('../../lib/streamingOverrides', () => ({
  clearStreamingOverride: vi.fn(),
  fetchStreamingOverride: vi.fn(),
  setStreamingOverride: vi.fn(),
}))
vi.mock('../../lib/streamingProvider', async () => {
  const actual = await vi.importActual<typeof import('../../lib/streamingProvider')>('../../lib/streamingProvider')
  return { ...actual, invalidatePlatformCache: vi.fn(), pickBestFreeProvider: vi.fn() }
})

import { detectRegion, getWatchProviders } from '../../lib/tmdb'
import { clearStreamingOverride, fetchStreamingOverride, setStreamingOverride } from '../../lib/streamingOverrides'
import { invalidatePlatformCache, pickBestFreeProvider } from '../../lib/streamingProvider'
import { useStreamingProvider } from './useStreamingProvider'
import type {
  AppUser,
  StreamingOverride,
  TmdbProviderListItem,
  TmdbShowDetail,
  TmdbWatchProviderRegion,
  TmdbWatchProviders,
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
  number_of_seasons: 1,
  number_of_episodes: 2,
  status: 'Ended',
  origin_country: ['US'],
  original_language: 'en',
  seasons: [{ id: 1, season_number: 1, name: 'Season 1', episode_count: 2, poster_path: null, air_date: '2020-01-01' }],
}

function overrideRow(overrides: Partial<StreamingOverride> = {}): StreamingOverride {
  return {
    id: 'ov1',
    show_id: 100,
    provider_id: 8,
    provider_name: 'Netflix',
    provider_logo_path: '/netflix.jpg',
    updated_by: 'u1',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function providerListItem(overrides: Partial<TmdbProviderListItem> = {}): TmdbProviderListItem {
  return {
    provider_id: 9,
    provider_name: 'Amazon Prime Video',
    logo_path: '/prime.jpg',
    display_priority: 1,
    display_priorities: {},
    ...overrides,
  }
}

function watchProviders(results: TmdbWatchProviders['results'] = {}): TmdbWatchProviders {
  return { id: 100, results }
}

function useHarness(opts: {
  showId?: number
  show?: TmdbShowDetail | null
  user?: AppUser | null
  showError?: (message: string) => void
} = {}) {
  const [defaults] = useState(() => ({ showError: vi.fn() }))
  return useStreamingProvider(
    opts.showId ?? 100,
    opts.show === undefined ? show : opts.show,
    opts.user === undefined ? user : opts.user,
    opts.showError ?? defaults.showError,
  )
}

beforeEach(() => {
  vi.mocked(detectRegion).mockReset().mockReturnValue('US')
  vi.mocked(getWatchProviders).mockReset().mockResolvedValue(watchProviders())
  vi.mocked(fetchStreamingOverride).mockReset().mockResolvedValue(null)
  vi.mocked(setStreamingOverride).mockReset()
  vi.mocked(clearStreamingOverride).mockReset()
  vi.mocked(invalidatePlatformCache).mockReset()
  vi.mocked(pickBestFreeProvider).mockReset().mockReturnValue(null)
})

describe('useStreamingProvider', () => {
  it('fetches watch providers and the streaming override on mount, and clears loadingProviders once resolved', async () => {
    const { result } = renderHook(() => useHarness())

    expect(result.current.loadingProviders).toBe(true)
    expect(getWatchProviders).toHaveBeenCalledWith(100)
    expect(fetchStreamingOverride).toHaveBeenCalledWith(100)

    await waitFor(() => expect(result.current.loadingProviders).toBe(false))
  })

  it('is a no-op when showId is NaN', async () => {
    renderHook(() => useHarness({ showId: NaN }))

    await Promise.resolve()

    expect(getWatchProviders).not.toHaveBeenCalled()
    expect(fetchStreamingOverride).not.toHaveBeenCalled()
  })

  it('regionProviders reads providers.results[region], and is null when the region key is absent', async () => {
    const region: TmdbWatchProviderRegion = { link: 'https://example.com' }
    vi.mocked(getWatchProviders).mockResolvedValue(watchProviders({ US: region }))
    const { result } = renderHook(() => useHarness())

    await waitFor(() => expect(result.current.regionProviders).toEqual(region))
  })

  it('regionProviders is null when the region key is absent from results', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue(watchProviders({ FR: { link: 'https://example.com' } }))
    const { result } = renderHook(() => useHarness())

    await waitFor(() => expect(result.current.loadingProviders).toBe(false))
    expect(result.current.regionProviders).toBeNull()
  })

  it('effectiveProvider falls back to pickBestFreeProvider(regionProviders) when there is no override', async () => {
    const region: TmdbWatchProviderRegion = { link: 'https://example.com' }
    vi.mocked(getWatchProviders).mockResolvedValue(watchProviders({ US: region }))
    const best = {
      provider_id: 8,
      provider_name: 'Netflix',
      logo_path: '/netflix.jpg',
      display_priority: 1,
    }
    vi.mocked(pickBestFreeProvider).mockReturnValue(best)
    const { result } = renderHook(() => useHarness())

    await waitFor(() => expect(result.current.effectiveProvider).toEqual(best))
    expect(pickBestFreeProvider).toHaveBeenCalledWith(region)
  })

  it('effectiveProvider prefers the manual override over the auto-picked bestFreeProvider', async () => {
    vi.mocked(pickBestFreeProvider).mockReturnValue({
      provider_id: 8,
      provider_name: 'Netflix',
      logo_path: '/netflix.jpg',
      display_priority: 1,
    })
    vi.mocked(fetchStreamingOverride).mockResolvedValue(
      overrideRow({ provider_name: 'Hulu', provider_logo_path: '/hulu.jpg' }),
    )
    const { result } = renderHook(() => useHarness())

    await waitFor(() =>
      expect(result.current.effectiveProvider).toEqual({ provider_name: 'Hulu', logo_path: '/hulu.jpg' }),
    )
  })

  it('handlePickProvider saves the override, updates state, closes the picker, and invalidates the cache', async () => {
    const saved = overrideRow({ provider_name: 'Disney+', provider_logo_path: '/disney.jpg' })
    vi.mocked(setStreamingOverride).mockResolvedValue(saved)
    const { result } = renderHook(() => useHarness())
    await waitFor(() => expect(result.current.loadingProviders).toBe(false))

    act(() => result.current.setPickerOpen(true))
    const pick = providerListItem({ provider_id: 337, provider_name: 'Disney+', logo_path: '/disney.jpg' })

    await act(() => result.current.handlePickProvider(pick))

    expect(setStreamingOverride).toHaveBeenCalledWith({
      showId: 100,
      providerId: 337,
      providerName: 'Disney+',
      providerLogoPath: '/disney.jpg',
      updatedBy: 'u1',
    })
    expect(result.current.override).toEqual(saved)
    expect(result.current.pickerOpen).toBe(false)
    expect(invalidatePlatformCache).toHaveBeenCalledWith(100)
  })

  it('handlePickProvider shows an error and leaves override unchanged on failure', async () => {
    vi.mocked(setStreamingOverride).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))
    await waitFor(() => expect(result.current.loadingProviders).toBe(false))

    await act(() => result.current.handlePickProvider(providerListItem()))

    expect(showError).toHaveBeenCalledWith('Failed to set streaming provider. Try again.')
    expect(result.current.override).toBeNull()
    expect(invalidatePlatformCache).not.toHaveBeenCalled()
  })

  it('handlePickProvider no-ops when user is null', async () => {
    const { result } = renderHook(() => useHarness({ user: null }))
    await waitFor(() => expect(result.current.loadingProviders).toBe(false))

    await act(() => result.current.handlePickProvider(providerListItem()))

    expect(setStreamingOverride).not.toHaveBeenCalled()
  })

  it('handlePickProvider no-ops when show is null', async () => {
    const { result } = renderHook(() => useHarness({ show: null }))
    await waitFor(() => expect(result.current.loadingProviders).toBe(false))

    await act(() => result.current.handlePickProvider(providerListItem()))

    expect(setStreamingOverride).not.toHaveBeenCalled()
  })

  it('handleClearOverride clears the override and invalidates the cache', async () => {
    vi.mocked(fetchStreamingOverride).mockResolvedValue(overrideRow())
    vi.mocked(clearStreamingOverride).mockResolvedValue(undefined)
    const { result } = renderHook(() => useHarness())
    await waitFor(() => expect(result.current.override).not.toBeNull())

    await act(() => result.current.handleClearOverride())

    expect(clearStreamingOverride).toHaveBeenCalledWith(100)
    expect(result.current.override).toBeNull()
    expect(invalidatePlatformCache).toHaveBeenCalledWith(100)
  })

  it('handleClearOverride shows an error on failure', async () => {
    vi.mocked(fetchStreamingOverride).mockResolvedValue(overrideRow())
    vi.mocked(clearStreamingOverride).mockRejectedValue(new Error('boom'))
    const showError = vi.fn()
    const { result } = renderHook(() => useHarness({ showError }))
    await waitFor(() => expect(result.current.override).not.toBeNull())

    await act(() => result.current.handleClearOverride())

    expect(showError).toHaveBeenCalledWith('Failed to reset streaming provider. Try again.')
    expect(result.current.override).not.toBeNull()
  })

  it('handleClearOverride no-ops when show is null', async () => {
    const { result } = renderHook(() => useHarness({ show: null }))
    await waitFor(() => expect(result.current.loadingProviders).toBe(false))

    await act(() => result.current.handleClearOverride())

    expect(clearStreamingOverride).not.toHaveBeenCalled()
  })

  it('re-fetches when showId changes between renders', async () => {
    const { result, rerender } = renderHook(({ showId }) => useHarness({ showId }), { initialProps: { showId: 100 } })
    await waitFor(() => expect(result.current.loadingProviders).toBe(false))
    expect(getWatchProviders).toHaveBeenCalledTimes(1)
    expect(getWatchProviders).toHaveBeenCalledWith(100)

    rerender({ showId: 200 })

    await waitFor(() => expect(getWatchProviders).toHaveBeenCalledWith(200))
    expect(getWatchProviders).toHaveBeenCalledTimes(2)
    expect(fetchStreamingOverride).toHaveBeenCalledWith(200)
  })
})
