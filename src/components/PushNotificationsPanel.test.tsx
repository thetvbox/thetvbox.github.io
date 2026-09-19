import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../lib/pushNotifications', () => ({
  isPushSupported: vi.fn(),
  isPushSubscribed: vi.fn(),
  subscribeToPush: vi.fn(),
  unsubscribeFromPush: vi.fn(),
}))

import {
  isPushSubscribed,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications'
import PushNotificationsPanel from './PushNotificationsPanel'

function stubNotification(permission: NotificationPermission, requestPermission = vi.fn()) {
  vi.stubGlobal('Notification', { permission, requestPermission })
}

beforeEach(() => {
  vi.mocked(isPushSupported).mockReset().mockReturnValue(true)
  vi.mocked(isPushSubscribed).mockReset().mockResolvedValue(false)
  vi.mocked(subscribeToPush).mockReset()
  vi.mocked(unsubscribeFromPush).mockReset()
  stubNotification('default')
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('PushNotificationsPanel', () => {
  it('shows an unsupported message when the browser lacks push support', async () => {
    vi.mocked(isPushSupported).mockReturnValue(false)
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByText(/doesn.t support push notifications/)).toBeInTheDocument()
  })

  it('shows a blocked message when notifications are already denied', async () => {
    stubNotification('denied')
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByText(/Notifications are blocked/)).toBeInTheDocument()
  })

  it('offers to enable when not yet subscribed', async () => {
    vi.mocked(isPushSubscribed).mockResolvedValue(false)
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByRole('button', { name: 'Enable push notifications' })).toBeInTheDocument()
  })

  it('shows the on state and a disable action when already subscribed', async () => {
    vi.mocked(isPushSubscribed).mockResolvedValue(true)
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)
    expect(await screen.findByText('Push notifications are on for this device.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Disable on this device' })).toBeInTheDocument()
  })

  it('requests permission and subscribes when enabling', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    stubNotification('default', requestPermission)
    vi.mocked(subscribeToPush).mockResolvedValue(undefined)
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Enable push notifications' }))

    await waitFor(() => expect(subscribeToPush).toHaveBeenCalledWith('u1'))
    expect(await screen.findByText('Push notifications are on for this device.')).toBeInTheDocument()
  })

  it('does not subscribe when permission is denied at the prompt', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied')
    stubNotification('default', requestPermission)
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Enable push notifications' }))

    await waitFor(() => expect(screen.getByText(/Notifications are blocked/)).toBeInTheDocument())
    expect(subscribeToPush).not.toHaveBeenCalled()
  })

  it('shows an error toast when subscribing fails', async () => {
    const requestPermission = vi.fn().mockResolvedValue('granted')
    stubNotification('default', requestPermission)
    vi.mocked(subscribeToPush).mockRejectedValue(new Error('boom'))
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Enable push notifications' }))

    expect(await screen.findByText('boom')).toBeInTheDocument()
  })

  it('unsubscribes when disabling', async () => {
    vi.mocked(isPushSubscribed).mockResolvedValue(true)
    vi.mocked(unsubscribeFromPush).mockResolvedValue(undefined)
    render(<PushNotificationsPanel userId="u1" onClose={vi.fn()} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Disable on this device' }))

    await waitFor(() => expect(unsubscribeFromPush).toHaveBeenCalled())
    expect(await screen.findByRole('button', { name: 'Enable push notifications' })).toBeInTheDocument()
  })

  it('calls onClose when the panel header close button is clicked', async () => {
    const onClose = vi.fn()
    render(<PushNotificationsPanel userId="u1" onClose={onClose} />)
    await screen.findByRole('button', { name: 'Enable push notifications' })
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalled()
  })
})
