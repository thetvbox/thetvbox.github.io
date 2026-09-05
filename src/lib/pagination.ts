import { POSTGREST_MAX_ROWS_PER_REQUEST } from './constants'

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
  /** Exact total row count for the query, independent of `.range()` --
   * every `fetchPage` passed in here MUST request it (`{ count: 'exact' }`
   * alongside `.select()`), so the first page tells us how many more pages
   * exist and the rest can be fetched together instead of one at a time. */
  count?: number | null
}

/** Works around Supabase's hosted PostgREST silently capping every response
 * at `db-max-rows` (1000 by default) by paging with `.range()`.
 *
 * Pages are NOT fetched one-at-a-time-then-wait: the first page's exact
 * count tells us the total up front, so every remaining page is requested
 * in parallel via Promise.all. A heavy history (10k+ rows = 11 pages) went
 * from ~11 sequential round trips (the actual cause of a reported 4-5s
 * profile-load) to 2 concurrent batches.
 *
 * The query built by `fetchPage` MUST sort by a fully unique, deterministic
 * column (id) as a tiebreaker after any semantic ordering -- otherwise rows
 * tied on the semantic sort (e.g. many episodes backfilled with the same
 * "watched a while ago" placeholder date) can be skipped or duplicated
 * across page boundaries. */
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
