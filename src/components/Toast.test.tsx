import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import { TOAST_SECONDS } from '../lib/constants'
import type { ToastState } from '../hooks/useToast'
import Toast from './Toast'

function makeToast(overrides: Partial<ToastState> = {}): ToastState {
  return { id: 1, message: 'Saved', tone: 'info', ...overrides }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('renders nothing when toast is null', () => {
    const { container } = render(<Toast toast={null} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the toast message when a toast is provided', () => {
    render(<Toast toast={makeToast({ message: 'Episode removed' })} onDismiss={vi.fn()} />)
    expect(screen.getByText('Episode removed')).toBeInTheDocument()
  })

  it('uses aria-live="polite" for an info toast', () => {
    render(<Toast toast={makeToast({ tone: 'info' })} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })

  it('uses aria-live="assertive" for an error toast', () => {
    render(<Toast toast={makeToast({ tone: 'error' })} onDismiss={vi.fn()} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'assertive')
  })

  it('renders an action button and calls its onClick when clicked', () => {
    const onClick = vi.fn()
    render(
      <Toast
        toast={makeToast({ action: { label: 'Undo', onClick } })}
        onDismiss={vi.fn()}
      />,
    )
    const button = screen.getByRole('button', { name: 'Undo' })
    fireEvent.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders no action button when the toast has no action', () => {
    render(<Toast toast={makeToast()} onDismiss={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('auto-dismisses after TOAST_SECONDS', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast toast={makeToast()} onDismiss={onDismiss} />)

    vi.advanceTimersByTime(TOAST_SECONDS * 1000)

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not dismiss before the full duration has elapsed', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    render(<Toast toast={makeToast()} onDismiss={onDismiss} />)

    vi.advanceTimersByTime(TOAST_SECONDS * 1000 - 100)

    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('resets the auto-dismiss timer when a new toast (different id) replaces the old one', () => {
    vi.useFakeTimers()
    const onDismiss = vi.fn()
    const { rerender } = render(<Toast toast={makeToast({ id: 1, message: 'First' })} onDismiss={onDismiss} />)

    // Let most of the first toast's timer elapse, then swap in a new toast (remounts via key={id}).
    vi.advanceTimersByTime(TOAST_SECONDS * 1000 - 100)
    rerender(<Toast toast={makeToast({ id: 2, message: 'Second' })} onDismiss={onDismiss} />)

    // The remaining 100ms from the old toast's timer should NOT dismiss the new toast.
    vi.advanceTimersByTime(100)
    expect(onDismiss).not.toHaveBeenCalled()

    // The new toast's own full duration still needs to elapse.
    vi.advanceTimersByTime(TOAST_SECONDS * 1000 - 100)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
