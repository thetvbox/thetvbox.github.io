import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as AppleAuthentication from 'expo-apple-authentication'
import { GlassView } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import Animated, { SlideInLeft, SlideInRight, SlideOutLeft, SlideOutRight } from 'react-native-reanimated'

import { useAuth } from '@/contexts/AuthContext'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useColorScheme } from '@/hooks/use-color-scheme'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { EMAIL_OTP_LENGTH, EMAIL_PATTERN } from '@/lib/constants'
import { AuthButton, AuthErrorBanner, AuthLinkButton, AuthTextField } from '@/components/auth/auth-controls'
import { AuthHero } from '@/components/auth/auth-hero'

type Step = 'options' | 'email' | 'otp'

/** Sign-in screen: Apple and an emailed one-time code, shown whenever there's no Supabase Auth session yet. Email OTP doubles as sign-up -- there's no separate "create account" path, since AccountSetupScreen already asks new users for a name/username right after, so a manual sign-in/sign-up switch would only add a redundant question. */
export function LoginScreen() {
  const { signInWithApple, sendEmailOtp, verifyEmailOtp } = useAuth()
  const { busy, error, run } = useAsyncAction()
  const scheme = useColorScheme()
  const theme = useThemeColors()

  const [step, setStep] = useState<Step>('options')
  const [direction, setDirection] = useState<1 | -1>(1)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable)
  }, [])

  function goTo(next: Step, dir: 1 | -1) {
    setDirection(dir)
    setStep(next)
  }

  const entering = direction === 1 ? SlideInRight.duration(260) : SlideInLeft.duration(260)
  const exiting = direction === 1 ? SlideOutLeft.duration(200) : SlideOutRight.duration(200)

  return (
    <View className="flex-1 bg-base-950">
      <SafeAreaView className="flex-1 justify-center px-6">
        <AuthHero title="TV Box" tagline="Track what you watch, together." />

        <View className="mt-8" style={{ overflow: 'hidden', borderRadius: 28 }}>
          <GlassView glassEffectStyle="regular" isInteractive style={{ padding: 24 }}>
            <View className="gap-4">
              {error && <AuthErrorBanner message={error} />}

              {step === 'options' && (
                <Animated.View key="options" entering={entering} exiting={exiting} className="gap-3">
                  {appleAvailable && (
                    <AppleAuthentication.AppleAuthenticationButton
                      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                      buttonStyle={
                        scheme === 'dark'
                          ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                          : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                      }
                      cornerRadius={14}
                      style={{ width: '100%', height: 50 }}
                      onPress={() => run(signInWithApple)}
                    />
                  )}

                  {appleAvailable && (
                    <View className="flex-row items-center gap-3">
                      <View className="h-px flex-1 bg-hairline" />
                      <Text className="text-xs uppercase tracking-wide text-base-500">or</Text>
                      <View className="h-px flex-1 bg-hairline" />
                    </View>
                  )}

                  <AuthButton
                    label="Continue with email"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => goTo('email', 1)}
                  />
                </Animated.View>
              )}

              {step === 'email' && (
                <Animated.View key="email" entering={entering} exiting={exiting}>
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-3">
                    <Text className="text-base-400">{"Enter your email and we'll send you a one-time code."}</Text>
                    <View className="relative justify-center">
                      <SymbolView
                        name="envelope.fill"
                        size={18}
                        tintColor={theme.textSecondary}
                        style={{ position: 'absolute', left: 16, zIndex: 1 }}
                      />
                      <AuthTextField
                        autoCapitalize="none"
                        autoComplete="email"
                        autoFocus
                        keyboardType="email-address"
                        placeholder="you@example.com"
                        value={email}
                        onChangeText={setEmail}
                        className="pl-11"
                      />
                    </View>
                    <AuthButton
                      label="Send code"
                      loading={busy}
                      disabled={busy || !EMAIL_PATTERN.test(email.trim())}
                      onPress={() =>
                        run(async () => {
                          await sendEmailOtp(email)
                          goTo('otp', 1)
                        })
                      }
                    />
                    <AuthLinkButton label="Back" onPress={() => goTo('options', -1)} />
                  </KeyboardAvoidingView>
                </Animated.View>
              )}

              {step === 'otp' && (
                <Animated.View key="otp" entering={entering} exiting={exiting}>
                  <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="gap-3">
                    <Text className="text-center text-base-300">Enter the code we sent to {email}</Text>
                    <AuthTextField
                      autoComplete="one-time-code"
                      autoFocus
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
                    <AuthLinkButton label="Use a different email" onPress={() => goTo('email', -1)} />
                  </KeyboardAvoidingView>
                </Animated.View>
              )}
            </View>
          </GlassView>
        </View>
      </SafeAreaView>
    </View>
  )
}
