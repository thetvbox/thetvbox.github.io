const SIZE_CLASSES = {
  xs: 'h-3 w-3 border-2',
  sm: 'h-3.5 w-3.5 border-2',
  md: 'h-8 w-8 border-2',
} as const

const TONE_CLASSES = {
  accent: 'border-base-700 border-t-accent-400',
  muted: 'border-base-600 border-t-accent-400',
  current: 'border-current/30 border-t-current',
} as const

/** Shared spinning-ring loader; size/tone cover every variant already in use across the app. */
export default function Spinner({
  size = 'md',
  tone = 'accent',
  className = '',
}: {
  size?: keyof typeof SIZE_CLASSES
  tone?: keyof typeof TONE_CLASSES
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block shrink-0 animate-spin rounded-full ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
    />
  )
}
