import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/personalAccessTokens', () => ({
  createPersonalAccessToken: vi.fn(),
  fetchPersonalAccessTokens: vi.fn(),
  revokePersonalAccessToken: vi.fn(),
}))

import {
  createPersonalAccessToken,
  fetchPersonalAccessTokens,
  revokePersonalAccessToken,
} from '../lib/personalAccessTokens'
import ShortcutsPanel from './ShortcutsPanel'
import type { PersonalAccessTokenSummary } from '../types'

function token(overrides: Partial<PersonalAccessTokenSummary> = {}): PersonalAccessTokenSummary {
  return {
    id: 'pat1',
    label: 'iPhone Shortcuts',
    created_at: '2026-09-01T00:00:00Z',
    last_used_at: null,
    ...overrides,
  }
}

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.mocked(fetchPersonalAccessTokens).mockReset()
  vi.mocked(createPersonalAccessToken).mockReset()
  vi.mocked(revokePersonalAccessToken).mockReset()
  writeText.mockClear().mockResolvedValue(undefined)
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ShortcutsPanel', () => {
  it('shows the empty state when the user has no tokens', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([])
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByText('No tokens yet.')).toBeInTheDocument()
  })

  it('lists existing tokens with their created/last-used dates', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([
      token({ last_used_at: '2026-09-10T00:00:00Z' }),
    ])
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByText('iPhone Shortcuts')).toBeInTheDocument()
    expect(screen.getByText(/Last used/)).toBeInTheDocument()
  })

  it('shows a load error when fetching tokens fails', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockRejectedValue(new Error('boom'))
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('boom')
  })

  it('creates a token and shows the raw value once', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([])
    vi.mocked(createPersonalAccessToken).mockResolvedValue({
      token: 'tvbox_pat_abc123',
      summary: token(),
    })
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    await screen.findByText('No tokens yet.')

    fireEvent.click(screen.getByRole('button', { name: 'New token' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. iPhone Shortcuts'), {
      target: { value: 'iPhone Shortcuts' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('tvbox_pat_abc123')).toBeInTheDocument()
    expect(createPersonalAccessToken).toHaveBeenCalledWith('u1', 'iPhone Shortcuts')
    expect(screen.getByText('iPhone Shortcuts', { selector: 'p' })).toBeInTheDocument()
  })

  it('copies the newly created token to the clipboard', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([])
    vi.mocked(createPersonalAccessToken).mockResolvedValue({
      token: 'tvbox_pat_abc123',
      summary: token(),
    })
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    await screen.findByText('No tokens yet.')
    fireEvent.click(screen.getByRole('button', { name: 'New token' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await screen.findByText('tvbox_pat_abc123')

    fireEvent.click(screen.getByRole('button', { name: 'Copy token' }))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('tvbox_pat_abc123'))
  })

  it('revokes a token after confirming, removing it from the list', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([token()])
    vi.mocked(revokePersonalAccessToken).mockResolvedValue(undefined)
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    await screen.findByText('iPhone Shortcuts')

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(revokePersonalAccessToken).toHaveBeenCalledWith('pat1'))
    await waitFor(() => expect(screen.queryByText('iPhone Shortcuts')).not.toBeInTheDocument())
  })

  it('restores the token in the list if revoking fails', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([token()])
    vi.mocked(revokePersonalAccessToken).mockRejectedValue(new Error('boom'))
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    await screen.findByText('iPhone Shortcuts')

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => expect(revokePersonalAccessToken).toHaveBeenCalled())
    expect(await screen.findByText('iPhone Shortcuts')).toBeInTheDocument()
  })

  it('cancelling the revoke confirmation leaves the token in place', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([token()])
    render(<ShortcutsPanel userId="u1" onClose={vi.fn()} />)
    await screen.findByText('iPhone Shortcuts')

    fireEvent.click(screen.getByRole('button', { name: 'Revoke' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(revokePersonalAccessToken).not.toHaveBeenCalled()
    expect(screen.getByText('iPhone Shortcuts')).toBeInTheDocument()
  })

  it('calls onClose when the panel header close button is clicked', async () => {
    vi.mocked(fetchPersonalAccessTokens).mockResolvedValue([])
    const onClose = vi.fn()
    render(<ShortcutsPanel userId="u1" onClose={onClose} />)
    await screen.findByText('No tokens yet.')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
