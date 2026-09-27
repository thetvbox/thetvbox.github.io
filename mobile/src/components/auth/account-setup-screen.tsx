import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from '@/lib/constants';

/** Post-sign-in setup: creates a brand-new profile row, or collects name/preferred-name for an existing passkey account signing in natively for the first time. */
export function AccountSetupScreen() {
  const { accountSetup, user, createAccount, completeProfile, skipAccountSetup, signOut } = useAuth();
  const isNew = accountSetup === 'new';
  const scheme = useColorScheme();
  const placeholderColor = scheme === 'light' ? '#56637a' : '#6b6b78';

  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedUsername = username.trim();
  const usernameValid = !isNew || USERNAME_PATTERN.test(trimmedUsername);
  const canSubmit = fullName.trim().length > 0 && usernameValid && !busy;

  async function handleSubmit() {
    setError(null);
    setBusy(true);
    try {
      const name = fullName.trim();
      const preferred = preferredName.trim() || name;
      if (isNew) {
        await createAccount({ username: trimmedUsername, fullName: name, preferredName: preferred });
      } else {
        await completeProfile({ fullName: name, preferredName: preferred });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 justify-center gap-6 px-6">
        <View className="gap-2">
          <Text className="text-2xl font-bold text-base-100">
            {isNew ? 'Create your account' : `Welcome back${user?.username ? `, @${user.username}` : ''}`}
          </Text>
          <Text className="text-base-400">
            {isNew
              ? 'Pick a username and tell us your name.'
              : 'A couple quick details to finish setting up your account.'}
          </Text>
        </View>

        {error && (
          <View className="rounded-2xl border border-hairline bg-glass px-4 py-3">
            <Text className="text-danger">{error}</Text>
          </View>
        )}

        <View className="gap-3">
          {isNew && (
            <TextInput
              autoCapitalize="none"
              autoComplete="username"
              placeholder="Username"
              placeholderTextColor={placeholderColor}
              value={username}
              onChangeText={setUsername}
              maxLength={USERNAME_MAX_LENGTH}
              className="h-[50px] rounded-2xl border border-hairline-strong px-4 text-base text-base-100"
            />
          )}
          <TextInput
            autoComplete="name"
            placeholder="Full name"
            placeholderTextColor={placeholderColor}
            value={fullName}
            onChangeText={setFullName}
            className="h-[50px] rounded-2xl border border-hairline-strong px-4 text-base text-base-100"
          />
          <TextInput
            placeholder="Preferred name (optional)"
            placeholderTextColor={placeholderColor}
            value={preferredName}
            onChangeText={setPreferredName}
            className="h-[50px] rounded-2xl border border-hairline-strong px-4 text-base text-base-100"
          />
          {isNew && username.length > 0 && !usernameValid && (
            <Text className="text-warning">
              {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} letters, numbers, or underscores.
            </Text>
          )}
        </View>

        <Pressable
          className="h-[50px] items-center justify-center rounded-2xl bg-accent-500 active:opacity-80 disabled:opacity-50"
          disabled={!canSubmit}
          onPress={handleSubmit}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">Continue</Text>
          )}
        </Pressable>

        {!isNew && (
          <Pressable disabled={busy} onPress={skipAccountSetup}>
            <Text className="text-center text-base-400">Skip for now</Text>
          </Pressable>
        )}

        <Pressable disabled={busy} onPress={() => signOut()}>
          <Text className="text-center text-base-500">Sign out</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
