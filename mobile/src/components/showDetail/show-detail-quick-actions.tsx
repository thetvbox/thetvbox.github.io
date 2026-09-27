import { View } from 'react-native';

import { ActionPill } from '@/components/action-pill';
import { AddToListSheet } from '@/components/add-to-list-sheet';
import { pluralSuffix } from '@/lib/format';
import type { AppUser, ShowDropped, ShowWatchingDismissed, TmdbShowDetail, WatchlistItem } from '@/types';

interface ShowDetailQuickActionsProps {
  show: TmdbShowDetail;
  user: AppUser | null;
  canTrackNowWatching: boolean;
  inNowWatching: boolean;
  dismissedItem: ShowWatchingDismissed | null;
  savingNowWatching: boolean;
  onToggleNowWatching: () => void;
  canDropShow: boolean;
  droppedItem: ShowDropped | null;
  savingDropped: boolean;
  onToggleDropped: () => void;
  watchlistItem: WatchlistItem | null;
  savingWatchlist: boolean;
  onToggleWatchlist: () => void;
  listMembership: Set<string>;
  onListMembershipChange: (memberOf: Set<string>) => void;
  listPickerOpen: boolean;
  onToggleListPicker: () => void;
  onCloseListPicker: () => void;
}

/** Now Watching / watchlist / list toggles, independent of each other, plus the list picker sheet. */
export function ShowDetailQuickActions({
  show,
  user,
  canTrackNowWatching,
  inNowWatching,
  dismissedItem,
  savingNowWatching,
  onToggleNowWatching,
  canDropShow,
  droppedItem,
  savingDropped,
  onToggleDropped,
  watchlistItem,
  savingWatchlist,
  onToggleWatchlist,
  listMembership,
  onListMembershipChange,
  listPickerOpen,
  onToggleListPicker,
  onCloseListPicker,
}: ShowDetailQuickActionsProps) {
  return (
    <>
      <View className="mt-3 flex-row flex-wrap items-center gap-2">
        {canTrackNowWatching && (
          <ActionPill
            icon={inNowWatching ? 'play.circle.fill' : 'play.circle'}
            active={inNowWatching}
            saving={savingNowWatching}
            onPress={onToggleNowWatching}
            label={inNowWatching ? 'Remove from Now Watching' : dismissedItem ? 'Add to Now Watching' : 'Start watching'}
          />
        )}

        {canDropShow && (
          <ActionPill
            icon={droppedItem ? 'xmark.circle.fill' : 'tray.and.arrow.down'}
            active={Boolean(droppedItem)}
            saving={savingDropped}
            onPress={onToggleDropped}
            label={droppedItem ? 'Resume watching' : 'Drop this show'}
          />
        )}

        <ActionPill
          icon={watchlistItem ? 'bookmark.fill' : 'bookmark'}
          active={Boolean(watchlistItem)}
          saving={savingWatchlist}
          onPress={onToggleWatchlist}
          label={watchlistItem ? 'On your watchlist' : 'Add to watchlist'}
        />

        <ActionPill
          icon="list.bullet"
          active={listMembership.size > 0}
          onPress={onToggleListPicker}
          label={listMembership.size > 0 ? `On ${listMembership.size} list${pluralSuffix(listMembership.size)}` : 'Add to a list'}
        />
      </View>

      {user && (
        <AddToListSheet
          visible={listPickerOpen}
          userId={user.id}
          showId={show.id}
          showName={show.name}
          showPosterPath={show.poster_path}
          memberOf={listMembership}
          onChange={onListMembershipChange}
          onClose={onCloseListPicker}
        />
      )}
    </>
  );
}
