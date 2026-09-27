import { GlassView } from 'expo-glass-effect';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** The slice of React Navigation's BottomTabBarProps this component actually reads -- kept local
 * rather than imported from expo-router's internal (non-public) react-navigation/bottom-tabs path. */
type GlassTabBarProps = {
  state: {
    index: number;
    routes: { key: string; name: string }[];
  };
  descriptors: Record<string, { options: { title?: unknown } }>;
  navigation: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean };
    navigate: (name: string) => void;
  };
};

const TAB_ICONS: Record<string, SymbolViewProps['name']> = {
  index: 'house.fill',
  activity: 'chart.line.uptrend.xyaxis',
  search: 'magnifyingglass',
  members: 'person.2.fill',
  profile: 'person.crop.circle.fill',
};

const INDICATOR_SPRING = { damping: 22, stiffness: 260 };

/** tv-box's floating glass pill bottom tab bar, ported from Navbar.tsx's mobile nav -- same inset-from-edges pill shape and sliding active-tab highlight, but the pill itself is a real native GlassView (Liquid Glass on iOS 26+) instead of a hand-rolled backdrop-filter approximation. */
export function GlassTabBar({ state, descriptors, navigation }: GlassTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  const tabWidth = useSharedValue(0);
  const indicatorX = useSharedValue(0);

  useEffect(() => {
    indicatorX.value = withSpring(state.index * tabWidth.value, INDICATOR_SPRING);
    // tabWidth is a shared value read for its current value, not a reactive dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: tabWidth.value,
  }));

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { bottom: Math.max(insets.bottom, 16) }]}>
      <GlassView
        glassEffectStyle="regular"
        isInteractive
        style={[styles.pill, { backgroundColor: 'rgba(20,20,24,0.55)' }]}
        onLayout={(e) => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are intentionally mutable via `.value`.
          tabWidth.value = e.nativeEvent.layout.width / state.routes.length;
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.indicator, indicatorStyle, { backgroundColor: `${theme.accent}26`, borderColor: `${theme.accent}66` }]}
        />
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;

          function onPress() {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          }

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              <SymbolView
                name={TAB_ICONS[route.name] ?? 'circle'}
                size={21}
                tintColor={focused ? theme.accent : theme.textSecondary}
              />
            </Pressable>
          );
        })}
      </GlassView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.one,
  },
  indicator: {
    position: 'absolute',
    top: Spacing.one,
    bottom: Spacing.one,
    borderRadius: 999,
    borderWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.two,
  },
});
