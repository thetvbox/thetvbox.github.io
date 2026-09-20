import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/bugReport', () => ({ submitBugReport: vi.fn() }))
vi.mock('../lib/changelog', () => ({ appVersion: '1.2.3' }))
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))

import { useAuth } from '../contexts/AuthContext'
import { submitBugReport } from '../lib/bugReport'
import ReportBugPanel from './ReportBugPanel'
import type { AppUser } from '../types'

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function renderPanel(onClose = vi.fn()) {
  return render(
    <MemoryRouter>
      <ReportBugPanel onClose={onClose} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(submitBugReport).mockReset()
  vi.mocked(useAuth).mockReturnValue({
    user: me,
    loading: false,
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })
})

describe('ReportBugPanel', () => {
  it('renders the form', () => {
    renderPanel()
    expect(screen.getByRole('dialog', { name: 'Report a bug' })).toBeInTheDocument()
    expect(screen.getByLabelText('Bug title')).toBeInTheDocument()
    expect(screen.getByLabelText('Bug description')).toBeInTheDocument()
  })

  it('disables Send report until both fields are filled', () => {
    renderPanel()
    const sendButton = screen.getByText('Send report')
    expect(sendButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Bug title'), { target: { value: 'Title' } })
    expect(sendButton).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Bug description'), { target: { value: 'Description' } })
    expect(sendButton).not.toBeDisabled()
  })

  it('submits and shows the success screen with the issue link', async () => {
    vi.mocked(submitBugReport).mockResolvedValue({ url: 'https://github.com/x/x/issues/5', number: 5 })
    renderPanel()
    fireEvent.change(screen.getByLabelText('Bug title'), { target: { value: 'Title' } })
    fireEvent.change(screen.getByLabelText('Bug description'), { target: { value: 'Description' } })
    fireEvent.click(screen.getByText('Send report'))
    await waitFor(() => expect(screen.getByText('Filed as issue #5.')).toBeInTheDocument())
    expect(submitBugReport).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Title', description: 'Description', username: 'me', appVersion: '1.2.3' }),
    )
  })

  it('shows an error message when submission fails', async () => {
    vi.mocked(submitBugReport).mockRejectedValue(new Error('network down'))
    renderPanel()
    fireEvent.change(screen.getByLabelText('Bug title'), { target: { value: 'Title' } })
    fireEvent.change(screen.getByLabelText('Bug description'), { target: { value: 'Description' } })
    fireEvent.click(screen.getByText('Send report'))
    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
  })

  it('calls onClose on Escape', () => {
    const onClose = vi.fn()
    renderPanel(onClose)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    renderPanel(onClose)
    fireEvent.click(screen.getByText('Cancel'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
