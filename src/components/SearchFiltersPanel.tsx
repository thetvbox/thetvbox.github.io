import BottomSheet from './BottomSheet'
import { ChipGroup, FilterSection } from './FilterSection'
import PanelHeader from './PanelHeader'
import { emptySearchFilters, isSearchFiltersActive } from '../lib/searchFilters'
import type { SearchFilterCounts, SearchFilterFacets, SearchFilters } from '../lib/searchFilters'

type Category = 'platforms' | 'genres'

/** The platform + genre facets for Search, both as always-visible scrollable sections in one sheet instead of a small floating dropdown that hid one category behind the other. */
export default function SearchFiltersPanel({
  facets,
  filters,
  counts,
  onChange,
  onClose,
}: {
  facets: SearchFilterFacets
  filters: SearchFilters
  counts?: SearchFilterCounts
  onChange: (filters: SearchFilters) => void
  onClose: () => void
}) {
  function toggle(category: Category, value: string) {
    const next = new Set(filters[category])
    if (next.has(value)) next.delete(value)
    else next.add(value)
    onChange({ ...filters, [category]: next })
  }

  return (
    <BottomSheet onClose={onClose} label="Filters" className="scroll-fade-bottom max-h-[85vh] overflow-y-auto p-5 sm:p-6">
      <PanelHeader
        title="Filters"
        onClose={onClose}
        actions={
          isSearchFiltersActive(filters) && (
            <button
              type="button"
              onClick={() => onChange(emptySearchFilters())}
              className="text-xs font-medium text-accent-400 hover:underline"
            >
              Clear all
            </button>
          )
        }
      />

      {facets.platforms.length > 0 && (
        <FilterSection title="Platform">
          <ChipGroup
            options={facets.platforms}
            selected={filters.platforms}
            onToggle={(v) => toggle('platforms', v)}
            counts={counts?.platforms}
          />
        </FilterSection>
      )}

      {facets.genres.length > 0 && (
        <FilterSection title="Genre">
          <ChipGroup
            options={facets.genres}
            selected={filters.genres}
            onToggle={(v) => toggle('genres', v)}
            counts={counts?.genres}
          />
        </FilterSection>
      )}
    </BottomSheet>
  )
}
