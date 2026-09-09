import { useMemo, useState } from 'react'
import { deleteShowRating, upsertShowRating } from '../../lib/showRatings'
import { deleteSeasonRating, upsertSeasonRating } from '../../lib/seasonRatings'
import type { AppUser, SeasonRatingWithUser, ShowRatingWithUser, TmdbSeasonDetail, TmdbShowDetail } from '../../types'

/** Show-level and active-season-level rating state, each independently editable by the current user. */
export function useShowRatingsState(
  user: AppUser | null,
  show: TmdbShowDetail | null,
  activeSeason: number | null,
  season: TmdbSeasonDetail | null,
  showError: (message: string) => void,
) {
  const [showRatings, setShowRatings] = useState<ShowRatingWithUser[]>([])
  const [seasonRatings, setSeasonRatings] = useState<SeasonRatingWithUser[]>([])
  const [savingRating, setSavingRating] = useState(false)
  const [savingSeasonRating, setSavingSeasonRating] = useState(false)

  const myShowRating = useMemo(() => showRatings.find((r) => r.user_id === user?.id) ?? null, [showRatings, user])

  const mySeasonRatings = useMemo(
    () => seasonRatings.filter((r) => r.user_id === user?.id),
    [seasonRatings, user],
  )

  /** Average of the seasons the user has rated so far, shown only until they rate the whole show themselves. */
  const estimatedShowRating = useMemo(() => {
    if (myShowRating || mySeasonRatings.length === 0) return null
    const average = mySeasonRatings.reduce((sum, r) => sum + r.rating, 0) / mySeasonRatings.length
    return { average, seasons: mySeasonRatings }
  }, [myShowRating, mySeasonRatings])

  const seasonRatingsForActive = useMemo(
    () => (activeSeason === null ? [] : seasonRatings.filter((r) => r.season_number === activeSeason)),
    [seasonRatings, activeSeason],
  )
  const mySeasonRating = useMemo(
    () => seasonRatingsForActive.find((r) => r.user_id === user?.id) ?? null,
    [seasonRatingsForActive, user],
  )

  async function handleRateShow(value: number) {
    if (!user || !show) return
    setSavingRating(true)
    try {
      if (value === 0) {
        const previous = showRatings
        setShowRatings((prev) => prev.filter((r) => r.user_id !== user.id))
        try {
          await deleteShowRating(user.id, show.id)
        } catch {
          setShowRatings(previous)
          showError('Failed to clear your rating. Try again.')
        }
        return
      }
      const saved = await upsertShowRating({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        rating: value,
      })
      setShowRatings((prev) => [
        ...prev.filter((r) => r.user_id !== user.id),
        { ...saved, users: { username: user.username } },
      ])
    } catch {
      showError('Failed to save your rating. Try again.')
    } finally {
      setSavingRating(false)
    }
  }

  /** Same shape as handleRateShow, but scoped to whichever season tab is active. */
  async function handleRateSeason(value: number) {
    if (!user || !show || activeSeason === null) return
    setSavingSeasonRating(true)
    try {
      if (value === 0) {
        const previous = seasonRatings
        setSeasonRatings((prev) => prev.filter((r) => !(r.user_id === user.id && r.season_number === activeSeason)))
        try {
          await deleteSeasonRating(user.id, show.id, activeSeason)
        } catch {
          setSeasonRatings(previous)
          showError('Failed to clear your season rating. Try again.')
        }
        return
      }
      const saved = await upsertSeasonRating({
        userId: user.id,
        showId: show.id,
        showName: show.name,
        showPosterPath: show.poster_path,
        seasonNumber: activeSeason,
        seasonName: season?.season_number === activeSeason ? season.name : null,
        rating: value,
      })
      setSeasonRatings((prev) => [
        ...prev.filter((r) => !(r.user_id === user.id && r.season_number === activeSeason)),
        { ...saved, users: { username: user.username } },
      ])
    } catch {
      showError('Failed to save your season rating. Try again.')
    } finally {
      setSavingSeasonRating(false)
    }
  }

  return {
    showRatings,
    setShowRatings,
    myShowRating,
    estimatedShowRating,
    savingRating,
    handleRateShow,
    seasonRatings,
    setSeasonRatings,
    seasonRatingsForActive,
    mySeasonRating,
    savingSeasonRating,
    handleRateSeason,
  }
}
