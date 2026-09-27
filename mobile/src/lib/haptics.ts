import * as Haptics from 'expo-haptics'

/** Light tactile tick for a toggle/selection change (filter chips, segmented controls). */
export async function selectionHaptic(): Promise<void> {
  try {
    await Haptics.selectionAsync()
  } catch {}
}

/** Tactile confirmation for a committed action (submitting search, saving a change). */
export async function impactHaptic(style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light): Promise<void> {
  try {
    await Haptics.impactAsync(style)
  } catch {}
}
