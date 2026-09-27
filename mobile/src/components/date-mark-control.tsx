import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { dateToNoonIso } from '@/lib/date';
import { UNKNOWN_WATCHED_AT } from '@/lib/watched';
import { impactHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface DateMarkControlProps {
  label: string;
  onConfirm: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>;
  confirmSummary?: string;
  allowUnknownDate?: boolean;
}

/** Text trigger that expands into a native date picker + confirm, for marking watched (or rewatched) on a chosen date. */
export function DateMarkControl({ label, onConfirm, confirmSummary, allowUnknownDate = true }: DateMarkControlProps) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const [unknownDate, setUnknownDate] = useState(false);
  const [saving, setSaving] = useState(false);
  const theme = useThemeColors();

  if (!open) {
    return (
      <Pressable
        onPress={() => {
          setDate(new Date());
          setUnknownDate(false);
          setOpen(true);
        }}
        accessibilityRole="button"
      >
        <Text className="text-xs text-accent-400 underline">{label}</Text>
      </Pressable>
    );
  }

  return (
    <View className="flex-col gap-1.5">
      {confirmSummary && <Text className="max-w-xs text-[11px] text-warning">{confirmSummary}</Text>}
      <View className="flex-row flex-wrap items-center gap-2">
        <DateTimePicker
          value={date}
          maximumDate={new Date()}
          mode="date"
          display="compact"
          disabled={unknownDate}
          onValueChange={(_event, value) => setDate(value)}
          accentColor={theme.accent}
        />
        <Pressable
          disabled={saving}
          onPress={async () => {
            impactHaptic();
            setSaving(true);
            try {
              await onConfirm({ watchedAt: unknownDate ? UNKNOWN_WATCHED_AT : dateToNoonIso(date), unknownDate });
              setOpen(false);
            } finally {
              setSaving(false);
            }
          }}
          className="rounded-lg bg-accent-500/15 px-2.5 py-1"
          accessibilityRole="button"
        >
          {saving ? <ActivityIndicator size="small" /> : <Text className="text-xs font-medium text-accent-300">Confirm</Text>}
        </Pressable>
        <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
          <Text className="text-xs text-base-500">Cancel</Text>
        </Pressable>
      </View>
      {allowUnknownDate && (
        <Pressable onPress={() => setUnknownDate((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: unknownDate }} className="flex-row items-center gap-1.5">
          <SymbolView name={unknownDate ? 'checkmark.square.fill' : 'square'} size={14} tintColor={unknownDate ? theme.accent : theme.textSecondary} />
          <Text className="flex-1 text-[11px] text-base-500">Don&apos;t remember exactly when — just log it as watched a while ago</Text>
        </Pressable>
      )}
    </View>
  );
}
