# siri-app-intents

Local Expo module (iOS only, autolinked from `./modules` -- no npm package).
The two Siri App Intents from the Phase 4 plan, plus the tiny piece of
state they need to run in the background.

## The two intents

- **LogEpisodeWatchedIntent** -- "Log that I watched the next episode of
  [show]". Takes a spoken show name, posts it to
  `log-next-episode-watched`, which does the actual resolution (fuzzy name
  match against your watch history, work out which episode is next).
- **WhatsNextIntent** -- "What should I watch next". Posts to `whats-next`,
  which picks your most recently active in-progress show.

Both have `openAppWhenRun = false` and never touch the app's Supabase
session -- they read a stored personal access token
(`SiriTokenStoreModule`, `UserDefaults.standard`, key
`tvbox_siri_personal_access_token`) and call the Edge Functions directly
over `URLSession`. That's deliberate: this is the one piece of Phase 4
with a real architecture choice behind it -- reusing the app's live auth
session would mean Siri launching the app and hitting the Face ID lock
screen on every invocation, which defeats the point of a hands-free
Shortcut. A lightweight, revocable, single-purpose token (the same kind
the web app's old Shortcuts panel already used) avoids that entirely, at
the cost of the user having to explicitly turn this on once from Profile
-> Siri & Shortcuts (see `src/lib/personalAccessTokens.ts` and its UI).

## Not verified, and the two things most likely to need a fix in Xcode

Nothing here has been compiled -- there's no Xcode/Swift toolchain in the
environment this was built in. Everything network- and logic-related
(the `AppIntentsAPIClient` request/response handling, the JSON field
names, the Edge Functions themselves) was written carefully and matches
its backend exactly, but two things are genuinely uncertain and specific
to how App Intents get discovered:

1. **Where these files need to live.** Apple's App Intents metadata
   tooling (which is what actually registers a phrase with Siri) has
   historically been pickiest about intents defined in a separate
   framework/static library rather than the app's own main target -- and
   a local Expo module compiles into exactly that: its own CocoaPods
   library, linked into the app, not the main target itself. It's
   entirely possible `AppShortcut` phrases from `TVBoxShortcuts.swift`
   just don't show up in Shortcuts/Siri from here. If so, the fix isn't
   more automation -- it's manually dragging the five files in `ios/`
   into the main app target in Xcode (Copy items if needed off, since
   they'd move rather than duplicate) after a prebuild. This is a
   one-time, low-risk manual step, which is why it wasn't attempted here
   automatically by rewriting the generated Xcode project instead
   (`.pbxproj` surgery has a much worse failure mode -- a build that
   doesn't open at all -- for an outcome this only *might* fix).
2. **`AppShortcut`'s phrase syntax** (`\(\.$showName)`, `\(.applicationName)`)
   matches Apple's documented pattern, but was never run through the
   compiler here.

## Setup this needs before it can work at all

- `TMDB_API_KEY` set as a function secret, and both Edge Functions
  actually deployed -- see their READMEs (blocked here by the
  environment's "Production Deploy" restriction).
- The user generating a personal access token from Profile -> Siri &
  Shortcuts in the app at least once.
