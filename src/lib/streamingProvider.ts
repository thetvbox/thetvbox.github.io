import { getWatchProviders } from './tmdb'
import { fetchStreamingOverride } from './streamingOverrides'
import type { TmdbWatchProvider, TmdbWatchProviderRegion } from '../types'

/** Providers can repeat across flatrate/rent/buy -- keep one, sorted the way TMDB ranks them. */
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

/** JustWatch/TMDB "resold through someone else's storefront" listings (e.g.
 * "HBO Max Amazon Channel") -- same underlying service as the plain-name
 * entry, but often ranked *above* it with a different logo, so picking
 * flatrate[0] blindly surfaces an unfamiliar name/icon. Excludes "The Roku
 * Channel" itself (a real standalone service); callers must trim input, the
 * `i` flag alone doesn't cover TMDB's inconsistent capitalization. */
const RESELLER_CHANNEL_SUFFIX = /\s(Amazon|Apple TV|Roku Premium|Prime Video|Google Play)\s*Channel$/i

/** Live-TV bundles (YouTube TV, fuboTV, etc). JustWatch lists these as
 * "flatrate" when a show airs as reruns on a carried cable network, often
 * ranked above the show's real streaming home -- deprioritized like reseller
 * channels, since a $70-90/mo bundle isn't "free to you" the same way. */
const LIVE_TV_BUNDLE = /^(YouTube ?TV|fubo ?TV|Sling ?TV|Philo|DirecTV( Stream)?|Hulu\s*\+?\s*Live ?TV|Vidgo|Frndly ?TV)\b/i

function isLowSignalProvider(providerName: string): boolean {
  const name = providerName.trim()
  return RESELLER_CHANNEL_SUFFIX.test(name) || LIVE_TV_BUNDLE.test(name)
}

/** The first provider in priority order that isn't a reseller-channel or
 * live-TV-bundle listing, falling back to the top overall listing if
 * that's genuinely the only way to watch (some smaller platforms are only
 * ever offered bundled, with no direct/standalone option anywhere). */
function pickDirect(list: TmdbWatchProvider[]): TmdbWatchProvider | null {
  if (list.length === 0) return null
  return list.find((p) => !isLowSignalProvider(p.provider_name)) ?? list[0]
}

/** The single best-guess "free to you" provider for a region -- included with a
 * subscription first, then genuinely free/ad-supported. Deliberately never
 * rent/buy: those cost extra, so they're not "free" by any reading. */
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

/** The group's resolved "where to watch" answer for one show: a manual
 * override always wins, otherwise the best automatic free guess. */
async function resolveShowPlatform(showId: number, region: string): Promise<ResolvedProvider | null> {
  const [providers, override] = await Promise.all([
    getWatchProviders(showId).catch(() => null),
    fetchStreamingOverride(showId).catch(() => null),
  ])
  if (override) return { provider_name: override.provider_name, logo_path: override.provider_logo_path }
  const best = pickBestFreeProvider(providers?.results[region] ?? null)
  return best ? { provider_name: best.provider_name, logo_path: best.logo_path } : null
}

// Module-level cache: platform data is stable within a session and the same
// shows reappear across Home/Profile/Activity.
const platformCache = new Map<string, ResolvedProvider | null>()

function cacheKey(showId: number, region: string): string {
  return `${region}:${showId}`
}

/** Drops every cached answer for a show (all regions) -- call after setting
 * or clearing a streaming override, or poster badges keep showing the old one. */
export function invalidatePlatformCache(showId: number): void {
  for (const key of platformCache.keys()) {
    if (key.endsWith(`:${showId}`)) platformCache.delete(key)
  }
}

/** Resolves "where to watch" for many shows at once (batched + cached), for
 * grouping a history/activity list by streaming platform. */
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
