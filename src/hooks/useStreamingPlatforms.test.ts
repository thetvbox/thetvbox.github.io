import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tmdb', () => ({ detectRegion: vi.fn(() => 'US') }))
vi.mock('../lib/streamingProvider', () => ({ resolveShowPlatforms: vi.fn() }))

import { resolveShowPlatforms } from '../lib/streamingProvider'
import { useStreamingPlatforms } from './useStreamingPlatforms'
import type { ResolvedProvider } from '../lib/streamingProvider'

beforeEach(() => {
  vi.mocked(resolveShowPlatforms).mockReset()
})

describe('useStreamingPlatforms', () => {
  it('returns an empty map without fetching when showIds is empty', () => {
    const { result } = renderHook(() => useStreamingPlatforms([]))
    expect(result.current.platforms).toEqual(new Map())
    expect(result.current.loading).toBe(false)
    expect(resolveShowPlatforms).not.toHaveBeenCalled()
  })

  it('resolves platforms for the given show ids', async () => {
    const map = new Map<number, ResolvedProvider | null>([[1, { provider_name: 'Netflix', logo_path: null }]])
    vi.mocked(resolveShowPlatforms).mockResolvedValue(map)
    const { result } = renderHook(() => useStreamingPlatforms([1]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.platforms).toBe(map)
    expect(resolveShowPlatforms).toHaveBeenCalledWith([1], 'US')
  })

  it('swallows fetch errors and stops loading', async () => {
    vi.mocked(resolveShowPlatforms).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useStreamingPlatforms([1]))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.platforms).toEqual(new Map())
  })
})
