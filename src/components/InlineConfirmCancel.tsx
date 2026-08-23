/** Shared Confirm/Cancel button pair for inline expand-to-confirm controls
 * (DateMarkControl, RewatchLogControl) -- no native confirm(), since opening
 * the control and tapping Confirm is already the confirmation step. */
export default function InlineConfirmCancel({
  saving,
  savingLabel,
  onConfirm,
  onCancel,
}: {
  saving: boolean
  savingLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <>
      <button
        type="button"
        disabled={saving}
        onClick={onConfirm}
        className="rounded-lg bg-accent-500/15 px-2.5 py-1 text-xs font-medium text-accent-300 ring-1 ring-accent-500/40 transition-opacity duration-150 disabled:opacity-60"
      >
        {saving ? savingLabel : 'Confirm'}
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-base-500 hover:text-base-300">
        Cancel
      </button>
    </>
  )
}
