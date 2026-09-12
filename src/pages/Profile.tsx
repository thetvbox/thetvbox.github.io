import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { useCloseOnNavigate } from '../hooks/useCloseOnNavigate'
import ProfileActivity from '../components/ProfileActivity'
import ProfileFollowSection from '../components/ProfileFollowSection'
import ChangelogPanel from '../components/ChangelogPanel'
import DropdownPanel from '../components/DropdownPanel'
import PanelHeader from '../components/PanelHeader'
import Avatar from '../components/Avatar'
import { appVersion } from '../lib/changelog'
import { profileRoute } from '../lib/routes'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [changelogOpen, setChangelogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  useCloseOnNavigate(() => setMenuOpen(false))

  // The menu floats over the page with no backdrop of its own (see ProfileMenuPanel below),
  // so a click anywhere outside the trigger+menu needs to close it -- same technique as
  // Navbar's notifications dropdown and Activity's Person filter.
  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(e: PointerEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [menuOpen])

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar username={user?.username ?? ''} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-wide text-base-500">Signed in as</p>
            <h1 className="font-display text-lg font-semibold text-base-100 sm:text-xl">
              @{user?.username}
            </h1>
            <p className="text-xs text-base-500">{user?.email}</p>
            {user && <ProfileFollowSection profileId={user.id} username={user.username} isMe />}
          </div>
        </div>

        {/* Year in review / Public view / Sign out used to sit here as three peer-weight
            buttons -- they're all secondary/occasional actions next to the content below,
            so they're tucked behind one trigger instead of competing for attention. This is
            a short action menu, not a content-filter form, so it floats over the page as a
            dropdown (like NotificationsBell) instead of pushing content down. */}
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
              />
            )}
          </AnimatePresence>
        </div>
      </div>

      {user && <ProfileActivity userId={user.id} username={user.username} />}

      <div className="mt-12 border-t border-hairline pt-4">
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
    </div>
  )
}

function ProfileMenuPanel({
  username,
  onSignOut,
  onClose,
}: {
  username: string
  onSignOut: () => void
  onClose: () => void
}) {
  return (
    <DropdownPanel onClose={onClose} label="More" className="w-56 p-2">
      <PanelHeader title="More" onClose={onClose} />
      <div className="space-y-0.5">
        <Link
          to="/recap"
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
