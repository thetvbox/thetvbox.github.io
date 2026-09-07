import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import Modal from './Modal'

describe('Modal', () => {
  it('renders children inside a labeled dialog', () => {
    render(
      <Modal onClose={vi.fn()} label="Followers">
        <p>Hello</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'Followers' })).toBeInTheDocument()
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal onClose={onClose} label="Followers">
        <p>Hello</p>
      </Modal>,
    )
    fireEvent.click(container.ownerDocument.querySelector('[aria-hidden="true"]')!)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    render(
      <Modal onClose={onClose} label="Followers">
        <p>Hello</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('locks body scroll while open and restores it on unmount', () => {
    const { unmount } = render(
      <Modal onClose={vi.fn()} label="Followers">
        <p>Hello</p>
      </Modal>,
    )
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
