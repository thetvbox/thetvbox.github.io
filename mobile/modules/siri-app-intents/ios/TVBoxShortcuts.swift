import AppIntents

struct TVBoxShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LogEpisodeWatchedIntent(),
      phrases: [
        "Log that I watched the next episode of \(\.$showName) in \(.applicationName)",
        "Log an episode watched in \(.applicationName)",
      ],
      shortTitle: "Log Episode Watched",
      systemImageName: "checkmark.circle"
    )
    AppShortcut(
      intent: WhatsNextIntent(),
      phrases: [
        "What should I watch next in \(.applicationName)",
        "Ask \(.applicationName) what to watch next",
      ],
      shortTitle: "What's Next",
      systemImageName: "play.circle"
    )
  }
}
