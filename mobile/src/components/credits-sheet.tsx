import { Text, View } from 'react-native'

import { PickerSheet } from '@/components/picker-sheet'
import { openExternalLink } from '@/lib/browser'

interface CreditsSheetProps {
  visible: boolean
  onClose: () => void
}

const PRIVACY_POLICY_URL = 'https://thetvbox.github.io/#/privacy'

/** Attribution required by TMDB/TVmaze's API terms, plus a link to the privacy policy -- mirrors web's CreditsPanel. */
export function CreditsSheet({ visible, onClose }: CreditsSheetProps) {
  return (
    <PickerSheet visible={visible} title="Credits & Privacy" onClose={onClose}>
      <View className="gap-4 px-1">
        <Text className="text-xs leading-relaxed text-base-400">
          Show artwork and metadata from TMDB. This product uses the TMDB API but is not endorsed or certified by
          TMDB.
        </Text>
        <Text className="text-xs leading-relaxed text-base-400">
          Episode air dates corrected using data from TVmaze.
        </Text>
        <Text className="text-xs leading-relaxed text-base-400">
          IMDb ratings and Rotten Tomatoes scores from the OMDb API.
        </Text>
        <Text
          onPress={() => openExternalLink(PRIVACY_POLICY_URL)}
          className="border-t border-hairline pt-3 text-sm font-medium text-accent-400"
        >
          Privacy policy
        </Text>
      </View>
    </PickerSheet>
  )
}
