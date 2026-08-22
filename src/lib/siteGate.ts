// Soft deterrent, not real security: VITE_SITE_PASSCODE ships in the public
// JS bundle, same no-real-auth model as AuthContext.

import { STORAGE_KEYS } from './constants'

const expectedPasscode = import.meta.env.VITE_SITE_PASSCODE?.trim()

export const isGateConfigured = Boolean(expectedPasscode)

export function hasPassedGate(): boolean {
  // Fails closed if storage access throws (Safari private browsing etc).
  try {
    return localStorage.getItem(STORAGE_KEYS.gate) === '1'
  } catch {
    return false
  }
}

export function markGatePassed(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.gate, '1')
  } catch {
    // Worst case they just see the passcode gate again next visit.
  }
}

export function checkPasscode(input: string): boolean {
  if (!expectedPasscode) return true
  return input.trim() === expectedPasscode
}
