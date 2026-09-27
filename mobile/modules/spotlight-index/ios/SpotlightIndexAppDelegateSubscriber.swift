import ExpoModulesCore
import CoreSpotlight

// Routes a tap on one of our indexed Spotlight results back into the app as
// a normal mobile://show/{id} deep link. Apple hands Spotlight taps to
// application(_:continue:restorationHandler:) as an NSUserActivity of type
// CSSearchableItemActionType, carrying our uniqueIdentifier (see
// SpotlightIndexModule) in userInfo[CSSearchableItemActivityIdentifier] --
// there's no URL involved on Apple's side, unlike a Universal Link.
//
// RCTLinkingManager (which expo-router's Linking listener sits on top of)
// already owns a NotificationCenter observer for RCTOpenURLNotification --
// the same notification it posts internally for a plain custom-scheme
// "openURL" call -- so posting it ourselves with our constructed URL feeds
// into the exact same JS-side "url" event expo-router already handles, with
// no direct dependency on any Expo/RN internal API. This is standard and has
// been stable for years, but -- like the rest of this module -- was never
// compiled or run in the environment that wrote it; verify a Spotlight tap
// actually reaches ShowDetail on a real device before relying on it.
public class SpotlightIndexAppDelegateSubscriber: ExpoAppDelegateSubscriber {
  public func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    guard userActivity.activityType == CSSearchableItemActionType,
      let showId = userActivity.userInfo?[CSSearchableItemActivityIdentifier] as? String,
      let url = URL(string: "mobile://show/\(showId)")
    else {
      return false
    }

    NotificationCenter.default.post(
      name: NSNotification.Name("RCTOpenURLNotification"),
      object: nil,
      userInfo: ["url": url.absoluteString]
    )
    return true
  }
}
