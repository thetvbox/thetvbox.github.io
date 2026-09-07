import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/changelog', () => ({
  changelogReleases: [
    {
      version: '1.2.0',
      date: '2026-01-01',
      blocks: [
        { type: 'heading', text: 'Added' },
        { type: 'paragraph', text: 'A new feature.' },
        { type: 'list', items: ['Item one', 'Item two'] },
      ],
    },
  ],
}))

import ChangelogPanel from './ChangelogPanel'

describe('ChangelogPanel', () => {
  it('renders as a labeled overlay', () => {
    render(<ChangelogPanel onClose={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: "What's new" })).toBeInTheDocument()
  })

  it('renders the release version, date, and block content', () => {
    render(<ChangelogPanel onClose={vi.fn()} />)
    expect(screen.getByText('v1.2.0')).toBeInTheDocument()
    expect(screen.getByText('Added')).toBeInTheDocument()
    expect(screen.getByText('A new feature.')).toBeInTheDocument()
    expect(screen.getByText('Item one')).toBeInTheDocument()
    expect(screen.getByText('Item two')).toBeInTheDocument()
  })

  it('calls onClose when Close is clicked, and on Escape', () => {
    const onClose = vi.fn()
    render(<ChangelogPanel onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
