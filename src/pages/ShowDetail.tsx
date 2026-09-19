import { useLocation, useParams } from 'react-router-dom'
import Toast from '../components/Toast'
import { useGoBack } from '../hooks/useGoBack'
import { ROUTES } from '../lib/routes'
import ShowDetailHero from '../components/showDetail/ShowDetailHero'
import ShowDetailQuickActions from '../components/showDetail/ShowDetailQuickActions'
import ShowDetailProgress from '../components/showDetail/ShowDetailProgress'
import ShowDetailStreaming from '../components/showDetail/ShowDetailStreaming'
import ShowDetailSeasons from '../components/showDetail/ShowDetailSeasons'
import { backdropUrl } from '../lib/tmdb'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useShowDetail } from '../hooks/useShowDetail'
import ErrorText from '../components/ErrorText'

function BackGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}

export default function ShowDetail() {
  const { id } = useParams<{ id: string }>()
  const showId = Number(id)
  const { user } = useAuth()
  const d = useShowDetail(showId, user)
  useDocumentTitle(d.show?.name ?? null)
  const location = useLocation()
  const jumpToProgress = Boolean((location.state as { jumpToProgress?: boolean } | null)?.jumpToProgress)
  const goBack = useGoBack(ROUTES.home)

  if (Number.isNaN(showId)) {
    return <ErrorText className="p-8 text-center text-sm">Invalid show.</ErrorText>
  }

  if (d.error && !d.show) {
    return <ErrorText className="p-8 text-center text-sm">{d.error}</ErrorText>
  }

  return (
    <div className="pb-24 md:pb-10">
      <div className="relative h-56 w-full overflow-hidden sm:h-auto sm:aspect-[3/1] sm:max-h-[520px]">
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          title="Back"
          className="glass-surface absolute left-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full text-base-100 transition-colors duration-200 hover:bg-hover-strong"
        >
          <BackGlyph />
        </button>
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

      <div className="relative mx-auto -mt-24 max-w-5xl px-4 sm:-mt-28 sm:px-6 lg:-mt-32">
        <ShowDetailHero
          show={d.show}
          loadingShow={d.loadingShow}
          showRatings={d.showRatings}
          myRating={d.myShowRating?.rating ?? 0}
          estimatedShowRating={d.estimatedShowRating}
          externalRatings={d.externalRatings}
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
            canDropShow={d.canDropShow}
            droppedItem={d.droppedItem}
            savingDropped={d.savingDropped}
            onToggleDropped={d.handleToggleDropped}
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
          loading={d.loadingProviders}
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
            jumpToProgress={jumpToProgress}
          />
        )}
      </div>

      <Toast toast={d.toast} onDismiss={d.dismissToast} />
    </div>
  )
}
