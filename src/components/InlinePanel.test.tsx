import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import InlinePanel from './InlinePanel'

describe('InlinePanel', () => {
  it('renders children without a dialog role when no label is given', () => {
    render(<InlinePanel>Hello</InlinePanel>)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders as a labeled dialog when given a label', () => {
    render(<InlinePanel label="Filters">Hello</InlinePanel>)
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
  })

  it('traps Tab within the panel', () => {
    render(
      <InlinePanel label="Filters">
        <button type="button">First</button>
        <button type="button">Last</button>
      </InlinePanel>,
    )
    screen.getByText('Last').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('First'))
  })
})
