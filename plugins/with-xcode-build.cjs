const { withPodfile, withXcodeProject } = require('expo/config-plugins');

const hermesOutputMarker = '# Relais: track the Hermes compiler binary after Pod cleanup.';
function trackHermesCompiler(contents) {
  if (contents.includes(hermesOutputMarker)) return contents;
  const hook = 'post_install do |installer|';
  if (!contents.includes(hook)) throw new Error('Cannot locate the CocoaPods post_install hook.');
  return contents.replace(
    hook,
    `${hook}
    ${hermesOutputMarker}
    installer.pods_project.targets.select { |target| target.name == 'hermes-engine' }.each do |target|
      target.shell_script_build_phases.each do |phase|
        next unless phase.name.to_s.include?('Build Hermesc')
        compilers = phase.output_paths.filter_map do |path|
          path.sub('/ImportHostCompilers.cmake', '/bin/hermesc') if path.end_with?('/ImportHostCompilers.cmake')
        end
        phase.output_paths = (phase.output_paths + compilers).uniq
      end
    end
`,
  );
}

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
module.exports = (config) => {
  config = withPodfile(config, (config) => {
    config.modResults.contents = trackHermesCompiler(config.modResults.contents);
    return config;
  });
  return withXcodeProject(config, (config) => {
    configure(config.modResults);
    return config;
  });
};
module.exports.configure = configure;
module.exports.trackHermesCompiler = trackHermesCompiler;
