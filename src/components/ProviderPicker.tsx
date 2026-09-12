import { useEffect, useMemo, useState } from 'react'
import { getAllTvProviders, providerLogoUrl } from '../lib/tmdb'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import InlinePanel from './InlinePanel'
import PanelHeader from './PanelHeader'
import type { TmdbProviderListItem } from '../types'

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

/** Returns a sort rank where lower is more recognizable; unlisted providers sort last. */
function wellKnownRank(providerName: string): number {
  const idx = WELL_KNOWN_PROVIDER_PREFIXES.findIndex((prefix) => providerName.startsWith(prefix))
  return idx === -1 ? WELL_KNOWN_PROVIDER_PREFIXES.length : idx
}

/** Searchable panel for manually correcting "where to watch", backed by TMDB's full provider list. */
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
    <InlinePanel className="p-3.5" label="Where to watch">
      <PanelHeader title="Where to watch" onClose={onClose} />
      <input
        autoFocus
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search platforms (Netflix, Hulu, Max...)"
        className="w-full rounded-lg border border-hairline-strong bg-base-950 px-2.5 py-1.5 text-xs text-base-200 placeholder:text-base-600"
      />
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
