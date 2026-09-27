import { useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { GlassView } from 'expo-glass-effect'
import { SymbolView } from 'expo-symbols'
import Animated, { FadeInUp } from 'react-native-reanimated'

import { useAuth } from '@/contexts/AuthContext'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from '@/lib/constants'
import { AuthButton, AuthErrorBanner, AuthLinkButton, AuthTextField } from '@/components/auth/auth-controls'
import { AuthHero } from '@/components/auth/auth-hero'

/** Post-sign-in setup: creates a brand-new profile row, or collects name/preferred-name for an existing passkey account signing in natively for the first time. */
export function AccountSetupScreen() {
  const { accountSetup, user, createAccount, completeProfile, skipAccountSetup, signOut } = useAuth()
  const isNew = accountSetup === 'new'
  const { busy, error, run } = useAsyncAction()
  const theme = useThemeColors()

  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [preferredName, setPreferredName] = useState('')

  const trimmedUsername = username.trim()
  const usernameValid = !isNew || USERNAME_PATTERN.test(trimmedUsername)
  const canSubmit = fullName.trim().length > 0 && usernameValid && !busy

  function handleSubmit() {
    run(async () => {
      const name = fullName.trim()
      const preferred = preferredName.trim() || name
      if (isNew) {
        await createAccount({ username: trimmedUsername, fullName: name, preferredName: preferred })
      } else {
        await completeProfile({ fullName: name, preferredName: preferred })
      }
    })
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <AuthHero
          title={isNew ? 'Create your account' : `Welcome back${user?.username ? `, @${user.username}` : ''}`}
          tagline={isNew ? 'Pick a username and tell us your name.' : 'A couple quick details to finish setting up.'}
        />

        <Animated.View
          entering={FadeInUp.delay(80).duration(420)}
          style={{ marginTop: 32, borderRadius: 28, overflow: 'hidden' }}
        >
          {/* GlassView renders only the material -- see login-screen.tsx for why interactive
              children live in a sibling view instead of nested inside it. */}
          <GlassView glassEffectStyle="regular" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
          <View style={{ padding: 24, gap: 16 }}>
            {error && <AuthErrorBanner message={error} />}

            <View className="gap-3">
              {isNew && (
                <View className="relative justify-center">
                  <SymbolView
                    name="at"
                    size={18}
                    tintColor={theme.textSecondary}
                    style={{ position: 'absolute', left: 16, zIndex: 1 }}
                  />
                  <AuthTextField
                    autoCapitalize="none"
                    autoComplete="username"
                    autoFocus
                    placeholder="Username"
                    value={username}
                    onChangeText={setUsername}
                    maxLength={USERNAME_MAX_LENGTH}
                    className="pl-11"
                  />
                </View>
              )}
              <View className="relative justify-center">
                <SymbolView
                  name="person.fill"
                  size={18}
                  tintColor={theme.textSecondary}
                  style={{ position: 'absolute', left: 16, zIndex: 1 }}
                />
                <AuthTextField
                  autoComplete="name"
                  placeholder="Full name"
                  value={fullName}
                  onChangeText={setFullName}
                  className="pl-11"
                />
              </View>
              <View className="relative justify-center">
                <SymbolView
                  name="sparkles"
                  size={18}
                  tintColor={theme.textSecondary}
                  style={{ position: 'absolute', left: 16, zIndex: 1 }}
                />
                <AuthTextField
                  placeholder="Preferred name (optional)"
                  value={preferredName}
                  onChangeText={setPreferredName}
                  className="pl-11"
                />
              </View>
              {isNew && username.length > 0 && !usernameValid && (
                <Text className="text-warning">
                  {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} letters, numbers, or underscores.
                </Text>
              )}
            </View>

            <AuthButton label="Continue" loading={busy} disabled={!canSubmit} onPress={handleSubmit} />

            {!isNew && <AuthLinkButton label="Skip for now" disabled={busy} onPress={skipAccountSetup} />}

            <AuthLinkButton label="Sign out" tone="faint" disabled={busy} onPress={() => signOut()} />
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  )
}
