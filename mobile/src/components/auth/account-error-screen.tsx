import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { useThemeColors } from '@/hooks/use-theme-colors';
import { AuthButton, AuthErrorBanner } from '@/components/auth/auth-controls';

const ERROR_ICON_SIZE = 48;

/** Shown in place of the app's content when resolving the signed-in account failed, so a transient error can't silently misroute into account creation. */
export function AccountErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  const theme = useThemeColors();

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 items-center justify-center gap-6 px-6">
        <SymbolView name="exclamationmark.triangle.fill" size={ERROR_ICON_SIZE} tintColor={theme.accent} />
        <Text className="text-xl font-semibold text-base-100">Couldn&apos;t load your account</Text>
        <AuthErrorBanner message={message} />
        <View className="min-w-[160px]">
          <AuthButton label="Try again" onPress={onRetry} />
        </View>
      </SafeAreaView>
    </View>
  );
}
