import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { PickerSheet } from '@/components/picker-sheet';
import { PROVIDER_PICKER_MAX_RESULTS } from '@/lib/constants';
import { getAllTvProviders, providerLogoUrl } from '@/lib/tmdb';
import { impactHaptic } from '@/lib/haptics';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { TmdbProviderListItem } from '@/types';

const WELL_KNOWN_PROVIDER_PREFIXES = [
  'Netflix',
  'HBO Max',
  'Disney Plus',
  'Hulu',
  'Amazon Prime Video',
  'Apple TV',
  'Paramount Plus',
  'Peacock',
  'Starz',
  'AMC+',
  'Discovery',
  'Crunchyroll',
];

/** Returns a sort rank where lower is more recognizable; unlisted providers sort last. */
function wellKnownRank(providerName: string): number {
  const idx = WELL_KNOWN_PROVIDER_PREFIXES.findIndex((prefix) => providerName.startsWith(prefix));
  return idx === -1 ? WELL_KNOWN_PROVIDER_PREFIXES.length : idx;
}

interface ProviderPickerSheetProps {
  visible: boolean;
  region: string;
  onPick: (provider: TmdbProviderListItem) => Promise<void>;
  onClose: () => void;
}

/** Native sheet for manually correcting "where to watch", backed by TMDB's full provider list. */
export function ProviderPickerSheet({ visible, region, onPick, onClose }: ProviderPickerSheetProps) {
  const [query, setQuery] = useState('');
  const [allProviders, setAllProviders] = useState<TmdbProviderListItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const theme = useThemeColors();

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getAllTvProviders(region)
      .then((data) => {
        if (!cancelled) setAllProviders(data);
      })
      .catch(() => {
        if (!cancelled) setAllProviders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, region]);

  const matches = useMemo(() => {
    if (!allProviders) return [];
    const q = query.trim().toLowerCase();
    const filtered = q ? allProviders.filter((p) => p.provider_name.toLowerCase().includes(q)) : allProviders;
    return filtered.slice().sort((a, b) => wellKnownRank(a.provider_name) - wellKnownRank(b.provider_name)).slice(0, PROVIDER_PICKER_MAX_RESULTS);
  }, [allProviders, query]);

  return (
    <PickerSheet visible={visible} title="Where to watch" onClose={onClose}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search platforms (Netflix, Hulu, Max...)"
        placeholderTextColor={theme.textSecondary}
        className="rounded-lg border border-hairline-strong bg-base-900 px-2.5 py-2 text-sm text-base-200"
      />
      <ScrollView className="mt-2 flex-1">
        {loading ? (
          <Text className="px-1 py-2 text-xs text-base-500">Loading platforms…</Text>
        ) : matches.length === 0 ? (
          <Text className="px-1 py-2 text-xs text-base-500">No matches.</Text>
        ) : (
          <View className="gap-0.5">
            {matches.map((p) => (
              <Pressable
                key={p.provider_id}
                disabled={saving}
                onPress={async () => {
                  impactHaptic();
                  setSaving(true);
                  try {
                    await onPick(p);
                    onClose();
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex-row items-center gap-2.5 rounded-lg px-1.5 py-2"
              >
                <View className="h-7 w-7 shrink-0 overflow-hidden rounded bg-base-800">
                  {providerLogoUrl(p.logo_path) && <Image source={{ uri: providerLogoUrl(p.logo_path)! }} style={{ width: '100%', height: '100%' }} contentFit="cover" />}
                </View>
                <Text className="flex-1 text-sm text-base-200">{p.provider_name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
      {saving && <ActivityIndicator size="small" className="mt-2" />}
    </PickerSheet>
  );
}
