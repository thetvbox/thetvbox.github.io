import { useAuth } from '../contexts/AuthContext'
import { followUser, unfollowUser } from '../lib/follows'
import { useToast } from './useToast'

/** Shared follow/unfollow mutation logic -- optimistic update, error rollback,
 * and an undo toast on unfollow -- used by every follow surface (Members,
 * FollowListPanel, ProfileFollowSection). Callers own their own state shape
 * (a `Set` of ids for a list, a single boolean for one profile); `onChange`
 * is how each applies the optimistic flip. */
export function useFollowActions() {
  const { user: me } = useAuth()
  const { toast, showUndo, showError, dismiss } = useToast()

  async function follow(targetId: string, onChange: (following: boolean) => void) {
    if (!me) return
    onChange(true)
    try {
      await followUser(me.id, targetId)
    } catch {
      onChange(false)
      showError('Failed to follow. Try again.')
    }
  }

  async function unfollow(targetId: string, targetUsername: string | undefined, onChange: (following: boolean) => void) {
    if (!me) return
    onChange(false)
    try {
      await unfollowUser(me.id, targetId)
    } catch {
      onChange(true)
      showError('Failed to unfollow. Try again.')
      return
    }
    showUndo(targetUsername ? `Unfollowed @${targetUsername}` : 'Unfollowed', async () => {
      onChange(true)
      try {
        await followUser(me.id, targetId)
      } catch {
        onChange(false)
        showError('Failed to undo. Try following again.')
      }
    })
  }

  return { follow, unfollow, toast, dismiss }
}
