import type { ReactNode } from 'react'
import Avatar from './Avatar'
import BottomSheet from './BottomSheet'
import { ChipGroup, FilterSection } from './FilterSection'
import PanelHeader from './PanelHeader'
import type { AppUser } from '../types'

interface ActivityFiltersPanelProps {
  members: AppUser[]
  me: AppUser | null
  activeUsername: string | null
  onSelectUsername: (username: string | null) => void
  genres: string[]
  selectedGenres: Set<string>
  onToggleGenre: (genre: string) => void
  onClear: () => void
  onClose: () => void
}

/** Consolidated Activity filters -- who, and (for Now Watching only) which genre -- in one scrollable sheet instead of two separately-floated dropdowns in two different parts of the page. */
export default function ActivityFiltersPanel({
  members,
  me,
  activeUsername,
  onSelectUsername,
  genres,
  selectedGenres,
  onToggleGenre,
  onClear,
  onClose,
}: ActivityFiltersPanelProps) {
  const hasActive = activeUsername !== null || selectedGenres.size > 0

  return (
    <BottomSheet onClose={onClose} label="Filters" className="scroll-fade-bottom max-h-[85vh] overflow-y-auto p-5 sm:p-6">
      <PanelHeader
        title="Filters"
        onClose={onClose}
        actions={
          hasActive && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs font-medium text-accent-400 hover:underline"
            >
              Clear all
            </button>
          )
        }
      />

      {members.length > 1 && (
        <FilterSection title="Person">
          <ul className="space-y-1">
            {members.map((u) => (
              <li key={u.id}>
                <PersonRow
                  active={activeUsername === u.username}
                  onClick={() => onSelectUsername(activeUsername === u.username ? null : u.username)}
                >
                  <Avatar username={u.username} size="xs" />
                  <span>{me?.username === u.username ? 'You' : `@${u.username}`}</span>
                </PersonRow>
              </li>
            ))}
          </ul>
        </FilterSection>
      )}

      {genres.length > 1 && (
        <FilterSection title="Genre · Now Watching">
          <ChipGroup options={genres} selected={selectedGenres} onToggle={onToggleGenre} />
        </FilterSection>
      )}
    </BottomSheet>
  )
}

function PersonRow({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left text-sm font-medium transition-colors duration-200 ${
        active ? 'bg-accent-500/15 text-accent-300' : 'text-base-200 hover:bg-hover'
      }`}
    >
      {children}
    </button>
  )
}
