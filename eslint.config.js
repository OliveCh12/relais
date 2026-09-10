const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', 'ios/**', 'android/**', '.expo/**', '.native-tools/**', '.gradle/**'] },
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: [
      'app/dev/**',
      'src/spikes/**',
      'src/transport/PeerSession.ts',
      'src/transport/native/**',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: ['react-native-webrtc', 'react-native-vision-camera'],
          patterns: ['**/spikes/**'],
        },
      ],
    },
  },
]);
