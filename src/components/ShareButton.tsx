import { useState } from 'react'
import { shareOrCopyLink, type ShareResult } from '../lib/share'

interface ShareButtonProps {
  title: string
  text?: string
  url?: string
  onResult?: (result: ShareResult) => void
  className?: string
}

/** iOS-style share icon button; shares via the native share sheet or copies the link, and reports what happened. */
export default function ShareButton({ title, text, url, onResult, className = '' }: ShareButtonProps) {
  const [sharing, setSharing] = useState(false)

  async function handleClick() {
    if (sharing) return
    setSharing(true)
    try {
      const result = await shareOrCopyLink({ title, text, url })
      onResult?.(result)
    } finally {
      setSharing(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={sharing}
      aria-label="Share"
      title="Share"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline-strong text-base-400 transition-colors duration-200 hover:border-accent-500/40 hover:text-accent-400 disabled:opacity-60 ${className}`}
    >
      <ShareGlyph />
    </button>
  )
}

function ShareGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}
