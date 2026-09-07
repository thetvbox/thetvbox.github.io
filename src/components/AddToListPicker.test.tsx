import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/lists', () => ({
  addShowToList: vi.fn(),
  createList: vi.fn(),
  deleteList: vi.fn(),
  fetchListsForUser: vi.fn(),
  removeShowFromList: vi.fn(),
}))

import { addShowToList, createList, deleteList, fetchListsForUser, removeShowFromList } from '../lib/lists'
import AddToListPicker from './AddToListPicker'
import type { ShowListWithCount } from '../types'

function list(overrides: Partial<ShowListWithCount> = {}): ShowListWithCount {
  return {
    id: 'l1',
    user_id: 'u1',
    name: 'Favorites',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    itemCount: 2,
    ...overrides,
  }
}

function renderPicker(memberOf: Set<string> = new Set(), onChange = vi.fn(), onClose = vi.fn()) {
  return render(
    <AddToListPicker
      userId="u1"
      showId={1}
      showName="Show One"
      showPosterPath={null}
      memberOf={memberOf}
      onChange={onChange}
      onClose={onClose}
    />,
  )
}

beforeEach(() => {
  vi.mocked(fetchListsForUser).mockReset()
  vi.mocked(addShowToList).mockReset().mockResolvedValue({} as never)
  vi.mocked(removeShowFromList).mockReset().mockResolvedValue(undefined)
  vi.mocked(createList).mockReset()
  vi.mocked(deleteList).mockReset().mockResolvedValue(undefined)
})

describe('AddToListPicker', () => {
  it('shows a loading message while fetching lists', () => {
    vi.mocked(fetchListsForUser).mockReturnValue(new Promise(() => {}))
    renderPicker()
    expect(screen.getByText('Loading your lists…')).toBeInTheDocument()
  })

  it('shows a load-error message when the fetch fails', async () => {
    vi.mocked(fetchListsForUser).mockRejectedValue(new Error('boom'))
    renderPicker()
    await waitFor(() => expect(screen.getByText(/Couldn't load your lists/)).toBeInTheDocument())
  })

  it('shows an empty-lists message', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([])
    renderPicker()
    await waitFor(() => expect(screen.getByText(/No lists yet/)).toBeInTheDocument())
  })

  it('lists the user\'s lists with item counts', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([list({ name: 'Favorites', itemCount: 3 })])
    renderPicker()
    await waitFor(() => expect(screen.getByText(/Favorites/)).toBeInTheDocument())
    expect(screen.getByText(/3/)).toBeInTheDocument()
  })

  it('shows "Add" for lists not containing the show, and adds it on click', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([list()])
    const onChange = vi.fn()
    renderPicker(new Set(), onChange)
    await waitFor(() => expect(screen.getByText('Add')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Add'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(new Set(['l1'])))
    expect(addShowToList).toHaveBeenCalledWith({ listId: 'l1', showId: 1, showName: 'Show One', showPosterPath: null })
  })

  it('shows "✓ Added" for a list already containing the show, and removes it with an undo offer', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([list()])
    const onChange = vi.fn()
    renderPicker(new Set(['l1']), onChange)
    await waitFor(() => expect(screen.getByText('✓ Added')).toBeInTheDocument())
    fireEvent.click(screen.getByText('✓ Added'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(new Set()))
    expect(removeShowFromList).toHaveBeenCalledWith('l1', 1)
    expect(screen.getByText(/Removed from/)).toBeInTheDocument()
  })

  it('shows an error toast when adding fails', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([list()])
    vi.mocked(addShowToList).mockRejectedValue(new Error('boom'))
    renderPicker()
    await waitFor(() => expect(screen.getByText('Add')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Add'))
    await waitFor(() => expect(screen.getByText('Failed to add to list. Try again.')).toBeInTheDocument())
  })

  it('undoing a removal re-adds the show', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([list()])
    const onChange = vi.fn()
    renderPicker(new Set(['l1']), onChange)
    await waitFor(() => expect(screen.getByText('✓ Added')).toBeInTheDocument())
    fireEvent.click(screen.getByText('✓ Added'))
    await waitFor(() => expect(screen.getByText(/Removed from/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('Undo'))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(new Set(['l1'])))
  })

  it('expands the create-list form and creates a list', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([])
    vi.mocked(createList).mockResolvedValue(list({ id: 'l2', name: 'New List', itemCount: 0 }))
    const onChange = vi.fn()
    renderPicker(new Set(), onChange)
    await waitFor(() => expect(screen.getByText(/No lists yet/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ New list'))
    fireEvent.change(screen.getByPlaceholderText('List name'), { target: { value: 'New List' } })
    fireEvent.click(screen.getByText('Create'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(new Set(['l2'])))
    expect(createList).toHaveBeenCalledWith('u1', 'New List')
    expect(addShowToList).toHaveBeenCalledWith({ listId: 'l2', showId: 1, showName: 'Show One', showPosterPath: null })
  })

  it('shows an error and rolls back the new list when adding the show to it fails', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([])
    vi.mocked(createList).mockResolvedValue(list({ id: 'l2', name: 'New List' }))
    vi.mocked(addShowToList).mockRejectedValue(new Error('boom'))
    renderPicker()
    await waitFor(() => expect(screen.getByText(/No lists yet/)).toBeInTheDocument())
    fireEvent.click(screen.getByText('+ New list'))
    fireEvent.change(screen.getByPlaceholderText('List name'), { target: { value: 'New List' } })
    fireEvent.click(screen.getByText('Create'))
    await waitFor(() => expect(screen.getByText('Failed to create list. Try again.')).toBeInTheDocument())
    expect(deleteList).toHaveBeenCalledWith('l2')
  })

  it('calls onClose when Close is clicked, and on Escape', async () => {
    vi.mocked(fetchListsForUser).mockResolvedValue([])
    const onClose = vi.fn()
    renderPicker(new Set(), vi.fn(), onClose)
    fireEvent.click(screen.getByText('Close'))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
