import { supabase } from './supabase'
import { TABLE_SHOW_STREAMING_OVERRIDES } from './constants'
import type { StreamingOverride } from '../types'

/** The group's manually-corrected "where to watch" answer for a show, if anyone has set one. */
export async function fetchStreamingOverride(showId: number): Promise<StreamingOverride | null> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_STREAMING_OVERRIDES)
    .select('*')
    .eq('show_id', showId)
    .maybeSingle()

  if (error) throw error
  return (data as StreamingOverride) ?? null
}

/**
 * Batched version of fetchStreamingOverride for resolving many shows at once (Home/Search/History
 * poster grids) -- one request for the whole page instead of one per card, keyed by show_id.
 */
export async function fetchStreamingOverrides(showIds: number[]): Promise<Map<number, StreamingOverride>> {
  if (showIds.length === 0) return new Map()

  const { data, error } = await supabase.from(TABLE_SHOW_STREAMING_OVERRIDES).select('*').in('show_id', showIds)

  if (error) throw error
  const map = new Map<number, StreamingOverride>()
  for (const row of (data as StreamingOverride[] | null) ?? []) {
    map.set(row.show_id, row)
  }
  return map
}

export interface SetStreamingOverrideInput {
  showId: number
  providerId: number | null
  providerName: string
  providerLogoPath: string | null
  updatedBy: string
}

export async function setStreamingOverride(input: SetStreamingOverrideInput): Promise<StreamingOverride> {
  const { data, error } = await supabase
    .from(TABLE_SHOW_STREAMING_OVERRIDES)
    .upsert(
      {
        show_id: input.showId,
        provider_id: input.providerId,
        provider_name: input.providerName,
        provider_logo_path: input.providerLogoPath,
        updated_by: input.updatedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'show_id' },
    )
    .select()
    .single()

  if (error) throw error
  return data as StreamingOverride
}

export async function clearStreamingOverride(showId: number): Promise<void> {
  const { error } = await supabase.from(TABLE_SHOW_STREAMING_OVERRIDES).delete().eq('show_id', showId)
  if (error) throw error
}
