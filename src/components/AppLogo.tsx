import { useId } from 'react'

/** The TV Box mark (neutral glass badge + amber play glyph, matching the favicon/home-screen icon), shared by the navbar, login screen, and passcode gate. */
export default function AppLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className}>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--color-icon-bg-1)" />
          <stop offset="1" stopColor="var(--color-icon-bg-2)" />
        </linearGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${id}-bg)`} />
      <rect width="32" height="14" rx="8" fill={`url(#${id}-sheen)`} />
      <rect x="6" y="9" width="20" height="14" rx="3" fill="var(--color-base-950)" />
      <path d="M15 14.5L19 16.5L15 18.5V14.5Z" fill="var(--color-star)" />
    </svg>
  )
}
