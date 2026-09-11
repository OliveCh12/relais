import type { ExpoConfig } from 'expo/config';

const appleTeamId = process.env.RELAIS_APPLE_TEAM_ID;
const cameraPermission =
  'Relais uses the camera to scan QR codes, take photos, record videos and share a local live preview.';
const microphonePermission =
  'Relais uses this phone’s microphone to record audio in the local video file.';

const config: ExpoConfig = {
  name: 'Relais',
  slug: 'relais',
  scheme: 'relais',
  version: '0.1.0',
  icon: './assets/icon.png',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'app.relais.mobile',
    ...(appleTeamId ? { appleTeamId } : {}),
    supportsTablet: false,
    infoPlist: {
      CADisableMinimumFrameDurationOnPhone: true,
      EXDevMenuShowFloatingActionButton: false,
      NSCameraUsageDescription: cameraPermission,
      NSMicrophoneUsageDescription: microphonePermission,
      NSPhotoLibraryAddUsageDescription: 'Relais adds the photos and videos you capture to Photos.',
      NSLocalNetworkUsageDescription:
        'Relais connects your two phones over Wi-Fi without sending video over the internet.',
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.relais.mobile',
    predictiveBackGestureEnabled: true,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#007AFF',
    },
    permissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
    ],
    blockedPermissions: [
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: [
    './plugins/with-dev-menu.cjs',
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F2F2F7',
        image: './assets/splash-symbol.png',
        imageWidth: 72,
        resizeMode: 'contain',
        dark: { backgroundColor: '#000000', image: './assets/splash-symbol-dark.png' },
      },
    ],
    ['expo-dev-client', { launchMode: 'most-recent' }],
    './plugins/with-xcode-build.cjs',
    [
      'expo-camera',
      {
        cameraPermission,
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      '@config-plugins/react-native-webrtc',
      {
        cameraPermission,
        microphonePermission,
      },
    ],
    [
      'expo-build-properties',
      {
        android: { usesCleartextTraffic: true },
        ios: { buildReactNativeFromSource: true, usePrecompiledModules: false },
      },
    ],
  ],
  experiments: { typedRoutes: true },
};

export default config;
