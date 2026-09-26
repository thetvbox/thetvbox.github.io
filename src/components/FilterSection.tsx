import type { ReactNode } from 'react'
import Chip from './Chip'

/** Shared "uppercase label + content" wrapper for one facet inside a filters panel (Activity/Search/History). */
export function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-600">{title}</p>
      {children}
    </div>
  )
}

/** Wrapping row of toggle Chips for one facet's options, sharing a Set<string> selection model. */
export function ChipGroup({
  options,
  selected,
  onToggle,
  labelFor,
}: {
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  labelFor?: (value: string) => string
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <Chip key={opt} active={selected.has(opt)} onClick={() => onToggle(opt)}>
          {labelFor ? labelFor(opt) : opt}
        </Chip>
      ))}
    </div>
  )
}
