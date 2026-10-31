import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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

/** Forgets the signed-in user, both in storage and in state. */
function clearSignedInUser(setUser: (user: AppUser | null) => void): void {
  clearStoredUser()
  setUser(null)
}

interface AuthContextValue {
  user: AppUser | null
  register: (email: string, username: string) => Promise<AppUser>
  signIn: (user: AppUser) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
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

  useEffect(() => {
    let active = true
    if (readStoredUser() !== null) {
      void supabase.auth.getSession().then(({ data }) => {
        if (active && !data.session) clearSignedInUser(setUser)
      })
    }
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') clearSignedInUser(setUser)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      /** Creates the account row only; the caller must call signIn() separately once a passkey is registered (see Login.tsx). */
      async register(email: string, username: string) {
        const newUser: AppUser = {
          id: crypto.randomUUID(),
          email: email.toLowerCase().trim(),
          username: username.trim(),
          created_at: new Date().toISOString(),
        }
        const { error } = await supabase
          .from(TABLE_USERS)
          .insert({ id: newUser.id, email: newUser.email, username: newUser.username })
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
        return newUser
      },
      signIn(nextUser: AppUser) {
        writeStoredUser(JSON.stringify(nextUser))
        setUser(nextUser)
      },
      signOut() {
        clearSignedInUser(setUser)
        void supabase.auth.signOut()
      },
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
