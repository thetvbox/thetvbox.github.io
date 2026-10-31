import { strictEqual as assertEquals } from 'node:assert'
import { mayAddFirstPasskey, SIGN_UP_WINDOW_MS } from './passkeyGuard.ts'

const now = Date.parse('2026-10-31T12:00:00Z')
const minutesAgo = (minutes: number) => new Date(now - minutes * 60 * 1000).toISOString()
const fresh = { callerAuthUserId: null, accountCreatedAt: minutesAgo(1), accountAuthUserId: null, linkedAuthUserIds: [], now }

Deno.test('a brand-new account with no login can get its first passkey', () => {
  assertEquals(mayAddFirstPasskey(fresh), true)
})

Deno.test('an anonymous caller cannot add a passkey to an older account', () => {
  assertEquals(mayAddFirstPasskey({ ...fresh, accountCreatedAt: minutesAgo(20) }), false)
  assertEquals(mayAddFirstPasskey({ ...fresh, accountCreatedAt: new Date(now - SIGN_UP_WINDOW_MS).toISOString() }), false)
})

Deno.test('an anonymous caller cannot add a passkey to an account with a linked login', () => {
  assertEquals(mayAddFirstPasskey({ ...fresh, accountAuthUserId: 'auth-1' }), false)
  assertEquals(mayAddFirstPasskey({ ...fresh, linkedAuthUserIds: ['auth-1'] }), false)
})

Deno.test('a creation time in the future or unreadable is refused', () => {
  assertEquals(mayAddFirstPasskey({ ...fresh, accountCreatedAt: new Date(now + 60_000).toISOString() }), false)
  assertEquals(mayAddFirstPasskey({ ...fresh, accountCreatedAt: 'not a date' }), false)
})

Deno.test('the signed-in owner can add a passkey at any age', () => {
  const old = { ...fresh, accountCreatedAt: minutesAgo(60 * 24 * 90), callerAuthUserId: 'auth-1' }
  assertEquals(mayAddFirstPasskey({ ...old, linkedAuthUserIds: ['auth-1'] }), true)
  assertEquals(mayAddFirstPasskey({ ...old, accountAuthUserId: 'auth-1' }), true)
})

Deno.test('a signed-in caller who does not own the account is refused, even on a fresh account', () => {
  assertEquals(mayAddFirstPasskey({ ...fresh, callerAuthUserId: 'auth-2' }), false)
  assertEquals(mayAddFirstPasskey({ ...fresh, callerAuthUserId: 'auth-2', linkedAuthUserIds: ['auth-1'] }), false)
})
