import type { ReactNode } from 'react'
import Chip from './Chip'
import DropdownPanel from './DropdownPanel'
import { emptySearchFilters, isSearchFiltersActive } from '../lib/searchFilters'
import type { SearchFilterFacets, SearchFilters } from '../lib/searchFilters'

/** The platform + genre facets for Search, floated behind the "Filters" trigger button. */
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
  function toggle(key: 'genres' | 'platforms', value: string) {
    const next = new Set(filters[key])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange({ ...filters, [key]: next })
  }

  return (
    <DropdownPanel onClose={onClose} label="Filters" className="w-64 p-3">
      {isSearchFiltersActive(filters) && (
        <button
          type="button"
          onClick={() => onChange(emptySearchFilters())}
          className="mb-2 text-xs font-medium text-accent-400 hover:underline"
        >
          Clear
        </button>
      )}

      {facets.platforms.length > 0 && (
        <FilterSection title="Platform">
          {facets.platforms.map((p) => (
            <Chip key={p} active={filters.platforms.has(p)} onClick={() => toggle('platforms', p)}>
              {p}
            </Chip>
          ))}
        </FilterSection>
      )}

      {facets.genres.length > 0 && (
        <FilterSection title="Genre">
          {facets.genres.map((g) => (
            <Chip key={g} active={filters.genres.has(g)} onClick={() => toggle('genres', g)}>
              {g}
            </Chip>
          ))}
        </FilterSection>
      )}
    </DropdownPanel>
  )
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-base-600">{title}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}
