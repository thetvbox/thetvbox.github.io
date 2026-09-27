import { Text, View } from 'react-native';

const CONTAINER_SIZE_CLASSES = {
  xs: 'h-8 w-8',
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
} as const;

const TEXT_SIZE_CLASSES = {
  xs: 'text-[11px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
} as const;

interface AvatarProps {
  username: string;
  size?: keyof typeof CONTAINER_SIZE_CLASSES;
}

/** Circular initials avatar used anywhere a person shows up without a real profile photo. */
export function Avatar({ username, size = 'md' }: AvatarProps) {
  return (
    <View
      className={`shrink-0 items-center justify-center rounded-full bg-accent-500/15 ring-1 ring-accent-500/20 ${CONTAINER_SIZE_CLASSES[size]}`}
    >
      <Text className={`font-semibold text-accent-300 ${TEXT_SIZE_CLASSES[size]}`}>
        {username.slice(0, 2).toUpperCase()}
      </Text>
    </View>
  );
}
