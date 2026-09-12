import { useEffect, useMemo, useState } from 'react'
import { detectRegion, getWatchProviders } from '../../lib/tmdb'
import { clearStreamingOverride, fetchStreamingOverride, setStreamingOverride } from '../../lib/streamingOverrides'
import { invalidatePlatformCache, pickBestFreeProvider } from '../../lib/streamingProvider'
import type { AppUser, StreamingOverride, TmdbProviderListItem, TmdbShowDetail, TmdbWatchProviders } from '../../types'

/** Loads watch-provider data and the group's manual override for one show, with handlers to change it. */
export function useStreamingProvider(
  showId: number,
  show: TmdbShowDetail | null,
  user: AppUser | null,
  showError: (message: string) => void,
) {
  const [providers, setProviders] = useState<TmdbWatchProviders | null>(null)
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [override, setOverride] = useState<StreamingOverride | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (Number.isNaN(showId)) return
    let cancelled = false
    // Genuinely synchronizing with an external system (a network fetch); known false positive
    // for this pattern, see https://github.com/facebook/react/issues/34743
    // oxlint-disable-next-line react/set-state-in-effect
    setLoadingProviders(true)
    getWatchProviders(showId)
      .then((data) => {
        if (!cancelled) setProviders(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProviders(false)
      })
    fetchStreamingOverride(showId)
      .then((data) => {
        if (!cancelled) setOverride(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [showId])

  const region = useMemo(() => detectRegion(), [])
  const regionProviders = providers?.results[region] ?? null
  const bestFreeProvider = useMemo(() => pickBestFreeProvider(regionProviders), [regionProviders])

  const effectiveProvider: { provider_name: string; logo_path: string | null } | null = override
    ? { provider_name: override.provider_name, logo_path: override.provider_logo_path }
    : bestFreeProvider

  /** Sets the group's manual streaming-provider override for this show. */
  async function handlePickProvider(p: TmdbProviderListItem) {
    if (!user || !show) return
    try {
      const saved = await setStreamingOverride({
        showId: show.id,
        providerId: p.provider_id,
        providerName: p.provider_name,
        providerLogoPath: p.logo_path,
        updatedBy: user.id,
      })
      setOverride(saved)
      setPickerOpen(false)
      invalidatePlatformCache(show.id)
    } catch {
      showError('Failed to set streaming provider. Try again.')
    }
  }

  /** Clears the manual override, falling back to the auto-picked free provider. */
  async function handleClearOverride() {
    if (!show) return
    try {
      await clearStreamingOverride(show.id)
      setOverride(null)
      invalidatePlatformCache(show.id)
    } catch {
      showError('Failed to reset streaming provider. Try again.')
    }
  }

  return {
    region,
    regionProviders,
    effectiveProvider,
    loadingProviders,
    override,
    pickerOpen,
    setPickerOpen,
    handlePickProvider,
    handleClearOverride,
  }
}
