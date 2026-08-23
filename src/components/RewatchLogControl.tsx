import { useState } from 'react'
import { dateInputToNoonIso, todayLocalDateInput } from '../lib/date'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import InlineConfirmCancel from './InlineConfirmCancel'

/** Expand-to-confirm control for logging a rewatch -- same shape as
 * DateMarkControl (no native confirm(): opening it and tapping Confirm *is*
 * the confirmation) so a stray double-tap can't insert a second rewatch.
 * logRewatch is a plain insert since rewatching twice is the point of the
 * log, so nothing else guards against an accidental extra tap. Doesn't reuse
 * DateMarkControl directly: its "date unknown" checkbox doesn't apply here. */
export default function RewatchLogControl({
  count,
  onConfirm,
}: {
  count: number
  onConfirm: (rewatchedAt: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayLocalDateInput)
  const [saving, setSaving] = useState(false)
  const today = todayLocalDateInput()

  useEscapeAndFocusReturn(open, () => setOpen(false))

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          // Reset to today -- this control stays mounted across repeat
          // opens, so without this it'd keep the last-used date.
          setDate(todayLocalDateInput())
          setOpen(true)
        }}
        className="text-xs text-accent-400 hover:underline"
      >
        {count > 0 ? `Log another rewatch (${count} so far)` : 'Log a rewatch'}
      </button>
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        aria-label="Rewatch date"
        value={date}
        max={today}
        onChange={(e) => setDate(e.target.value)}
        className="rounded-lg border border-hairline-strong bg-base-900 px-2 py-1 text-xs text-base-200"
      />
      <InlineConfirmCancel
        saving={saving}
        savingLabel="Logging…"
        onConfirm={async () => {
          setSaving(true)
          try {
            await onConfirm(dateInputToNoonIso(date))
          } finally {
            setSaving(false)
            setOpen(false)
          }
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  )
}
