import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)

import RewatchLogControl from './RewatchLogControl'

describe('RewatchLogControl', () => {
  it('shows the base trigger label when count is 0', () => {
    render(<RewatchLogControl count={0} onConfirm={vi.fn()} />)
    expect(screen.getByText('Log a rewatch')).toBeInTheDocument()
  })

  it('shows the running count in the trigger label when count > 0', () => {
    render(<RewatchLogControl count={2} onConfirm={vi.fn()} />)
    expect(screen.getByText('Log another rewatch (2 so far)')).toBeInTheDocument()
  })

  it('expands into a date form when clicked', () => {
    render(<RewatchLogControl count={0} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    expect(screen.getByLabelText('Rewatch date')).toBeInTheDocument()
    expect(screen.getByText('Confirm')).toBeInTheDocument()
  })

  it('collapses back to the trigger on Cancel', () => {
    render(<RewatchLogControl count={0} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    fireEvent.click(screen.getByText('Cancel'))
    expect(screen.getByText('Log a rewatch')).toBeInTheDocument()
  })

  it('confirms with a noon-anchored ISO timestamp for the picked date', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<RewatchLogControl count={0} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    fireEvent.change(screen.getByLabelText('Rewatch date'), { target: { value: '2026-03-01' } })
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1))
    const [arg] = onConfirm.mock.calls[0]
    expect(new Date(arg).getHours()).toBe(12)
    expect(new Date(arg).getDate()).toBe(1)
  })

  it('collapses back to the trigger after a successful confirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<RewatchLogControl count={0} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    fireEvent.click(screen.getByText('Confirm'))
    await waitFor(() => expect(screen.getByText('Log a rewatch')).toBeInTheDocument())
  })

  it('shows the saving label and disables Confirm while pending', async () => {
    let resolveConfirm!: () => void
    const onConfirm = vi.fn(() => new Promise<void>((res) => (resolveConfirm = res)))
    render(<RewatchLogControl count={0} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    fireEvent.click(screen.getByText('Confirm'))
    const confirmButton = await screen.findByText('Logging…')
    expect(confirmButton.closest('button')).toBeDisabled()
    resolveConfirm()
    await waitFor(() => expect(screen.getByText('Log a rewatch')).toBeInTheDocument())
  })

  it('closes on Escape', () => {
    render(<RewatchLogControl count={0} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByText('Log a rewatch')).toBeInTheDocument()
  })

  it('caps the date input at today', () => {
    render(<RewatchLogControl count={0} onConfirm={vi.fn()} />)
    fireEvent.click(screen.getByText('Log a rewatch'))
    const dateInput = screen.getByLabelText('Rewatch date') as HTMLInputElement
    const today = new Date()
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    expect(dateInput.max).toBe(expected)
  })
})
