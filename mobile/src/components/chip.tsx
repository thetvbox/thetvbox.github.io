import type { ReactNode } from 'react'
import { Pressable, Text } from 'react-native'

import { selectionHaptic } from '@/lib/haptics'

export const PILL_SIZE_CLASSES = 'rounded-full px-4 py-2'
export const PILL_ACTIVE_CLASSES = 'bg-accent-500/15 ring-1 ring-accent-500/40'
export const PILL_INACTIVE_CLASSES = 'bg-base-850/60 ring-1 ring-hairline'
export const PILL_ACTIVE_TEXT_CLASSES = 'text-sm font-medium text-accent-300'
export const PILL_INACTIVE_TEXT_CLASSES = 'text-sm font-medium text-base-400'

interface ChipProps {
  active: boolean
  onPress: () => void
  disabled?: boolean
  children: ReactNode
}

/** A small toggleable pill, shared by every chip-style filter/select control in the app -- `disabled` dims it and blocks a new selection without hiding it, so an already-active chip stays clickable so it can still be cleared. */
export function Chip({ active, onPress, disabled = false, children }: ChipProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        selectionHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      className={`shrink-0 ${PILL_SIZE_CLASSES} ${active ? PILL_ACTIVE_CLASSES : PILL_INACTIVE_CLASSES} ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className={active ? PILL_ACTIVE_TEXT_CLASSES : PILL_INACTIVE_TEXT_CLASSES}>{children}</Text>
    </Pressable>
  )
}
