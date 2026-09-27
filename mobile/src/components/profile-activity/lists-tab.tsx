import { SymbolView } from 'expo-symbols'
import { router } from 'expo-router'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'

import { EmptyState } from '@/components/empty-state'
import { useThemeColors } from '@/hooks/use-theme-colors'
import { pluralSuffix } from '@/lib/format'
import { listDetailHref } from '@/lib/navigation'
import type { ShowListWithCount } from '@/types'

interface ListsTabProps {
  lists: ShowListWithCount[]
  isMe: boolean
  username: string
  creatingList: boolean
  newListName: string
  onNewListNameChange: (value: string) => void
  savingList: boolean
  onStartCreating: () => void
  onCancelCreating: () => void
  onCreateList: () => void
}

const PLUS_ICON_SIZE = 12

/** Lists tab body -- the owner's curated lists, plus the new-list form. */
export function ListsTab({
  lists,
  isMe,
  username,
  creatingList,
  newListName,
  onNewListNameChange,
  savingList,
  onStartCreating,
  onCancelCreating,
  onCreateList,
}: ListsTabProps) {
  const theme = useThemeColors()

  return (
    <View>
      {isMe && (
        <View className="mb-4">
          {creatingList ? (
            <View className="flex-row items-center gap-1.5">
              <TextInput
                autoFocus
                value={newListName}
                onChangeText={onNewListNameChange}
                placeholder="List name"
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={onCreateList}
                className="w-full max-w-xs rounded-lg border border-hairline-strong bg-base-900 px-2.5 py-1.5 text-xs text-base-200"
              />
              <Pressable
                disabled={!newListName.trim() || savingList}
                onPress={onCreateList}
                accessibilityRole="button"
                className="shrink-0 rounded-lg bg-accent-500/15 px-2.5 py-1.5"
              >
                {savingList ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <Text className="text-xs font-medium text-accent-300">Create</Text>
                )}
              </Pressable>
              <Pressable onPress={onCancelCreating} accessibilityRole="button">
                <Text className="shrink-0 text-xs text-base-500">Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={onStartCreating}
              accessibilityRole="button"
              className="flex-row items-center gap-1.5 self-start rounded-lg bg-accent-500/15 px-3 py-1.5"
            >
              <SymbolView name="plus" size={PLUS_ICON_SIZE} tintColor={theme.accent} />
              <Text className="text-xs font-medium text-accent-300">New list</Text>
            </Pressable>
          )}
        </View>
      )}

      {lists.length === 0 ? (
        <EmptyState icon="📋" className="mt-6">
          <Text className="text-sm text-base-500">No lists yet.</Text>
        </EmptyState>
      ) : (
        <View className="gap-2">
          {lists.map((l) => (
            <Pressable
              key={l.id}
              onPress={() => router.push(listDetailHref(username, l.id))}
              accessibilityRole="link"
              className="flex-row items-center justify-between rounded-xl border border-hairline bg-base-850/60 p-3 active:bg-base-800/70"
            >
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="text-sm font-medium text-base-100">
                  {l.name}
                </Text>
                {l.description && (
                  <Text numberOfLines={1} className="text-xs text-base-500">
                    {l.description}
                  </Text>
                )}
              </View>
              <Text className="shrink-0 text-xs text-base-500">
                {l.itemCount} show{pluralSuffix(l.itemCount)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  )
}
