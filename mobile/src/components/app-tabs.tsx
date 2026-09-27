import { router, Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { GlassTabBar } from '@/components/glass-tab-bar';
import { useSearch } from '@/contexts/SearchContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

const FILTERS_ICON_SIZE = 22;

/** Native nav-bar button opening the Search filters sheet; hidden until the current results actually have filterable facets. */
function SearchFiltersButton() {
  const { filtersAvailable, filtersActive } = useSearch();
  const scheme = useColorScheme();
  const theme = Colors[scheme === 'unspecified' || !scheme ? 'light' : scheme];
  if (!filtersAvailable) return null;

  return (
    <Pressable
      onPress={() => router.push('/search-filters')}
      accessibilityRole="button"
      accessibilityLabel="Filters"
      className="p-1"
    >
      <SymbolView
        name={filtersActive ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle'}
        size={FILTERS_ICON_SIZE}
        tintColor={theme.accent}
      />
    </Pressable>
  );
}

/** tv-box's iOS/Android tab bar: a real GlassView-based floating pill (see glass-tab-bar.tsx) instead of the starter template's default NativeTabs, so the actual mobile Liquid Glass proof-of-concept renders in tv-box's own bottom-pill shape. Web keeps the starter's separate app-tabs.web.tsx top nav, out of scope for this pass. */
export default function AppTabs() {
  const { setQuery } = useSearch();

  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerShown: true,
          headerSearchBarOptions: {
            placeholder: 'Search for a TV show…',
            onChangeText: (event) => setQuery(event.nativeEvent.text),
            onClose: () => setQuery(''),
          },
          headerRight: () => <SearchFiltersButton />,
        }}
      />
      <Tabs.Screen name="members" options={{ title: 'Members' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
