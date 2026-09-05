import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import ProfileActivity from '../components/ProfileActivity'
import ProfileFollowSection from '../components/ProfileFollowSection'
import ChangelogPanel from '../components/ChangelogPanel'
import Avatar from '../components/Avatar'
import { appVersion } from '../lib/changelog'

export default function Profile() {
  const { user, signOut } = useAuth()
  const [changelogOpen, setChangelogOpen] = useState(false)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
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
        <div className="flex items-center gap-2">
          <Link
            to="/recap"
            className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm text-base-300 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
          >
            Year in review
          </Link>
          <Link
            to={`/u/${user?.username}`}
            className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm text-base-300 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
          >
            Public view
          </Link>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm text-base-300 transition-colors duration-200 hover:border-danger/40 hover:text-danger"
          >
            Sign out
          </button>
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
