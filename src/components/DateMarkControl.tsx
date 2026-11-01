import { useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { UNKNOWN_WATCHED_AT } from '../lib/watched'
import { dateInputToNoonIso, todayLocalDateInput } from '../lib/date'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import InlineConfirmCancel from './InlineConfirmCancel'
import { TRIGGER_SWAP_MOTION } from '../lib/motion'

/** Text trigger that expands into a date picker + confirm, for marking watched on a chosen date. */
export default function DateMarkControl({
  label,
  onConfirm,
  className,
  formClassName,
  confirmSummary,
}: {
  label: string
  onConfirm: (input: { watchedAt: string; unknownDate: boolean }) => Promise<void>
  className?: string
  /** Classes for the open form, e.g. `basis-full` so it drops onto its own line inside a flex row. */
  formClassName?: string
  confirmSummary?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(todayLocalDateInput)
  const [unknownDate, setUnknownDate] = useState(false)
  const [saving, setSaving] = useState(false)
  const today = todayLocalDateInput()

  useEscapeAndFocusReturn(open, () => setOpen(false))

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!open ? (
        <motion.button
          key="trigger"
          type="button"
          onClick={() => {
            setDate(todayLocalDateInput())
            setUnknownDate(false)
            setOpen(true)
          }}
          className={`text-xs text-accent-400 hover:underline ${className ?? ''}`}
          {...TRIGGER_SWAP_MOTION}
        >
          {label}
        </motion.button>
      ) : (
        <motion.div key="form" className={`flex min-w-0 flex-col gap-1.5 ${formClassName ?? ''}`} {...TRIGGER_SWAP_MOTION}>
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
                ;(document.activeElement as HTMLElement | null)?.blur()
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
          <label className="flex items-start gap-1.5 text-[11px] text-base-500">
            <input
              type="checkbox"
              checked={unknownDate}
              onChange={(e) => setUnknownDate(e.target.checked)}
              className="mt-0.5 h-3 w-3 shrink-0 rounded border-hairline-strong bg-base-900 accent-accent-500"
            />
            Don&apos;t remember exactly when — just log it as watched a while ago
          </label>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
