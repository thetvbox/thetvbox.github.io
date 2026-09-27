import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

/** Root navigation shell: the tab bar group plus every screen that pushes on top of it. */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="show/[id]" options={{ title: 'Show' }} />
        <Stack.Screen name="u/[username]/index" options={{ title: 'Profile' }} />
        <Stack.Screen name="u/[username]/shows/[showId]" options={{ title: 'Show Diary' }} />
        <Stack.Screen name="u/[username]/lists/[listId]" options={{ title: 'List' }} />
        <Stack.Screen name="compare/[username]" options={{ title: 'Compare' }} />
        <Stack.Screen name="recap" options={{ title: 'Recap' }} />
      </Stack>
    </ThemeProvider>
  );
}
