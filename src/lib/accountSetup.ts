import { supabase } from './supabase'
import { RPC_CLAIM_ACCOUNT, RPC_REDEEM_INVITE, TABLE_USERS } from './constants'
import type { AppUser } from '../types'

const UNIQUE_VIOLATION = '23505'
const ACCOUNT_COLUMNS = 'id, email, username, created_at'

/** Lowercases and trims an email address the way accounts store it. */
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}

/** Emails a one-time code to confirm the address, creating its login the first time. */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ email: normalizeEmail(email), options: { shouldCreateUser: true } })
  if (error) throw new Error('We couldn’t send a code to that email. Try again in a minute.')
}

/** Checks the emailed code, which starts a session for that login. */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token: code.trim(), type: 'email' })
  if (error) throw new Error('That code didn’t work. Check it, or go back and send a new one.')
}

/** Redeems the invite code and creates the account for the confirmed login. */
export async function createAccount(username: string, inviteCode: string): Promise<AppUser> {
  const { data } = await supabase.auth.getUser()
  const login = data.user
  if (!login?.email) throw new Error('Confirm your email again to finish creating your account.')

  const { data: accepted, error: inviteError } = await supabase.rpc(RPC_REDEEM_INVITE, { code: inviteCode })
  if (inviteError) throw new Error(inviteError.message)
  if (!accepted) throw new Error('That invite code isn’t right.')

  const account: AppUser = {
    id: crypto.randomUUID(),
    email: normalizeEmail(login.email),
    username: username.trim(),
    created_at: new Date().toISOString(),
  }
  const { error } = await supabase
    .from(TABLE_USERS)
    .insert({ id: account.id, email: account.email, username: account.username, auth_user_id: login.id })
  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      throw new Error(
        error.message.includes('username') ? 'That username is taken. Try another.' : 'An account with that email already exists.',
      )
    }
    throw new Error(error.message)
  }
  return account
}

/** Links the confirmed login to the existing account with the same email, and returns that account. */
export async function claimAccount(): Promise<AppUser> {
  const { data: accountId, error } = await supabase.rpc(RPC_CLAIM_ACCOUNT)
  if (error || typeof accountId !== 'string') throw new Error('We couldn’t match that email to an account.')
  const { data, error: readError } = await supabase.from(TABLE_USERS).select(ACCOUNT_COLUMNS).eq('id', accountId).single()
  if (readError || !data) throw new Error('We couldn’t load your account. Try again.')
  return data as AppUser
}

/** Ends the session of a sign-up that was left part-way. */
export async function endPendingSession(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch {}
}
