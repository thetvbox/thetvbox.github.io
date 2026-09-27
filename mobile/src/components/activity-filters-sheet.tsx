import type { ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { Avatar } from '@/components/avatar'
import { ChipGroup, FilterSection } from '@/components/filter-section'
import { PickerSheet } from '@/components/picker-sheet'
import { selectionHaptic } from '@/lib/haptics'
import type { AppUser } from '@/types'

interface ActivityFiltersSheetProps {
  visible: boolean
  members: AppUser[]
  me: AppUser | null
  activeUsername: string | null
  onSelectUsername: (username: string | null) => void
  personCounts: Map<string, number>
  genres: string[]
  selectedGenres: Set<string>
  onToggleGenre: (genre: string) => void
  genreCounts: Map<string, number>
  onClear: () => void
  onClose: () => void
}

/** Person + Genre filter sheet shared by the Activity feed and its Now Watching grid. */
export function ActivityFiltersSheet({
  visible,
  members,
  me,
  activeUsername,
  onSelectUsername,
  personCounts,
  genres,
  selectedGenres,
  onToggleGenre,
  genreCounts,
  onClear,
  onClose,
}: ActivityFiltersSheetProps) {
  const hasActive = activeUsername !== null || selectedGenres.size > 0

  return (
    <PickerSheet
      visible={visible}
      title="Filters"
      onClose={onClose}
      headerActions={
        hasActive ? (
          <Pressable onPress={onClear} accessibilityRole="button" accessibilityLabel="Clear all filters">
            <Text className="text-sm font-medium text-accent-400">Clear all</Text>
          </Pressable>
        ) : undefined
      }
    >
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        {members.length > 1 && (
          <FilterSection title="Person" first>
            <View className="gap-0.5">
              {members.map((u) => {
                const active = activeUsername === u.username
                const count = personCounts.get(u.username)
                const disabled = count === 0 && !active
                return (
                  <PersonRow
                    key={u.id}
                    active={active}
                    disabled={disabled}
                    onPress={() => onSelectUsername(active ? null : u.username)}
                  >
                    <Avatar username={u.username} size="xs" />
                    <Text
                      numberOfLines={1}
                      className={`flex-1 text-sm font-medium ${
                        active ? 'text-accent-300' : disabled ? 'text-base-600' : 'text-base-200'
                      }`}
                    >
                      {me?.username === u.username ? 'You' : `@${u.username}`}
                    </Text>
                    {count !== undefined && <Text className="text-xs text-base-500">{count}</Text>}
                  </PersonRow>
                )
              })}
            </View>
          </FilterSection>
        )}

        {genres.length > 1 && (
          <FilterSection title="Genre · Now Watching" first={members.length <= 1}>
            <ChipGroup options={genres} selected={selectedGenres} onToggle={onToggleGenre} counts={genreCounts} />
          </FilterSection>
        )}
      </ScrollView>
    </PickerSheet>
  )
}

function PersonRow({
  active,
  disabled = false,
  onPress,
  children,
}: {
  active: boolean
  disabled?: boolean
  onPress: () => void
  children: ReactNode
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        selectionHaptic()
        onPress()
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      className={`flex-row items-center gap-2.5 rounded-lg p-1.5 ${active ? 'bg-accent-500/15' : ''} ${disabled ? 'opacity-40' : ''}`}
    >
      {children}
    </Pressable>
  )
}
