/** One stat tile (big number + small label) -- used across Compare, Recap,
 * and a profile's own stats row. Previously defined identically in each of
 * those three files. */
export default function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-hairline bg-base-850/60 p-3.5 text-center">
      <p className="text-lg font-semibold text-base-100 sm:text-xl">{value}</p>
      <p className="mt-0.5 text-[11px] text-base-500">{label}</p>
    </div>
  )
}
