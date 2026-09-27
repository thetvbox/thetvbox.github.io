import { deindexAllShows, indexShows } from '../../modules/spotlight-index'

export interface SpotlightShowSummary {
  showId: number
  showName: string
  subtitle: string
}

const SPOTLIGHT_MAX_ITEMS = 40

/** Replaces the app's whole iOS Spotlight index with the given shows; silently a no-op off iOS or if indexing fails. */
export async function syncSpotlightIndex(shows: SpotlightShowSummary[]): Promise<void> {
  try {
    await deindexAllShows()
    if (shows.length === 0) return
    await indexShows(
      shows.slice(0, SPOTLIGHT_MAX_ITEMS).map((s) => ({
        id: String(s.showId),
        title: s.showName,
        subtitle: s.subtitle,
      })),
    )
  } catch {}
}
