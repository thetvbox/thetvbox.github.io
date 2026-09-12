/** One stat tile: a big number with a small label below it. Becomes a button when onClick is
 *  given -- used on Profile to jump straight to the tab a stat summarizes (e.g. "Finished" ->
 *  the History tab), so the numbers double as navigation instead of being purely decorative. */
export default function StatCard({
  label,
  value,
  onClick,
}: {
  label: string
  value: string | number
  onClick?: () => void
}) {
  const className =
    'rounded-xl border border-hairline bg-base-850/60 p-3.5 text-center transition-colors duration-200'

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${className} hover:border-accent-500/40 hover:bg-hover`}>
        <p className="text-lg font-semibold text-base-100 sm:text-xl">{value}</p>
        <p className="mt-0.5 text-[11px] text-base-500">{label}</p>
      </button>
    )
  }

  return (
    <div className={className}>
      <p className="text-lg font-semibold text-base-100 sm:text-xl">{value}</p>
      <p className="mt-0.5 text-[11px] text-base-500">{label}</p>
    </div>
  )
}
