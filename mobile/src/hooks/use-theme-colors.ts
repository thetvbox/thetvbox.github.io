import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

/** Normalizes a color scheme value to a theme key, treating an undetermined scheme as light. */
export function resolveScheme(scheme: ReturnType<typeof useColorScheme>): 'light' | 'dark' {
  return scheme === 'unspecified' || !scheme ? 'light' : scheme;
}

/** Resolves the active color scheme to its theme palette, treating an undetermined scheme as light. */
export function useThemeColors() {
  const scheme = useColorScheme();
  return Colors[resolveScheme(scheme)];
}
