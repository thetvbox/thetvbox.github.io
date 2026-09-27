import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppLogo } from '@/components/app-logo';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface AuthHeroProps {
  title: string;
  tagline: string;
}

const BADGE_SIZE = 84;

/** Branded header shared by the login and account-setup screens: the TV Box mark cropped into a clean circular badge with a soft pulsing native shadow-glow in its own brand color, a title, and a tagline. */
export function AuthHero({ title, tagline }: AuthHeroProps) {
  const theme = useThemeColors();
  const glowOpacity = useSharedValue(0.35);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.75, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [glowOpacity]);

  // The glow is a real native shadow cast by this (opaque) circle, not a separate flat disc --
  // shadow* only renders correctly against a non-transparent background, and clipping that same
  // view would clip its own shadow too, so the clip lives on a separate inner view instead.
  const glowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <Animated.View entering={FadeInDown.duration(520).springify().damping(16)} className="items-center gap-3">
      <Animated.View
        style={[
          glowStyle,
          {
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: BADGE_SIZE / 2,
            backgroundColor: theme.iconBg2,
            shadowColor: theme.star,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 0 },
          },
        ]}
      >
        <View
          style={{
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: BADGE_SIZE / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppLogo size={BADGE_SIZE * 1.08} />
        </View>
      </Animated.View>
      <View className="items-center gap-1">
        <Text className="text-3xl font-bold text-base-100">{title}</Text>
        <Text className="text-base-400">{tagline}</Text>
      </View>
    </Animated.View>
  );
}
