import { useState } from 'react'

interface FollowButtonProps {
  isFollowing: boolean
  saving?: boolean
  onFollow: () => void
  onUnfollow: () => void
  size?: 'sm' | 'md'
}

// Checked once at module load -- gates the hover-to-"Unfollow" relabel below.
// Touch browsers fire a synthetic mouseenter on tap with no matching
// mouseleave, which would otherwise leave the button stuck showing
// "Unfollow" styling after a tap (same class of bug useDesktopAutoFocus
// exists to avoid). `hover: hover` checks for real hover events specifically.
const supportsHover =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(hover: hover) and (pointer: fine)').matches
    : false

/** Follow/Unfollow toggle, controlled by the caller so list pages can share
 * one following-set instead of each row re-fetching its own status. Hovering
 * "Following" relabels it "Unfollow" on desktop only. */
export default function FollowButton({
  isFollowing,
  saving = false,
  onFollow,
  onUnfollow,
  size = 'md',
}: FollowButtonProps) {
  const [hovering, setHovering] = useState(false)
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-sm'
  const label = isFollowing ? (hovering ? 'Unfollow' : 'Following') : 'Follow'

  return (
    <button
      type="button"
      disabled={saving}
      aria-label={isFollowing ? 'Unfollow' : 'Follow'}
      aria-pressed={isFollowing}
      onClick={() => (isFollowing ? onUnfollow() : onFollow())}
      onMouseEnter={() => supportsHover && setHovering(true)}
      onMouseLeave={() => supportsHover && setHovering(false)}
      className={`shrink-0 rounded-full font-medium transition-colors duration-200 disabled:opacity-50 ${sizeClasses} ${
        isFollowing
          ? hovering
            ? 'bg-danger/10 text-danger ring-1 ring-danger/40'
            : 'bg-hover-strong text-base-300 ring-1 ring-hairline-strong'
          : 'bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/40 hover:bg-accent-500/25'
      }`}
    >
      {saving ? '…' : label}
    </button>
  )
}
