import type { ReactNode } from 'react'
import { Text, View } from 'react-native'

interface EmptyStateProps {
  icon: string
  className?: string
  children: ReactNode
}

/** Shared "nothing here yet" card shell -- icon + bordered panel -- reused for every empty state in the app. */
export function EmptyState({ icon, className = 'mt-10', children }: EmptyStateProps) {
  return (
    <View className={`items-center rounded-2xl border border-hairline bg-base-850/40 px-6 py-14 ${className}`}>
      <Text className="mb-3 text-4xl">{icon}</Text>
      {children}
    </View>
  )
}
