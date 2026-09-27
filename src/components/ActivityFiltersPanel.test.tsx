import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import ActivityFiltersPanel from './ActivityFiltersPanel'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }
const friend: AppUser = { id: 'u2', email: 'friend@example.com', username: 'friend', created_at: '2026-01-01T00:00:00Z' }

function renderPanel(overrides: Partial<Parameters<typeof ActivityFiltersPanel>[0]> = {}) {
  return render(
    <ActivityFiltersPanel
      members={[me, friend]}
      me={me}
      activeUsername={null}
      onSelectUsername={vi.fn()}
      genres={['Drama', 'Comedy']}
      selectedGenres={new Set()}
      onToggleGenre={vi.fn()}
      onClear={vi.fn()}
      onClose={vi.fn()}
      {...overrides}
    />,
  )
}

describe('ActivityFiltersPanel', () => {
  it('renders the Person section with "You" for the signed-in user and @username for everyone else', () => {
    renderPanel()
    expect(screen.getByText('You')).toBeInTheDocument()
    expect(screen.getByText('@friend')).toBeInTheDocument()
  })

  it('renders the Genre section, labeled as applying to Now Watching specifically', () => {
    renderPanel()
    expect(screen.getByText('Genre · Now Watching')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.getByText('Comedy')).toBeInTheDocument()
  })

  it('omits the Person section when at most one member is passed in', () => {
    renderPanel({ members: [me] })
    expect(screen.queryByText('Person')).not.toBeInTheDocument()
  })

  it('omits the Genre section when at most one genre is passed in', () => {
    renderPanel({ genres: ['Drama'] })
    expect(screen.queryByText('Genre · Now Watching')).not.toBeInTheDocument()
  })

  it('calls onSelectUsername with the clicked username', () => {
    const onSelectUsername = vi.fn()
    renderPanel({ onSelectUsername })
    fireEvent.click(screen.getByText('@friend'))
    expect(onSelectUsername).toHaveBeenCalledWith('friend')
  })

  it('calls onSelectUsername with null when the already-active person is clicked again', () => {
    const onSelectUsername = vi.fn()
    renderPanel({ activeUsername: 'friend', onSelectUsername })
    fireEvent.click(screen.getByText('@friend'))
    expect(onSelectUsername).toHaveBeenCalledWith(null)
  })

  it('reflects the active person via aria-pressed', () => {
    renderPanel({ activeUsername: 'friend' })
    expect(screen.getByText('@friend').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('You').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggleGenre with the clicked genre', () => {
    const onToggleGenre = vi.fn()
    renderPanel({ onToggleGenre })
    fireEvent.click(screen.getByText('Drama'))
    expect(onToggleGenre).toHaveBeenCalledWith('Drama')
  })

  it('does not render a Clear all button when nothing is active', () => {
    renderPanel()
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument()
  })

  it('renders a Clear all button when a person is active, and it calls onClear', () => {
    const onClear = vi.fn()
    renderPanel({ activeUsername: 'friend', onClear })
    const clearButton = screen.getByText('Clear all')
    fireEvent.click(clearButton)
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('renders a Clear all button when a genre is active', () => {
    renderPanel({ selectedGenres: new Set(['Drama']) })
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it("shows no per-option counts when the counts maps aren't passed", () => {
    renderPanel()
    expect(screen.queryByText(/^· \d+$/)).not.toBeInTheDocument()
  })

  it("shows each person's live count next to their row", () => {
    renderPanel({ personCounts: new Map([['me', 4], ['friend', 0]]) })
    expect(screen.getByText('You').closest('button')).toHaveTextContent('You4')
    expect(screen.getByText('@friend').closest('button')).toHaveTextContent('@friend0')
  })

  it('disables an unselected person at zero count instead of hiding their row', () => {
    renderPanel({ personCounts: new Map([['friend', 0]]) })
    expect(screen.getByText('@friend')).toBeInTheDocument()
    expect(screen.getByText('@friend').closest('button')).toBeDisabled()
    expect(screen.getByText('You').closest('button')).not.toBeDisabled()
  })

  it('keeps the already-active person clickable even at zero count, so they can still be cleared', () => {
    const onSelectUsername = vi.fn()
    renderPanel({ activeUsername: 'friend', personCounts: new Map([['friend', 0]]), onSelectUsername })
    const button = screen.getByText('@friend').closest('button') as HTMLButtonElement
    expect(button).not.toBeDisabled()
    fireEvent.click(button)
    expect(onSelectUsername).toHaveBeenCalledWith(null)
  })

  it("shows each genre chip's live count, and disables an unselected option at zero", () => {
    renderPanel({ genreCounts: new Map([['Drama', 2], ['Comedy', 0]]) })
    expect(screen.getByText('· 2')).toBeInTheDocument()
    expect(screen.getByText('· 0')).toBeInTheDocument()
    expect(screen.getByText('Comedy').closest('button')).toBeDisabled()
    expect(screen.getByText('Drama').closest('button')).not.toBeDisabled()
  })

  it('wires onClose through to the underlying BottomSheet (Escape closes it)', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
