import type { ReactNode } from 'react'

/** Shared header row for panels/dropdowns: a title, optional secondary actions, and an icon close button. */
export default function PanelHeader({
  title,
  onClose,
  actions,
}: {
  title: ReactNode
  onClose: () => void
  actions?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <p className="text-sm font-semibold text-base-100">{title}</p>
      <div className="flex shrink-0 items-center gap-2">
        {actions}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          title="Close"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base-500 transition-colors duration-200 hover:bg-hover hover:text-base-200"
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
