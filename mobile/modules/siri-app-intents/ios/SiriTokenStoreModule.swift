import ExpoModulesCore

public class SiriTokenStoreModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SiriTokenStore")

    Function("setToken") { (token: String) in
      UserDefaults.standard.set(token, forKey: siriTokenDefaultsKey)
    }

    Function("clearToken") {
      UserDefaults.standard.removeObject(forKey: siriTokenDefaultsKey)
    }
  }
}
