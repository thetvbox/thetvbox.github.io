import { Link } from 'react-router-dom'

interface BackButtonProps {
  /** Navigates back programmatically (e.g. real browser history via useGoBack). Mutually exclusive with `to`. */
  onClick?: () => void
  /** Navigates to a fixed route instead of back through history. Mutually exclusive with `onClick`. */
  to?: string
  /** Visible label for the `inline` variant, or the accessible name for the icon-only `floating` variant. */
  label?: string
  /** `inline` (default): a small chevron + text link, for the top of a page's content column.
   *  `floating`: an icon-only glass FAB, for overlaying non-text hero imagery (e.g. ShowDetail's backdrop),
   *  where a plain text link wouldn't stay legible against changing photo content underneath. */
  variant?: 'inline' | 'floating'
  className?: string
}

/** App-wide back control -- one small, consistent chevron used everywhere a page needs to go back, instead of the mix of arrow-character text links, an icon-only circular button, and accent-underlined links this app previously had scattered across pages. */
export default function BackButton({ onClick, to, label = 'Back', variant = 'inline', className = '' }: BackButtonProps) {
  if (variant === 'floating') {
    const floatingClassName = `glass-surface flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base-100 transition-colors duration-200 hover:bg-hover-strong ${className}`
    return to ? (
      <Link to={to} aria-label={label} title={label} className={floatingClassName}>
        <BackGlyph />
      </Link>
    ) : (
      <button type="button" onClick={onClick} aria-label={label} title={label} className={floatingClassName}>
        <BackGlyph />
      </button>
    )
  }

  const inlineClassName = `inline-flex items-center gap-1 text-sm font-medium text-base-400 transition-colors duration-200 hover:text-base-200 ${className}`
  if (to) {
    return (
      <Link to={to} className={inlineClassName}>
        <BackGlyph />
        {label}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className={inlineClassName}>
      <BackGlyph />
      {label}
    </button>
  )
}

function BackGlyph() {
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
      className="shrink-0"
    >
      <path d="M15 6l-6 6 6 6" />
    </svg>
  )
}
