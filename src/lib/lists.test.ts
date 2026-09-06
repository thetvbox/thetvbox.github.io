import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createQueryBuilder } from '../test/supabaseMock'

vi.mock('./supabase', () => ({ supabase: { from: vi.fn() } }))

import { supabase } from './supabase'
import {
  addShowToList,
  createList,
  deleteList,
  fetchList,
  fetchListItems,
  fetchListMembershipForShow,
  fetchListsForUser,
  removeShowFromList,
} from './lists'
import type { ShowList, ShowListItem } from '../types'

function list(overrides: Partial<ShowList> = {}): ShowList {
  return {
    id: 'l1',
    user_id: 'u1',
    name: 'Favorites',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function listItem(overrides: Partial<ShowListItem> = {}): ShowListItem {
  return {
    id: 'li1',
    list_id: 'l1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    added_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function mockFrom(result: Parameters<typeof createQueryBuilder>[0]) {
  const builder = createQueryBuilder(result)
  vi.mocked(supabase.from).mockReturnValue(builder as never)
  return builder
}

beforeEach(() => {
  vi.mocked(supabase.from).mockReset()
})

describe('fetchListsForUser', () => {
  it('maps the nested show_list_items count to itemCount', async () => {
    mockFrom({
      data: [
        { ...list(), show_list_items: [{ count: 3 }] },
        { ...list({ id: 'l2', name: 'Later' }), show_list_items: [] },
      ],
    })
    const result = await fetchListsForUser('u1')
    expect(result[0]).toMatchObject({ id: 'l1', itemCount: 3 })
    expect(result[1]).toMatchObject({ id: 'l2', itemCount: 0 })
  })

  it('returns an empty array when the user has no lists', async () => {
    mockFrom({ data: null })
    expect(await fetchListsForUser('u1')).toEqual([])
  })

  it('throws on a Supabase error', async () => {
    mockFrom({ error: new Error('boom') })
    await expect(fetchListsForUser('u1')).rejects.toThrow('boom')
  })
})

describe('fetchList', () => {
  it('returns the list when found', async () => {
    mockFrom({ data: list() })
    expect(await fetchList('l1')).toEqual(list())
  })

  it('returns null when not found', async () => {
    mockFrom({ data: null })
    expect(await fetchList('missing')).toBeNull()
  })
})

describe('fetchListItems', () => {
  it('returns the items on a list', async () => {
    mockFrom({ data: [listItem()] })
    expect(await fetchListItems('l1')).toEqual([listItem()])
  })

  it('returns an empty array when data is null', async () => {
    mockFrom({ data: null })
    expect(await fetchListItems('l1')).toEqual([])
  })
})

describe('fetchListMembershipForShow', () => {
  it('returns the set of list ids the show appears on for that user', async () => {
    mockFrom({ data: [{ list_id: 'l1' }, { list_id: 'l2' }] })
    expect(await fetchListMembershipForShow('u1', 1)).toEqual(new Set(['l1', 'l2']))
  })

  it('returns an empty set when the show is on no lists', async () => {
    mockFrom({ data: [] })
    expect(await fetchListMembershipForShow('u1', 1)).toEqual(new Set())
  })
})

describe('createList / deleteList', () => {
  it('createList inserts and returns the saved row, defaulting a missing description to null', async () => {
    const builder = mockFrom({ data: list() })
    const saved = await createList('u1', 'Favorites')
    expect(saved).toEqual(list())
    expect(builder.insert).toHaveBeenCalledWith({ user_id: 'u1', name: 'Favorites', description: null })
  })

  it('createList throws on a Supabase error', async () => {
    mockFrom({ error: new Error('insert failed') })
    await expect(createList('u1', 'Favorites')).rejects.toThrow('insert failed')
  })

  it('deleteList resolves without error on success', async () => {
    mockFrom({})
    await expect(deleteList('l1')).resolves.toBeUndefined()
  })

  it('deleteList throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(deleteList('l1')).rejects.toThrow('delete failed')
  })
})

describe('addShowToList / removeShowFromList', () => {
  it('addShowToList upserts on (list, show) and returns the saved row', async () => {
    const builder = mockFrom({ data: listItem() })
    const saved = await addShowToList({ listId: 'l1', showId: 1, showName: 'Show One', showPosterPath: null })
    expect(saved).toEqual(listItem())
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ list_id: 'l1', show_id: 1 }),
      { onConflict: 'list_id,show_id' },
    )
  })

  it('removeShowFromList resolves without error on success', async () => {
    mockFrom({})
    await expect(removeShowFromList('l1', 1)).resolves.toBeUndefined()
  })

  it('removeShowFromList throws on a Supabase error', async () => {
    mockFrom({ error: new Error('delete failed') })
    await expect(removeShowFromList('l1', 1)).rejects.toThrow('delete failed')
  })
})
