import { describe, expect, it, vi } from 'vitest'
import { fetchPaginated } from './pagination'
import { POSTGREST_MAX_ROWS_PER_REQUEST } from './constants'

function makeRows(count: number, offset = 0) {
  return Array.from({ length: count }, (_, i) => ({ id: offset + i }))
}

describe('fetchPaginated', () => {
  it('returns an empty array without calling fetchPage when maxRows is 0', async () => {
    const fetchPage = vi.fn()
    const result = await fetchPaginated(fetchPage, 0)
    expect(result).toEqual([])
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('returns an empty array for a negative maxRows', async () => {
    const fetchPage = vi.fn()
    const result = await fetchPaginated(fetchPage, -5)
    expect(result).toEqual([])
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('does a single request when the total is under one page', async () => {
    const rows = makeRows(10)
    const fetchPage = vi.fn().mockResolvedValue({ data: rows, error: null, count: 10 })
    const result = await fetchPaginated(fetchPage, 50)
    expect(result).toEqual(rows)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage).toHaveBeenCalledWith(0, 49)
  })

  it('caps the first request at maxRows when maxRows is smaller than the page cap', async () => {
    const rows = makeRows(5)
    const fetchPage = vi.fn().mockResolvedValue({ data: rows, error: null, count: 5 })
    await fetchPaginated(fetchPage, 5)
    expect(fetchPage).toHaveBeenCalledWith(0, 4)
  })

  it('caps the first request at the PostgREST page size when maxRows is larger', async () => {
    const rows = makeRows(POSTGREST_MAX_ROWS_PER_REQUEST)
    const fetchPage = vi.fn().mockResolvedValue({ data: rows, error: null, count: POSTGREST_MAX_ROWS_PER_REQUEST })
    await fetchPaginated(fetchPage, POSTGREST_MAX_ROWS_PER_REQUEST * 5)
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, POSTGREST_MAX_ROWS_PER_REQUEST - 1)
  })

  it('fetches subsequent pages in parallel and concatenates them in order', async () => {
    const total = POSTGREST_MAX_ROWS_PER_REQUEST * 2 + 10
    const page1 = makeRows(POSTGREST_MAX_ROWS_PER_REQUEST, 0)
    const page2 = makeRows(POSTGREST_MAX_ROWS_PER_REQUEST, POSTGREST_MAX_ROWS_PER_REQUEST)
    const page3 = makeRows(10, POSTGREST_MAX_ROWS_PER_REQUEST * 2)

    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: page1, error: null, count: total }
      if (from === POSTGREST_MAX_ROWS_PER_REQUEST) return { data: page2, error: null, count: total }
      return { data: page3, error: null, count: total }
    })

    const result = await fetchPaginated(fetchPage, total)
    expect(result).toEqual([...page1, ...page2, ...page3])
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('stops paging once maxRows is reached, even if count reports more', async () => {
    const rows = makeRows(POSTGREST_MAX_ROWS_PER_REQUEST)
    const fetchPage = vi.fn().mockResolvedValue({ data: rows, error: null, count: 100_000 })
    const result = await fetchPaginated(fetchPage, POSTGREST_MAX_ROWS_PER_REQUEST)
    expect(result).toHaveLength(POSTGREST_MAX_ROWS_PER_REQUEST)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('falls back to the first page length when count is null', async () => {
    const rows = makeRows(3)
    const fetchPage = vi.fn().mockResolvedValue({ data: rows, error: null, count: null })
    const result = await fetchPaginated(fetchPage, 50)
    expect(result).toEqual(rows)
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('treats a null data array as empty', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: null, error: null, count: 0 })
    const result = await fetchPaginated(fetchPage, 50)
    expect(result).toEqual([])
  })

  it('throws the error from the first page and never requests more', async () => {
    const fetchPage = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' }, count: null })
    await expect(fetchPaginated(fetchPage, 50)).rejects.toEqual({ message: 'boom' })
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('throws if a later page errors', async () => {
    const total = POSTGREST_MAX_ROWS_PER_REQUEST + 5
    const page1 = makeRows(POSTGREST_MAX_ROWS_PER_REQUEST)
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 0) return { data: page1, error: null, count: total }
      return { data: null, error: { message: 'page 2 failed' }, count: null }
    })
    await expect(fetchPaginated(fetchPage, total)).rejects.toEqual({ message: 'page 2 failed' })
  })
})
