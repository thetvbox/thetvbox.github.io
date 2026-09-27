import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

/** Resolves the active color scheme to its theme palette, treating an undetermined scheme as light. */
export function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
}
