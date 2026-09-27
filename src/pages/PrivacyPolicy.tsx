import { useDocumentTitle } from '../hooks/useDocumentTitle'

const LAST_UPDATED = 'September 27, 2026'
const CONTACT_EMAIL = 'ravipati.tarun.kumar@gmail.com'

/** Public, ungated privacy policy -- reachable without signing in or passing the site passcode, since app stores/TestFlight require a publicly-viewable URL. See App.tsx for the gate bypass. */
export default function PrivacyPolicy() {
  useDocumentTitle('Privacy Policy')

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-base-100">TV Box Privacy Policy</h1>
      <p className="mt-1 text-xs text-base-500">Last updated {LAST_UPDATED}</p>

      <div className="mt-8 space-y-8 text-sm leading-relaxed text-base-300">
        <section>
          <p>
            TV Box is a small, invite-only app a group of friends uses to track what we&apos;re watching, rate
            shows, and see each other&apos;s activity. It isn&apos;t a public product, isn&apos;t monetized, and
            doesn&apos;t run ads or trackers. This page explains what data the app collects and how it&apos;s used.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">Information we collect</h2>
          <ul className="mt-2 space-y-1.5">
            <li>
              <strong className="text-base-200">Account info:</strong> your email address, username, and display
              name, plus a sign-in identifier from Apple if you use it to sign in.
            </li>
            <li>
              <strong className="text-base-200">Activity you create:</strong> the shows/episodes you mark watched,
              your ratings, your watchlist and lists, rewatch logs, and who you follow.
            </li>
            <li>
              <strong className="text-base-200">Device info, only if you opt in:</strong> a push notification token
              (to send you an activity alert) and, if you enable Siri shortcuts, a personal access token stored on
              your device so Siri can log an episode or ask what to watch next on your behalf.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">How it&apos;s used</h2>
          <p className="mt-2">
            Solely to run the app&apos;s own features for the group: showing your activity to people you&apos;re
            connected with, sending you a notification when someone follows you or rates a show, and letting Siri
            act on your behalf if you turn that on. Nothing here is used for advertising, and nothing is sold.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">Who we share it with</h2>
          <ul className="mt-2 space-y-1.5">
            <li>
              <strong className="text-base-200">Supabase</strong> hosts the app&apos;s database, authentication, and
              backend functions -- all of the data above lives there.
            </li>
            <li>
              <strong className="text-base-200">TMDB, OMDb, and TVmaze</strong> supply show/episode metadata,
              posters, and ratings. The app sends them show search queries and IDs, not your personal account data.
            </li>
            <li>
              <strong className="text-base-200">Expo</strong> relays push notifications to your device using your
              push token; Apple is only involved if you choose to sign in with it, through Apple's
              standard sign-in flow.
            </li>
          </ul>
          <p className="mt-2">
            We don&apos;t share your data with advertisers, data brokers, or anyone outside of running the app
            itself.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">Your data</h2>
          <p className="mt-2">
            You can remove individual ratings, watch history, or list entries from within the app at any time. To
            delete your account and all associated data entirely, email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-400 hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">Children</h2>
          <p className="mt-2">
            TV Box is shared privately with a known group of adults and isn&apos;t directed at or knowingly used by
            children.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">Changes</h2>
          <p className="mt-2">
            If what&apos;s collected or how it&apos;s used changes meaningfully, this page will be updated and the
            date above will change.
          </p>
        </section>

        <section>
          <h2 className="font-display text-base font-semibold text-base-100">Contact</h2>
          <p className="mt-2">
            Questions about this policy or your data:{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-400 hover:underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
