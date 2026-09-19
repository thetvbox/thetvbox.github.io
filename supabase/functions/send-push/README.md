# send-push

Sends a Web Push notification to every device subscribed for a
`notifications` row's recipient, using `npm:web-push` and the
`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` secrets.

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

Devices register themselves in `public.push_subscriptions` via
`src/lib/pushNotifications.ts` (open "Anyone can ..." RLS, like most of
this app's tables -- the actual send-capable secret is the VAPID private
key, which only lives here). When a send comes back 404 or 410 (the
push service says the subscription is gone -- usually because
notification permission was revoked or the browser data was cleared),
this function deletes that subscription row so it stops being retried.

## Not end-to-end tested here

This was deployed and its request-validation paths (missing body,
missing fields, an unconfigured VAPID key) were checked from a real
browser, but actually receiving a push on a device needs a real
subscribed browser, which isn't available in the environment this was
built in. Worth a manual check after deploy: enable push from Profile ->
More -> Push Notifications on a real device, then follow someone or have
them rate a show, and confirm a notification arrives.

## Redeploying

```sh
supabase functions deploy send-push --no-verify-jwt
```
