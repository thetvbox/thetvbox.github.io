import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AccountSetupScreen } from '@/components/auth/account-setup-screen';
import { BiometricLockScreen } from '@/components/auth/biometric-lock-screen';
import { LoginScreen } from '@/components/auth/login-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { MembersProvider } from '@/contexts/MembersContext';
import { SearchProvider } from '@/contexts/SearchContext';
import { useBiometricGate } from '@/hooks/useBiometricGate';

SplashScreen.preventAutoHideAsync();

function AppGate() {
  const { user, loading, accountSetup } = useAuth();
  const { unlocked, checking, promptUnlock } = useBiometricGate(Boolean(user) && !accountSetup);

  if (loading) return <View className="flex-1 bg-base-950" />;
  if (!user && !accountSetup) return <LoginScreen />;
  if (accountSetup) return <AccountSetupScreen />;
  if (!unlocked) return <BiometricLockScreen checking={checking} onRetry={promptUnlock} />;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="show/[id]" options={{ title: 'Show' }} />
      <Stack.Screen name="u/[username]/index" options={{ title: 'Profile' }} />
      <Stack.Screen name="u/[username]/shows/[showId]" options={{ title: 'Show Diary' }} />
      <Stack.Screen name="u/[username]/lists/[listId]" options={{ title: 'List' }} />
      <Stack.Screen name="compare/[username]" options={{ title: 'Compare' }} />
      <Stack.Screen name="recap" options={{ title: 'Recap' }} />
      <Stack.Screen
        name="search-filters"
        options={{
          presentation: 'formSheet',
          sheetAllowedDetents: [0.5, 1],
          sheetInitialDetentIndex: 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      />
    </Stack>
  );
}

/** Root shell: sign-in, account setup, and the Face ID lock all gate the tab/stack navigation below them. */
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <SearchProvider>
          <MembersProvider>
            <AnimatedSplashOverlay />
            <AppGate />
          </MembersProvider>
        </SearchProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
