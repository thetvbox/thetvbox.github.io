import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as AppleAuthentication from 'expo-apple-authentication'

import { useAuth } from '@/contexts/AuthContext'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { EMAIL_OTP_LENGTH, EMAIL_PATTERN } from '@/lib/constants'
import { AuthButton, AuthErrorBanner, AuthLinkButton, AuthTextField } from '@/components/auth/auth-controls'

type Step = 'options' | 'email' | 'otp'

/** Sign-in screen: Apple, Google, and an emailed one-time code, shown whenever there's no Supabase Auth session yet. */
export function LoginScreen() {
  const { signInWithApple, signInWithGoogle, sendEmailOtp, verifyEmailOtp } = useAuth()
  const { busy, error, run } = useAsyncAction()

  const [step, setStep] = useState<Step>('options')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [])

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 justify-center gap-6 px-6">
        <View className="items-center gap-2">
          <Text className="text-3xl font-bold text-base-100">TV Box</Text>
          <Text className="text-base-400">Track what you watch, together.</Text>
        </View>

        {error && <AuthErrorBanner message={error} />}

        {step === 'options' && (
          <View className="gap-3">
            {appleAvailable && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={14}
                style={{ width: '100%', height: 50 }}
                onPress={() => run(signInWithApple)}
              />
            )}

            <AuthButton
              label="Continue with Google"
              variant="secondary"
              disabled={busy}
              onPress={() => run(signInWithGoogle)}
            />

            <AuthButton
              label="Continue with email"
              variant="secondary"
              disabled={busy}
              onPress={() => setStep('email')}
            />
          </View>
        )}

        {step === 'email' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-3">
            <AuthTextField
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
            />
            <AuthButton
              label="Send code"
              loading={busy}
              disabled={busy || !EMAIL_PATTERN.test(email.trim())}
              onPress={() =>
                run(async () => {
                  await sendEmailOtp(email)
                  setStep('otp')
                })
              }
            />
            <AuthLinkButton label="Back" onPress={() => setStep('options')} />
          </KeyboardAvoidingView>
        )}

        {step === 'otp' && (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-3">
            <Text className="text-center text-base-300">Enter the code we sent to {email}</Text>
            <AuthTextField
              autoComplete="one-time-code"
              keyboardType="number-pad"
              placeholder="123456"
              value={code}
              onChangeText={setCode}
              className="text-center text-lg tracking-widest"
            />
            <AuthButton
              label="Verify"
              loading={busy}
              disabled={busy || code.trim().length < EMAIL_OTP_LENGTH}
              onPress={() => run(() => verifyEmailOtp(email, code.trim()))}
            />
            <AuthLinkButton label="Use a different email" onPress={() => setStep('email')} />
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </View>
  )
}
