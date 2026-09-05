import { useEffect, useMemo, useState } from 'react'
import { getAllTvProviders, providerLogoUrl } from '../lib/tmdb'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import InlinePanel from './InlinePanel'
import type { TmdbProviderListItem } from '../types'

/** Curated by real-world recognizability, not TMDB's own `display_priority`
 * -- that field doesn't track "well known" at all (HBO Max ranks ~150th out
 * of ~200 in TMDB's general US provider list), so this panel's default,
 * unsearched view was surfacing near-random smaller platforms ahead of the
 * ones people actually look for. Prefix match, not exact: several of these
 * come back from TMDB with a tier suffix (e.g. "Peacock Premium",
 * "Paramount Plus Essential"). */
const WELL_KNOWN_PROVIDER_PREFIXES = [
  'Netflix',
  'HBO Max',
  'Disney Plus',
  'Hulu',
  'Amazon Prime Video',
  'Apple TV',
  'Paramount Plus',
  'Peacock',
  'Starz',
  'AMC+',
  'Discovery',
  'Crunchyroll',
]

/** Lower is more recognizable; anything not on the curated list sorts after
 * all of it, in whatever order it already had (Array.sort is stable, so
 * that's TMDB's own priority order, untouched). */
function wellKnownRank(providerName: string): number {
  const idx = WELL_KNOWN_PROVIDER_PREFIXES.findIndex((prefix) => providerName.startsWith(prefix))
  return idx === -1 ? WELL_KNOWN_PROVIDER_PREFIXES.length : idx
}

/** Searchable panel for manually correcting "where to watch" -- backed by
 * TMDB's full provider list, not just those already known for this show. */
export default function ProviderPicker({
  region,
  onPick,
  onClose,
}: {
  region: string
  onPick: (provider: TmdbProviderListItem) => void | Promise<void>
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [allProviders, setAllProviders] = useState<TmdbProviderListItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Only ever mounted while open, so "active" for its whole lifetime.
  useEscapeAndFocusReturn(true, onClose)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getAllTvProviders(region)
      .then((data) => {
        if (!cancelled) setAllProviders(data)
      })
      .catch(() => {
        if (!cancelled) setAllProviders([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [region])

  const matches = useMemo(() => {
    if (!allProviders) return []
    const q = query.trim().toLowerCase()
    const filtered = q ? allProviders.filter((p) => p.provider_name.toLowerCase().includes(q)) : allProviders
    const sorted = filtered
      .slice()
      .sort((a, b) => wellKnownRank(a.provider_name) - wellKnownRank(b.provider_name))
    return sorted.slice(0, 8)
  }, [allProviders, query])

  return (
    <InlinePanel className="p-3">
      <div className="flex items-center justify-between gap-2">
        <input
          autoFocus
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search platforms (Netflix, Hulu, Max...)"
          className="w-full rounded-lg border border-hairline-strong bg-base-950 px-2.5 py-1.5 text-xs text-base-200 placeholder:text-base-600"
        />
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 text-xs text-base-500 hover:text-base-300"
        >
          Close
        </button>
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto">
        {loading ? (
          <p className="px-1 py-2 text-xs text-base-500">Loading platforms…</p>
        ) : matches.length === 0 ? (
          <p className="px-1 py-2 text-xs text-base-500">No matches.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {matches.map((p) => (
              <button
                key={p.provider_id}
                type="button"
                disabled={saving}
                onClick={async () => {
                  setSaving(true)
                  try {
                    await onPick(p)
                  } finally {
                    setSaving(false)
                  }
                }}
                className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 text-left text-xs text-base-200 transition-colors duration-150 hover:bg-hover disabled:opacity-50"
              >
                <div className="h-6 w-6 shrink-0 overflow-hidden rounded bg-base-800 ring-1 ring-hairline-strong">
                  {providerLogoUrl(p.logo_path) ? (
                    <img
                      src={providerLogoUrl(p.logo_path) ?? undefined}
                      alt={p.provider_name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                {p.provider_name}
              </button>
            ))}
          </div>
        )}
      </div>
    </InlinePanel>
  )
}
