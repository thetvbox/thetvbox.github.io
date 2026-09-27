import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function ListDetailScreen() {
  const { username, listId } = useLocalSearchParams<{ username: string; listId: string }>();
  return <PlaceholderScreen title="List" blurb={`@${username}'s list #${listId} lands in Phase 3.`} />;
}
