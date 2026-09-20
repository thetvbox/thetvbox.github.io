import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../lib/omdb', () => ({ getExternalRatings: vi.fn() }))

import { getExternalRatings } from '../../lib/omdb'
import { useExternalRatings } from './useExternalRatings'
import type { ExternalRatings, TmdbShowDetail } from '../../types'

const show = { external_ids: { imdb_id: 'tt123' } } as TmdbShowDetail

/** A promise plus its resolve/reject, for tests that need to control exactly when a fetch settles. */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  vi.mocked(getExternalRatings).mockReset()
})

describe('useExternalRatings', () => {
  it('returns null initially, then the resolved external ratings once the fetch completes', async () => {
    const ratings: ExternalRatings = { imdbRating: 8.4, rottenTomatoesScore: 92 }
    const { promise, resolve } = createDeferred<ExternalRatings | null>()
    vi.mocked(getExternalRatings).mockReturnValue(promise)

    const { result } = renderHook(() => useExternalRatings(show))
    expect(result.current).toBeNull()

    resolve(ratings)
    await waitFor(() => expect(result.current).toEqual(ratings))
  })

  it('calls getExternalRatings with the imdb id from external_ids when present', async () => {
    vi.mocked(getExternalRatings).mockResolvedValue(null)
    renderHook(() => useExternalRatings(show))
    await waitFor(() => expect(getExternalRatings).toHaveBeenCalledWith('tt123'))
  })

  it('still calls getExternalRatings, with undefined, when external_ids is absent', async () => {
    vi.mocked(getExternalRatings).mockResolvedValue(null)
    const showWithoutExternalIds = { ...show, external_ids: undefined } as TmdbShowDetail
    renderHook(() => useExternalRatings(showWithoutExternalIds))
    await waitFor(() => expect(getExternalRatings).toHaveBeenCalledWith(undefined))
  })

  it('does nothing when show is null', async () => {
    const { result } = renderHook(() => useExternalRatings(null))
    expect(result.current).toBeNull()
    await new Promise((r) => setTimeout(r, 0))
    expect(getExternalRatings).not.toHaveBeenCalled()
    expect(result.current).toBeNull()
  })

  it('leaves externalRatings null when the fetch rejects, without throwing', async () => {
    vi.mocked(getExternalRatings).mockRejectedValue(new Error('network error'))
    const { result } = renderHook(() => useExternalRatings(show))
    await waitFor(() => expect(getExternalRatings).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 0))
    expect(result.current).toBeNull()
  })

  it('does not update state or warn after unmounting while the fetch is still pending', async () => {
    const ratings: ExternalRatings = { imdbRating: 8.4, rottenTomatoesScore: 92 }
    const { promise, resolve } = createDeferred<ExternalRatings | null>()
    vi.mocked(getExternalRatings).mockReturnValue(promise)
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { unmount } = renderHook(() => useExternalRatings(show))
    unmount()

    resolve(ratings)
    await promise
    await new Promise((r) => setTimeout(r, 0))

    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('re-fires the effect and reflects the new ratings when the show prop changes', async () => {
    const ratingsA: ExternalRatings = { imdbRating: 7.1, rottenTomatoesScore: 50 }
    const ratingsB: ExternalRatings = { imdbRating: 9.0, rottenTomatoesScore: 99 }
    vi.mocked(getExternalRatings).mockResolvedValueOnce(ratingsA).mockResolvedValueOnce(ratingsB)
    const showA = { external_ids: { imdb_id: 'tt-a' } } as TmdbShowDetail
    const showB = { external_ids: { imdb_id: 'tt-b' } } as TmdbShowDetail

    const { result, rerender } = renderHook(({ show }) => useExternalRatings(show), {
      initialProps: { show: showA as TmdbShowDetail | null },
    })
    await waitFor(() => expect(result.current).toEqual(ratingsA))

    rerender({ show: showB })
    await waitFor(() => expect(result.current).toEqual(ratingsB))

    expect(getExternalRatings).toHaveBeenNthCalledWith(1, 'tt-a')
    expect(getExternalRatings).toHaveBeenNthCalledWith(2, 'tt-b')
  })
})
