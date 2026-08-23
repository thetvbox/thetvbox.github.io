import { useState } from 'react'
import type { ReactNode } from 'react'
import { UNKNOWN_WATCHED_AT } from '../lib/watched'
import { dateInputToNoonIso, todayLocalDateInput } from '../lib/date'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import InlineConfirmCancel from './InlineConfirmCancel'

/** Text trigger that expands into a date picker + confirm, so any "mark
 * watched" action can land on the right date in History instead of
 * defaulting to today. No native confirm() -- opening this control and
 * tapping Confirm is already the confirmation step. */
export default function DateMarkControl({
  label,
  onConfirm,
  className,
  confirmSummary,
}: {
  label: string
  onConfirm: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>
  className?: string
  /** Shown above the date picker once expanded, e.g. "This will overwrite
   * the date on 3 already-watched episodes." */
  confirmSummary?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayLocalDateInput)
  const [unknownDate, setUnknownDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = todayLocalDateInput()

  useEscapeAndFocusReturn(open, () => setOpen(false))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`text-xs text-accent-400 hover:underline ${className ?? ''}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {confirmSummary && <p className="max-w-xs text-[11px] text-warning">{confirmSummary}</p>}
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="date"
          value={date}
          max={today}
          disabled={unknownDate}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-hairline-strong bg-base-900 px-2 py-1 text-xs text-base-200 disabled:opacity-40"
        />
        <InlineConfirmCancel
          saving={saving}
          savingLabel="Marking…"
          onConfirm={async () => {
            setSaving(true)
            try {
              await onConfirm({
                watchedAt: unknownDate ? UNKNOWN_WATCHED_AT : dateInputToNoonIso(date),
                unknownDate,
              })
              setOpen(false)
            } finally {
              setSaving(false)
            }
          }}
          onCancel={() => setOpen(false)}
        />
      </div>
      <label className="flex items-center gap-1.5 text-[11px] text-base-500">
        <input
          type="checkbox"
          checked={unknownDate}
          onChange={(e) => setUnknownDate(e.target.checked)}
          className="h-3 w-3 rounded border-hairline-strong bg-base-900 accent-accent-500"
        />
        Don&apos;t remember exactly when — just log it as watched a while ago
      </label>
    </div>
  )
}
