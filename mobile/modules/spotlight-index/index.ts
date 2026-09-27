import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

export interface SpotlightIndexItem {
  id: string
  title: string
  subtitle?: string
}

interface SpotlightIndexNativeModule {
  indexShows(items: SpotlightIndexItem[]): Promise<void>
  deindexShows(ids: string[]): Promise<void>
  deindexAllShows(): Promise<void>
}

function nativeModule(): SpotlightIndexNativeModule {
  return requireNativeModule<SpotlightIndexNativeModule>('SpotlightIndex')
}

/** Indexes the given shows into iOS Spotlight; a no-op off iOS. */
export async function indexShows(items: SpotlightIndexItem[]): Promise<void> {
  if (Platform.OS !== 'ios') return
  await nativeModule().indexShows(items)
}

/** Removes the given show ids from the Spotlight index; a no-op off iOS. */
export async function deindexShows(ids: string[]): Promise<void> {
  if (Platform.OS !== 'ios') return
  await nativeModule().deindexShows(ids)
}

/** Clears every show this app has indexed into Spotlight; a no-op off iOS. */
export async function deindexAllShows(): Promise<void> {
  if (Platform.OS !== 'ios') return
  await nativeModule().deindexAllShows()
}
