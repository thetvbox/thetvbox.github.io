import { getWatchProviders } from './tmdb'
import { fetchStreamingOverride } from './streamingOverrides'
import type { TmdbWatchProvider, TmdbWatchProviderRegion } from '../types'

/** Dedupes providers that repeat across flatrate/rent/buy, sorted by TMDB's display priority. */
export function dedupeProviders(list: TmdbWatchProvider[]): TmdbWatchProvider[] {
  const seen = new Set<number>()
  return list
    .filter((p) => {
      if (seen.has(p.provider_id)) return false
      seen.add(p.provider_id)
      return true
    })
    .sort((a, b) => a.display_priority - b.display_priority)
}

const RESELLER_CHANNEL_SUFFIX = /\s(Amazon|Apple TV|Roku Premium|Prime Video|Google Play)\s*Channel$/i

const LIVE_TV_BUNDLE = /^(YouTube ?TV|fubo ?TV|Sling ?TV|Philo|DirecTV( Stream)?|Hulu\s*\+?\s*Live ?TV|Vidgo|Frndly ?TV)\b/i

const CABLE_NETWORK_APP =
  /^(TBS|TNT|TruTV|USA Network|FX|FXX|Comedy Central|Adult Swim|Bravo|E!|Syfy|Freeform|VH1|MTV2?|Nickelodeon|AMC|IFC|Paramount Network|Lifetime|A&E|HGTV|Food Network|Travel Channel|Discovery Channel|TLC|History|National Geographic|CNN|MSNBC|Fox News|CBS|NBC|ABC|FOX|The CW)$/i

/** True if a provider name is a reseller-channel, live-TV-bundle, or cable-network-app listing. */
function isLowSignalProvider(providerName: string): boolean {
  const name = providerName.trim()
  return RESELLER_CHANNEL_SUFFIX.test(name) || LIVE_TV_BUNDLE.test(name) || CABLE_NETWORK_APP.test(name)
}

/** Picks the first non-low-signal provider in priority order, falling back to the top overall listing. */
function pickDirect(list: TmdbWatchProvider[]): TmdbWatchProvider | null {
  if (list.length === 0) return null
  return list.find((p) => !isLowSignalProvider(p.provider_name)) ?? list[0]
}

/** Picks the single best-guess "free to you" provider for a region: subscription first, then free/ad-supported. */
export function pickBestFreeProvider(region: TmdbWatchProviderRegion | null): TmdbWatchProvider | null {
  if (!region) return null
  const flatrate = dedupeProviders(region.flatrate ?? [])
  const direct = pickDirect(flatrate)
  if (direct) return direct
  const free = dedupeProviders([...(region.free ?? []), ...(region.ads ?? [])])
  return pickDirect(free)
}

export interface ResolvedProvider {
  provider_name: string
  logo_path: string | null
}

/** Resolves the group's "where to watch" answer for one show: manual override wins, else best automatic guess. */
async function resolveShowPlatform(showId: number, region: string): Promise<ResolvedProvider | null> {
  const [providers, override] = await Promise.all([
    getWatchProviders(showId).catch(() => null),
    fetchStreamingOverride(showId).catch(() => null),
  ])
  if (override) return { provider_name: override.provider_name, logo_path: override.provider_logo_path }
  const best = pickBestFreeProvider(providers?.results[region] ?? null)
  return best ? { provider_name: best.provider_name, logo_path: best.logo_path } : null
}

const platformCache = new Map<string, ResolvedProvider | null>()

function cacheKey(showId: number, region: string): string {
  return `${region}:${showId}`
}

/** Drops every cached answer for a show, across all regions. */
export function invalidatePlatformCache(showId: number): void {
  for (const key of platformCache.keys()) {
    if (key.endsWith(`:${showId}`)) platformCache.delete(key)
  }
}

/** Resolves "where to watch" for many shows at once, batched and cached. */
export async function resolveShowPlatforms(
  showIds: number[],
  region: string,
): Promise<Map<number, ResolvedProvider | null>> {
  const uncached = [...new Set(showIds)].filter((id) => !platformCache.has(cacheKey(id, region)))

  await Promise.all(
    uncached.map(async (id) => {
      const result = await resolveShowPlatform(id, region).catch(() => null)
      platformCache.set(cacheKey(id, region), result)
    }),
  )

  const result = new Map<number, ResolvedProvider | null>()
  for (const id of showIds) {
    result.set(id, platformCache.get(cacheKey(id, region)) ?? null)
  }
  return result
}
