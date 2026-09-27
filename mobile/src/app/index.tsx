import { isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

/** Reports whether GlassTabBar's GlassView is rendering real native Liquid Glass on this device, or its plain-View fallback -- the whole point of this proof-of-concept pass. */
function glassStatusLine(): string {
  if (Platform.OS !== 'ios') return `Liquid Glass is iOS-only -- running as a plain view on ${Platform.OS}.`;
  if (!isGlassEffectAPIAvailable()) return 'Liquid Glass API not available on this build (iOS < 26, or an early iOS 26 beta).';
  return isLiquidGlassAvailable() ? 'Liquid Glass is active -- the tab bar below is real UIVisualEffectView glass.' : 'Liquid Glass API is present but not active for this app.';
}

export default function HomeScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          TV Box
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.subtitle}>
          Liquid Glass proof of concept
        </ThemedText>

        <ThemedView type="backgroundElement" style={styles.statusCard}>
          <ThemedText type="smallBold" themeColor="accent">
            {Platform.OS.toUpperCase()} {String(Platform.Version)}
          </ThemedText>
          <ThemedText type="small" style={styles.statusText}>
            {glassStatusLine()}
          </ThemedText>
        </ThemedView>

        <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
          Tap around the tab bar below -- on an iOS 26+ device it refracts and blurs whatever is
          behind it in real time, the way {'\n'}Apple’s own apps do.
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
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingBottom: BottomTabInset,
  },
  title: {
    fontSize: 40,
    lineHeight: 46,
  },
  subtitle: {
    marginTop: -Spacing.two,
  },
  statusCard: {
    marginTop: Spacing.four,
    padding: Spacing.four,
    borderRadius: Spacing.four,
    gap: Spacing.one,
    alignSelf: 'stretch',
  },
  statusText: {
    lineHeight: 20,
  },
  hint: {
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
