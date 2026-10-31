// Turns a verified passkey into a real Supabase Auth session for the account, so the browser writes as that user.

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

export interface SessionAccount {
  id: string
  email: string
  auth_user_id?: string | null
}

export interface SessionTokens {
  access_token: string
  refresh_token: string
}

export type SessionResult = { tokens: SessionTokens } | { error: string; status: number }

export interface SessionDeps {
  linkedAuthUserIds(accountId: string): Promise<string[]>
  emailOf(authUserId: string): Promise<string | null>
  createLogin(email: string): Promise<'created' | 'taken' | 'failed'>
  magicLinkSession(email: string): Promise<{ authUserId: string; tokens: SessionTokens } | null>
  linkedAccountOf(authUserId: string): Promise<string | null>
  linkLogin(authUserId: string, accountId: string): Promise<boolean>
  setLegacyAuthUserId(accountId: string, authUserId: string): Promise<void>
}

export const SESSION_FAILED = 'Could not start your session. Try again.'
export const LOGIN_BELONGS_ELSEWHERE = 'This sign-in is linked to a different account.'

/** Email of a login already tied to the account, or null when it has none yet. */
async function linkedLoginEmail(deps: SessionDeps, account: SessionAccount): Promise<string | null> {
  const ids = await deps.linkedAuthUserIds(account.id)
  if (account.auth_user_id) ids.push(account.auth_user_id)
  for (const id of ids) {
    const email = await deps.emailOf(id)
    if (email) return email
  }
  return null
}

/** Signs the account in through Supabase Auth, using the login of its email (created on first use), and returns the session tokens. */
export async function startSession(deps: SessionDeps, account: SessionAccount): Promise<SessionResult> {
  let email = await linkedLoginEmail(deps, account)
  if (!email) {
    const created = await deps.createLogin(account.email)
    if (created === 'failed') return { error: SESSION_FAILED, status: 500 }
    email = account.email
  }
  const session = await deps.magicLinkSession(email)
  if (!session) return { error: SESSION_FAILED, status: 500 }

  const owner = await deps.linkedAccountOf(session.authUserId)
  if (owner && owner !== account.id) return { error: LOGIN_BELONGS_ELSEWHERE, status: 409 }
  if (!owner && !(await deps.linkLogin(session.authUserId, account.id))) return { error: SESSION_FAILED, status: 500 }
  if (!account.auth_user_id) await deps.setLegacyAuthUserId(account.id, session.authUserId)
  return { tokens: session.tokens }
}

/** The real Supabase-backed dependencies for startSession, using the service-role client for admin calls. */
export function supabaseSessionDeps(admin: SupabaseClient): SessionDeps {
  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return {
    async linkedAuthUserIds(accountId) {
      const { data } = await admin.from('user_auth_links').select('auth_user_id').eq('user_id', accountId)
      return (data ?? []).map((row: { auth_user_id: string }) => row.auth_user_id)
    },
    async emailOf(authUserId) {
      const { data } = await admin.auth.admin.getUserById(authUserId)
      return data.user?.email ?? null
    },
    async createLogin(email) {
      const { error } = await admin.auth.admin.createUser({ email, email_confirm: true })
      if (!error) return 'created'
      console.error('createUser failed', error.message)
      return error.code === 'email_exists' || /already/i.test(error.message) ? 'taken' : 'failed'
    },
    async magicLinkSession(email) {
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      const tokenHash = link?.properties?.hashed_token
      if (linkError || !tokenHash) {
        console.error('generateLink failed', linkError?.message)
        return null
      }
      const { data, error } = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' })
      if (error || !data.session || !data.user) {
        console.error('verifyOtp failed', error?.message)
        return null
      }
      return {
        authUserId: data.user.id,
        tokens: { access_token: data.session.access_token, refresh_token: data.session.refresh_token },
      }
    },
    async linkedAccountOf(authUserId) {
      const { data } = await admin.from('user_auth_links').select('user_id').eq('auth_user_id', authUserId).maybeSingle()
      return data?.user_id ?? null
    },
    async linkLogin(authUserId, accountId) {
      const { error } = await admin.from('user_auth_links').insert({ auth_user_id: authUserId, user_id: accountId, provider: 'passkey' })
      if (error) console.error('Linking the login failed', error.message)
      return !error
    },
    async setLegacyAuthUserId(accountId, authUserId) {
      await admin.from('users').update({ auth_user_id: authUserId }).eq('id', accountId).is('auth_user_id', null)
    },
  }
}
