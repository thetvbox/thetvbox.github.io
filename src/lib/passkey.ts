import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
  WebAuthnError,
} from '@simplewebauthn/browser'
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/browser'
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AppUser } from '../types'

const FN = {
  registrationOptions: 'webauthn-registration-options',
  registrationVerify: 'webauthn-registration-verify',
  authenticationOptions: 'webauthn-authentication-options',
  authenticationVerify: 'webauthn-authentication-verify',
} as const

/** Thrown when the person cancels or times out a passkey prompt -- distinct from a real failure. */
export class PasskeyCancelledError extends Error {
  constructor() {
    super('Passkey request cancelled.')
    this.name = 'PasskeyCancelledError'
  }
}

/** True when this browser can run WebAuthn ceremonies at all. */
export function isPasskeySupported(): boolean {
  return browserSupportsWebAuthn()
}

interface FunctionErrorInfo {
  message: string
  reason?: string
  user?: { id: string; username: string }
}

/** Reads the structured {error, reason, user?} body off a failed function invocation, when there is one. */
async function readFunctionError(error: unknown): Promise<FunctionErrorInfo> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      return {
        message: typeof body?.error === 'string' ? body.error : 'Something went wrong. Try again.',
        reason: typeof body?.reason === 'string' ? body.reason : undefined,
        user: body?.user,
      }
    } catch {}
  }
  return { message: 'Something went wrong. Try again.' }
}

export type AuthenticationOptionsResult =
  | { status: 'ready'; options: PublicKeyCredentialRequestOptionsJSON }
  | { status: 'no_user' }
  | { status: 'no_credentials'; user: { id: string; username: string } }

/** Looks up whether an email can sign in with a passkey yet, and if so, fetches the sign-in challenge. */
export async function fetchAuthenticationOptions(email: string): Promise<AuthenticationOptionsResult> {
  const { data, error } = await supabase.functions.invoke(FN.authenticationOptions, { body: { email } })
  if (error) {
    const { message, reason, user } = await readFunctionError(error)
    if (reason === 'no_user') return { status: 'no_user' }
    if (reason === 'no_credentials' && user) return { status: 'no_credentials', user }
    throw new Error(message)
  }
  return { status: 'ready', options: data.options as PublicKeyCredentialRequestOptionsJSON }
}

/** Fetches the passkey-registration challenge for an existing user row that has no passkey yet. */
export async function fetchRegistrationOptions(userId: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const { data, error } = await supabase.functions.invoke(FN.registrationOptions, { body: { user_id: userId } })
  if (error) throw new Error((await readFunctionError(error)).message)
  return data.options as PublicKeyCredentialCreationOptionsJSON
}

/** Runs a WebAuthn browser ceremony, turning a cancelled/timed-out prompt into a distinguishable error. */
async function runCeremony<T>(ceremony: () => Promise<T>): Promise<T> {
  try {
    return await ceremony()
  } catch (err) {
    if (err instanceof WebAuthnError && err.code === 'ERROR_CEREMONY_ABORTED') {
      throw new PasskeyCancelledError()
    }
    throw new Error('Your device could not complete the passkey request. Try again.')
  }
}

/** Runs the WebAuthn sign-in ceremony and verifies it server-side, returning the signed-in user. */
export async function signInWithPasskey(
  email: string,
  options: PublicKeyCredentialRequestOptionsJSON,
): Promise<AppUser> {
  const response = await runCeremony(() => startAuthentication({ optionsJSON: options }))
  const { data, error } = await supabase.functions.invoke(FN.authenticationVerify, { body: { email, response } })
  if (error) throw new Error((await readFunctionError(error)).message)
  return data.user as AppUser
}

/** Runs the WebAuthn registration ceremony and verifies it server-side, returning the now-passkey-enabled user. */
export async function registerPasskey(
  userId: string,
  options: PublicKeyCredentialCreationOptionsJSON,
): Promise<AppUser> {
  const response = await runCeremony(() => startRegistration({ optionsJSON: options }))
  const { data, error } = await supabase.functions.invoke(FN.registrationVerify, {
    body: { user_id: userId, response },
  })
  if (error) throw new Error((await readFunctionError(error)).message)
  return data.user as AppUser
}
