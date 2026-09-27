import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/glass-tab-bar';

/** tv-box's iOS/Android tab bar: a real GlassView-based floating pill (see glass-tab-bar.tsx) instead of the starter template's default NativeTabs, so the actual mobile Liquid Glass proof-of-concept renders in tv-box's own bottom-pill shape. Web keeps the starter's separate app-tabs.web.tsx top nav, out of scope for this pass. */
export default function AppTabs() {
  return (
    <Tabs tabBar={(props) => <GlassTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="members" options={{ title: 'Members' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
