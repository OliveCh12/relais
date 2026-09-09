import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Relais',
  slug: 'relais',
  scheme: 'relais',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'dark',
  ios: {
    bundleIdentifier: 'app.relais.mobile',
    supportsTablet: false,
    infoPlist: {
      NSCameraUsageDescription:
        'Relais utilise la caméra pour scanner un QR et filmer depuis le téléphone Caméra.',
      NSMicrophoneUsageDescription:
        'Relais utilise le micro du téléphone Caméra pour le son du fichier local.',
      NSLocalNetworkUsageDescription:
        'Relais relie vos deux téléphones sur votre Wi-Fi, sans envoyer de vidéo sur internet.',
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'app.relais.mobile',
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
    'expo-router',
    ['expo-dev-client', { launchMode: 'most-recent' }],
    [
      'expo-camera',
      {
        cameraPermission: 'Relais utilise la caméra pour scanner le QR de votre autre téléphone.',
        recordAudioAndroid: false,
        barcodeScannerEnabled: true,
      },
    ],
    [
      '@config-plugins/react-native-webrtc',
      {
        cameraPermission: 'Relais utilise la caméra pour le retour vidéo local.',
        microphonePermission:
          'Relais utilise le micro pour le fichier enregistré sur le téléphone Caméra.',
      },
    ],
    ['expo-build-properties', { android: { usesCleartextTraffic: true } }],
  ],
  experiments: { typedRoutes: true },
};

export default config;
