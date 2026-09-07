import { render, screen } from '@testing-library/react'
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
import App from './App'
import type { AppUser } from './types'

const setGateConfigured = (siteGate as unknown as { __setGateConfigured: (value: boolean) => void }).__setGateConfigured

const me: AppUser = { id: 'u1', email: 'me@example.com', username: 'me', created_at: '2026-01-01T00:00:00Z' }

function authValue(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    loading: false,
    findByEmail: vi.fn(),
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

  it('redirects a signed-out visitor to login for a protected route', () => {
    window.location.hash = '#/search'
    render(<App />)
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
  })

  it('renders the requested page for a signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    window.location.hash = '#/search'
    render(<App />)
    expect(await screen.findByText('SearchPage')).toBeInTheDocument()
    expect(screen.getByText('NavbarStub')).toBeInTheDocument()
  })

  it('hides the navbar on the login route even when signed in', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    window.location.hash = '#/login'
    render(<App />)
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
    expect(screen.queryByText('NavbarStub')).not.toBeInTheDocument()
  })

  it('redirects an unknown route to home for a signed-in user', async () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: me }))
    window.location.hash = '#/does-not-exist'
    render(<App />)
    expect(await screen.findByText('HomePage')).toBeInTheDocument()
  })

  it('redirects the root route to login when signed out', () => {
    render(<App />)
    expect(screen.getByText('LoginPage')).toBeInTheDocument()
  })
})
