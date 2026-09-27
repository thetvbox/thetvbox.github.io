import { ActivityIndicator, Pressable, Text } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { impactHaptic } from '@/lib/haptics';
import { ICON_PILL_ACTIVE_CLASSES, ICON_PILL_BASE_CLASSES, ICON_PILL_INACTIVE_CLASSES } from '@/lib/iconPill';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface ActionPillProps {
  icon: SymbolViewProps['name'];
  label: string;
  active: boolean;
  saving?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** Icon+label pill for a show/episode-level toggle (Now Watching, watchlist, drop, mark watched, ...), with a confirming haptic on activation. */
export function ActionPill({ icon, label, active, saving = false, disabled = false, onPress }: ActionPillProps) {
  const theme = useThemeColors();

  return (
    <Pressable
      onPress={() => {
        impactHaptic();
        onPress();
      }}
      disabled={disabled || saving}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled: disabled || saving }}
      className={`${ICON_PILL_BASE_CLASSES} ${active ? ICON_PILL_ACTIVE_CLASSES : ICON_PILL_INACTIVE_CLASSES} ${disabled || saving ? 'opacity-60' : ''}`}
    >
      <SymbolView name={icon} size={14} tintColor={active ? theme.accent : theme.textSecondary} />
      <Text className={`text-xs font-medium ${active ? 'text-accent-300' : 'text-base-400'}`}>{label}</Text>
      {saving && <ActivityIndicator size="small" className="ml-0.5" />}
    </Pressable>
  );
}
