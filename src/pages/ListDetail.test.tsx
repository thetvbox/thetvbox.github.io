import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/users', () => ({ fetchUserByUsername: vi.fn() }))
vi.mock('../lib/lists', () => ({
  addShowToList: vi.fn(),
  deleteList: vi.fn(),
  fetchList: vi.fn(),
  fetchListItems: vi.fn(),
  removeShowFromList: vi.fn(),
}))

import { useAuth } from '../contexts/AuthContext'
import { fetchUserByUsername } from '../lib/users'
import { addShowToList, deleteList, fetchList, fetchListItems, removeShowFromList } from '../lib/lists'
import ListDetail from './ListDetail'
import type { AppUser, ShowList, ShowListItem } from '../types'

const owner: AppUser = { id: 'owner1', email: 'owner@example.com', username: 'owner', created_at: '2026-01-01T00:00:00Z' }

function list(overrides: Partial<ShowList> = {}): ShowList {
  return {
    id: 'l1',
    user_id: 'owner1',
    name: 'Favorites',
    description: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function item(overrides: Partial<ShowListItem> = {}): ShowListItem {
  return {
    id: 'li1',
    list_id: 'l1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: '/poster1.jpg',
    added_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderPage(username = 'owner', listId = 'l1') {
  return render(
    <MemoryRouter initialEntries={[`/u/${username}/lists/${listId}`]}>
      <Routes>
        <Route path="/u/:username/lists/:listId" element={<ListDetail />} />
        <Route path="/u/:username" element={<p>Profile page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchUserByUsername).mockReset()
  vi.mocked(fetchList).mockReset()
  vi.mocked(fetchListItems).mockReset().mockResolvedValue([])
  vi.mocked(addShowToList).mockReset()
  vi.mocked(deleteList).mockReset()
  vi.mocked(removeShowFromList).mockReset().mockResolvedValue(undefined)
  vi.mocked(useAuth).mockReturnValue({
    user: owner,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('ListDetail', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchUserByUsername).mockReturnValue(new Promise(() => {}))
    vi.mocked(fetchList).mockReturnValue(new Promise(() => {}))
    const { container } = renderPage()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows a not-found message when the list does not exist', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(null)
    renderPage()
    await waitFor(() => expect(screen.getByText('List not found.')).toBeInTheDocument())
  })

  it("treats a list belonging to someone else as not found", async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list({ user_id: 'someone-else' }))
    renderPage()
    await waitFor(() => expect(screen.getByText('List not found.')).toBeInTheDocument())
  })

  it('shows the list name, description, and item count', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list({ description: 'My picks' }))
    vi.mocked(fetchListItems).mockResolvedValue([item()])
    renderPage()
    await waitFor(() => expect(screen.getByText('Favorites')).toBeInTheDocument())
    expect(screen.getByText('My picks')).toBeInTheDocument()
    expect(screen.getByText('1 show')).toBeInTheDocument()
  })

  it('shows an empty state with no items', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list())
    renderPage()
    await waitFor(() => expect(screen.getByText(/Nothing on this list yet/)).toBeInTheDocument())
  })

  it('shows a remove button and Delete list control for the owner', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list())
    vi.mocked(fetchListItems).mockResolvedValue([item()])
    renderPage()
    await waitFor(() => expect(screen.getByText('Delete list')).toBeInTheDocument())
    expect(screen.getByLabelText('Remove Show One from this list')).toBeInTheDocument()
  })

  it('hides owner controls for a visitor', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...owner, id: 'visitor1' },
      loading: false,
      findByEmail: vi.fn(),
      register: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    })
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list())
    vi.mocked(fetchListItems).mockResolvedValue([item()])
    renderPage()
    await waitFor(() => expect(screen.getByText('Show One')).toBeInTheDocument())
    expect(screen.queryByText('Delete list')).not.toBeInTheDocument()
  })

  it('removes a show and offers undo', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list())
    vi.mocked(fetchListItems).mockResolvedValue([item()])
    renderPage()
    await waitFor(() => expect(screen.getByLabelText('Remove Show One from this list')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('Remove Show One from this list'))
    await waitFor(() => expect(removeShowFromList).toHaveBeenCalledWith('l1', 1))
    expect(screen.getByText(/Removed Show One from this list/)).toBeInTheDocument()
  })

  it('confirms then deletes the list', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list())
    vi.mocked(deleteList).mockResolvedValue(undefined)
    renderPage()
    await waitFor(() => expect(screen.getByText('Delete list')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Delete list'))
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(deleteList).toHaveBeenCalledWith('l1'))
  })

  it('shows an error and stays on the page if delete fails', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(owner)
    vi.mocked(fetchList).mockResolvedValue(list())
    vi.mocked(deleteList).mockRejectedValue(new Error('boom'))
    renderPage()
    await waitFor(() => expect(screen.getByText('Delete list')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Delete list'))
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(screen.getByText('Failed to delete this list. Try again.')).toBeInTheDocument())
  })
})
