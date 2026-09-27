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

/** Branded header shared by the login and account-setup screens: a softly-glowing TV Box mark over a title and tagline, with a gentle entrance animation. */
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
      <View className="items-center justify-center" style={{ width: 96, height: 96 }}>
        <Animated.View
          style={[
            glowStyle,
            {
              position: 'absolute',
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: theme.iconBg2,
              shadowColor: theme.star,
              shadowOpacity: 0.55,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            },
          ]}
        />
        <AppLogo size={72} />
      </View>
      <View className="items-center gap-1">
        <Text className="text-3xl font-bold text-base-100">{title}</Text>
        <Text className="text-base-400">{tagline}</Text>
      </View>
    </Animated.View>
  );
}
