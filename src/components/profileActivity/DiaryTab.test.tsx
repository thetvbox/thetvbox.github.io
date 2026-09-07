import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import * as framerMotionMock from '../../test/framerMotionMock'
import { vi } from 'vitest'

vi.mock('framer-motion', () => framerMotionMock)

import DiaryTab from './DiaryTab'
import type { DiaryEntry } from '../../lib/showActivity'
import type { DiaryDayGroup } from './DiaryTab'

function entry(overrides: Partial<DiaryEntry> = {}): DiaryEntry {
  return {
    id: 'e1',
    kind: 'watched',
    showId: 1,
    showName: 'Show One',
    showPosterPath: null,
    at: '2026-01-01T12:00:00Z',
    ...overrides,
  }
}

function renderTab(groups: DiaryDayGroup[] = [], undatedEntries: DiaryEntry[] = []) {
  return render(
    <MemoryRouter>
      <DiaryTab groups={groups} undatedEntries={undatedEntries} username="bob" />
    </MemoryRouter>,
  )
}

describe('DiaryTab', () => {
  it('shows an empty state when there are no entries at all', () => {
    renderTab()
    expect(screen.getByText(/Nothing logged yet/)).toBeInTheDocument()
  })

  it('renders a day heading with its entries', () => {
    renderTab([{ heading: 'Today', entries: [entry({ showName: 'Show One' })] }])
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByText('Show One')).toBeInTheDocument()
  })

  it('renders a "Date unknown" section for undated entries', () => {
    renderTab([], [entry({ showName: 'Undated Show' })])
    expect(screen.getByText('Date unknown')).toBeInTheDocument()
    expect(screen.getByText('Undated Show')).toBeInTheDocument()
  })

  it('shows "Rated" text for a rated entry with its rating', () => {
    renderTab([{ heading: 'Today', entries: [entry({ kind: 'rated', rating: 4.5 })] }])
    expect(screen.getByText('Rated')).toBeInTheDocument()
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('shows "Rewatched" text for a rewatch entry', () => {
    renderTab([{ heading: 'Today', entries: [entry({ kind: 'rewatched' })] }])
    expect(screen.getByText('Rewatched')).toBeInTheDocument()
  })

  it('shows a specific episode label when provided for a watched entry', () => {
    renderTab([{ heading: 'Today', entries: [entry({ kind: 'watched', episodeLabel: 'S2E4-E6' })] }])
    expect(screen.getByText(/S2E4-E6/)).toBeInTheDocument()
  })

  it('falls back to an episode count summary with season label', () => {
    renderTab([
      { heading: 'Today', entries: [entry({ kind: 'watched', episodeCount: 3, seasonLabel: 'Season 2' })] },
    ])
    expect(screen.getByText(/3 episodes/)).toBeInTheDocument()
    expect(screen.getByText(/Season 2/)).toBeInTheDocument()
  })

  it('uses singular "episode" for a count of 1', () => {
    renderTab([{ heading: 'Today', entries: [entry({ kind: 'watched', episodeCount: 1 })] }])
    expect(screen.getByText(/1 episode(?!s)/)).toBeInTheDocument()
  })

  it('links to the per-show diary via the history icon', () => {
    renderTab([{ heading: 'Today', entries: [entry({ showId: 42 })] }])
    expect(screen.getByLabelText("View this show's full diary")).toHaveAttribute('href', '/u/bob/shows/42')
  })
})
