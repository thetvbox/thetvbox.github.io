import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import type { TextInputProps } from 'react-native'

import { useColorScheme } from '@/hooks/use-color-scheme'
import { impactHaptic, selectionHaptic } from '@/lib/haptics'
import {
  AUTH_BUTTON_SPINNER_COLOR,
  AUTH_ERROR_BANNER_CLASSES,
  AUTH_PLACEHOLDER_COLOR,
  AUTH_PRIMARY_BUTTON_CLASSES,
  AUTH_SECONDARY_BUTTON_CLASSES,
  AUTH_TEXT_INPUT_CLASSES,
  resolveThemedColor,
} from '@/lib/authForm'

type AuthTextFieldProps = TextInputProps

/** Text input styled for the auth flow, with a theme-aware placeholder color baked in. */
export function AuthTextField({ className, ...props }: AuthTextFieldProps) {
  const scheme = useColorScheme()
  const placeholderColor = resolveThemedColor(scheme, AUTH_PLACEHOLDER_COLOR)
  return (
    <TextInput
      placeholderTextColor={placeholderColor}
      className={[AUTH_TEXT_INPUT_CLASSES, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

interface AuthButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  loading?: boolean
  variant?: 'primary' | 'secondary'
}

/** Filled or outlined auth-flow button that swaps its label for a spinner while its action is in flight. */
export function AuthButton({ label, onPress, disabled, loading, variant = 'primary' }: AuthButtonProps) {
  const isPrimary = variant === 'primary'
  const isDisabled = Boolean(disabled) || Boolean(loading)
  return (
    <Pressable
      className={isPrimary ? AUTH_PRIMARY_BUTTON_CLASSES : AUTH_SECONDARY_BUTTON_CLASSES}
      disabled={isDisabled}
      onPress={() => {
        impactHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
      accessibilityLabel={label}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? AUTH_BUTTON_SPINNER_COLOR : undefined} />
      ) : (
        <Text className={`text-base font-semibold ${isPrimary ? 'text-white' : 'text-base-100'}`}>{label}</Text>
      )}
    </Pressable>
  )
}

interface AuthLinkButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  tone?: 'muted' | 'faint'
}

/** Plain-text tap target for secondary auth actions like "Back" or "Sign out". */
export function AuthLinkButton({ label, onPress, disabled, tone = 'muted' }: AuthLinkButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        selectionHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Text className={`text-center ${tone === 'muted' ? 'text-base-400' : 'text-base-500'}`}>{label}</Text>
    </Pressable>
  )
}

/** Inline error banner shown below the header on every auth screen. */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <View className={AUTH_ERROR_BANNER_CLASSES}>
      <Text accessibilityRole="alert" className="text-danger">
        {message}
      </Text>
    </View>
  )
}
