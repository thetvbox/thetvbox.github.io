import { useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useAuth } from '@/contexts/AuthContext'
import { useAsyncAction } from '@/hooks/useAsyncAction'
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH, USERNAME_PATTERN } from '@/lib/constants'
import { AuthButton, AuthErrorBanner, AuthLinkButton, AuthTextField } from '@/components/auth/auth-controls'

/** Post-sign-in setup: creates a brand-new profile row, or collects name/preferred-name for an existing passkey account signing in natively for the first time. */
export function AccountSetupScreen() {
  const { accountSetup, user, createAccount, completeProfile, skipAccountSetup, signOut } = useAuth()
  const isNew = accountSetup === 'new'
  const { busy, error, run } = useAsyncAction()

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

        {error && <AuthErrorBanner message={error} />}

        <View className="gap-3">
          {isNew && (
            <AuthTextField
              autoCapitalize="none"
              autoComplete="username"
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              maxLength={USERNAME_MAX_LENGTH}
            />
          )}
          <AuthTextField autoComplete="name" placeholder="Full name" value={fullName} onChangeText={setFullName} />
          <AuthTextField
            placeholder="Preferred name (optional)"
            value={preferredName}
            onChangeText={setPreferredName}
          />
          {isNew && username.length > 0 && !usernameValid && (
            <Text className="text-warning">
              {USERNAME_MIN_LENGTH}-{USERNAME_MAX_LENGTH} letters, numbers, or underscores.
            </Text>
          )}
        </View>

        <AuthButton label="Continue" loading={busy} disabled={!canSubmit} onPress={handleSubmit} />

        {!isNew && <AuthLinkButton label="Skip for now" disabled={busy} onPress={skipAccountSetup} />}

        <AuthLinkButton label="Sign out" tone="faint" disabled={busy} onPress={() => signOut()} />
      </SafeAreaView>
    </View>
  )
}
