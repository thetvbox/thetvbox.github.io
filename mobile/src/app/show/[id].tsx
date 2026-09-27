import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <PlaceholderScreen
      title="Show Detail"
      blurb={`Show #${id} -- ratings, watch tracking, and episodes land in Phase 1.`}
    />
  );
}
