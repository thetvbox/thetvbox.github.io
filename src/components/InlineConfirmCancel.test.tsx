import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import InlineConfirmCancel from './InlineConfirmCancel'

describe('InlineConfirmCancel', () => {
  it('renders Confirm and Cancel buttons when not saving', () => {
    render(
      <InlineConfirmCancel saving={false} savingLabel="Saving…" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText('Confirm')).toBeInTheDocument()
    expect(screen.getByText('Cancel')).toBeInTheDocument()
  })

  it('renders the savingLabel instead of Confirm when saving', () => {
    render(
      <InlineConfirmCancel saving onConfirm={vi.fn()} onCancel={vi.fn()} savingLabel="Saving…" />,
    )
    expect(screen.getByText('Saving…')).toBeInTheDocument()
    expect(screen.queryByText('Confirm')).not.toBeInTheDocument()
  })

  it('disables the confirm button when saving', () => {
    render(
      <InlineConfirmCancel saving savingLabel="Saving…" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText('Saving…')).toBeDisabled()
  })

  it('does not disable the confirm button when not saving', () => {
    render(
      <InlineConfirmCancel saving={false} savingLabel="Saving…" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText('Confirm')).not.toBeDisabled()
  })

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <InlineConfirmCancel saving={false} savingLabel="Saving…" onConfirm={onConfirm} onCancel={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('Confirm'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('does not call onConfirm when the disabled confirm button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <InlineConfirmCancel saving savingLabel="Saving…" onConfirm={onConfirm} onCancel={vi.fn()} />,
    )
    fireEvent.click(screen.getByText('Saving…'))
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <InlineConfirmCancel saving={false} savingLabel="Saving…" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('never disables the cancel button, even while saving', () => {
    const onCancel = vi.fn()
    render(
      <InlineConfirmCancel saving savingLabel="Saving…" onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    const cancelButton = screen.getByText('Cancel')
    expect(cancelButton).not.toBeDisabled()
    fireEvent.click(cancelButton)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
