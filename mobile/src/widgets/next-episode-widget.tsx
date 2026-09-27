import { Text, VStack } from '@expo/ui/swift-ui'
import { containerBackground, font, foregroundStyle, padding } from '@expo/ui/swift-ui/modifiers'
import { createWidget } from 'expo-widgets'

export interface NextEpisodeWidgetProps {
  showName: string | null
  seasonNumber: number | null
  episodeNumber: number | null
}

function NextEpisodeWidget(props: NextEpisodeWidgetProps) {
  'widget'
  return (
    <VStack modifiers={[containerBackground('#15121f', 'widget'), padding({ all: 16 })]}>
      <Text modifiers={[font({ textStyle: 'caption', weight: 'semibold' }), foregroundStyle('#a78bfa')]}>
        Continue Watching
      </Text>
      {props.showName ? (
        <VStack modifiers={[padding({ top: 4 })]}>
          <Text modifiers={[font({ textStyle: 'headline', weight: 'bold' })]}>{props.showName}</Text>
          <Text
            modifiers={[
              font({ textStyle: 'subheadline' }),
              foregroundStyle({ type: 'hierarchical', style: 'secondary' }),
            ]}
          >
            {`Season ${props.seasonNumber} · Episode ${props.episodeNumber}`}
          </Text>
        </VStack>
      ) : (
        <Text modifiers={[font({ textStyle: 'subheadline' })]}>Nothing in progress</Text>
      )}
    </VStack>
  )
}

/** The "Continue Watching" home screen widget; Home calls .updateSnapshot() on this whenever now-watching changes. */
export const nextEpisodeWidget = createWidget<NextEpisodeWidgetProps>('NextEpisodeWidget', NextEpisodeWidget)
