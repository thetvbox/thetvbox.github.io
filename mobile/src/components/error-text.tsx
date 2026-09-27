import { Text } from 'react-native'

interface ErrorTextProps {
  children: string
  className?: string
}

/** Inline error copy, announced to screen readers via accessibilityRole="alert". */
export function ErrorText({ children, className = '' }: ErrorTextProps) {
  return (
    <Text accessibilityRole="alert" className={`text-danger ${className}`}>
      {children}
    </Text>
  )
}
