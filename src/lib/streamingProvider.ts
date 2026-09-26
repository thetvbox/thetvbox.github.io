import { getWatchProviders } from './tmdb'
import { fetchStreamingOverrides } from './streamingOverrides'
import type { StreamingOverride, TmdbWatchProvider, TmdbWatchProviderRegion } from '../types'

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
export function isLowSignalProvider(providerName: string): boolean {
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

/** One show's full resolution: the single "best guess" badge pick, plus every provider it actually streams on. */
interface CachedProviderResolution {
  best: ResolvedProvider | null
  names: Set<string>
}

/** Every non-low-signal flatrate/free/ads provider name for a region, deduped -- the full set a show streams on. */
function providerNames(region: TmdbWatchProviderRegion | null): Set<string> {
  if (!region) return new Set()
  const combined = dedupeProviders([...(region.flatrate ?? []), ...(region.free ?? []), ...(region.ads ?? [])])
  return new Set(combined.filter((p) => !isLowSignalProvider(p.provider_name)).map((p) => p.provider_name))
}

/** Resolves the group's full "where to watch" picture for one show: manual override wins for the badge pick alone. */
async function resolveShowProviders(
  showId: number,
  region: string,
  override: StreamingOverride | undefined,
): Promise<CachedProviderResolution> {
  if (override) {
    return {
      best: { provider_name: override.provider_name, logo_path: override.provider_logo_path },
      names: new Set([override.provider_name]),
    }
  }
  const providers = await getWatchProviders(showId).catch(() => null)
  const regionData = providers?.results[region] ?? null
  const best = pickBestFreeProvider(regionData)
  return {
    best: best ? { provider_name: best.provider_name, logo_path: best.logo_path } : null,
    names: providerNames(regionData),
  }
}

const platformCache = new Map<string, CachedProviderResolution>()

function cacheKey(showId: number, region: string): string {
  return `${region}:${showId}`
}

/** Drops every cached answer for a show, across all regions. */
export function invalidatePlatformCache(showId: number): void {
  for (const key of platformCache.keys()) {
    if (key.endsWith(`:${showId}`)) platformCache.delete(key)
  }
}

/** Populates the shared cache for whichever of `showIds` aren't already resolved for `region`. */
async function ensureResolved(showIds: number[], region: string): Promise<void> {
  const uncached = [...new Set(showIds)].filter((id) => !platformCache.has(cacheKey(id, region)))
  if (uncached.length === 0) return

  const overrides = await fetchStreamingOverrides(uncached).catch(() => new Map<number, StreamingOverride>())

  await Promise.all(
    uncached.map(async (id) => {
      const result = await resolveShowProviders(id, region, overrides.get(id)).catch(() => ({
        best: null,
        names: new Set<string>(),
      }))
      platformCache.set(cacheKey(id, region), result)
    }),
  )
}

/** Resolves "where to watch" for many shows at once, batched and cached -- one badge-worthy pick per show. */
export async function resolveShowPlatforms(
  showIds: number[],
  region: string,
): Promise<Map<number, ResolvedProvider | null>> {
  await ensureResolved(showIds, region)
  const result = new Map<number, ResolvedProvider | null>()
  for (const id of showIds) {
    result.set(id, platformCache.get(cacheKey(id, region))?.best ?? null)
  }
  return result
}

/** Every provider each show actually streams on, not just its single "best guess" badge pick -- for "is this on Netflix" filtering, where reusing the one-pick-per-show badge data would hide titles ranked below another service for the badge. Shares `resolveShowPlatforms`' cache, so calling both for the same shows/region never double-fetches. */
export async function resolveShowPlatformNames(
  showIds: number[],
  region: string,
): Promise<Map<number, Set<string>>> {
  await ensureResolved(showIds, region)
  const result = new Map<number, Set<string>>()
  for (const id of showIds) {
    result.set(id, platformCache.get(cacheKey(id, region))?.names ?? new Set())
  }
  return result
}
