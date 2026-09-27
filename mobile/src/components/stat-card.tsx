import { Pressable, Text, View } from 'react-native'

interface StatCardProps {
  label: string
  value: string | number
  onPress?: () => void
}

const STAT_CARD_CLASSES = 'rounded-xl border border-hairline bg-base-850/60 p-3.5'

/** One stat tile: a big number with a small label below it; becomes a button when onPress is given. */
export function StatCard({ label, value, onPress }: StatCardProps) {
  const content = (
    <>
      <Text className="text-center text-lg font-semibold text-base-100">{value}</Text>
      <Text className="mt-0.5 text-center text-[11px] text-base-500">{label}</Text>
    </>
  )

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" className={`active:bg-hover ${STAT_CARD_CLASSES}`}>
        {content}
      </Pressable>
    )
  }

  return <View className={STAT_CARD_CLASSES}>{content}</View>
}
