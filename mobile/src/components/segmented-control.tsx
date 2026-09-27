import { Pressable, Text, View } from 'react-native';

import { selectionHaptic } from '@/lib/haptics';

interface SegmentedControlOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedControlOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}

/** Two/three-way pill switcher sharing the app's accent styling, in place of the system segmented control (whose tint isn't themeable on iOS). */
export function SegmentedControl<T extends string>({ options, value, onChange, label }: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      className="flex-row self-start rounded-full bg-base-850/60 p-0.5 ring-1 ring-hairline"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => {
              if (opt.value === value) return;
              selectionHaptic();
              onChange(opt.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3.5 py-1.5 ${active ? 'bg-accent-500/20' : ''}`}
          >
            <Text className={`text-xs font-medium ${active ? 'text-accent-300' : 'text-base-500'}`}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
