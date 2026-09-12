import { describe, expect, it, vi } from 'vitest'
import type { TmdbWatchProvider, TmdbWatchProviderRegion, TmdbWatchProviders } from '../types'

vi.mock('./tmdb', () => ({ getWatchProviders: vi.fn() }))
vi.mock('./streamingOverrides', () => ({ fetchStreamingOverrides: vi.fn() }))

import { getWatchProviders } from './tmdb'
import { fetchStreamingOverrides } from './streamingOverrides'
import { dedupeProviders, invalidatePlatformCache, pickBestFreeProvider, resolveShowPlatforms } from './streamingProvider'

function provider(overrides: Partial<TmdbWatchProvider> = {}): TmdbWatchProvider {
  return { provider_id: 1, provider_name: 'Netflix', logo_path: '/netflix.png', display_priority: 1, ...overrides }
}

describe('dedupeProviders', () => {
  it('removes repeated provider ids, keeping the first occurrence, sorted by display priority', () => {
    const result = dedupeProviders([
      provider({ provider_id: 2, provider_name: 'Hulu', display_priority: 5 }),
      provider({ provider_id: 1, provider_name: 'Netflix', display_priority: 1 }),
      provider({ provider_id: 2, provider_name: 'Hulu (dup)', display_priority: 5 }),
    ])
    expect(result.map((p) => p.provider_name)).toEqual(['Netflix', 'Hulu'])
  })

  it('returns an empty array for an empty list', () => {
    expect(dedupeProviders([])).toEqual([])
  })
})

describe('pickBestFreeProvider', () => {
  it('returns null when region is null', () => {
    expect(pickBestFreeProvider(null)).toBeNull()
  })

  it('prefers a flatrate subscription provider over free/ads', () => {
    const region: TmdbWatchProviderRegion = {
      link: 'https://example.com',
      flatrate: [provider({ provider_id: 1, provider_name: 'Netflix' })],
      free: [provider({ provider_id: 2, provider_name: 'Tubi' })],
    }
    expect(pickBestFreeProvider(region)?.provider_name).toBe('Netflix')
  })

  it('falls back to free/ads when there is no flatrate provider', () => {
    const region: TmdbWatchProviderRegion = {
      link: 'https://example.com',
      free: [provider({ provider_id: 2, provider_name: 'Tubi' })],
      ads: [provider({ provider_id: 3, provider_name: 'Freevee' })],
    }
    expect(pickBestFreeProvider(region)?.provider_name).toBe('Tubi')
  })

  it('returns null when the region has no listings at all', () => {
    expect(pickBestFreeProvider({ link: 'https://example.com' })).toBeNull()
  })

  it('skips low-signal reseller/live-TV/cable-app listings in favor of a direct provider', () => {
    const region: TmdbWatchProviderRegion = {
      link: 'https://example.com',
      flatrate: [
        provider({ provider_id: 1, provider_name: 'Hulu Amazon Channel', display_priority: 1 }),
        provider({ provider_id: 2, provider_name: 'Hulu', display_priority: 2 }),
      ],
    }
    expect(pickBestFreeProvider(region)?.provider_name).toBe('Hulu')
  })

  it('falls back to the top listing when every option is low-signal', () => {
    const region: TmdbWatchProviderRegion = {
      link: 'https://example.com',
      flatrate: [provider({ provider_id: 1, provider_name: 'YouTube TV', display_priority: 1 })],
    }
    expect(pickBestFreeProvider(region)?.provider_name).toBe('YouTube TV')
  })
})

describe('resolveShowPlatforms', () => {
  it('prefers a manual override over the auto-picked provider', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue({
      id: 101,
      results: { US: { link: '', flatrate: [provider({ provider_name: 'Netflix' })] } },
    } as TmdbWatchProviders)
    vi.mocked(fetchStreamingOverrides).mockResolvedValue(
      new Map([
        [
          101,
          {
            id: 'o1',
            show_id: 101,
            provider_id: 9,
            provider_name: 'Manual Pick',
            provider_logo_path: '/manual.png',
            updated_by: 'u1',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      ]),
    )

    const result = await resolveShowPlatforms([101], 'US')
    expect(result.get(101)).toEqual({ provider_name: 'Manual Pick', logo_path: '/manual.png' })
    // An override answers the question on its own -- no need to also ask TMDB.
    expect(getWatchProviders).not.toHaveBeenCalled()
  })

  it('auto-picks the best free provider when there is no override', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue({
      id: 102,
      results: { US: { link: '', flatrate: [provider({ provider_name: 'Netflix' })] } },
    } as TmdbWatchProviders)
    vi.mocked(fetchStreamingOverrides).mockResolvedValue(new Map())

    const result = await resolveShowPlatforms([102], 'US')
    expect(result.get(102)).toEqual({ provider_name: 'Netflix', logo_path: '/netflix.png' })
  })

  it('resolves null for a show with no providers and no override', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue({ id: 103, results: {} } as TmdbWatchProviders)
    vi.mocked(fetchStreamingOverrides).mockResolvedValue(new Map())

    const result = await resolveShowPlatforms([103], 'US')
    expect(result.get(103)).toBeNull()
  })

  it('resolves null (not a throw) when both lookups fail', async () => {
    vi.mocked(getWatchProviders).mockRejectedValue(new Error('tmdb down'))
    vi.mocked(fetchStreamingOverrides).mockRejectedValue(new Error('supabase down'))

    const result = await resolveShowPlatforms([104], 'US')
    expect(result.get(104)).toBeNull()
  })

  it('batches every uncached show into a single overrides request', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue({ id: 0, results: {} } as TmdbWatchProviders)
    vi.mocked(fetchStreamingOverrides).mockResolvedValue(new Map())

    await resolveShowPlatforms([201, 202, 203], 'US')
    expect(fetchStreamingOverrides).toHaveBeenCalledTimes(1)
    expect(fetchStreamingOverrides).toHaveBeenCalledWith([201, 202, 203])
  })

  it('caches results so a second call for the same show/region skips re-fetching', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue({
      id: 105,
      results: { US: { link: '', flatrate: [provider()] } },
    } as TmdbWatchProviders)
    vi.mocked(fetchStreamingOverrides).mockResolvedValue(new Map())

    await resolveShowPlatforms([105], 'US')
    const callsAfterFirst = vi.mocked(getWatchProviders).mock.calls.length
    await resolveShowPlatforms([105], 'US')
    expect(vi.mocked(getWatchProviders).mock.calls.length).toBe(callsAfterFirst)
  })

  it('invalidatePlatformCache forces the next call to re-fetch', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue({
      id: 106,
      results: { US: { link: '', flatrate: [provider()] } },
    } as TmdbWatchProviders)
    vi.mocked(fetchStreamingOverrides).mockResolvedValue(new Map())

    await resolveShowPlatforms([106], 'US')
    const callsAfterFirst = vi.mocked(getWatchProviders).mock.calls.length
    invalidatePlatformCache(106)
    await resolveShowPlatforms([106], 'US')
    expect(vi.mocked(getWatchProviders).mock.calls.length).toBeGreaterThan(callsAfterFirst)
  })
})
