import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { fetchUserByUsername } from '../lib/users'
import ProfileActivity from '../components/ProfileActivity'
import ProfileFollowSection from '../components/ProfileFollowSection'
import CenteredMessage from '../components/CenteredMessage'
import Avatar from '../components/Avatar'
import ShareButton from '../components/ShareButton'
import Toast from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { ROUTES, compareRoute } from '../lib/routes'
import { useGoBack } from '../hooks/useGoBack'
import { errorMessage } from '../lib/format'
import type { AppUser } from '../types'

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>()
  const { user: me } = useAuth()
  useDocumentTitle(username ? `@${username}` : 'Profile')
  const [profile, setProfile] = useState<AppUser | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const { toast, showInfo, showError: showToastError, dismiss } = useToast()
  const goBack = useGoBack(ROUTES.members)

  useEffect(() => {
    if (!username) return
    let cancelled = false
    // oxlint-disable-next-line react/set-state-in-effect
    setProfile(undefined)
    setError(null)

    fetchUserByUsername(username)
      .then((found) => {
        if (!cancelled) setProfile(found)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err, 'Failed to load this profile.'))
      })

    return () => {
      cancelled = true
    }
  }, [username])

  if (error || profile === null) {
    return <CenteredMessage message={error ?? `No one found with username “${username}”.`} />
  }

  const isMe = me?.username === username

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6 md:pb-10">
      <button
        type="button"
        onClick={goBack}
        className="mb-4 inline-block text-xs text-base-500 hover:text-base-300"
      >
        &larr; Back
      </button>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar username={profile === undefined ? '' : profile.username} size="lg" />
          <div>
            <p className="text-xs uppercase tracking-wide text-base-500">
              {isMe ? 'This is you' : 'Member'}
            </p>
            {profile === undefined ? (
              <div className="mt-1 h-6 w-32 animate-pulse rounded bg-base-800" />
            ) : (
              <h1 className="large-title font-display text-lg font-semibold text-base-100 sm:text-xl">
                @{profile.username}
              </h1>
            )}
            {profile && <ProfileFollowSection profileId={profile.id} username={profile.username} isMe={isMe} />}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {profile && (
            <ShareButton
              title={`@${profile.username} on TV Box`}
              onResult={(result) => {
                if (result === 'copied') showInfo('Link copied to clipboard')
                if (result === 'failed') showToastError('Failed to share this profile.')
              }}
            />
          )}
          {isMe ? (
            <Link
              to={ROUTES.profile}
              className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm text-base-300 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
            >
              Edit / sign out
            </Link>
          ) : (
            <Link
              to={compareRoute(username ?? '')}
              className="rounded-lg border border-hairline-strong px-3.5 py-2 text-sm text-base-300 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400"
            >
              Compare ratings
            </Link>
          )}
        </div>
      </div>

      {profile && <ProfileActivity userId={profile.id} username={profile.username} />}
      <Toast toast={toast} onDismiss={dismiss} />
    </div>
  )
}
