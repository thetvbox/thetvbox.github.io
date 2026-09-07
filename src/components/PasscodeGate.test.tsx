import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/siteGate', () => ({ checkPasscode: vi.fn(), markGatePassed: vi.fn() }))

import { checkPasscode, markGatePassed } from '../lib/siteGate'
import PasscodeGate from './PasscodeGate'

beforeEach(() => {
  vi.mocked(checkPasscode).mockReset()
  vi.mocked(markGatePassed).mockReset()
})

describe('PasscodeGate', () => {
  it('strips non-digit characters as the user types', () => {
    render(<PasscodeGate onSuccess={vi.fn()} />)
    const input = screen.getByLabelText('Enter passcode') as HTMLInputElement
    fireEvent.change(input, { target: { value: '12a3b4' } })
    expect(input.value).toBe('1234')
  })

  it('disables Continue until a code is entered', () => {
    render(<PasscodeGate onSuccess={vi.fn()} />)
    expect(screen.getByText('Continue')).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Enter passcode'), { target: { value: '1' } })
    expect(screen.getByText('Continue')).not.toBeDisabled()
  })

  it('calls markGatePassed and onSuccess for a correct code', () => {
    vi.mocked(checkPasscode).mockReturnValue(true)
    const onSuccess = vi.fn()
    render(<PasscodeGate onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText('Enter passcode'), { target: { value: '123456' } })
    fireEvent.submit(screen.getByLabelText('Enter passcode').closest('form')!)
    expect(markGatePassed).toHaveBeenCalledTimes(1)
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it('shows an error and does not call onSuccess for a wrong code', () => {
    vi.mocked(checkPasscode).mockReturnValue(false)
    const onSuccess = vi.fn()
    render(<PasscodeGate onSuccess={onSuccess} />)
    fireEvent.change(screen.getByLabelText('Enter passcode'), { target: { value: '000000' } })
    fireEvent.submit(screen.getByLabelText('Enter passcode').closest('form')!)
    expect(screen.getByText('That code isn’t right.')).toBeInTheDocument()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(markGatePassed).not.toHaveBeenCalled()
  })

  it('clears a previous error once the user edits the code again', () => {
    vi.mocked(checkPasscode).mockReturnValue(false)
    render(<PasscodeGate onSuccess={vi.fn()} />)
    const input = screen.getByLabelText('Enter passcode')
    fireEvent.change(input, { target: { value: '000000' } })
    fireEvent.submit(input.closest('form')!)
    expect(screen.getByText('That code isn’t right.')).toBeInTheDocument()
    fireEvent.change(input, { target: { value: '1' } })
    expect(screen.queryByText('That code isn’t right.')).not.toBeInTheDocument()
  })
})
