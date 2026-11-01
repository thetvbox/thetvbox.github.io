// Supabase Edge Function: sends a Web Push notification for a new notifications row to its recipient's browsers. See README.md next to this file for the full design notes.

import webpush from 'npm:web-push@3.6.7'
import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2'

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

/** How long after a notification is created it can still be pushed. */
const PUSH_WINDOW_MS = 5 * 60 * 1000

/** Marks a recent, not-yet-pushed notification as pushed and returns it, in one statement so each one is sent at most once. */
async function claimNotification(supabase: SupabaseClient, id: string): Promise<NotificationRow | null> {
  const { data, error } = await supabase
    .from('notifications')
    .update({ pushed_at: new Date().toISOString() })
    .eq('id', id)
    .is('pushed_at', null)
    .gte('created_at', new Date(Date.now() - PUSH_WINDOW_MS).toISOString())
    .select('user_id, actor_username, type, show_id, show_name, rating, episode_count')
    .maybeSingle()
  if (error) console.error('Notification claim failed', error)
  return (data as NotificationRow | null) ?? null
}

/** Sends to every Web Push subscription on file for the notification's user, and removes any the push service reports as gone. */
async function sendWebPush(
  supabase: SupabaseClient,
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
  const id = (payload as { id?: unknown } | null)?.id
  if (typeof id !== 'string' || !id) return jsonResponse({ error: 'A notification id is required' }, 400)

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const n = await claimNotification(supabase, id)
  if (!n) return jsonResponse({ error: 'No recent, unsent notification with that id' }, 404)
  const content = buildPushContent(n)

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('VAPID keys are not set; no push sent')
    return jsonResponse({ sent: 0, removed: 0 }, 200)
  }

  const result = await sendWebPush(supabase, n.user_id, content, vapidPublicKey, vapidPrivateKey)
  return jsonResponse(result, 200)
})
