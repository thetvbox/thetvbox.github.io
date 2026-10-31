// Decides who may add the first passkey to an account, so knowing a user id is not enough to take it over.

/** How long after sign-up an account can get its first passkey without a signed-in session. */
export const SIGN_UP_WINDOW_MS = 15 * 60 * 1000

export interface PasskeyGuardInput {
  callerAuthUserId: string | null
  accountCreatedAt: string
  accountAuthUserId: string | null
  linkedAuthUserIds: string[]
  now: number
}

/** True for the account's signed-in owner, or for an anonymous caller on an account created in the last few minutes with no login linked. */
export function mayAddFirstPasskey(input: PasskeyGuardInput): boolean {
  const { callerAuthUserId, accountCreatedAt, accountAuthUserId, linkedAuthUserIds, now } = input
  if (callerAuthUserId) {
    return accountAuthUserId === callerAuthUserId || linkedAuthUserIds.includes(callerAuthUserId)
  }
  const createdAt = Date.parse(accountCreatedAt)
  if (Number.isNaN(createdAt)) return false
  const age = now - createdAt
  return age >= 0 && age < SIGN_UP_WINDOW_MS && accountAuthUserId === null && linkedAuthUserIds.length === 0
}
