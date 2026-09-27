import { SymbolView } from 'expo-symbols'
import { useEffect, useState } from 'react'
import { Linking, Text, View } from 'react-native'

import { AuthButton } from '@/components/auth/auth-controls'
import { ErrorText } from '@/components/error-text'
import { PickerSheet } from '@/components/picker-sheet'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { errorMessage } from '@/lib/format'
import { getPushStatus, subscribeToPush, type PushStatus } from '@/lib/pushNotifications'

interface PushNotificationsSheetProps {
  visible: boolean
  userId: string
  onClose: () => void
}

const BELL_ICON_SIZE = 40

const STATUS_COPY: Record<PushStatus, string> = {
  unsupported: "Push notifications need a physical device -- the simulator can't register for them.",
  disabled: 'Get notified here when someone follows you, rates a show you both watch, or finishes a show you follow.',
  denied: 'Notifications are turned off for TV Box. Turn them on in Settings to hear about new followers and activity.',
  enabled: 'Push notifications are on for this device.',
}

/** Push-notification permission sheet: the one-time post-sign-in prompt and Profile's manual "Notifications" entry both render this. */
export function PushNotificationsSheet({ visible, userId, onClose }: PushNotificationsSheetProps) {
  const theme = useThemeColors()
  const [status, setStatus] = useState<PushStatus | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setError(null)
    getPushStatus().then((s) => {
      if (!cancelled) setStatus(s)
    })
    return () => {
      cancelled = true
    }
  }, [visible])

  async function handleEnable() {
    setBusy(true)
    setError(null)
    try {
      await subscribeToPush(userId)
      setStatus('enabled')
    } catch (err) {
      setError(errorMessage(err, 'Could not enable push notifications.'))
      setStatus(await getPushStatus())
    } finally {
      setBusy(false)
    }
  }

  return (
    <PickerSheet visible={visible} title="Notifications" onClose={onClose}>
      <View className="flex-1 items-center justify-center gap-5 px-2">
        <SymbolView name="bell.badge.fill" size={BELL_ICON_SIZE} tintColor={theme.accent} />
        <Text className="text-center text-sm text-base-400">{status === 'loading' ? ' ' : STATUS_COPY[status]}</Text>
        {error && <ErrorText>{error}</ErrorText>}
        {status === 'disabled' && (
          <View className="min-w-[220px]">
            <AuthButton label="Enable Notifications" onPress={handleEnable} loading={busy} />
          </View>
        )}
        {(status === 'denied' || status === 'enabled') && (
          <View className="min-w-[220px]">
            <AuthButton label="Open Settings" onPress={() => Linking.openSettings()} variant="secondary" />
          </View>
        )}
      </View>
    </PickerSheet>
  )
}
