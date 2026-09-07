import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/tmdb', () => ({ getShowDetailsBulk: vi.fn() }))

import { getShowDetailsBulk } from '../lib/tmdb'
import { useShowDetails } from './useShowDetails'
import type { TmdbShowDetail } from '../types'

beforeEach(() => {
  vi.mocked(getShowDetailsBulk).mockReset()
})

describe('useShowDetails', () => {
  it('does nothing when disabled', () => {
    const { result } = renderHook(() => useShowDetails([1, 2], false))
    expect(result.current.loading).toBe(false)
    expect(getShowDetailsBulk).not.toHaveBeenCalled()
  })

  it('does nothing when showIds is empty', () => {
    const { result } = renderHook(() => useShowDetails([], true))
    expect(result.current.loading).toBe(false)
    expect(getShowDetailsBulk).not.toHaveBeenCalled()
  })

  it('fetches bulk details and returns them keyed by id', async () => {
    const map = new Map<number, TmdbShowDetail>([[1, { id: 1 } as TmdbShowDetail]])
    vi.mocked(getShowDetailsBulk).mockResolvedValue(map)
    const { result } = renderHook(() => useShowDetails([1], true))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.details).toBe(map)
    expect(getShowDetailsBulk).toHaveBeenCalledWith([1])
  })

  it('swallows fetch errors and stops loading', async () => {
    vi.mocked(getShowDetailsBulk).mockRejectedValue(new Error('boom'))
    const { result } = renderHook(() => useShowDetails([1], true))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.details).toEqual(new Map())
  })

  it('refetches when the id list changes', async () => {
    vi.mocked(getShowDetailsBulk).mockResolvedValue(new Map())
    const { rerender } = renderHook(({ ids }) => useShowDetails(ids, true), {
      initialProps: { ids: [1] },
    })
    await waitFor(() => expect(getShowDetailsBulk).toHaveBeenCalledTimes(1))
    rerender({ ids: [1, 2] })
    await waitFor(() => expect(getShowDetailsBulk).toHaveBeenCalledTimes(2))
    expect(getShowDetailsBulk).toHaveBeenLastCalledWith([1, 2])
  })
})
