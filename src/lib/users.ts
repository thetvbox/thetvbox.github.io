import { supabase } from './supabase'
import { TABLE_USERS } from './constants'
import type { AppUser } from '../types'

export async function fetchAllUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase
    .from(TABLE_USERS)
    .select('*')
    .order('username', { ascending: true })

  if (error) throw error
  return (data ?? []) as AppUser[]
}

export async function fetchUserByUsername(username: string): Promise<AppUser | null> {
  const { data, error } = await supabase
    .from(TABLE_USERS)
    .select('*')
    .eq('username', username)
    .maybeSingle()

  if (error) throw error
  return (data as AppUser) ?? null
}
