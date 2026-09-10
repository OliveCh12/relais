const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const config = getDefaultConfig(require('node:path').dirname(require.resolve('./package.json')));
if (!config.resolver.assetExts.includes('xml')) config.resolver.assetExts.push('xml');

// Native JSI modules must use the same JS instance and version as autolinking.
const nativeSingletons = [
  'react-native-worklets',
  'react-native-reanimated',
  'react-native-nitro-modules',
];
const nativeRoots = new Map(
  nativeSingletons.map((name) => [name, path.dirname(require.resolve(`${name}/package.json`))]),
);
const resolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const owner = nativeSingletons.find(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`),
  );
  const request = owner
    ? path.join(nativeRoots.get(owner), moduleName.slice(owner.length))
    : moduleName;
  return (resolveRequest ?? context.resolveRequest)(context, request, platform);
};

module.exports = config;
