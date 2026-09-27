import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { ProviderPickerSheet } from '@/components/provider-picker-sheet';
import { openExternalLink } from '@/lib/browser';
import { providerLogoUrl } from '@/lib/tmdb';
import type { StreamingOverride, TmdbProviderListItem, TmdbWatchProviderRegion } from '@/types';

interface ShowDetailStreamingProps {
  effectiveProvider: { provider_name: string; logo_path: string | null } | null;
  loading: boolean;
  override: StreamingOverride | null;
  regionProviders: TmdbWatchProviderRegion | null;
  region: string;
  onPickProvider: (p: TmdbProviderListItem) => Promise<void>;
  onClearOverride: () => void;
}

/** "Where to watch" -- the group's resolved answer, correctable by anyone via a native picker sheet. */
export function ShowDetailStreaming({ effectiveProvider, loading, override, regionProviders, region, onPickProvider, onClearOverride }: ShowDetailStreamingProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  if (loading) return null;
  const logo = effectiveProvider ? providerLogoUrl(effectiveProvider.logo_path) : null;

  return (
    <View className="mt-6 max-w-md rounded-2xl border border-hairline bg-base-850/40 p-4">
      <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-500">Streaming</Text>
      {effectiveProvider ? (
        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-base-800">
            {logo ? (
              <Image source={{ uri: logo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center p-0.5">
                <Text className="text-center text-[8px] leading-tight text-base-400">{effectiveProvider.provider_name}</Text>
              </View>
            )}
          </View>
          <View>
            <Text className="text-sm font-medium text-base-100">{effectiveProvider.provider_name}</Text>
            {override && <Text className="text-[11px] text-base-500">Set manually</Text>}
          </View>
        </View>
      ) : regionProviders ? (
        <Text className="text-sm text-base-500">Not free to stream in your region right now.</Text>
      ) : (
        <Text className="text-sm text-base-500">Streaming info isn&apos;t available for this show yet.</Text>
      )}

      <View className="mt-1.5 flex-row flex-wrap items-center gap-x-3 gap-y-1">
        <Pressable onPress={() => setPickerOpen(true)} accessibilityRole="button">
          <Text className="text-[11px] text-accent-400">{effectiveProvider ? 'Not right? Fix it' : 'Know where? Set it'}</Text>
        </Pressable>
        {override && (
          <Pressable onPress={onClearOverride} accessibilityRole="button">
            <Text className="text-[11px] text-base-500">Reset to automatic</Text>
          </Pressable>
        )}
        {regionProviders && (
          <Pressable onPress={() => openExternalLink(regionProviders.link)} accessibilityRole="link">
            <Text className="text-[11px] text-base-500">See all options (JustWatch)</Text>
          </Pressable>
        )}
      </View>

      <ProviderPickerSheet visible={pickerOpen} region={region} onPick={onPickProvider} onClose={() => setPickerOpen(false)} />
    </View>
  );
}
