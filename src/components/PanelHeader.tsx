import type { ReactNode } from 'react'

/** Shared header row for panels/dropdowns: an optional icon chip, a title, optional actions, and a close button. */
export default function PanelHeader({
  title,
  onClose,
  actions,
  icon,
}: {
  title: ReactNode
  onClose: () => void
  actions?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/15 text-accent-300 ring-1 ring-accent-500/25">
            {icon}
          </span>
        )}
        <p className="truncate text-sm font-semibold text-base-100">{title}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base-500 transition-colors duration-200 hover:bg-hover hover:text-base-200"
        >
          <CloseGlyph />
        </button>
      </div>
    </div>
  )
}

function CloseGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
