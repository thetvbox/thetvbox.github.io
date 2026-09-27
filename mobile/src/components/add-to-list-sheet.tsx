import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PickerSheet } from '@/components/picker-sheet';
import { Toast } from '@/components/toast';
import { addShowToList, createList, deleteList, fetchListsForUser, removeShowFromList } from '@/lib/lists';
import { impactHaptic } from '@/lib/haptics';
import { useToast } from '@/hooks/useToast';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { ShowListWithCount } from '@/types';

interface AddToListSheetProps {
  visible: boolean;
  userId: string;
  showId: number;
  showName: string;
  showPosterPath: string | null;
  memberOf: Set<string>;
  onChange: (memberOf: Set<string>) => void;
  onClose: () => void;
}

/** Native sheet for adding/removing a show from the user's lists, or creating a new one. */
export function AddToListSheet({ visible, userId, showId, showName, showPosterPath, memberOf, onChange, onClose }: AddToListSheetProps) {
  const [lists, setLists] = useState<ShowListWithCount[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const { toast, showUndo, showError, dismiss } = useToast();
  const theme = useThemeColors();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadError(false);
    fetchListsForUser(userId)
      .then((data) => {
        if (!cancelled) setLists(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  async function handleUndoRemove(listId: string) {
    setSavingId(listId);
    try {
      await addShowToList({ listId, showId, showName, showPosterPath });
      const next = new Set(memberOf);
      next.add(listId);
      onChange(next);
      setLists((prev) => prev?.map((l) => (l.id === listId ? { ...l, itemCount: l.itemCount + 1 } : l)) ?? prev);
    } catch {
      showError('Failed to undo. Try adding it back manually.');
    } finally {
      setSavingId(null);
    }
  }

  async function handleToggle(listId: string) {
    impactHaptic();
    setSavingId(listId);
    try {
      if (memberOf.has(listId)) {
        const removedList = lists?.find((l) => l.id === listId);
        try {
          await removeShowFromList(listId, showId);
        } catch {
          showError('Failed to remove from list. Try again.');
          return;
        }
        const next = new Set(memberOf);
        next.delete(listId);
        onChange(next);
        setLists((prev) => prev?.map((l) => (l.id === listId ? { ...l, itemCount: l.itemCount - 1 } : l)) ?? prev);
        if (removedList) showUndo(`Removed from "${removedList.name}"`, () => handleUndoRemove(listId));
      } else {
        try {
          await addShowToList({ listId, showId, showName, showPosterPath });
        } catch {
          showError('Failed to add to list. Try again.');
          return;
        }
        const next = new Set(memberOf);
        next.add(listId);
        onChange(next);
        setLists((prev) => prev?.map((l) => (l.id === listId ? { ...l, itemCount: l.itemCount + 1 } : l)) ?? prev);
      }
    } finally {
      setSavingId(null);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setSavingId('new');
    try {
      const list = await createList(userId, name);
      try {
        await addShowToList({ listId: list.id, showId, showName, showPosterPath });
      } catch {
        await deleteList(list.id).catch(() => {});
        throw new Error('add-to-new-list-failed');
      }
      setLists((prev) => [{ ...list, itemCount: 1 }, ...(prev ?? [])]);
      onChange(new Set([...memberOf, list.id]));
      setNewName('');
      setCreating(false);
    } catch {
      showError('Failed to create list. Try again.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <PickerSheet visible={visible} title="Add to a list" onClose={onClose}>
      <ScrollView className="flex-1">
        {lists === null ? (
          <Text className="px-1 py-2 text-xs text-base-500">
            {loadError ? "Couldn't load your lists. Try closing and reopening this panel." : 'Loading your lists…'}
          </Text>
        ) : lists.length === 0 ? (
          <Text className="px-1 py-2 text-xs text-base-500">No lists yet -- create your first one below.</Text>
        ) : (
          <View className="gap-0.5">
            {lists.map((list) => (
              <Pressable
                key={list.id}
                disabled={savingId === list.id}
                onPress={() => handleToggle(list.id)}
                className="flex-row items-center justify-between rounded-lg px-1.5 py-2.5"
              >
                <Text numberOfLines={1} className="flex-1 text-sm text-base-200">
                  {list.name} <Text className="text-base-500">· {list.itemCount}</Text>
                </Text>
                {savingId === list.id ? (
                  <ActivityIndicator size="small" />
                ) : memberOf.has(list.id) ? (
                  <SymbolView name="checkmark.circle.fill" size={18} tintColor={theme.accent} />
                ) : (
                  <SymbolView name="circle" size={18} tintColor={theme.textSecondary} />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {creating ? (
        <View className="mt-2 flex-row items-center gap-1.5">
          <TextInput
            autoFocus
            value={newName}
            onChangeText={setNewName}
            placeholder="List name"
            placeholderTextColor={theme.textSecondary}
            onSubmitEditing={handleCreate}
            className="flex-1 rounded-lg border border-hairline-strong bg-base-900 px-2.5 py-2 text-sm text-base-200"
          />
          <Pressable
            disabled={!newName.trim() || savingId === 'new'}
            onPress={handleCreate}
            className="shrink-0 rounded-lg bg-accent-500/15 px-3 py-2"
            accessibilityRole="button"
          >
            <Text className="text-xs font-medium text-accent-300">Create</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setCreating(true)} className="mt-2" accessibilityRole="button">
          <Text className="text-xs text-accent-400">+ New list</Text>
        </Pressable>
      )}

      <Toast toast={toast} onDismiss={dismiss} />
    </PickerSheet>
  );
}
