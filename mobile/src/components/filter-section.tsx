import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

import { Chip } from '@/components/chip'

interface FilterSectionProps {
  title: string
  first?: boolean
  children: ReactNode
}

/** Shared "uppercase label + content" wrapper for one facet inside a filters sheet. */
export function FilterSection({ title, first = false, children }: FilterSectionProps) {
  return (
    <View className={first ? '' : 'mt-4'}>
      <Text className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-600">{title}</Text>
      {children}
    </View>
  )
}

interface ChipGroupProps {
  options: string[]
  selected: Set<string>
  onToggle: (value: string) => void
  counts?: Map<string, number>
}

/** Wrapping row of toggle Chips for one facet's options, sharing a Set<string> selection model. `counts`, when given, shows each option's live match count and disables one that's currently at zero (and not already selected) instead of removing it, so combining this facet with another one never makes an option silently vanish. */
export function ChipGroup({ options, selected, onToggle, counts }: ChipGroupProps) {
  return (
    <View className="flex-row flex-wrap gap-1.5">
      {options.map((opt) => {
        const count = counts?.get(opt)
        const isActive = selected.has(opt)
        return (
          <Chip key={opt} active={isActive} onPress={() => onToggle(opt)} disabled={count === 0 && !isActive}>
            {opt}
            {count !== undefined && <Text className="opacity-70"> · {count}</Text>}
          </Chip>
        )
      })}
    </View>
  )
}
