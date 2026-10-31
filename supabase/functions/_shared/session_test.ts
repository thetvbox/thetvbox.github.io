import { deepStrictEqual as assertEquals } from 'node:assert'
import { LOGIN_BELONGS_ELSEWHERE, SESSION_FAILED, type SessionDeps, startSession } from './session.ts'

const tokens = { access_token: 'access', refresh_token: 'refresh' }
const account = { id: 'acct-1', email: 'ada@example.com', auth_user_id: null }

function fakeDeps(overrides: Partial<SessionDeps> = {}) {
  const calls: string[] = []
  const deps: SessionDeps = {
    linkedAuthUserIds: () => Promise.resolve([]),
    emailOf: () => Promise.resolve(null),
    createLogin: (email) => (calls.push(`create ${email}`), Promise.resolve('created')),
    magicLinkSession: (email) => (calls.push(`session ${email}`), Promise.resolve({ authUserId: 'auth-1', tokens })),
    linkedAccountOf: () => Promise.resolve(null),
    linkLogin: (authId, accountId) => (calls.push(`link ${authId} ${accountId}`), Promise.resolve(true)),
    setLegacyAuthUserId: (accountId, authId) => (calls.push(`legacy ${accountId} ${authId}`), Promise.resolve()),
    ...overrides,
  }
  return { deps, calls }
}

Deno.test('an account with no login gets one created, linked, and signed in', async () => {
  const { deps, calls } = fakeDeps()
  assertEquals(await startSession(deps, account), { tokens })
  assertEquals(calls, ['create ada@example.com', 'session ada@example.com', 'link auth-1 acct-1', 'legacy acct-1 auth-1'])
})

Deno.test('an account with a linked login signs in through that login without creating another', async () => {
  const { deps, calls } = fakeDeps({
    linkedAuthUserIds: () => Promise.resolve(['auth-9']),
    emailOf: (id) => Promise.resolve(id === 'auth-9' ? 'apple-relay@privaterelay.appleid.com' : null),
    magicLinkSession: (email) => (calls.push(`session ${email}`), Promise.resolve({ authUserId: 'auth-9', tokens })),
    linkedAccountOf: () => Promise.resolve('acct-1'),
  })
  assertEquals(await startSession(deps, { ...account, auth_user_id: 'auth-9' }), { tokens })
  assertEquals(calls, ['session apple-relay@privaterelay.appleid.com'])
})

Deno.test('the older app’s login on users.auth_user_id is used when there is no link row', async () => {
  const { deps, calls } = fakeDeps({ emailOf: (id) => Promise.resolve(id === 'auth-legacy' ? 'ada@example.com' : null) })
  const result = await startSession(deps, { ...account, auth_user_id: 'auth-legacy' })
  assertEquals(result, { tokens })
  assertEquals(calls, ['session ada@example.com', 'link auth-1 acct-1'])
})

Deno.test('an unlinked login that already uses the account email is linked and signed in', async () => {
  const { deps, calls } = fakeDeps({ createLogin: (email) => (calls.push(`create ${email}`), Promise.resolve('taken')) })
  assertEquals(await startSession(deps, account), { tokens })
  assertEquals(calls, ['create ada@example.com', 'session ada@example.com', 'link auth-1 acct-1', 'legacy acct-1 auth-1'])
})

Deno.test('a failure to create the login or the session reports a retryable error', async () => {
  assertEquals(await startSession(fakeDeps({ createLogin: () => Promise.resolve('failed') }).deps, account), {
    error: SESSION_FAILED,
    status: 500,
  })
  assertEquals(await startSession(fakeDeps({ magicLinkSession: () => Promise.resolve(null) }).deps, account), {
    error: SESSION_FAILED,
    status: 500,
  })
  assertEquals(await startSession(fakeDeps({ linkLogin: () => Promise.resolve(false) }).deps, account), {
    error: SESSION_FAILED,
    status: 500,
  })
})

Deno.test('a login that belongs to a different account is refused', async () => {
  const { deps } = fakeDeps({ linkedAccountOf: () => Promise.resolve('acct-2') })
  assertEquals(await startSession(deps, account), { error: LOGIN_BELONGS_ELSEWHERE, status: 409 })
})
