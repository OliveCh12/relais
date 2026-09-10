const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = (config) =>
  withAndroidManifest(config, (config) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(config.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      application,
      'EXDevMenuShowFloatingActionButton',
      'false',
    );
    return config;
  });
