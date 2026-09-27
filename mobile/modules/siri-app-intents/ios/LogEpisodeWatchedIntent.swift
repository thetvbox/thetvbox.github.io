import AppIntents

struct LogEpisodeWatchedIntent: AppIntent {
  static var title: LocalizedStringResource = "Log Episode Watched"
  static var description = IntentDescription("Logs the next episode of a show as watched in TV Box.")
  static var openAppWhenRun: Bool = false

  @Parameter(title: "Show")
  var showName: String

  static var parameterSummary: some ParameterSummary {
    Summary("Log that I watched the next episode of \(\.$showName)")
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    do {
      let result = try await AppIntentsAPIClient.post(path: "log-next-episode-watched", body: ["show_name": showName])
      let name = result["show_name"] as? String ?? showName
      let season = result["season_number"] as? Int ?? 0
      let episode = result["episode_number"] as? Int ?? 0
      return .result(dialog: "Logged \(name) season \(season), episode \(episode) as watched.")
    } catch let error as AppIntentsAPIError {
      return .result(dialog: "Couldn't log that. \(error.message)")
    }
  }
}
