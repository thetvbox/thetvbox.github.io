import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as framerMotionMock from '../test/framerMotionMock'

vi.mock('framer-motion', () => framerMotionMock)
vi.mock('../contexts/AuthContext', () => ({ useAuth: vi.fn() }))
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: true }))
vi.mock('../lib/accountSetup', () => ({
  sendEmailCode: vi.fn(),
  verifyEmailCode: vi.fn(),
  createAccount: vi.fn(),
  claimAccount: vi.fn(),
  endPendingSession: vi.fn(),
}))
vi.mock('../lib/passkey', async () => {
  const actual = await vi.importActual<typeof import('../lib/passkey')>('../lib/passkey')
  return {
    ...actual,
    fetchAuthenticationOptions: vi.fn(),
    fetchRegistrationOptions: vi.fn(),
    isPasskeySupported: vi.fn(() => true),
    registerPasskey: vi.fn(),
    signInWithPasskey: vi.fn(),
  }
})

import { useAuth } from '../contexts/AuthContext'
import {
  fetchAuthenticationOptions,
  fetchRegistrationOptions,
  isPasskeySupported,
  PasskeyCancelledError,
  registerPasskey,
  signInWithPasskey,
} from '../lib/passkey'
import { claimAccount, createAccount, endPendingSession, sendEmailCode, verifyEmailCode } from '../lib/accountSetup'
import Login from './Login'
import type { AppUser } from '../types'

const bob: AppUser = { id: 'u1', email: 'bob@example.com', username: 'bob', created_at: '2026-01-01T00:00:00Z' }
const fakeAuthOptions = { challenge: 'auth-challenge' } as never
const fakeRegOptions = { challenge: 'reg-challenge' } as never

function authValue(overrides: Partial<ReturnType<typeof useAuth>> = {}) {
  return {
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
  }
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function enterEmail(email: string) {
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: email } })
  fireEvent.click(screen.getByText('Continue'))
}

async function chooseUsername(username: string, inviteCode: string) {
  await screen.findByPlaceholderText('username')
  fireEvent.change(screen.getByPlaceholderText('username'), { target: { value: username } })
  fireEvent.change(screen.getByPlaceholderText('invite code'), { target: { value: inviteCode } })
  fireEvent.click(screen.getByText('Continue'))
}

async function enterEmailCode(code: string) {
  await screen.findByText('Confirm email')
  fireEvent.change(screen.getByLabelText(/Enter the code we emailed/), { target: { value: code } })
  fireEvent.click(screen.getByText('Confirm email'))
}

beforeEach(() => {
  vi.mocked(useAuth).mockReturnValue(authValue())
  vi.mocked(isPasskeySupported).mockReturnValue(true)
  vi.mocked(fetchAuthenticationOptions).mockReset()
  vi.mocked(fetchRegistrationOptions).mockReset()
  vi.mocked(signInWithPasskey).mockReset()
  vi.mocked(registerPasskey).mockReset()
  vi.mocked(sendEmailCode).mockReset().mockResolvedValue(undefined)
  vi.mocked(verifyEmailCode).mockReset().mockResolvedValue(undefined)
  vi.mocked(createAccount).mockReset().mockResolvedValue(bob)
  vi.mocked(claimAccount).mockReset().mockResolvedValue(bob)
  vi.mocked(endPendingSession).mockReset().mockResolvedValue(undefined)
})

describe('Login', () => {
  it('redirects to /home when already signed in', () => {
    vi.mocked(useAuth).mockReturnValue(authValue({ user: bob }))
    renderLogin()
    expect(screen.getByText('Home page')).toBeInTheDocument()
  })

  it("shows an unsupported message when the browser can't do passkeys", () => {
    vi.mocked(isPasskeySupported).mockReturnValue(false)
    renderLogin()
    expect(screen.getByText(/doesn.t support passkeys/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Email address')).not.toBeInTheDocument()
  })

  it('shows the email step first', () => {
    renderLogin()
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('rejects an invalid email without calling fetchAuthenticationOptions', () => {
    renderLogin()
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'not-an-email' } })
    fireEvent.submit(screen.getByLabelText('Email address').closest('form')!)
    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(fetchAuthenticationOptions).not.toHaveBeenCalled()
  })

  it('offers to sign in with a passkey when the account has one', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'ready', options: fakeAuthOptions })
    renderLogin()
    await enterEmail('bob@example.com')
    await waitFor(() => expect(screen.getByText('Sign in with passkey')).toBeInTheDocument())
    expect(screen.getByText(/Welcome back/)).toBeInTheDocument()
  })

  it('signs in once the passkey ceremony succeeds', async () => {
    const signIn = vi.fn()
    vi.mocked(useAuth).mockReturnValue(authValue({ signIn }))
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'ready', options: fakeAuthOptions })
    vi.mocked(signInWithPasskey).mockResolvedValue(bob)
    renderLogin()
    await enterEmail('bob@example.com')
    await screen.findByText('Sign in with passkey')
    fireEvent.click(screen.getByText('Sign in with passkey'))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(bob))
    expect(signInWithPasskey).toHaveBeenCalledWith('bob@example.com', fakeAuthOptions)
  })

  it('shows a gentle notice, not an error, when the passkey prompt is cancelled', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'ready', options: fakeAuthOptions })
    vi.mocked(signInWithPasskey).mockRejectedValue(new PasskeyCancelledError())
    renderLogin()
    await enterEmail('bob@example.com')
    await screen.findByText('Sign in with passkey')
    fireEvent.click(screen.getByText('Sign in with passkey'))
    await waitFor(() => expect(screen.getByText(/cancelled/i)).toBeInTheDocument())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows an error when the passkey ceremony fails for another reason', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'ready', options: fakeAuthOptions })
    vi.mocked(signInWithPasskey).mockRejectedValue(new Error('Your device could not complete the passkey request.'))
    renderLogin()
    await enterEmail('bob@example.com')
    await screen.findByText('Sign in with passkey')
    fireEvent.click(screen.getByText('Sign in with passkey'))
    await waitFor(() =>
      expect(screen.getByText('Your device could not complete the passkey request.')).toBeInTheDocument(),
    )
  })

  it("asks an account without a passkey to confirm its email first", async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({
      status: 'no_credentials',
      user: { id: 'u1', username: 'bob' },
    })
    renderLogin()
    await enterEmail('bob@example.com')
    await screen.findByText('Confirm email')
    expect(sendEmailCode).toHaveBeenCalledWith('bob@example.com')
    expect(fetchRegistrationOptions).not.toHaveBeenCalled()
  })

  it('claims the account once the email is confirmed, then signs in after passkey setup', async () => {
    const signIn = vi.fn()
    vi.mocked(useAuth).mockReturnValue(authValue({ signIn }))
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({
      status: 'no_credentials',
      user: { id: 'u1', username: 'bob' },
    })
    vi.mocked(fetchRegistrationOptions).mockResolvedValue(fakeRegOptions)
    vi.mocked(registerPasskey).mockResolvedValue(bob)
    renderLogin()
    await enterEmail('bob@example.com')
    await enterEmailCode('123456')
    await screen.findByText('Set up passkey')
    expect(verifyEmailCode).toHaveBeenCalledWith('bob@example.com', '123456')
    expect(claimAccount).toHaveBeenCalled()
    expect(fetchRegistrationOptions).toHaveBeenCalledWith('u1')
    fireEvent.click(screen.getByText('Set up passkey'))
    await waitFor(() => expect(signIn).toHaveBeenCalledWith(bob))
    expect(registerPasskey).toHaveBeenCalledWith('u1', fakeRegOptions)
  })

  it('rejects an email code that is not all digits of the right length', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_credentials', user: { id: 'u1', username: 'bob' } })
    renderLogin()
    await enterEmail('bob@example.com')
    await enterEmailCode('12')
    expect(screen.getByText('Enter the code from the email we just sent.')).toBeInTheDocument()
    expect(verifyEmailCode).not.toHaveBeenCalled()
  })

  it('shows the error when the email code is wrong', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_credentials', user: { id: 'u1', username: 'bob' } })
    vi.mocked(verifyEmailCode).mockRejectedValue(new Error('That code didn’t work.'))
    renderLogin()
    await enterEmail('bob@example.com')
    await enterEmailCode('000000')
    await waitFor(() => expect(screen.getByText('That code didn’t work.')).toBeInTheDocument())
    expect(claimAccount).not.toHaveBeenCalled()
  })

  it('advances to the username step for a new email', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    renderLogin()
    await enterEmail('new@example.com')
    await waitFor(() => expect(screen.getByPlaceholderText('username')).toBeInTheDocument())
    expect(screen.getByPlaceholderText('invite code')).toBeInTheDocument()
  })

  it('shows an error when the authentication-options lookup fails', async () => {
    vi.mocked(fetchAuthenticationOptions).mockRejectedValue(new Error('network down'))
    renderLogin()
    await enterEmail('bob@example.com')
    await waitFor(() => expect(screen.getByText('network down')).toBeInTheDocument())
  })

  it('rejects an invalid username without sending a code', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    renderLogin()
    await enterEmail('new@example.com')
    await chooseUsername('a', 'invite')
    expect(screen.getByText(/Username must be/)).toBeInTheDocument()
    expect(sendEmailCode).not.toHaveBeenCalled()
  })

  it('asks for the invite code before sending a code', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    renderLogin()
    await enterEmail('new@example.com')
    await chooseUsername('newbob', '  ')
    expect(screen.getByText('Enter the invite code you were given.')).toBeInTheDocument()
    expect(sendEmailCode).not.toHaveBeenCalled()
  })

  it('creates the account after the email is confirmed and moves to passkey setup', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    vi.mocked(fetchRegistrationOptions).mockResolvedValue(fakeRegOptions)
    renderLogin()
    await enterEmail('new@example.com')
    await chooseUsername('newbob', ' secret ')
    await enterEmailCode('123456')
    await screen.findByText('Set up passkey')
    expect(sendEmailCode).toHaveBeenCalledWith('new@example.com')
    expect(createAccount).toHaveBeenCalledWith('newbob', 'secret')
    expect(fetchRegistrationOptions).toHaveBeenCalledWith(bob.id)
  })

  it('shows an account creation error, such as a wrong invite code', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    vi.mocked(createAccount).mockRejectedValue(new Error('That invite code isn’t right.'))
    renderLogin()
    await enterEmail('new@example.com')
    await chooseUsername('newbob', 'nope')
    await enterEmailCode('123456')
    await waitFor(() => expect(screen.getByText('That invite code isn’t right.')).toBeInTheDocument())
  })

  it('shows an error when the code cannot be sent', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    vi.mocked(sendEmailCode).mockRejectedValue(new Error('We couldn’t send a code to that email.'))
    renderLogin()
    await enterEmail('new@example.com')
    await chooseUsername('newbob', 'secret')
    await waitFor(() => expect(screen.getByText('We couldn’t send a code to that email.')).toBeInTheDocument())
  })

  it('lets a cancelled passkey setup be retried', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_credentials', user: { id: 'u1', username: 'bob' } })
    vi.mocked(fetchRegistrationOptions).mockResolvedValue(fakeRegOptions)
    vi.mocked(registerPasskey).mockRejectedValue(new PasskeyCancelledError())
    renderLogin()
    await enterEmail('bob@example.com')
    await enterEmailCode('123456')
    await screen.findByText('Set up passkey')
    fireEvent.click(screen.getByText('Set up passkey'))
    await waitFor(() => expect(screen.getByText(/cancelled/i)).toBeInTheDocument())
    expect(screen.getByText('Set up passkey')).toBeInTheDocument()
  })

  it('ends the half-finished session when going back from the code step', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_credentials', user: { id: 'u1', username: 'bob' } })
    renderLogin()
    await enterEmail('bob@example.com')
    await screen.findByText('Confirm email')
    fireEvent.click(screen.getByText(/Use a different email/))
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
    expect(endPendingSession).toHaveBeenCalled()
  })

  it('goes back to the email step from the username step', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'no_user' })
    renderLogin()
    await enterEmail('new@example.com')
    await screen.findByPlaceholderText('username')
    fireEvent.click(screen.getByText(/Use a different email/))
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })

  it('goes back to the email step from the signin step', async () => {
    vi.mocked(fetchAuthenticationOptions).mockResolvedValue({ status: 'ready', options: fakeAuthOptions })
    renderLogin()
    await enterEmail('bob@example.com')
    await screen.findByText('Sign in with passkey')
    fireEvent.click(screen.getByText(/Use a different email/))
    expect(screen.getByLabelText('Email address')).toBeInTheDocument()
  })
})
