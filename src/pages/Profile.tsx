import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import type { Transparency } from '../contexts/ThemeContext'
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useOutsideClick } from '../hooks/useOutsideClick'
import ProfileActivity from '../components/ProfileActivity'
import ProfileFollowSection from '../components/ProfileFollowSection'
import ChangelogPanel from '../components/ChangelogPanel'
import ShortcutsPanel from '../components/ShortcutsPanel'
import PushNotificationsPanel from '../components/PushNotificationsPanel'
import ReportBugPanel from '../components/ReportBugPanel'
import DropdownPanel from '../components/DropdownPanel'
import SegmentedControl from '../components/SegmentedControl'
import Avatar from '../components/Avatar'
import { appVersion } from '../lib/changelog'
import { ROUTES, profileRoute } from '../lib/routes'

const THEME_OPTIONS = [
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
] as const

const TRANSPARENCY_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'reduced', label: 'Reduced' },
  { value: 'full', label: 'Full' },
] as const

const TRANSPARENCY_HINT: Record<Transparency, string> = {
  system: "Follows your device's Reduce Transparency setting.",
  reduced: 'Chrome always shows as a solid surface.',
  full: 'Chrome always shows as blurred glass, even if your device prefers reduced transparency.',
}

export default function Profile() {
  const { user, signOut } = useAuth()
  const { theme, setTheme, transparency, setTransparency } = useTheme()
  useDocumentTitle(user ? `@${user.username}` : 'Profile')
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)
  const [bugReportOpen, setBugReportOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useCloseOnNavigate(() => setMenuOpen(false))

  /** Opens a menu-triggered sheet on its own tick, after the menu's own close has committed. */
  function openAfterMenuCloses(setOpen: (value: boolean) => void) {
    setTimeout(() => setOpen(true), 0)
  }

  const menuRef = useOutsideClick<HTMLDivElement>(menuOpen, () => setMenuOpen(false))

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar username={user?.username ?? ''} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-wide text-base-500">Signed in as</p>
            <h1 className="large-title font-display text-lg font-semibold text-base-100 sm:text-xl">
              @{user?.username}
            </h1>
            <p className="text-xs text-base-500">{user?.email}</p>
            {user && <ProfileFollowSection profileId={user.id} username={user.username} isMe />}
          </div>
        </div>

        <div ref={menuRef} className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="true"
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
              menuOpen
                ? 'border-accent-500/40 bg-accent-500/15 text-accent-300'
                : 'border-hairline-strong text-base-300 hover:border-accent-500/40 hover:text-accent-400'
            }`}
          >
            More
          </button>

          <AnimatePresence>
            {menuOpen && (
              <ProfileMenuPanel
                username={user?.username ?? ''}
                onSignOut={signOut}
                onClose={() => setMenuOpen(false)}
                onOpenShortcuts={() => openAfterMenuCloses(setShortcutsOpen)}
                onOpenPush={() => openAfterMenuCloses(setPushOpen)}
                onOpenBugReport={() => openAfterMenuCloses(setBugReportOpen)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {user && <ProfileActivity userId={user.id} username={user.username} />}

      <div className="mt-12 border-t border-hairline pt-4">
        <h2 className="mb-3 font-display text-lg font-semibold text-base-100">Appearance</h2>
        <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-600">Theme</p>
            <SegmentedControl options={THEME_OPTIONS} value={theme} onChange={setTheme} label="Theme" />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-600">
              Glass transparency
            </p>
            <SegmentedControl
              options={TRANSPARENCY_OPTIONS}
              value={transparency}
              onChange={setTransparency}
              label="Glass transparency"
            />
            <p className="mt-1.5 max-w-[16rem] text-xs text-base-500">{TRANSPARENCY_HINT[transparency]}</p>
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-hairline pt-4">
        <button
          type="button"
          onClick={() => setChangelogOpen((v) => !v)}
          className="text-xs text-base-500 hover:text-base-300"
        >
          TV Box v{appVersion} · What&apos;s new
        </button>
        <AnimatePresence>
          {changelogOpen && <ChangelogPanel key="changelog" onClose={() => setChangelogOpen(false)} />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {shortcutsOpen && user && (
          <ShortcutsPanel key="shortcuts" userId={user.id} onClose={() => setShortcutsOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pushOpen && user && (
          <PushNotificationsPanel key="push" userId={user.id} onClose={() => setPushOpen(false)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bugReportOpen && user && <ReportBugPanel key="bug-report" onClose={() => setBugReportOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}

function ProfileMenuPanel({
  username,
  onSignOut,
  onClose,
  onOpenShortcuts,
  onOpenPush,
  onOpenBugReport,
}: {
  username: string
  onSignOut: () => void
  onClose: () => void
  onOpenShortcuts: () => void
  onOpenPush: () => void
  onOpenBugReport: () => void
}) {
  return (
    <DropdownPanel onClose={onClose} label="More" className="w-56 p-2">
      <div className="space-y-0.5">
        <Link
          to={ROUTES.recap}
          onClick={onClose}
          className="block rounded-lg px-2.5 py-2 text-sm text-base-200 transition-colors duration-200 hover:bg-hover"
        >
          Year in review
        </Link>
        <Link
          to={profileRoute(username)}
          onClick={onClose}
          className="block rounded-lg px-2.5 py-2 text-sm text-base-200 transition-colors duration-200 hover:bg-hover"
        >
          Public view
        </Link>
        <button
          type="button"
          onClick={() => {
            onClose()
            onOpenShortcuts()
          }}
          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-base-200 transition-colors duration-200 hover:bg-hover"
        >
          Shortcuts &amp; Siri
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            onOpenPush()
          }}
          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-base-200 transition-colors duration-200 hover:bg-hover"
        >
          Push Notifications
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            onOpenBugReport()
          }}
          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-base-200 transition-colors duration-200 hover:bg-hover"
        >
          Report a bug
        </button>
        <button
          type="button"
          onClick={() => {
            onClose()
            onSignOut()
          }}
          className="block w-full rounded-lg px-2.5 py-2 text-left text-sm text-base-200 transition-colors duration-200 hover:bg-hover hover:text-danger"
        >
          Sign out
        </button>
      </div>
    </DropdownPanel>
  )
}
