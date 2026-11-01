import { useState } from 'react'
import { useFollowActions } from './useFollowActions'

/** Follow/unfollow buttons for a list of people: who I follow, which rows are saving, and handlers that update both. */
export function useFollowToggles(usernameOf: (id: string) => string | undefined, onFollowingChange?: (delta: number) => void) {
  const { follow, unfollow, toast, dismiss } = useFollowActions()
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())

  function applyFollowing(targetId: string, following: boolean) {
    setFollowingIds((prev) => {
      const next = new Set(prev)
      if (following) next.add(targetId)
      else next.delete(targetId)
      return next
    })
    onFollowingChange?.(following ? 1 : -1)
  }

  async function whileSaving(targetId: string, run: () => Promise<void>) {
    setSavingIds((prev) => new Set(prev).add(targetId))
    await run()
    setSavingIds((prev) => {
      const next = new Set(prev)
      next.delete(targetId)
      return next
    })
  }

  const handleFollow = (targetId: string) =>
    whileSaving(targetId, () => follow(targetId, (following) => applyFollowing(targetId, following)))
  const handleUnfollow = (targetId: string) =>
    whileSaving(targetId, () =>
      unfollow(targetId, usernameOf(targetId), (following) => applyFollowing(targetId, following)),
    )

  return { followingIds, setFollowingIds, savingIds, handleFollow, handleUnfollow, toast, dismiss }
}
