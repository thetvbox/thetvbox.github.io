import { ActivityIndicator, Pressable, Text } from 'react-native';

import { impactHaptic } from '@/lib/haptics';

interface FollowButtonProps {
  isFollowing: boolean;
  saving?: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  size?: 'sm' | 'md';
}

const SIZE_CLASSES = { sm: 'px-2.5 py-1', md: 'px-3.5 py-1.5' } as const;
const TEXT_SIZE_CLASSES = { sm: 'text-xs', md: 'text-sm' } as const;

/** Follow/Following toggle; tapping either state acts immediately -- unfollow is backed by an Undo toast, so no hover-relabel or confirm step is needed on touch. */
export function FollowButton({ isFollowing, saving = false, onFollow, onUnfollow, size = 'md' }: FollowButtonProps) {
  return (
    <Pressable
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel={isFollowing ? 'Unfollow' : 'Follow'}
      accessibilityState={{ selected: isFollowing, disabled: saving }}
      onPress={() => {
        impactHaptic();
        if (isFollowing) onUnfollow();
        else onFollow();
      }}
      className={`shrink-0 rounded-full ${SIZE_CLASSES[size]} ${
        isFollowing ? 'bg-hover-strong ring-1 ring-hairline-strong' : 'bg-accent-500/15 ring-1 ring-accent-500/40'
      } ${saving ? 'opacity-50' : ''}`}
    >
      {saving ? (
        <ActivityIndicator size="small" />
      ) : (
        <Text
          className={`font-medium ${TEXT_SIZE_CLASSES[size]} ${isFollowing ? 'text-base-300' : 'text-accent-300'}`}
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Text>
      )}
    </Pressable>
  );
}
