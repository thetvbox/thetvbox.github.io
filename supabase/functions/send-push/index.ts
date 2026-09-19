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

import webpush from 'npm:web-push@3.6.7'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SITE_ORIGIN = 'https://thetvbox.github.io'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys are not configured')
    return jsonResponse({ error: 'Push is not configured' }, 500)
  }

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

  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', n.user_id)
  if (error) {
    console.error('Subscription lookup failed', error)
    return jsonResponse({ error: 'Failed to look up subscriptions' }, 500)
  }
  if (!subscriptions || subscriptions.length === 0) {
    return jsonResponse({ sent: 0, removed: 0 }, 200)
  }

  webpush.setVapidDetails(SITE_ORIGIN, vapidPublicKey, vapidPrivateKey)

  const content = buildPushContent(n as NotificationRow)
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

  return jsonResponse({ sent, removed: deadIds.length }, 200)
})
