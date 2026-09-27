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

/** Wrapping row of toggle Chips for one facet's options, sharing a Set<string> selection model. `counts`, when given, shows each option's live match count and dims+disables one that's currently at zero (and not already selected) instead of removing it -- so combining this facet with another one never makes an option silently vanish. */
export function ChipGroup({
  options,
  selected,
  onToggle,
  labelFor,
  counts,
}: {
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  labelFor?: (value: string) => string
  counts?: Map<string, number>
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const count = counts?.get(opt)
        const isActive = selected.has(opt)
        return (
          <Chip key={opt} active={isActive} onClick={() => onToggle(opt)} disabled={count === 0 && !isActive}>
            {labelFor ? labelFor(opt) : opt}
            {count !== undefined && <span className="ml-1 opacity-70">· {count}</span>}
          </Chip>
        )
      })}
    </div>
  )
}
