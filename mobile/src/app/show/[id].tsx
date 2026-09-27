import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ErrorText } from '@/components/error-text';
import { ShowDetailHero } from '@/components/showDetail/show-detail-hero';
import { ShowDetailProgress } from '@/components/showDetail/show-detail-progress';
import { ShowDetailQuickActions } from '@/components/showDetail/show-detail-quick-actions';
import { ShowDetailSeasons } from '@/components/showDetail/show-detail-seasons';
import { ShowDetailStreaming } from '@/components/showDetail/show-detail-streaming';
import { Toast } from '@/components/toast';
import { useAuth } from '@/contexts/AuthContext';
import { useShowDetail } from '@/hooks/useShowDetail';
import { backdropUrl } from '@/lib/tmdb';

const BACKDROP_HEIGHT = 220;
const HERO_OVERLAP = 72;

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const showId = Number(id);
  const { user } = useAuth();
  const d = useShowDetail(showId, user);
  const insets = useSafeAreaInsets();

  if (Number.isNaN(showId)) {
    return <ErrorText className="p-8 text-center text-sm">Invalid show.</ErrorText>;
  }
  if (d.error && !d.show) {
    return <ErrorText className="p-8 text-center text-sm">{d.error}</ErrorText>;
  }

  return (
    <View className="flex-1 bg-base-950">
      <Stack.Screen options={{ headerTransparent: true, headerTitle: d.show?.name ?? '', headerTintColor: '#fff', headerBackTitle: 'Back' }} />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={{ height: BACKDROP_HEIGHT }} className="w-full overflow-hidden bg-base-850">
          {d.show?.backdrop_path && (
            <Image source={{ uri: backdropUrl(d.show.backdrop_path) ?? undefined }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
          )}
          <LinearGradient colors={['transparent', 'rgba(8,8,12,0.7)', '#08080c']} style={{ position: 'absolute', inset: 0 }} />
        </View>

        <View className="px-4" style={{ marginTop: -HERO_OVERLAP }}>
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

          {d.show?.overview && <Text className="mt-5 text-sm leading-relaxed text-base-300">{d.show.overview}</Text>}

          {d.show?.genres && d.show.genres.length > 0 && (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {d.show.genres.map((g) => (
                <View key={g.id} className="rounded-full border border-hairline-strong px-2.5 py-0.5">
                  <Text className="text-[11px] text-base-400">{g.name}</Text>
                </View>
              ))}
            </View>
          )}

          <ShowDetailStreaming
            effectiveProvider={d.effectiveProvider}
            loading={d.loadingProviders}
            override={d.override}
            regionProviders={d.regionProviders}
            region={d.region}
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
        </View>
      </ScrollView>

      <Toast toast={d.toast} onDismiss={d.dismissToast} />
    </View>
  );
}
