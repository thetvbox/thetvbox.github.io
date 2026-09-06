import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import DateMarkControl from './DateMarkControl'
import { UNKNOWN_WATCHED_AT } from '../lib/watched'

describe('DateMarkControl', () => {
  it('renders only the trigger label until clicked', () => {
    render(<DateMarkControl label="Watched in the past" onConfirm={vi.fn()} />)
    expect(screen.getByText('Watched in the past')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('expands into a date form when the trigger is clicked', () => {
    render(<DateMarkControl label="Watched in the past" onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('collapses back to the trigger when Cancel is clicked', () => {
    render(<DateMarkControl label="Watched in the past" onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
    expect(screen.getByText('Watched in the past')).toBeInTheDocument()
  })

  it('disables the date input when "unknown date" is checked', () => {
    render(<DateMarkControl label="Watched in the past" onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    const checkbox = screen.getByRole('checkbox')
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    expect(dateInput).not.toBeDisabled()
    fireEvent.click(checkbox)
    expect(dateInput).toBeDisabled()
  })

  it('confirms with a noon-anchored ISO timestamp for the picked date', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<DateMarkControl label="Watched in the past" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Watched in the past'))

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(dateInput, { target: { value: '2026-02-14' } })
    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    const [arg] = onConfirm.mock.calls[0]
    expect(arg.unknownDate).toBe(false)
    expect(new Date(arg.watchedAt).getHours()).toBe(12)
    expect(new Date(arg.watchedAt).getDate()).toBe(14)
  })

  it('confirms with UNKNOWN_WATCHED_AT when "unknown date" is checked', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<DateMarkControl label="Watched in the past" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByText('Confirm'))

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    expect(onConfirm).toHaveBeenCalledWith({ watchedAt: UNKNOWN_WATCHED_AT, unknownDate: true })
  })

  it('collapses back to the trigger after a successful confirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<DateMarkControl label="Watched in the past" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(screen.getByText('Watched in the past')).toBeInTheDocument())
  })

  it('shows the saving label and disables Confirm while the confirm promise is pending', async () => {
    let resolveConfirm!: () => void
    const onConfirm = vi.fn(() => new Promise<void>((res) => (resolveConfirm = res)))
    render(<DateMarkControl label="Watched in the past" onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    fireEvent.click(screen.getByText('Confirm'))

    const confirmButton = await screen.findByText('Marking…')
    expect(confirmButton.closest('button')).toBeDisabled()

    resolveConfirm()
    await waitFor(() => expect(screen.getByText('Watched in the past')).toBeInTheDocument())
  })

  it('closes on Escape', () => {
    render(<DateMarkControl label="Watched in the past" onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('renders a confirmSummary warning when provided and open', () => {
    render(
      <DateMarkControl
        label="Watched in the past"
        onConfirm={vi.fn()}
        confirmSummary="This will overwrite 3 already-watched episodes."
      />,
    )
    expect(screen.queryByText(/overwrite/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Watched in the past'))
    expect(screen.getByText(/overwrite/)).toBeInTheDocument()
  })

  it('caps the date input at today', () => {
    render(<DateMarkControl label="Watched in the past" onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Watched in the past'))
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement
    const today = new Date()
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(dateInput.max).toBe(expected)
  })
})
