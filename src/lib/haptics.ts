let hapticInput: HTMLInputElement | null = null

/** Lazily creates (and reuses) the hidden checkbox-switch element the haptic trick toggles. */
function getHapticInput(): HTMLInputElement | null {
  if (typeof document === 'undefined') return null
  if (hapticInput) return hapticInput
  try {
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.setAttribute('aria-hidden', 'true')
    input.tabIndex = -1
    input.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;'
    document.body.appendChild(input)
    hapticInput = input
    return input
  } catch {
    return null
  }
}

/** Fires iOS's native Taptic Engine "toggle" haptic via Safari 17.4+'s `<input type="checkbox" switch>` trick; a safe no-op everywhere else. */
export function triggerHaptic(): void {
  try {
    getHapticInput()?.click()
  } catch {}
}
