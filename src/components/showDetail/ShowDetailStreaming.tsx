import { AnimatePresence } from 'framer-motion'
import ProviderPicker from '../ProviderPicker'
import { providerLogoUrl } from '../../lib/tmdb'
import type { StreamingOverride, TmdbProviderListItem, TmdbWatchProviderRegion } from '../../types'

interface ShowDetailStreamingProps {
  effectiveProvider: { provider_name: string; logo_path: string | null } | null
  /** True while the initial watch-providers fetch is still in flight --
   * distinct from "loaded but genuinely empty," which now gets its own
   * message instead of silently rendering nothing. */
  loading: boolean
  override: StreamingOverride | null
  regionProviders: TmdbWatchProviderRegion | null
  region: string
  pickerOpen: boolean
  onTogglePicker: () => void
  onClosePicker: () => void
  onPickProvider: (p: TmdbProviderListItem) => Promise<void>
  onClearOverride: () => void
}

/** "Where to watch" -- the group's resolved answer, correctable by anyone. */
export default function ShowDetailStreaming({
  effectiveProvider,
  loading,
  override,
  regionProviders,
  region,
  pickerOpen,
  onTogglePicker,
  onClosePicker,
  onPickProvider,
  onClearOverride,
}: ShowDetailStreamingProps) {
  if (loading) return null

  return (
    <div className="mt-6 max-w-md rounded-2xl border border-hairline bg-base-850/40 p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">Streaming</p>
      {effectiveProvider ? (
        <div className="flex items-center gap-2.5">
          <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-base-800 ring-1 ring-hairline-strong">
            {providerLogoUrl(effectiveProvider.logo_path) ? (
              <img
                src={providerLogoUrl(effectiveProvider.logo_path) ?? undefined}
                alt={effectiveProvider.provider_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-center text-[8px] leading-tight text-base-400">
                {effectiveProvider.provider_name}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-base-100">{effectiveProvider.provider_name}</p>
            {override && <p className="text-[11px] text-base-500">Set manually</p>}
          </div>
        </div>
      ) : regionProviders ? (
        <p className="text-sm text-base-500">Not free to stream in your region right now.</p>
      ) : (
        <p className="text-sm text-base-500">Streaming info isn&apos;t available for this show yet.</p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button type="button" onClick={onTogglePicker} className="text-[11px] text-accent-400 hover:underline">
          {effectiveProvider ? "Not right? Fix it" : 'Know where? Set it'}
        </button>
        {override && (
          <button type="button" onClick={onClearOverride} className="text-[11px] text-base-500 hover:text-base-300">
            Reset to automatic
          </button>
        )}
        {regionProviders && (
          <a
            href={regionProviders.link}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-base-500 hover:text-base-300"
          >
            See all options (JustWatch)
          </a>
        )}
      </div>

      <AnimatePresence>
        {pickerOpen && (
          <ProviderPicker key="provider-picker" region={region} onPick={onPickProvider} onClose={onClosePicker} />
        )}
      </AnimatePresence>
    </div>
  )
}
