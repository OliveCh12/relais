const { withXcodeProject } = require('expo/config-plugins');

function configure(project) {
  for (const configuration of Object.values(project.pbxXCBuildConfigurationSection())) {
    const settings = configuration.buildSettings;
    if (!settings?.PRODUCT_BUNDLE_IDENTIFIER || !Array.isArray(settings.OTHER_LDFLAGS)) continue;
    // CocoaPods already links libc++; keep the inherited flags as the single source.
    settings.OTHER_LDFLAGS = settings.OTHER_LDFLAGS.filter(
      (flag) => flag.replaceAll('"', '') !== '-lc++',
    );
  }
  for (const phase of Object.values(project.hash.project.objects.PBXShellScriptBuildPhase ?? {})) {
    if (phase.name?.includes('[Expo Dev Launcher] Strip Local Network Keys for Release')) {
      phase.alwaysOutOfDate = 1;
    }
  }
  return project;
}
module.exports = (config) =>
  withXcodeProject(config, (config) => {
    configure(config.modResults);
    return config;
  });
module.exports.configure = configure;
