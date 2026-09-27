// Supabase Edge Function: sends a Web Push notification to every device
// subscribed for a notification row's recipient. Invoked by the
// send_push_on_notification() Postgres trigger (see the
// add_push_subscriptions_and_trigger migration) right after a row is
// inserted into public.notifications, via pg_net.http_post. See
// README.md next to this file for the full design notes.
//
// verify_jwt is off: pg_net calls this with the anon key as a bearer
// token (this app has no real user sessions to verify), and the
// function's own job is narrow enough -- send to devices already on
// file for the row's own user_id -- that no further auth check adds
// anything here.
//
// Alongside Web Push, this also delivers to native iOS/Android devices
// registered in public.expo_push_tokens (the mobile app's
// expo-notifications token), via Expo's push API -- no APNs/FCM keys of
// our own needed, Expo relays to Apple/Google. The two channels are
// independent: a missing VAPID config only disables the web channel.

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SITE_ORIGIN = 'https://thetvbox.github.io'
const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send'

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

interface NotificationRow {
  user_id: string
  actor_username: string
  type: 'follow' | 'show_rated' | 'show_finished'
  show_id: number | null
  show_name: string | null
  rating: number | null
  episode_count: number | null
}

/** Builds the notification's title, body, and click-through URL -- mirrors NotificationText/notificationHref in src/components/NotificationsBell.tsx. */
function buildPushContent(n: NotificationRow): { title: string; body: string; url: string } {
  if (n.type === 'follow') {
    return {
      title: 'New follower',
      body: `@${n.actor_username} started following you`,
      url: `${SITE_ORIGIN}/#/u/${n.actor_username}`,
    }
  }
  const url = `${SITE_ORIGIN}/#/u/${n.actor_username}/shows/${n.show_id}`
  if (n.type === 'show_rated') {
    return {
      title: `@${n.actor_username} rated a show`,
      body: n.rating != null ? `${n.show_name} · ${n.rating.toFixed(1)}★` : (n.show_name ?? ''),
      url,
    }
  }
  return {
    title: `@${n.actor_username} finished a show`,
    body: n.episode_count ? `${n.show_name} · ${n.episode_count} episodes` : (n.show_name ?? ''),
    url,
  }
}

interface ExpoPushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: { error?: string }
}

/** Sends to every Expo push token on file for the notification's user, and removes any Expo reports as no longer registered. */
async function sendExpoPush(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  content: { title: string; body: string; url: string },
): Promise<{ sent: number; removed: number }> {
  const { data: tokens, error } = await supabase.from('expo_push_tokens').select('id, token').eq('user_id', userId)
  if (error) {
    console.error('Expo push token lookup failed', error)
    return { sent: 0, removed: 0 }
  }
  if (!tokens || tokens.length === 0) return { sent: 0, removed: 0 }

  const messages = tokens.map((t) => ({
    to: t.token,
    title: content.title,
    body: content.body,
    data: { url: content.url },
  }))

  const response = await fetch(EXPO_PUSH_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  })
  if (!response.ok) {
    console.error('Expo push send failed', response.status, await response.text())
    return { sent: 0, removed: 0 }
  }

  const { data: tickets } = (await response.json()) as { data?: ExpoPushTicket[] }
  let sent = 0
  const deadIds: string[] = []
  ;(tickets ?? []).forEach((ticket, i) => {
    if (ticket.status === 'ok') {
      sent++
    } else if (ticket.details?.error === 'DeviceNotRegistered') {
      deadIds.push(tokens[i].id)
    } else {
      console.error('Expo push ticket error', tokens[i].id, ticket)
    }
  })

  if (deadIds.length > 0) {
    await supabase.from('expo_push_tokens').delete().in('id', deadIds)
  }

  return { sent, removed: deadIds.length }
}

/** Sends to every Web Push subscription on file for the notification's user, and removes any the push service reports as gone. */
async function sendWebPush(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  content: { title: string; body: string; url: string },
  vapidPublicKey: string,
  vapidPrivateKey: string,
): Promise<{ sent: number; removed: number }> {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', userId)
  if (error) {
    console.error('Subscription lookup failed', error)
    return { sent: 0, removed: 0 }
  }
  if (!subscriptions || subscriptions.length === 0) return { sent: 0, removed: 0 }

  webpush.setVapidDetails(SITE_ORIGIN, vapidPublicKey, vapidPrivateKey)
  const payloadJson = JSON.stringify(content)

  let sent = 0
  const deadIds: string[] = []
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadJson,
        )
        sent++
      } catch (err) {
        const statusCode = (err as { statusCode?: number } | undefined)?.statusCode
        if (statusCode === 404 || statusCode === 410) {
          deadIds.push(sub.id)
        } else {
          console.error('Push send failed', sub.id, err)
        }
      }
    }),
  )

  if (deadIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', deadIds)
  }

  return { sent, removed: deadIds.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }
  const n = payload as Partial<NotificationRow> | null
  if (!n?.user_id || !n.actor_username || !n.type) {
    return jsonResponse({ error: 'A notification row is required' }, 400)
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const content = buildPushContent(n as NotificationRow)

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')

  const [web, expo] = await Promise.all([
    vapidPublicKey && vapidPrivateKey
      ? sendWebPush(supabase, n.user_id, content, vapidPublicKey, vapidPrivateKey)
      : Promise.resolve({ sent: 0, removed: 0 }),
    sendExpoPush(supabase, n.user_id, content),
  ])

  return jsonResponse(
    { sent: web.sent + expo.sent, removed: web.removed + expo.removed, web, expo },
    200,
  )
})
