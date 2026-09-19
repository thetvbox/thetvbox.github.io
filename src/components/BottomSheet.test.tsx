import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import BottomSheet from './BottomSheet'

describe('BottomSheet', () => {
  it('renders children inside a labeled dialog', () => {
    render(
      <BottomSheet onClose={vi.fn()} label="Mark all watched">
        <p>Hello</p>
      </BottomSheet>,
    )
    expect(screen.getByRole('dialog', { name: 'Mark all watched' })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <BottomSheet onClose={onClose} label="Mark all watched">
        <p>Hello</p>
      </BottomSheet>,
    )
    fireEvent.click(container.ownerDocument.querySelector('[aria-hidden="true"]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <BottomSheet onClose={onClose} label="Mark all watched">
        <p>Hello</p>
      </BottomSheet>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = render(
      <BottomSheet onClose={vi.fn()} label="Mark all watched">
        <p>Hello</p>
      </BottomSheet>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('renders the panel with the app-wide glass treatment and a drag handle', () => {
    render(
      <BottomSheet onClose={vi.fn()} label="Mark all watched">
        <p>Hello</p>
      </BottomSheet>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Mark all watched' })
    expect(dialog).toHaveClass('glass-surface-strong')
    expect(dialog.querySelector('.bg-base-600')).toBeTruthy()
  })

  it('traps Tab within the panel', () => {
    render(
      <BottomSheet onClose={vi.fn()} label="Mark all watched">
        <button type="button">First</button>
        <button type="button">Last</button>
      </BottomSheet>,
    )
    screen.getByText('Last').focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByText('First'))
  })
})
