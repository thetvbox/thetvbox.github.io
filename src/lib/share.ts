export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed'

export interface ShareOptions {
  title: string
  text?: string
  url?: string
}

/** True when the Web Share API is present and willing to share this payload. */
function canUseWebShare(nav: Navigator, data: ShareData): boolean {
  if (typeof nav.share !== 'function') return false
  if (typeof nav.canShare !== 'function') return true
  try {
    return nav.canShare(data)
  } catch {
    return false
  }
}

/** Copies text to the clipboard, resolving false rather than throwing on failure. */
async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Shares a link via the native share sheet when available, falling back to copying the URL to the clipboard; never throws. */
export async function shareOrCopyLink(options: ShareOptions): Promise<ShareResult> {
  const url = options.url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const data: ShareData = { title: options.title, text: options.text, url }

  if (canUseWebShare(navigator, data)) {
    try {
      await navigator.share(data)
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
    }
  }

  return (await copyToClipboard(url)) ? 'copied' : 'failed'
}
