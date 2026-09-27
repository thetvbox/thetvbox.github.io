import { useLocalSearchParams } from 'expo-router';

import { PlaceholderScreen } from '@/components/placeholder-screen';

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return (
    <PlaceholderScreen title={`@${username}`} blurb="This member's public profile lands in Phase 2." />
  );
}
