import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { STORAGE_KEYS, TABLE_USERS } from '../lib/constants'
import type { AppUser } from '../types'

/** Reads the stored session user, guarding against storage being unavailable. */
function readStoredUser(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.user)
  } catch {
    return null
  }
}

/** Writes the session user, guarding against storage being unavailable. */
function writeStoredUser(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.user, value)
  } catch {}
}

/** Clears the stored session user, guarding against storage being unavailable. */
function clearStoredUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.user)
  } catch {}
}

interface AuthContextValue {
  user: AppUser | null
  loading: boolean
  findByEmail: (email: string) => Promise<AppUser | null>
  register: (email: string, username: string) => Promise<AppUser>
  signIn: (user: AppUser) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Reading localStorage is synchronous, so the stored session can be the *initial* state
  // rather than something an effect fetches after mount -- no loading flash, no extra render.
  const [user, setUser] = useState<AppUser | null>(() => {
    const stored = readStoredUser()
    if (!stored) return null
    try {
      return JSON.parse(stored) as AppUser
    } catch {
      clearStoredUser()
      return null
    }
  })
  const loading = false

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async findByEmail(email: string) {
        const { data, error } = await supabase
          .from(TABLE_USERS)
          .select('*')
          .eq('email', email.toLowerCase().trim())
          .maybeSingle()
        if (error) throw error
        return (data as AppUser) ?? null
      },
      async register(email: string, username: string) {
        const { data, error } = await supabase
          .from(TABLE_USERS)
          .insert({ email: email.toLowerCase().trim(), username: username.trim() })
          .select()
          .single()
        if (error) {
          if (error.code === '23505') {
            throw new Error(
              error.message.includes('username')
                ? 'That username is taken. Try another.'
                : 'An account with that email already exists.',
            )
          }
          throw error
        }
        const newUser = data as AppUser
        writeStoredUser(JSON.stringify(newUser))
        setUser(newUser)
        return newUser
      },
      signIn(nextUser: AppUser) {
        writeStoredUser(JSON.stringify(nextUser))
        setUser(nextUser)
      },
      signOut() {
        clearStoredUser()
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// useAuth is the intended pairing for AuthProvider; splitting it into its own file purely for
// Fast Refresh isn't worth the extra indirection for a dev-only nicety.
// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
