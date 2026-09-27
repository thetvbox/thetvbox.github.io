import { POSTGREST_MAX_ROWS_PER_REQUEST } from './constants'

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
  count?: number | null
}

/** Fetches all rows past PostgREST's per-request row cap by paging with `.range()` in parallel. */
export async function fetchPaginated<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
  maxRows: number,
): Promise<T[]> {
  if (maxRows <= 0) return []

  const firstPageSize = Math.min(POSTGREST_MAX_ROWS_PER_REQUEST, maxRows)
  const first = await fetchPage(0, firstPageSize - 1)
  if (first.error) throw first.error
  const firstPage = first.data ?? []

  const total = Math.min(first.count ?? firstPage.length, maxRows)
  if (firstPage.length >= total) return firstPage

  const offsets: number[] = []
  for (let offset = firstPageSize; offset < total; offset += POSTGREST_MAX_ROWS_PER_REQUEST) {
    offsets.push(offset)
  }

  const restPages = await Promise.all(
    offsets.map(async (offset) => {
      const pageSize = Math.min(POSTGREST_MAX_ROWS_PER_REQUEST, maxRows - offset)
      const { data, error } = await fetchPage(offset, offset + pageSize - 1)
      if (error) throw error
      return data ?? []
    }),
  )

  return [firstPage, ...restPages].flat()
}
