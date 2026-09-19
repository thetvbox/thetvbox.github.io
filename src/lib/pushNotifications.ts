import { supabase } from './supabase'
import { TABLE_PUSH_SUBSCRIPTIONS, VAPID_PUBLIC_KEY } from './constants'

/** True when this browser can register a push subscription at all. */
export function isPushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

/** Decodes a URL-safe base64 VAPID key into the raw bytes PushManager.subscribe expects. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

/** True when this device already has an active push subscription. */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  return subscription !== null
}

/** Subscribes this device to push and saves the subscription for userId. */
export async function subscribeToPush(userId: string): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported in this browser.')
  }
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    // TS's DOM lib wants an ArrayBuffer-backed BufferSource specifically;
    // Uint8Array.from(...) is typed generically over ArrayBufferLike, so
    // browsers' actual (and looser) runtime acceptance of any BufferSource
    // needs this cast.
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  })
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error('Could not read the push subscription details.')
  }
  const { error } = await supabase
    .from(TABLE_PUSH_SUBSCRIPTIONS)
    .upsert(
      { user_id: userId, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth },
      { onConflict: 'endpoint' },
    )
  if (error) throw error
}

/** Unsubscribes this device from push and removes its saved subscription, if any. */
export async function unsubscribeFromPush(): Promise<void> {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  const { error } = await supabase.from(TABLE_PUSH_SUBSCRIPTIONS).delete().eq('endpoint', endpoint)
  if (error) throw error
}
