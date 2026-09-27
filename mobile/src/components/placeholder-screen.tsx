import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

/** Shared placeholder body for the tabs that don't have a ported screen yet -- this pass only proves out the GlassTabBar chrome, not full feature parity with the web app. */
export function PlaceholderScreen({ title, blurb }: { title: string; blurb: string }) {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.blurb}>
          {blurb}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingBottom: BottomTabInset,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  blurb: {
    textAlign: 'center',
  },
});
