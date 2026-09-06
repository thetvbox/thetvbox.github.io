import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FunctionsHttpError } from '@supabase/supabase-js'

vi.mock('./supabase', () => ({ supabase: { functions: { invoke: vi.fn() } } }))

import { supabase } from './supabase'
import { submitBugReport } from './bugReport'

beforeEach(() => {
  vi.mocked(supabase.functions.invoke).mockReset()
})

describe('submitBugReport', () => {
  it('returns the issue URL/number on success', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { url: 'https://github.com/x/y/issues/1', number: 1 },
      error: null,
    } as never)

    const result = await submitBugReport({ title: 'Bug', description: 'It broke' })
    expect(result).toEqual({ url: 'https://github.com/x/y/issues/1', number: 1 })
    expect(supabase.functions.invoke).toHaveBeenCalledWith('report-bug', {
      body: { title: 'Bug', description: 'It broke' },
    })
  })

  it('surfaces the server-provided error message from a FunctionsHttpError body', async () => {
    const httpError = new FunctionsHttpError({
      json: () => Promise.resolve({ error: 'Rate limited, try again later.' }),
    } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: httpError } as never)

    await expect(submitBugReport({ title: 'Bug', description: 'It broke' })).rejects.toThrow(
      'Rate limited, try again later.',
    )
  })

  it('falls back to a generic message when the FunctionsHttpError body has no error field', async () => {
    const httpError = new FunctionsHttpError({ json: () => Promise.resolve({}) } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: httpError } as never)

    await expect(submitBugReport({ title: 'Bug', description: 'It broke' })).rejects.toThrow(
      'Failed to submit your report. Try again.',
    )
  })

  it('falls back to a generic message when the error body cannot be parsed', async () => {
    const httpError = new FunctionsHttpError({ json: () => Promise.reject(new Error('bad body')) } as never)
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: httpError } as never)

    await expect(submitBugReport({ title: 'Bug', description: 'It broke' })).rejects.toThrow(
      'Failed to submit your report. Try again.',
    )
  })

  it('falls back to a generic message for a non-HTTP error (e.g. network failure)', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: null, error: new Error('network down') } as never)

    await expect(submitBugReport({ title: 'Bug', description: 'It broke' })).rejects.toThrow(
      'Failed to submit your report. Try again.',
    )
  })
})
