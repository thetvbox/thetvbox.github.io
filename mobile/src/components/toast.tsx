import { GlassView } from 'expo-glass-effect';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TOAST_SECONDS } from '@/lib/constants';
import type { ToastState } from '@/hooks/useToast';

const TOAST_FADE_MS = 200;

/** Shared bottom toast for "Undo" offers and failed-write errors, rendered locally by each screen that uses useToast. */
export function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);
  const [rendered, setRendered] = useState(toast);

  useEffect(() => {
    if (toast) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRendered(toast);
      opacity.value = withTiming(1, { duration: TOAST_FADE_MS });
      translateY.value = withTiming(0, { duration: TOAST_FADE_MS });
      const timer = setTimeout(onDismiss, TOAST_SECONDS * 1000);
      return () => clearTimeout(timer);
    }
    opacity.value = withTiming(0, { duration: TOAST_FADE_MS });
    translateY.value = withTiming(12, { duration: TOAST_FADE_MS }, (finished) => {
      if (finished) runOnJS(setRendered)(null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only toast.id should restart the auto-dismiss timer/exit animation
  }, [toast?.id]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: translateY.value }] }));

  if (!rendered) return null;

  return (
    <View pointerEvents="box-none" className="absolute inset-x-0 items-center px-4" style={{ bottom: insets.bottom + 24 }}>
      <Animated.View style={style}>
        <GlassView glassEffectStyle="regular" style={{ borderRadius: 999 }}>
          <View className="flex-row items-center gap-3 px-4 py-2.5">
            <Text className={`text-sm ${rendered.tone === 'error' ? 'text-danger' : 'text-base-100'}`} accessibilityRole="alert">
              {rendered.message}
            </Text>
            {rendered.action && (
              <Pressable onPress={rendered.action.onClick} accessibilityRole="button">
                <Text className="text-sm font-semibold text-accent-400">{rendered.action.label}</Text>
              </Pressable>
            )}
          </View>
        </GlassView>
      </Animated.View>
    </View>
  );
}
