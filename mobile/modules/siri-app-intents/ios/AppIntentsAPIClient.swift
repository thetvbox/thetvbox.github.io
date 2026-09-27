import Foundation

// Shared by SiriTokenStoreModule (writes the token, from JS) and the
// AppIntent perform() methods in this same module (read it, from Siri's
// own background invocation) -- keeping them in one compiled target lets
// this key live in exactly one place instead of two string literals that
// would need to be kept in sync by hand.
let siriTokenDefaultsKey = "tvbox_siri_personal_access_token"

struct AppIntentsAPIError: Error {
  let message: String
}

enum AppIntentsAPIClient {
  static let baseURL = "https://fuitioxkdagmfnvpteys.supabase.co/functions/v1"

  /// POSTs to one of the PAT-authenticated Siri Edge Functions (see
  /// supabase/functions/log-next-episode-watched, whats-next) using the
  /// token SiriTokenStoreModule stashed here when the user set up Siri &
  /// Shortcuts in the app -- no app launch, no Supabase session, no Face ID
  /// gate, so this can run fully in the background the way Siri expects.
  static func post(path: String, body: [String: Any]) async throws -> [String: Any] {
    guard let token = UserDefaults.standard.string(forKey: siriTokenDefaultsKey), !token.isEmpty else {
      throw AppIntentsAPIError(message: "Set this up first in TV Box, under Profile, Siri & Shortcuts.")
    }
    guard let url = URL(string: "\(baseURL)/\(path)") else {
      throw AppIntentsAPIError(message: "Something went wrong.")
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    request.httpBody = try JSONSerialization.data(withJSONObject: body)

    let (data, response) = try await URLSession.shared.data(for: request)
    let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]

    guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
      throw AppIntentsAPIError(message: json["error"] as? String ?? "Something went wrong.")
    }
    return json
  }
}
