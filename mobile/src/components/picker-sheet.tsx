import { GlassView } from 'expo-glass-effect';
import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface PickerSheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** Shared native page-sheet shell (title + Done) for the list and streaming-provider pickers. */
export function PickerSheet({ visible, title, onClose, children }: PickerSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <GlassView glassEffectStyle="regular" style={{ flex: 1 }}>
        <View className="flex-row items-center justify-between px-5 pb-3" style={{ paddingTop: insets.top + 8 }}>
          <Text accessibilityRole="header" className="text-base font-semibold text-base-100">
            {title}
          </Text>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Done">
            <Text className="text-sm font-semibold text-accent-400">Done</Text>
          </Pressable>
        </View>
        <View className="flex-1 px-5" style={{ paddingBottom: insets.bottom + 16 }}>
          {children}
        </View>
      </GlassView>
    </Modal>
  );
}
