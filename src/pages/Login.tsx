import { useState } from 'react'
import type { FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Navigate } from 'react-router-dom'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import { useAuth } from '../contexts/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import {
  fetchAuthenticationOptions,
  fetchRegistrationOptions,
  isPasskeySupported,
  PasskeyCancelledError,
  registerPasskey,
  signInWithPasskey,
} from '../lib/passkey'
import AppLogo from '../components/AppLogo'
import PrimaryButton from '../components/PrimaryButton'
import { useDesktopAutoFocus } from '../hooks/useDesktopAutoFocus'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { CARD_ENTRANCE_MOTION, STEP_SWAP_MOTION } from '../lib/motion'
import { EMAIL_PATTERN, USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from '../lib/constants'
import { ROUTES } from '../lib/routes'
import { errorMessage } from '../lib/format'
import ErrorText from '../components/ErrorText'

type Step =
  | { kind: 'email' }
  | { kind: 'username'; email: string }
  | { kind: 'signin'; email: string; options: PublicKeyCredentialRequestOptionsJSON }
  | { kind: 'bootstrap'; userId: string; username: string; options: PublicKeyCredentialCreationOptionsJSON }

export default function Login() {
  const { user, register, signIn } = useAuth()
  const [step, setStep] = useState<Step>({ kind: 'email' })
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const emailInputRef = useDesktopAutoFocus(step.kind === 'email')
  const usernameInputRef = useDesktopAutoFocus(step.kind === 'username')
  useDocumentTitle('Sign in')

  if (user) return <Navigate to={ROUTES.home} replace />

  function goToEmailStep() {
    setStep({ kind: 'email' })
    setUsername('')
    setError(null)
    setNotice(null)
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!EMAIL_PATTERN.test(email)) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      const result = await fetchAuthenticationOptions(email)
      if (result.status === 'ready') {
        setStep({ kind: 'signin', email, options: result.options })
      } else if (result.status === 'no_credentials') {
        const options = await fetchRegistrationOptions(result.user.id)
        setStep({ kind: 'bootstrap', userId: result.user.id, username: result.user.username, options })
      } else {
        setStep({ kind: 'username', email })
      }
    } catch (err) {
      setError(errorMessage(err, 'Something went wrong. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleUsernameSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const trimmed = username.trim()
    if (!USERNAME_PATTERN.test(trimmed)) {
      setError(`Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters: letters, numbers, underscores.`)
      return
    }
    setBusy(true)
    try {
      const newUser = await register(email, trimmed)
      const options = await fetchRegistrationOptions(newUser.id)
      setStep({ kind: 'bootstrap', userId: newUser.id, username: newUser.username, options })
    } catch (err) {
      setError(errorMessage(err, 'Could not create your account. Try again.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleSignInWithPasskey(stepValue: Extract<Step, { kind: 'signin' }>) {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const signedInUser = await signInWithPasskey(stepValue.email, stepValue.options)
      signIn(signedInUser)
    } catch (err) {
      if (err instanceof PasskeyCancelledError) {
        setNotice('Passkey request cancelled. Try again when ready.')
      } else {
        setError(errorMessage(err, 'Something went wrong. Try again.'))
      }
    } finally {
      setBusy(false)
    }
  }

  async function handleRegisterPasskey(stepValue: Extract<Step, { kind: 'bootstrap' }>) {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      const signedInUser = await registerPasskey(stepValue.userId, stepValue.options)
      signIn(signedInUser)
    } catch (err) {
      if (err instanceof PasskeyCancelledError) {
        setNotice('Passkey setup cancelled. Try again when ready.')
      } else {
        setError(errorMessage(err, 'Something went wrong. Try again.'))
      }
    } finally {
      setBusy(false)
    }
  }

  if (!isPasskeySupported()) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center">
            <AppLogo size={48} className="mb-4 drop-shadow-[0_6px_20px_rgba(139,92,246,0.35)]" />
            <h1 className="font-display text-2xl font-semibold text-base-100">TV Box</h1>
          </div>
          <div className="rounded-2xl border border-hairline bg-base-850/70 p-6 text-center shadow-xl shadow-black/10 dark:shadow-black/20">
            <ErrorText className="text-sm">
              This browser doesn&apos;t support passkeys, which TV Box now uses to sign in.
              Try a recent version of Chrome, Safari, or Edge.
            </ErrorText>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <motion.div {...CARD_ENTRANCE_MOTION} className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <AppLogo size={48} className="mb-4 drop-shadow-[0_6px_20px_rgba(139,92,246,0.35)]" />
          <h1 className="font-display text-2xl font-semibold text-base-100">TV Box</h1>
          <p className="mt-1 text-sm text-base-400">Track every show. Rate every episode.</p>
        </div>

        {!isSupabaseConfigured && (
          <div className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Supabase isn&apos;t configured yet. Set VITE_SUPABASE_URL and
            VITE_SUPABASE_ANON_KEY (see DEVELOPMENT.md) for sign-in to work.
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-hairline bg-base-850/70 p-6 shadow-xl shadow-black/10 dark:shadow-black/20">
          <AnimatePresence mode="wait">
            {step.kind === 'email' ? (
              <motion.form key="email" {...STEP_SWAP_MOTION} onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-base-200">
                    Email address
                  </label>
                  <input
                    id="email"
                    ref={emailInputRef}
                    type="email"
                    autoComplete="email webauthn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@gmail.com"
                    className="w-full rounded-lg border border-hairline-strong bg-base-900 px-3.5 py-2.5 text-base text-base-100 placeholder:text-base-500 focus:border-accent-500/60 sm:text-sm"
                  />
                </div>
                {error && <ErrorText className="text-xs">{error}</ErrorText>}
                <PrimaryButton disabled={busy}>{busy ? 'Checking…' : 'Continue'}</PrimaryButton>
                <p className="text-center text-xs text-base-500">
                  New here? We&apos;ll ask you to pick a username next. Returning? You&apos;ll
                  sign in with your passkey.
                </p>
              </motion.form>
            ) : step.kind === 'username' ? (
              <motion.form key="username" {...STEP_SWAP_MOTION} onSubmit={handleUsernameSubmit} className="space-y-4">
                <div>
                  <p className="text-sm text-base-300">
                    First time seeing <span className="font-medium text-base-100">{step.email}</span>.
                    Pick a username to finish creating your account.
                  </p>
                  <input
                    id="username"
                    ref={usernameInputRef}
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="username"
                    className="mt-3 w-full rounded-lg border border-hairline-strong bg-base-900 px-3.5 py-2.5 text-base text-base-100 placeholder:text-base-500 focus:border-accent-500/60 sm:text-sm"
                  />
                </div>
                {error && <ErrorText className="text-xs">{error}</ErrorText>}
                <PrimaryButton disabled={busy}>
                  {busy ? 'Creating account…' : 'Create account'}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={goToEmailStep}
                  className="w-full text-center text-xs text-base-500 hover:text-base-300"
                >
                  &larr; Use a different email
                </button>
              </motion.form>
            ) : step.kind === 'signin' ? (
              <motion.div key="signin" {...STEP_SWAP_MOTION} className="space-y-4">
                <p className="text-sm text-base-300">
                  Welcome back, <span className="font-medium text-base-100">{step.email}</span>.
                  Sign in with your passkey.
                </p>
                {error && <ErrorText className="text-xs">{error}</ErrorText>}
                {notice && <p className="text-xs text-base-400">{notice}</p>}
                <PrimaryButton
                  type="button"
                  disabled={busy}
                  onClick={() => handleSignInWithPasskey(step)}
                >
                  {busy ? 'Waiting for passkey…' : 'Sign in with passkey'}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={goToEmailStep}
                  className="w-full text-center text-xs text-base-500 hover:text-base-300"
                >
                  &larr; Use a different email
                </button>
              </motion.div>
            ) : (
              <motion.div key="bootstrap" {...STEP_SWAP_MOTION} className="space-y-4">
                <p className="text-sm text-base-300">
                  Set up a passkey to finish signing in as{' '}
                  <span className="font-medium text-base-100">{step.username}</span>. You&apos;ll
                  use it to sign in from now on -- no more typing your email.
                </p>
                {error && <ErrorText className="text-xs">{error}</ErrorText>}
                {notice && <p className="text-xs text-base-400">{notice}</p>}
                <PrimaryButton
                  type="button"
                  disabled={busy}
                  onClick={() => handleRegisterPasskey(step)}
                >
                  {busy ? 'Setting up…' : 'Set up passkey'}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={goToEmailStep}
                  className="w-full text-center text-xs text-base-500 hover:text-base-300"
                >
                  &larr; Use a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
