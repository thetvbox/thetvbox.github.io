import { vi } from 'vitest'

export interface MockResult {
  data?: unknown
  error?: unknown
  count?: number | null
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'upsert',
  'delete',
  'update',
  'eq',
  'neq',
  'order',
  'or',
  'range',
  'limit',
  'single',
  'maybeSingle',
] as const

export type QueryBuilderMock = { [K in (typeof CHAIN_METHODS)[number]]: ReturnType<typeof vi.fn> } & {
  then: (onFulfilled: (value: Required<MockResult>) => unknown, onRejected?: (reason: unknown) => unknown) => unknown
}

/** Builds a chainable Supabase query-builder mock that resolves to the given result from any await point. */
export function createQueryBuilder(result: MockResult): QueryBuilderMock {
  const resolved = { data: null, error: null, count: null, ...result }
  const builder = {} as QueryBuilderMock
  for (const method of CHAIN_METHODS) {
    builder[method] = vi.fn(() => builder)
  }
  builder.then = (onFulfilled, onRejected) => Promise.resolve(resolved).then(onFulfilled, onRejected)
  return builder
}

/** Builds a mock Supabase client whose `.from(table)` returns the given builder, recording the table name requested. */
export function createSupabaseMock(result: MockResult) {
  const builder = createQueryBuilder(result)
  const from = vi.fn(() => builder)
  return { supabase: { from }, builder, from }
}
