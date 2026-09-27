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
const GLOW_SIZE = 108;

/** Branded header shared by the login and account-setup screens: the TV Box mark cropped into a clean circular badge with a soft pulsing glow ring behind it, a title, and a tagline. */
export function AuthHero({ title, tagline }: AuthHeroProps) {
  const theme = useThemeColors();
  const glowOpacity = useSharedValue(0.45);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withTiming(0.85, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

  return (
    <Animated.View entering={FadeInDown.duration(520).springify().damping(16)} className="items-center gap-3">
      <View className="items-center justify-center" style={{ width: GLOW_SIZE, height: GLOW_SIZE }}>
        <Animated.View
          style={[
            glowStyle,
            {
              position: 'absolute',
              width: GLOW_SIZE,
              height: GLOW_SIZE,
              borderRadius: GLOW_SIZE / 2,
              backgroundColor: theme.iconBg2,
              shadowColor: theme.star,
              shadowOpacity: 0.55,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
        <View
          style={{
            width: BADGE_SIZE,
            height: BADGE_SIZE,
            borderRadius: BADGE_SIZE / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
          }}
        >
          <AppLogo size={BADGE_SIZE * 1.08} />
        </View>
      </View>
      <View className="items-center gap-1">
        <Text className="text-3xl font-bold text-base-100">{title}</Text>
        <Text className="text-base-400">{tagline}</Text>
      </View>
    </Animated.View>
  );
}
