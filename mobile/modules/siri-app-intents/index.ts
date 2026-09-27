import { requireNativeModule } from 'expo-modules-core'
import { Platform } from 'react-native'

interface SiriTokenStoreNativeModule {
  setToken(token: string): void
  clearToken(): void
}

function nativeModule(): SiriTokenStoreNativeModule {
  return requireNativeModule<SiriTokenStoreNativeModule>('SiriTokenStore')
}

/** Stores the personal access token the Siri App Intents read from; a no-op off iOS. */
export function setSiriToken(token: string): void {
  if (Platform.OS !== 'ios') return
  nativeModule().setToken(token)
}

/** Clears whatever personal access token was stored for the Siri App Intents; a no-op off iOS. */
export function clearSiriToken(): void {
  if (Platform.OS !== 'ios') return
  nativeModule().clearToken()
}
