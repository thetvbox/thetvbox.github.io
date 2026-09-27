import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ShowDiaryScreen() {
  const { username, showId } = useLocalSearchParams<{ username: string; showId: string }>();
  return (
    <PlaceholderScreen title="Show Diary" blurb={`@${username}'s history for show #${showId} lands in Phase 3.`} />
  );
}
