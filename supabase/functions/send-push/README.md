# send-push

Sends a push notification to every device registered for a
`notifications` row's recipient, over two independent channels: Web
Push (`npm:web-push` and the `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`
secrets) for browsers, and Expo's push API for the native iOS/Android
app -- no APNs/FCM keys of our own needed, Expo relays to Apple/Google.
A missing VAPID config only disables the web channel; the two never
block each other.

## How it's triggered

This isn't called by the client. The `add_push_subscriptions_and_trigger`
migration adds `send_push_on_notification()`, a Postgres trigger function
that fires `AFTER INSERT ON public.notifications` (the same table the
existing `notify_on_follow` / `notify_on_show_rating` /
`notify_on_show_finished` triggers already populate) and calls this
function via `pg_net.http_post`, passing the new row as the JSON body.
So a push follows the exact same events the in-app notification bell
already shows -- a new follower, a followed person rating a show, or a
followed person finishing one -- with no separate logic to keep in sync.

`verify_jwt` is off, matching the app's other custom-auth functions:
`pg_net` calls this with the anon key as a bearer token (this app has no
real user sessions to verify), and the function's own job -- send to
devices on file for the row's own `user_id` -- doesn't need a JWT to be
meaningful.

## Subscriptions and cleanup

Web devices register themselves in `public.push_subscriptions` via
`src/lib/pushNotifications.ts` (open "Anyone can ..." RLS, like most of
this app's tables -- the actual send-capable secret is the VAPID private
key, which only lives here). When a send comes back 404 or 410 (the
push service says the subscription is gone -- usually because
notification permission was revoked or the browser data was cleared),
this function deletes that subscription row so it stops being retried.

## Native mobile devices

The mobile app registers its `expo-notifications` push token into
`public.expo_push_tokens` via `mobile/src/lib/pushNotifications.ts`,
same open RLS convention. Sending is a single unauthenticated POST to
`https://exp.host/--/api/v2/push/send` with an array of `{ to, title,
body, data }` messages -- no push-service credentials to hold here at
all. When Expo's response reports a ticket's `details.error` as
`DeviceNotRegistered`, that token row is deleted.

## Not end-to-end tested here

This was deployed and its request-validation paths (missing body,
missing fields, an unconfigured VAPID key) were checked from a real
browser, but actually receiving a push on a device -- web or native --
needs a real subscribed browser or a real signed-in phone, neither of
which is available in the environment this was built in. Worth a manual
check after deploy: enable push notifications on a real device (browser
Profile -> More -> Push Notifications, or just granting the permission
prompt in the iOS app), then follow someone or have them rate a show,
and confirm a notification arrives on that device.

## Redeploying

```sh
supabase functions deploy send-push --no-verify-jwt
```
