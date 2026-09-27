import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useAuth } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { EMAIL_PATTERN } from '@/lib/constants';

type Step = 'options' | 'email' | 'otp';

/** Sign-in screen: Apple, Google, and an emailed one-time code, shown whenever there's no Supabase Auth session yet. */
export function LoginScreen() {
  const { signInWithApple, signInWithGoogle, sendEmailOtp, verifyEmailOtp } = useAuth();
  const scheme = useColorScheme();
  const placeholderColor = scheme === 'light' ? '#56637a' : '#6b6b78';

  const [step, setStep] = useState<Step>('options');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  async function withBusy(action: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 justify-center gap-6 px-6">
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-base-100">TV Box</Text>
          <Text className="text-base-400">Track what you watch, together.</Text>
        </View>

        {error && (
          <View className="rounded-2xl border border-hairline bg-glass px-4 py-3">
            <Text className="text-danger">{error}</Text>
          </View>
        )}

        {step === 'options' && (
          <View className="gap-3">
            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={14}
                style={{ width: '100%', height: 50 }}
                onPress={() => withBusy(signInWithApple)}
              />
            )}

            <Pressable
              className="h-[50px] items-center justify-center rounded-2xl bg-base-800 active:opacity-80"
              disabled={busy}
              onPress={() => withBusy(signInWithGoogle)}
            >
              <Text className="text-base font-semibold text-base-100">Continue with Google</Text>
            </Pressable>

            <Pressable
              className="h-[50px] items-center justify-center rounded-2xl border border-hairline-strong active:opacity-80"
              disabled={busy}
              onPress={() => setStep('email')}
            >
              <Text className="text-base font-semibold text-base-100">Continue with email</Text>
            </Pressable>
          </View>
        )}

        {step === 'email' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-3">
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor={placeholderColor}
              value={email}
              onChangeText={setEmail}
              className="h-[50px] rounded-2xl border border-hairline-strong px-4 text-base text-base-100"
            />
            <Pressable
              className="h-[50px] items-center justify-center rounded-2xl bg-accent-500 active:opacity-80"
              disabled={busy || !EMAIL_PATTERN.test(email.trim())}
              onPress={() =>
                withBusy(async () => {
                  await sendEmailOtp(email);
                  setStep('otp');
                })
              }
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Send code</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setStep('options')}>
              <Text className="text-center text-base-400">Back</Text>
            </Pressable>
          </KeyboardAvoidingView>
        )}

        {step === 'otp' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-3">
            <Text className="text-center text-base-300">Enter the code we sent to {email}</Text>
            <TextInput
              autoComplete="one-time-code"
              keyboardType="number-pad"
              placeholder="123456"
              placeholderTextColor={placeholderColor}
              value={code}
              onChangeText={setCode}
              className="h-[50px] rounded-2xl border border-hairline-strong px-4 text-center text-lg tracking-widest text-base-100"
            />
            <Pressable
              className="h-[50px] items-center justify-center rounded-2xl bg-accent-500 active:opacity-80"
              disabled={busy || code.trim().length < 6}
              onPress={() => withBusy(() => verifyEmailOtp(email, code.trim()))}
            >
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-semibold text-white">Verify</Text>
              )}
            </Pressable>
            <Pressable onPress={() => setStep('email')}>
              <Text className="text-center text-base-400">Use a different email</Text>
            </Pressable>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  );
}
