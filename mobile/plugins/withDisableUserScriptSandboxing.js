const { withXcodeProject } = require('@expo/config-plugins')

/** Disables Xcode 15+ user script sandboxing so CocoaPods' Copy Pods Resources script phase can write intermediate files for extension targets (e.g. the widget). */
const withDisableUserScriptSandboxing = (config) => {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection()
    for (const key in configurations) {
      const buildSettings = configurations[key]?.buildSettings
      if (buildSettings) {
        buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO'
      }
    }
    return config
  })
}

module.exports = withDisableUserScriptSandboxing
