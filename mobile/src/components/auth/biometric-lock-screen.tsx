import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

/** Shown in place of the app's content until Face ID/Touch ID confirms it's really you. */
export function BiometricLockScreen({ checking, onRetry }: { checking: boolean; onRetry: () => void }) {
  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 items-center justify-center gap-6 px-6">
        <SymbolView name="lock.fill" size={48} tintColor="#8b5cf6" />
        <Text className="text-xl font-semibold text-base-100">TV Box is locked</Text>
        <Text className="text-center text-base-400">Unlock with Face ID to continue.</Text>
        <Pressable
          className="h-[50px] min-w-[160px] items-center justify-center rounded-2xl bg-accent-500 active:opacity-80"
          disabled={checking}
          onPress={onRetry}
        >
          <Text className="text-base font-semibold text-white">{checking ? 'Checking…' : 'Try again'}</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
