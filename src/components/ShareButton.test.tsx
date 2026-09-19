import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { shareOrCopyLink } = vi.hoisted(() => ({ shareOrCopyLink: vi.fn() }))
vi.mock('../lib/share', () => ({ shareOrCopyLink }))

import ShareButton from './ShareButton'

describe('ShareButton', () => {
  it('renders an accessible share button', () => {
    shareOrCopyLink.mockResolvedValue('shared')
    render(<ShareButton title="Severance" />)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })

  it('shares with the given title, text, and url on click', async () => {
    shareOrCopyLink.mockResolvedValue('shared')
    render(<ShareButton title="Severance" text="Check out this show" url="https://example.com/show/1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() =>
      expect(shareOrCopyLink).toHaveBeenCalledWith({
        title: 'Severance',
        text: 'Check out this show',
        url: 'https://example.com/show/1',
      }),
    )
  })

  it('reports the result back to the caller', async () => {
    shareOrCopyLink.mockResolvedValue('copied')
    const onResult = vi.fn()
    render(<ShareButton title="Severance" onResult={onResult} />)
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    await waitFor(() => expect(onResult).toHaveBeenCalledWith('copied'))
  })

  it('disables itself while a share is in flight and re-enables once it settles', async () => {
    let resolveShare: (result: string) => void = () => {}
    shareOrCopyLink.mockReturnValue(
      new Promise((resolve) => {
        resolveShare = resolve
      }),
    )
    render(<ShareButton title="Severance" />)
    const button = screen.getByRole('button', { name: 'Share' })
    fireEvent.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    resolveShare('shared')
    await waitFor(() => expect(button).not.toBeDisabled())
  })

  it('ignores extra clicks while a share is already in flight', async () => {
    let resolveShare: (result: string) => void = () => {}
    shareOrCopyLink.mockReturnValue(
      new Promise((resolve) => {
        resolveShare = resolve
      }),
    )
    render(<ShareButton title="Severance" />)
    const button = screen.getByRole('button', { name: 'Share' })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    resolveShare('shared')
    await waitFor(() => expect(button).not.toBeDisabled())
    expect(shareOrCopyLink).toHaveBeenCalledTimes(1)
  })
})
