import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function CompareScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <PlaceholderScreen title="Compare" blurb={`Taste comparison against @${username} lands in Phase 3.`} />;
}
