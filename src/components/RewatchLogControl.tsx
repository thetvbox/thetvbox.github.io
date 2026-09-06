import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { dateInputToNoonIso, todayLocalDateInput } from '../lib/date'
import { useEscapeAndFocusReturn } from '../hooks/useEscapeAndFocusReturn'
import InlineConfirmCancel from './InlineConfirmCancel'
import { TRIGGER_SWAP_MOTION } from '../lib/motion'

/** Expand-to-confirm control for logging a rewatch on a chosen date. */
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

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!open ? (
        <motion.button
          key="trigger"
          type="button"
          onClick={() => {
            setDate(todayLocalDateInput())
            setOpen(true)
          }}
          className="text-xs text-accent-400 hover:underline"
          {...TRIGGER_SWAP_MOTION}
        >
          {count > 0 ? `Log another rewatch (${count} so far)` : 'Log a rewatch'}
        </motion.button>
      ) : (
        <motion.div key="form" className="flex flex-wrap items-center gap-1.5" {...TRIGGER_SWAP_MOTION}>
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
              ;(document.activeElement as HTMLElement | null)?.blur()
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
        </motion.div>
      )}
    </AnimatePresence>
  )
}
