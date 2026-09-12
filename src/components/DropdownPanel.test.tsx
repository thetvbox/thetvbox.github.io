import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import DropdownPanel from './DropdownPanel'

describe('DropdownPanel', () => {
  it('renders children inside a labeled, absolutely-positioned floating dialog', () => {
    render(
      <DropdownPanel onClose={vi.fn()} label="Notifications">
        <p>Hello</p>
      </DropdownPanel>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Notifications' })
    expect(dialog).toHaveClass('absolute', 'bg-base-900/95', 'backdrop-blur-xl')
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('right-aligns to its trigger by default, for triggers that sit near a page/row edge', () => {
    render(
      <DropdownPanel onClose={vi.fn()} label="Notifications">
        <p>Hello</p>
      </DropdownPanel>,
    )
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveClass('right-0')
  })

  it('centers under its trigger when align="center" is given, for a trigger away from any edge', () => {
    render(
      <DropdownPanel onClose={vi.fn()} label="Filter by person" align="center">
        <p>Hello</p>
      </DropdownPanel>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Filter by person' })
    expect(dialog).toHaveClass('inset-x-0', 'mx-auto')
    expect(dialog).not.toHaveClass('right-0')
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <DropdownPanel onClose={onClose} label="Notifications">
        <p>Hello</p>
      </DropdownPanel>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab within the panel', () => {
    render(
      <DropdownPanel onClose={vi.fn()} label="Notifications">
        <button type="button">First</button>
        <button type="button">Last</button>
      </DropdownPanel>,
    )
    screen.getByText('Last').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('First'))
  })

  it('accepts extra classes (e.g. width/padding) alongside its base styling', () => {
    render(
      <DropdownPanel onClose={vi.fn()} label="Notifications" className="w-80 p-4">
        <p>Hello</p>
      </DropdownPanel>,
    )
    expect(screen.getByRole('dialog', { name: 'Notifications' })).toHaveClass('w-80', 'p-4', 'absolute')
  })
})
