import { SymbolView } from 'expo-symbols'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { AuthButton } from '@/components/auth/auth-controls'
import { ErrorText } from '@/components/error-text'
import { PickerSheet } from '@/components/picker-sheet'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { errorMessage } from '@/lib/format'
import { createPersonalAccessToken, fetchPersonalAccessTokens, revokePersonalAccessToken } from '@/lib/personalAccessTokens'
import type { PersonalAccessTokenSummary } from '@/types'

import { clearSiriToken, setSiriToken } from '../../modules/siri-app-intents'

interface SiriShortcutsSheetProps {
  visible: boolean
  userId: string
  onClose: () => void
}

const MIC_ICON_SIZE = 40

/** Toggles the app's Siri App Intents on or off, backed by a single personal access token stored on-device for them to read -- see modules/siri-app-intents/README.md for why. */
export function SiriShortcutsSheet({ visible, userId, onClose }: SiriShortcutsSheetProps) {
  const theme = useThemeColors()
  const [tokens, setTokens] = useState<PersonalAccessTokenSummary[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    fetchPersonalAccessTokens(userId)
      .then((rows) => {
        if (!cancelled) setTokens(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorMessage(err, 'Could not load Siri & Shortcuts.'))
      })
    return () => {
      cancelled = true
    }
  }, [visible, userId])

  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      const { token, summary } = await createPersonalAccessToken(userId, 'Siri Shortcuts')
      setSiriToken(token)
      setTokens([summary])
    } catch (err) {
      setError(errorMessage(err, 'Could not enable Siri.'))
    } finally {
      setBusy(false)
    }
  }

  async function handleTurnOff() {
    if (!tokens) return
    setBusy(true)
    setError(null)
    try {
      await Promise.all(tokens.map((t) => revokePersonalAccessToken(t.id)))
      clearSiriToken()
      setTokens([])
    } catch (err) {
      setError(errorMessage(err, 'Could not turn off Siri.'))
    } finally {
      setBusy(false)
    }
  }

  const enabled = (tokens?.length ?? 0) > 0

  return (
    <PickerSheet visible={visible} title="Siri & Shortcuts" onClose={onClose}>
      <View className="flex-1 items-center justify-center gap-5 px-2">
        <SymbolView name="mic.circle.fill" size={MIC_ICON_SIZE} tintColor={theme.accent} />
        <Text className="text-center text-sm text-base-400">
          {tokens === null
            ? ' '
            : enabled
              ? 'Siri is set up on this device. Try "Log that I watched the next episode of..." or "What should I watch next".'
              : 'Turn this on to log episodes and ask what to watch next with Siri, hands-free.'}
        </Text>
        {error && <ErrorText>{error}</ErrorText>}
        {tokens !== null && (
          <View className="min-w-[220px]">
            {enabled ? (
              <AuthButton label="Turn Off" onPress={handleTurnOff} loading={busy} variant="secondary" />
            ) : (
              <AuthButton label="Enable Siri" onPress={handleEnable} loading={busy} />
            )}
          </View>
        )}
      </View>
    </PickerSheet>
  )
}
