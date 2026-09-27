import { Stack, router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ErrorText } from '@/components/error-text'
import { EmptyState } from '@/components/empty-state'
import { PosterGrid } from '@/components/poster-grid'
import { PosterTile } from '@/components/poster-tile'
import { ShareButton } from '@/components/share-button'
import { Toast } from '@/components/toast'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/useToast'
import { BottomTabInset } from '@/constants/theme'
import { PROFILE_LISTS_TAB_QUERY } from '@/lib/constants'
import { errorMessage, pluralSuffix } from '@/lib/format'
import { addShowToList, deleteList, fetchList, fetchListItems, removeShowFromList } from '@/lib/lists'
import { showHref } from '@/lib/navigation'
import { listDetailShareUrl } from '@/lib/routes'
import { fetchUserByUsername } from '@/lib/users'
import type { AppUser, ShowList, ShowListItem } from '@/types'

const LIST_DETAIL_BOTTOM_PADDING = BottomTabInset + 40

/** A member's show list: poster grid, share, and (when it's your own) remove-item and delete-list controls -- ported from web's ListDetail.tsx. */
export default function ListDetailScreen() {
  const { username, listId } = useLocalSearchParams<{ username: string; listId: string }>()
  const { user: me } = useAuth()

  const [profile, setProfile] = useState<AppUser | null | undefined>(undefined)
  const [list, setList] = useState<ShowList | null | undefined>(undefined)
  const [items, setItems] = useState<ShowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { toast, showUndo, showError, showInfo, dismiss } = useToast()

  useEffect(() => {
    if (!username || !listId) return
    let cancelled = false
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true)
    setLoadError(null)
    Promise.all([fetchUserByUsername(username), fetchList(listId), fetchListItems(listId)])
      .then(([userRow, listRow, itemRows]) => {
        if (cancelled) return
        setProfile(userRow)
        if (listRow && userRow && listRow.user_id !== userRow.id) {
          setList(null)
          setItems([])
          return
        }
        setList(listRow)
        setItems(itemRows)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoadError(errorMessage(err, 'Failed to load this list.'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [username, listId])

  const isMine = Boolean(me && profile && me.id === profile.id)

  async function handleRemove(item: ShowListItem) {
    if (!listId) return
    setItems((prev) => prev.filter((i) => i.show_id !== item.show_id))
    try {
      await removeShowFromList(listId, item.show_id)
    } catch {
      setItems((prev) => [item, ...prev])
      showError(`Failed to remove ${item.show_name}. Try again.`)
      return
    }
    showUndo(`Removed ${item.show_name} from this list`, async () => {
      if (!listId) return
      try {
        const saved = await addShowToList({
          listId,
          showId: item.show_id,
          showName: item.show_name,
          showPosterPath: item.show_poster_path,
        })
        setItems((prev) => [saved, ...prev])
      } catch {
        showError('Failed to undo. Try adding it back manually.')
      }
    })
  }

  async function handleDeleteList() {
    if (!listId || !username) return
    setDeleting(true)
    try {
      await deleteList(listId)
      router.replace(`/profile?${PROFILE_LISTS_TAB_QUERY}`)
    } catch {
      setDeleting(false)
      setConfirmingDelete(false)
      showError('Failed to delete this list. Try again.')
    }
  }

  if (!loading && (loadError || profile === null || list === null)) {
    return (
      <View className="flex-1 items-center justify-center bg-base-950 px-6">
        <Stack.Screen options={{ title: 'List' }} />
        <ErrorText className="text-center text-sm">{loadError ?? 'List not found.'}</ErrorText>
      </View>
    )
  }

  return (
    <View className="flex-1 bg-base-950">
      <Stack.Screen options={{ title: list?.name ?? 'List' }} />
      <SafeAreaView edges={['bottom']} className="flex-1">
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: LIST_DETAIL_BOTTOM_PADDING }}>
          {loading ? (
            <View className="gap-2">
              <View className="h-6 w-48 rounded bg-base-800" />
              <View className="h-3 w-64 rounded bg-base-800" />
            </View>
          ) : (
            list && (
              <>
                <View className="mb-6 flex-row flex-wrap items-start justify-between gap-3">
                  <View className="min-w-0 flex-1">
                    <Text className="text-xl font-semibold text-base-100">{list.name}</Text>
                    {list.description && <Text className="mt-1 text-sm text-base-400">{list.description}</Text>}
                    <Text className="mt-1 text-xs text-base-500">
                      {items.length} show{pluralSuffix(items.length)}
                    </Text>
                  </View>
                  <View className="shrink-0 flex-row items-center gap-2">
                    <ShareButton
                      title={list.name}
                      text={`${list.name} on TV Box`}
                      url={username && listId ? listDetailShareUrl(username, listId) : undefined}
                      onResult={(result) => {
                        if (result === 'copied') showInfo('Link copied to clipboard')
                        if (result === 'failed') showError('Failed to share this list.')
                      }}
                    />
                    {isMine &&
                      (confirmingDelete ? (
                        <View className="shrink-0 flex-row items-center gap-1.5">
                          <Text className="text-xs text-base-500">Delete this list?</Text>
                          <Pressable
                            disabled={deleting}
                            onPress={handleDeleteList}
                            accessibilityRole="button"
                            accessibilityLabel="Confirm delete"
                            className="rounded-lg bg-danger/15 px-2.5 py-1.5"
                          >
                            <Text className="text-xs font-medium text-danger">{deleting ? 'Deleting…' : 'Confirm'}</Text>
                          </Pressable>
                          <Pressable
                            disabled={deleting}
                            onPress={() => setConfirmingDelete(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Cancel delete"
                          >
                            <Text className="text-xs text-base-500">Cancel</Text>
                          </Pressable>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => setConfirmingDelete(true)}
                          accessibilityRole="button"
                          accessibilityLabel="Delete list"
                          className="shrink-0 rounded-lg border border-hairline-strong px-3 py-1.5"
                        >
                          <Text className="text-xs text-base-400">Delete list</Text>
                        </Pressable>
                      ))}
                  </View>
                </View>

                {items.length === 0 ? (
                  <EmptyState icon="📋">
                    <Text className="max-w-xs text-center text-sm text-base-500">
                      Nothing on this list yet. Add shows from any show&apos;s page.
                    </Text>
                  </EmptyState>
                ) : (
                  <PosterGrid
                    data={items}
                    keyExtractor={(item) => item.id}
                    renderItem={(item) => (
                      <View>
                        <Pressable
                          onPress={() => router.push(showHref(item.show_id))}
                          accessibilityRole="link"
                          accessibilityLabel={item.show_name}
                          className="active:opacity-80"
                        >
                          <PosterTile posterPath={item.show_poster_path} name={item.show_name} />
                          <Text numberOfLines={1} className="mt-2 text-sm font-medium text-base-100">
                            {item.show_name}
                          </Text>
                        </Pressable>
                        {isMine && (
                          <Pressable
                            onPress={() => handleRemove(item)}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${item.show_name} from this list`}
                            className="absolute right-1.5 top-1.5 h-7 w-7 items-center justify-center rounded-full bg-black/60"
                          >
                            <SymbolView name="xmark" size={13} tintColor="#ffffff" />
                          </Pressable>
                        )}
                      </View>
                    )}
                  />
                )}
              </>
            )
          )}
        </ScrollView>
      </SafeAreaView>
      <Toast toast={toast} onDismiss={dismiss} />
    </View>
  )
}
