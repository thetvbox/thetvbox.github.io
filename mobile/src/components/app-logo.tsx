import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { useThemeColors } from '@/hooks/use-theme-colors';

interface AppLogoProps {
  size?: number;
}

/** The TV Box mark -- neutral glass badge + amber play glyph -- ported 1:1 from web's AppLogo.tsx (same gradient badge, sheen, inset screen, and play glyph proportions). */
export function AppLogo({ size = 32 }: AppLogoProps) {
  const theme = useThemeColors();
  const radius = size * (8 / 32);
  const sheenHeight = size * (14 / 32);
  const screen = {
    left: size * (6 / 32),
    top: size * (9 / 32),
    width: size * (20 / 32),
    height: size * (14 / 32),
    borderRadius: size * (3 / 32),
  };

  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden' }}>
      <LinearGradient
        colors={[theme.iconBg1, theme.iconBg2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <LinearGradient
        colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: sheenHeight }}
      />
      <View
        style={{
          position: 'absolute',
          left: screen.left,
          top: screen.top,
          width: screen.width,
          height: screen.height,
          borderRadius: screen.borderRadius,
          backgroundColor: theme.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <SymbolView name="play.fill" size={size * (10 / 32)} tintColor={theme.star} />
      </View>
    </View>
  );
}
