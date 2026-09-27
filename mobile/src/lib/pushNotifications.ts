import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

import { STORAGE_KEYS, TABLE_EXPO_PUSH_TOKENS } from './constants'
import { supabase } from './supabase'

export type PushStatus = 'unsupported' | 'disabled' | 'denied' | 'enabled'

/** True when this device can register for native push at all -- simulators have no APNs token. */
export function isPushSupported(): boolean {
  return Device.isDevice
}

/** This device's current push status, derived from the system permission alone. */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return 'unsupported'
  const { status } = await Notifications.getPermissionsAsync()
  if (status === 'granted') return 'enabled'
  if (status === 'denied') return 'denied'
  return 'disabled'
}

/** Requests permission if needed, then registers this device's Expo push token for userId; throws if denied, unsupported, or the build has no EAS project configured. */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Push notifications need a physical device.')
  }
  const { status: current } = await Notifications.getPermissionsAsync()
  const status = current === 'granted' ? current : (await Notifications.requestPermissionsAsync()).status
  if (status !== 'granted') {
    throw new Error('Notification permission was not granted.')
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) {
    throw new Error('This build has no EAS project configured for push tokens yet.')
  }
  const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })

  const { error } = await supabase
    .from(TABLE_EXPO_PUSH_TOKENS)
    .upsert({ user_id: userId, token, platform: Platform.OS }, { onConflict: 'token' })
  if (error) throw error
}

/** Best-effort removal of this device's token so it stops receiving pushes; system permission itself can only be revoked from Settings. */
export async function unregisterPushToken(): Promise<void> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  if (!projectId) return
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId })
    await supabase.from(TABLE_EXPO_PUSH_TOKENS).delete().eq('token', token)
  } catch {}
}

/** True when this device has already been offered the one-time post-sign-in push prompt. */
export async function hasSeenPushOnboarding(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEYS.pushOnboardingSeen)) === '1'
  } catch {
    return true
  }
}

/** Records that this device has been offered the push prompt, so it isn't shown again. */
export async function markPushOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.pushOnboardingSeen, '1')
  } catch {}
}

/** True when push is supported, undecided, and hasn't been offered on this device before. */
export async function shouldOfferPushOnboarding(): Promise<boolean> {
  if (await hasSeenPushOnboarding()) return false
  const status = await getPushStatus()
  return status === 'disabled'
}
