import { STORAGE_KEYS } from './constants'

const expectedPasscode = import.meta.env.VITE_SITE_PASSCODE?.trim()

export const isGateConfigured = Boolean(expectedPasscode)

/** True if the visitor has already passed the shared passcode gate. */
export function hasPassedGate(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.gate) === '1'
  } catch {
    return false
  }
}

/** Marks the shared passcode gate as passed for this browser. */
export function markGatePassed(): void {
  try {
    localStorage.setItem(STORAGE_KEYS.gate, '1')
  } catch {}
}

export function checkPasscode(input: string): boolean {
  if (!expectedPasscode) return true
  return input.trim() === expectedPasscode
}
