import { useState } from 'react'
import Chip from './Chip'
import DropdownPanel from './DropdownPanel'
import SegmentedControl from './SegmentedControl'
import { emptySearchFilters, isSearchFiltersActive } from '../lib/searchFilters'
import type { SearchFilterFacets, SearchFilters } from '../lib/searchFilters'

type Category = 'platforms' | 'genres'

const CATEGORY_OPTIONS = [
  { value: 'platforms', label: 'Platform' },
  { value: 'genres', label: 'Genre' },
] as const

/** The platform + genre facets for Search, floated behind the "Filters" trigger button -- one category's chip list shown at a time (picked via the segmented control) so the panel never has to grow tall enough to fight the bottom tab bar for space. */
export default function SearchFiltersPanel({
  facets,
  filters,
  onChange,
  onClose,
}: {
  facets: SearchFilterFacets
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClose: () => void
}) {
  const hasBoth = facets.platforms.length > 0 && facets.genres.length > 0
  const [category, setCategory] = useState<Category>(facets.platforms.length > 0 ? 'platforms' : 'genres')
  const activeCategory: Category = hasBoth ? category : facets.platforms.length > 0 ? 'platforms' : 'genres'
  const options = activeCategory === 'platforms' ? facets.platforms : facets.genres

  function toggle(value: string) {
    const next = new Set(filters[activeCategory])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange({ ...filters, [activeCategory]: next })
  }

  return (
    <DropdownPanel onClose={onClose} label="Filters" className="w-72 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        {hasBoth ? (
          <SegmentedControl options={CATEGORY_OPTIONS} value={category} onChange={setCategory} label="Filter category" />
        ) : (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-base-600">
            {activeCategory === 'platforms' ? 'Platform' : 'Genre'}
          </p>
        )}
        {isSearchFiltersActive(filters) && (
          <button
            type="button"
            onClick={() => onChange(emptySearchFilters())}
            className="shrink-0 text-xs font-medium text-accent-400 hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="scroll-fade-bottom max-h-64 overflow-y-auto pb-1">
        <div className="flex flex-wrap gap-1.5">
          {options.map((value) => (
            <Chip key={value} active={filters[activeCategory].has(value)} onClick={() => toggle(value)}>
              {value}
            </Chip>
          ))}
        </div>
      </div>
    </DropdownPanel>
  )
}
