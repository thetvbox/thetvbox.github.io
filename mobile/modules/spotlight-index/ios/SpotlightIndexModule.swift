import ExpoModulesCore
import CoreSpotlight

private let spotlightDomainIdentifier = "com.thetvbox.mobile.show"

public class SpotlightIndexModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SpotlightIndex")

    AsyncFunction("indexShows") { (items: [[String: String]]) in
      let searchableItems: [CSSearchableItem] = items.compactMap { item in
        guard let id = item["id"], let title = item["title"] else { return nil }
        let attributeSet = CSSearchableItemAttributeSet(contentType: .content)
        attributeSet.title = title
        if let subtitle = item["subtitle"] {
          attributeSet.contentDescription = subtitle
        }
        return CSSearchableItem(uniqueIdentifier: id, domainIdentifier: spotlightDomainIdentifier, attributeSet: attributeSet)
      }
      try await CSSearchableIndex.default().indexSearchableItems(searchableItems)
    }

    AsyncFunction("deindexShows") { (ids: [String]) in
      try await CSSearchableIndex.default().deleteSearchableItems(withIdentifiers: ids)
    }

    AsyncFunction("deindexAllShows") {
      try await CSSearchableIndex.default().deleteSearchableItems(withDomainIdentifiers: [spotlightDomainIdentifier])
    }
  }
}
