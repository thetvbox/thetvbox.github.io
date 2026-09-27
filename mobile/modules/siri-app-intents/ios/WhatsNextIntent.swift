import AppIntents

struct WhatsNextIntent: AppIntent {
  static var title: LocalizedStringResource = "What Should I Watch Next"
  static var description = IntentDescription("Suggests the next episode to watch in TV Box.")
  static var openAppWhenRun: Bool = false

  func perform() async throws -> some IntentResult & ProvidesDialog {
    do {
      let result = try await AppIntentsAPIClient.post(path: "whats-next", body: [:])
      let name = result["show_name"] as? String ?? "something"
      let season = result["season_number"] as? Int ?? 0
      let episode = result["episode_number"] as? Int ?? 0
      return .result(dialog: "You should watch \(name), season \(season) episode \(episode).")
    } catch let error as AppIntentsAPIError {
      return .result(dialog: "Not sure. \(error.message)")
    }
  }
}
