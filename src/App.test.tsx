import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from './test/framerMotionMock'

vi.mock('framer-motion', () => ({
  ...framerMotionMock,
  MotionConfig: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: vi.fn(),
}))
vi.mock('./lib/siteGate', () => {
  const state = { configured: false }
  return {
    get isGateConfigured() {
      return state.configured
    },
    hasPassedGate: vi.fn(() => false),
    __setGateConfigured: (value: boolean) => {
      state.configured = value
    },
  }
})
vi.mock('./components/Navbar', () => ({ default: () => <div>NavbarStub</div> }))
vi.mock('./components/PasscodeGate', () => ({ default: () => <div>PasscodeGateStub</div> }))
vi.mock('./components/PushNotificationsPanel', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div>
      PushOnboardingStub
      <button onClick={onClose}>ClosePushOnboarding</button>
    </div>
  ),
}))
vi.mock('./lib/pushNotifications', () => ({
  shouldOfferPushOnboarding: vi.fn().mockResolvedValue(false),
  markPushOnboardingSeen: vi.fn(),
}))
vi.mock('./pages/Login', () => ({ default: () => <div>LoginPage</div> }))
vi.mock('./pages/Home', () => ({ default: () => <div>HomePage</div> }))
vi.mock('./pages/Activity', () => ({ default: () => <div>ActivityPage</div> }))
vi.mock('./pages/Search', () => ({ default: () => <div>SearchPage</div> }))
vi.mock('./pages/ShowDetail', () => ({ default: () => <div>ShowDetailPage</div> }))
vi.mock('./pages/Profile', () => ({ default: () => <div>ProfilePage</div> }))
vi.mock('./pages/Members', () => ({ default: () => <div>MembersPage</div> }))
vi.mock('./pages/PublicProfile', () => ({ default: () => <div>PublicProfilePage</div> }))
vi.mock('./pages/ShowDiary', () => ({ default: () => <div>ShowDiaryPage</div> }))
vi.mock('./pages/Compare', () => ({ default: () => <div>ComparePage</div> }))
vi.mock('./pages/ListDetail', () => ({ default: () => <div>ListDetailPage</div> }))
vi.mock('./pages/Recap', () => ({ default: () => <div>RecapPage</div> }))

import { useAuth } from './contexts/AuthContext'
import { hasPassedGate } from './lib/siteGate'
import * as siteGate from './lib/siteGate'
import { markPushOnboardingSeen, shouldOfferPushOnboarding } from './lib/pushNotifications'
import App from './App'
import type { AppUser } from './types'

const setGateConfigured = (siteGate as unknown as { __setGateConfigured: (value: boolean) => void }).__setGateConfigured

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function authValue(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    loading: false,
    register: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

beforeEach(() => {
  window.scrollTo = vi.fn()
  window.location.hash = ''
  setGateConfigured(false)
  vi.mocked(hasPassedGate).mockReturnValue(false)
  vi.mocked(useAuth).mockReturnValue(authValue())
  vi.mocked(shouldOfferPushOnboarding).mockReset().mockResolvedValue(false)
  vi.mocked(markPushOnboardingSeen).mockReset()
})

afterEach(() => {
  window.location.hash = ''
})

describe('App', () => {
  it('shows a loading spinner while auth is initializing', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ loading: true }))
    const { container } = render(<App />)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument()
    expect(screen.queryByText('HomePage')).not.toBeInTheDocument()
  })

  it('shows the passcode gate when configured and not yet passed', () => {
    setGateConfigured(true)
    render(<App />)
    expect(screen.getByText('PasscodeGateStub')).toBeInTheDocument()
  })

  it('redirects a signed-out visitor to login for a protected route', async () => {
    window.location.hash = '#/search'
    render(<App />)
    expect(await screen.findByText('LoginPage')).toBeInTheDocument()
  })

  it('renders the requested page for a signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    window.location.hash = '#/search'
    render(<App />)
    expect(await screen.findByText('SearchPage')).toBeInTheDocument()
    expect(screen.getByText('NavbarStub')).toBeInTheDocument()
  })

  it('hides the navbar on the login route even when signed in', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    window.location.hash = '#/login'
    render(<App />)
    expect(await screen.findByText('LoginPage')).toBeInTheDocument()
    expect(screen.queryByText('NavbarStub')).not.toBeInTheDocument()
  })

  it('redirects an unknown route to home for a signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    window.location.hash = '#/does-not-exist'
    render(<App />)
    expect(await screen.findByText('HomePage')).toBeInTheDocument()
  })

  it('redirects the root route to login when signed out', async () => {
    render(<App />)
    expect(await screen.findByText('LoginPage')).toBeInTheDocument()
  })

  it('offers the push-onboarding prompt once eligible for a signed-in user', async () => {
    vi.mocked(shouldOfferPushOnboarding).mockResolvedValue(true)
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    render(<App />)
    expect(await screen.findByText('PushOnboardingStub')).toBeInTheDocument()
    expect(markPushOnboardingSeen).toHaveBeenCalled()
  })

  it('does not offer the push-onboarding prompt when not eligible', async () => {
    vi.mocked(shouldOfferPushOnboarding).mockResolvedValue(false)
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    render(<App />)
    await screen.findByText('HomePage')
    expect(screen.queryByText('PushOnboardingStub')).not.toBeInTheDocument()
    expect(markPushOnboardingSeen).not.toHaveBeenCalled()
  })

  it('does not offer the push-onboarding prompt while signed out', async () => {
    vi.mocked(shouldOfferPushOnboarding).mockResolvedValue(true)
    render(<App />)
    await screen.findByText('LoginPage')
    expect(shouldOfferPushOnboarding).not.toHaveBeenCalled()
    expect(screen.queryByText('PushOnboardingStub')).not.toBeInTheDocument()
  })

  it('dismisses the push-onboarding prompt on close', async () => {
    vi.mocked(shouldOfferPushOnboarding).mockResolvedValue(true)
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    render(<App />)
    fireEvent.click(await screen.findByText('ClosePushOnboarding'))
    expect(screen.queryByText('PushOnboardingStub')).not.toBeInTheDocument()
  })
})
