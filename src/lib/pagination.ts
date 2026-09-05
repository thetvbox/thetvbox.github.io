import { POSTGREST_MAX_ROWS_PER_REQUEST } from './constants'

interface PageResult<T> {
  data: T[] | null
  error: { message: string } | null
}

/** Works around Supabase's hosted PostgREST silently capping every response
 * at `db-max-rows` (1000 by default) by paging with `.range()` until either
 * `maxRows` is reached or a short page signals the real end of the table.
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
  const rows: T[] = []
  let offset = 0
  while (offset < maxRows) {
    const pageSize = Math.min(POSTGREST_MAX_ROWS_PER_REQUEST, maxRows - offset)
    const { data, error } = await fetchPage(offset, offset + pageSize - 1)
    if (error) throw error
    const page = data ?? []
    rows.push(...page)
    if (page.length < pageSize) break
    offset += pageSize
  }
  return rows
}
