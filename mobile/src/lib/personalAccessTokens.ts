import * as Crypto from 'expo-crypto'

import { TABLE_PERSONAL_ACCESS_TOKENS } from './constants'
import { supabase } from './supabase'
import type { PersonalAccessTokenSummary } from '../types'

const TOKEN_PREFIX = 'tvbox_pat_'
const TOKEN_BYTES = 32

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

/** Generates a random personal access token; the raw value is only ever seen once, at creation. */
export function generateAccessToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  return TOKEN_PREFIX + toHex(bytes)
}

/** SHA-256 hashes a token into the form stored in the database; never reversible back to the raw token. */
export async function hashAccessToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token, {
    encoding: Crypto.CryptoEncoding.HEX,
  })
}

export interface CreatedPersonalAccessToken {
  token: string
  summary: PersonalAccessTokenSummary
}

/** Creates a personal access token for Siri/Shortcuts automations; the raw token is returned once and never stored. */
export async function createPersonalAccessToken(userId: string, label: string): Promise<CreatedPersonalAccessToken> {
  const token = generateAccessToken()
  const tokenHash = await hashAccessToken(token)
  const { data, error } = await supabase
    .from(TABLE_PERSONAL_ACCESS_TOKENS)
    .insert({ user_id: userId, token_hash: tokenHash, label: label.trim() || 'Siri' })
    .select('id, label, created_at, last_used_at')
    .single()
  if (error) throw error
  return { token, summary: data as PersonalAccessTokenSummary }
}

/** Lists a user's personal access tokens, newest first; never includes the token itself, only its metadata. */
export async function fetchPersonalAccessTokens(userId: string): Promise<PersonalAccessTokenSummary[]> {
  const { data, error } = await supabase
    .from(TABLE_PERSONAL_ACCESS_TOKENS)
    .select('id, label, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as PersonalAccessTokenSummary[]
}

/** Revokes a personal access token immediately; any Siri/Shortcuts automation using it starts failing on its next run. */
export async function revokePersonalAccessToken(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE_PERSONAL_ACCESS_TOKENS).delete().eq('id', id)
  if (error) throw error
}
