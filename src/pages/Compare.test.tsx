import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/showRatings', () => ({ fetchRecentShowRatings: vi.fn() }))
vi.mock('../lib/users', () => ({ fetchUserByUsername: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import { fetchRecentShowRatings } from '../lib/showRatings'
import { fetchUserByUsername } from '../lib/users'
import Compare from './Compare'
import type { AppUser, ShowRating } from '../types'

const me: AppUser = { id: 'me1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }
const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }

function rating(overrides: Partial<ShowRating> = {}): ShowRating {
  return {
    id: 'r1',
    user_id: 'me1',
    show_id: 1,
    show_name: 'Show One',
    show_poster_path: null,
    rating: 4,
    rated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

function renderCompare(username = 'bob') {
  return render(
    <MemoryRouter initialEntries={[`/compare/${username}`]}>
      <Routes>
        <Route path="/compare/:username" element={<Compare />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(fetchUserByUsername).mockReset()
  vi.mocked(fetchRecentShowRatings).mockReset().mockResolvedValue([])
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    findByEmail: vi.fn(),
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('Compare', () => {
  it('shows a loading skeleton before data resolves', () => {
    vi.mocked(fetchUserByUsername).mockReturnValue(new Promise(() => {}))
    const { container } = renderCompare()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows a not-found message when the target user does not exist', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(null)
    renderCompare('ghost')
    await waitFor(() => expect(screen.getByText(/No one found with username/)).toBeInTheDocument())
  })

  it("shows a self-compare message when comparing with yourself", async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(me)
    renderCompare('me')
    await waitFor(() => expect(screen.getByText("You can't compare with yourself.")).toBeInTheDocument())
  })

  it('shows an empty state when there is no overlap', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    renderCompare()
    await waitFor(() => expect(screen.getByText(/No overlap yet/)).toBeInTheDocument())
  })

  it('shows the taste match and shared shows sorted by biggest difference', async () => {
    vi.mocked(fetchUserByUsername).mockResolvedValue(bob)
    vi.mocked(fetchRecentShowRatings).mockImplementation((userId: string) =>
      Promise.resolve(
        userId === 'me1'
          ? [rating({ show_id: 1, show_name: 'Close Show', rating: 4 }), rating({ show_id: 2, show_name: 'Far Show', rating: 5 })]
          : [
              rating({ show_id: 1, show_name: 'Close Show', rating: 4 }),
              rating({ show_id: 2, show_name: 'Far Show', rating: 1 }),
            ],
      ),
    )
    renderCompare()
    await waitFor(() => expect(screen.getByText('Shows in common')).toBeInTheDocument())
    expect(screen.getByText('2')).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('Far Show')
    expect(items[1]).toHaveTextContent('Close Show')
  })

  it('shows an error message when loading fails', async () => {
    vi.mocked(fetchUserByUsername).mockRejectedValue(new Error('load failed'))
    renderCompare()
    await waitFor(() => expect(screen.getByText('load failed')).toBeInTheDocument())
  })
})
