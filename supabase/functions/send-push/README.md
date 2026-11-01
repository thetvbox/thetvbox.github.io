# send-push

Sends a Web Push notification (`npm:web-push` with the
`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` secrets) to every browser
registered for a `notifications` row's recipient. Without the VAPID
secrets it sends nothing.

## How it's triggered

This isn't called by the client. The `add_push_subscriptions_and_trigger`
migration adds `send_push_on_notification()`, a Postgres trigger function
that fires `AFTER INSERT ON public.notifications` (the same table the
existing `notify_on_follow` / `notify_on_show_rating` /
`notify_on_show_finished` triggers already populate) and calls this
function via `pg_net.http_post`, passing only the new row's `id`.
So a push follows the exact same events the in-app notification bell
already shows -- a new follower, a followed person rating a show, or a
followed person finishing one -- with no separate logic to keep in sync.

`verify_jwt` is off, since the caller is the database, not a signed-in
person. To keep that safe, the function trusts nothing in the request
except the `id`. With the service role it marks the row as pushed
(`pushed_at`) and reads it back in one statement. It only does that for a
row created in the last five minutes that hasn't been pushed yet. So a
forged call can't invent text or pick a recipient, and each notification
is pushed at most once. A notification restored by "undo" keeps its
`pushed_at`, so it isn't pushed again. The trigger reads this function's URL from the Vault secret
`send_push_url`. Without that secret (on a local stack, for example), no
push is attempted.

## Subscriptions and cleanup

Browsers register themselves in `public.push_subscriptions` through the
`register_push_subscription` RPC, called by `src/lib/pushNotifications.ts`.
Members can only see their own subscriptions; the VAPID private key that
can actually send lives only here. When a send comes back 404 or 410 (the
push service says the subscription is gone -- usually because
notification permission was revoked or the browser data was cleared),
this function deletes that subscription row so it stops being retried.

## Not end-to-end tested here

This was deployed and its request-validation paths (missing body,
missing fields, an unconfigured VAPID key) were checked from a real
browser, but actually receiving a push needs a real subscribed browser,
which isn't available in the environment this was built in. Worth a
manual check after deploy: turn on push notifications (Profile -> More ->
Push Notifications), then follow someone or have them rate a show, and
confirm a notification arrives.

## Redeploying

```sh
supabase functions deploy send-push --no-verify-jwt
```
