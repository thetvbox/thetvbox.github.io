import { useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import ShowDetailHero from '../components/showDetail/ShowDetailHero'
import ShowDetailQuickActions from '../components/showDetail/ShowDetailQuickActions'
import ShowDetailProgress from '../components/showDetail/ShowDetailProgress'
import ShowDetailStreaming from '../components/showDetail/ShowDetailStreaming'
import ShowDetailSeasons from '../components/showDetail/ShowDetailSeasons'
import { backdropUrl } from '../lib/tmdb'
import { useAuth } from '../contexts/AuthContext'
import { useShowDetail } from '../hooks/useShowDetail'

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>()
  const showId = Number(id)
  const { user } = useAuth()
  const d = useShowDetail(showId, user)

  if (Number.isNaN(showId)) {
    return <p className="p-8 text-center text-sm text-danger">Invalid show.</p>
  }

  if (d.error && !d.show) {
    return <p className="p-8 text-center text-sm text-danger">{d.error}</p>
  }

  return (
    <div className="pb-24 md:pb-10">
      <div className="relative h-56 w-full overflow-hidden sm:h-auto sm:aspect-[3/1] sm:max-h-[520px]">
        {d.show?.backdrop_path ? (
          <img
            src={backdropUrl(d.show.backdrop_path) ?? undefined}
            alt=""
            fetchPriority="high"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-base-850" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/70 to-base-950/20" />
      </div>

      {/* relative: the hero above is a positioned element, so without this,
          this static sibling would paint behind it wherever the negative
          margin makes them overlap, clipping the top of the poster. */}
      <div className="relative mx-auto -mt-24 max-w-5xl px-4 sm:-mt-28 sm:px-6 lg:-mt-32">
        <ShowDetailHero
          show={d.show}
          loadingShow={d.loadingShow}
          showRatings={d.showRatings}
          myRating={d.myShowRating?.rating ?? 0}
          savingRating={d.savingRating}
          currentUserId={user?.id}
          onRateShow={d.handleRateShow}
        />

        {d.show && !d.loadingShow && (
          <ShowDetailQuickActions
            show={d.show}
            user={user}
            canTrackNowWatching={d.canTrackNowWatching}
            inNowWatching={d.inNowWatching}
            dismissedItem={d.dismissedItem}
            savingNowWatching={d.savingNowWatching}
            onToggleNowWatching={d.handleToggleNowWatching}
            watchlistItem={d.watchlistItem}
            savingWatchlist={d.savingWatchlist}
            onToggleWatchlist={d.handleToggleWatchlist}
            listMembership={d.listMembership}
            onListMembershipChange={d.setListMembership}
            listPickerOpen={d.listPickerOpen}
            onToggleListPicker={() => d.setListPickerOpen((v) => !v)}
            onCloseListPicker={() => d.setListPickerOpen(false)}
          />
        )}

        {d.show && d.totalEpisodes !== null && d.totalEpisodes > 0 && (
          <ShowDetailProgress
            watchedCount={d.watchedCount}
            totalEpisodes={d.totalEpisodes}
            onMarkAllWatched={d.handleMarkAllWatched}
            rewatches={d.rewatches}
            onLogRewatch={d.handleLogRewatch}
            onDeleteRewatch={d.handleDeleteRewatch}
          />
        )}

        {d.show?.overview && <p className="mt-5 max-w-3xl text-sm leading-relaxed text-base-300">{d.show.overview}</p>}

        {d.show?.genres && d.show.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {d.show.genres.map((g) => (
              <span key={g.id} className="rounded-full border border-hairline-strong px-2.5 py-0.5 text-[11px] text-base-400">
                {g.name}
              </span>
            ))}
          </div>
        )}

        <ShowDetailStreaming
          effectiveProvider={d.effectiveProvider}
          override={d.override}
          regionProviders={d.regionProviders}
          region={d.region}
          pickerOpen={d.pickerOpen}
          onTogglePicker={() => d.setPickerOpen((v) => !v)}
          onClosePicker={() => d.setPickerOpen(false)}
          onPickProvider={d.handlePickProvider}
          onClearOverride={d.handleClearOverride}
        />

        {d.show && d.show.seasons.length > 0 && d.activeSeason !== null && (
          <ShowDetailSeasons
            show={d.show}
            activeSeason={d.activeSeason}
            onSelectSeason={d.setActiveSeason}
            season={d.season}
            loadingSeason={d.loadingSeason}
            seasonWatchedCount={d.seasonWatchedCount}
            onMarkSeasonWatched={d.handleMarkSeasonWatched}
            seasonRatings={d.seasonRatingsForActive}
            myRating={d.mySeasonRating?.rating ?? 0}
            savingSeasonRating={d.savingSeasonRating}
            currentUserId={user?.id}
            onRateSeason={d.handleRateSeason}
            nextUpcomingEpisode={d.nextUpcomingEpisode}
            watched={d.watched}
            effectiveAirDate={d.effectiveAirDate}
            onToggleWatched={d.handleToggleWatched}
            onMarkWatchedWithDate={d.handleMarkWatchedWithDate}
          />
        )}
      </div>

      {d.toast && <Toast message={d.toast.message} tone={d.toast.tone} action={d.toast.action} onDismiss={d.dismissToast} />}
    </div>
  )
}
