import { SymbolView } from 'expo-symbols'
import { useState } from 'react'
import { Pressable } from 'react-native'

import { useThemeColors } from '@/hooks/use-theme-colors'
import { impactHaptic } from '@/lib/haptics'
import { shareOrCopyLink, type ShareResult } from '@/lib/share'

const SHARE_ICON_SIZE = 16

interface ShareButtonProps {
  title: string
  text?: string
  url?: string
  onResult?: (result: ShareResult) => void
}

/** Icon button that shares via the native share sheet or copies the link, and reports what happened. */
export function ShareButton({ title, text, url, onResult }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)
  const theme = useThemeColors()

  async function handlePress() {
    if (sharing) return
    impactHaptic()
    setSharing(true)
    try {
      const result = await shareOrCopyLink({ title, text, url })
      onResult?.(result)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={sharing}
      accessibilityRole="button"
      accessibilityLabel="Share"
      className="h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-hairline-strong active:opacity-60"
    >
      <SymbolView name="square.and.arrow.up" size={SHARE_ICON_SIZE} tintColor={theme.textSecondary} />
    </Pressable>
  )
}
