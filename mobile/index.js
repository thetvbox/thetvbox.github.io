// Hermes on iOS doesn't ship Intl.DisplayNames yet, so polyfill it before anything else loads.
import '@formatjs/intl-displaynames/polyfill.js'
import '@formatjs/intl-displaynames/locale-data/en.js'

import 'expo-router/entry'
