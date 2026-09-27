# spotlight-index

Local Expo module (iOS only, autolinked from `./modules` -- no npm package).
Indexes a show into iOS Spotlight (`CSSearchableIndex`) so the system search
and Siri suggestions can surface it, and hands a tap on a result back to the
app as a `mobile://show/{id}` deep link.

## Why no thumbnail image

`CSSearchableItemAttributeSet.thumbnailURL` needs a local file URL --
Spotlight can't fetch a remote poster itself. Shipping this without images
(title + a short subtitle like "Now Watching") keeps this module free of an
image-download/cache step; add a `thumbnailURL` pointing at a locally-cached
poster file later if that's wanted.

## Not verified

Nothing here has been compiled or run -- there's no Xcode/Swift toolchain
in the environment this was built in. Two things are worth checking first
on a real device/simulator build:

- `indexShows`'s `[[String: String]]` argument bridges the way Expo Modules'
  other structured-argument APIs do; if the build fails on this function's
  signature, splitting it into parallel `string[]` arrays (ids, titles,
  subtitles) is the fallback.
- `SpotlightIndexAppDelegateSubscriber` posts the same
  `RCTOpenURLNotification` React Native's own linking manager listens for,
  to feed a Spotlight tap into expo-router the same way a custom-scheme
  open does -- see the comment in that file for the reasoning. Tap a show
  in Spotlight and confirm it opens ShowDetail before relying on this.

## Usage

See `src/lib/spotlightIndex.ts` for the app-level wrapper (`syncSpotlightIndex`)
that Home calls whenever the now-watching/watchlist lists change.
