import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'

import { useThemeColors } from '@/hooks/use-theme-colors'
import { AuthButton } from '@/components/auth/auth-controls'

const LOCK_ICON_SIZE = 48

/** Shown in place of the app's content until Face ID/Touch ID confirms it's really you. */
export function BiometricLockScreen({ checking, onRetry }: { checking: boolean; onRetry: () => void }) {
  const theme = useThemeColors()

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 items-center justify-center gap-6 px-6">
        <SymbolView name="lock.fill" size={LOCK_ICON_SIZE} tintColor={theme.accent} />
        <Text className="text-xl font-semibold text-base-100">TV Box is locked</Text>
        <Text className="text-center text-base-400">Unlock with Face ID to continue.</Text>
        <View className="min-w-[160px]">
          <AuthButton label="Try again" loading={checking} onPress={onRetry} />
        </View>
      </SafeAreaView>
    </View>
  )
}
