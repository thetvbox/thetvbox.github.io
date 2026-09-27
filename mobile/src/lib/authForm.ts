import type { ColorSchemeName } from 'react-native'

import { resolveScheme } from '@/hooks/use-theme-colors'

export const AUTH_TEXT_INPUT_CLASSES =
  'h-[50px] rounded-2xl border border-hairline-strong px-4 text-base text-base-100'
export const AUTH_PRIMARY_BUTTON_CLASSES =
  'h-[50px] items-center justify-center rounded-2xl bg-accent-500 active:opacity-80 disabled:opacity-50'
export const AUTH_SECONDARY_BUTTON_CLASSES =
  'h-[50px] items-center justify-center rounded-2xl border border-hairline-strong active:opacity-80 disabled:opacity-50'
export const AUTH_ERROR_BANNER_CLASSES = 'rounded-2xl border border-hairline bg-glass px-4 py-3'

export const AUTH_PLACEHOLDER_COLOR = { light: '#56637a', dark: '#6b6b78' } as const
export const AUTH_BUTTON_SPINNER_COLOR = '#fff'

/** Picks the light/dark value of a themed color pair, treating an unknown scheme as light. */
export function resolveThemedColor(scheme: ColorSchemeName, pair: { light: string; dark: string }): string {
  return pair[resolveScheme(scheme)]
}
