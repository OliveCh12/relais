#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/ios-env.sh
xcodebuild -version
command -v pod >/dev/null || { echo "Install CocoaPods before building iOS." >&2; exit 1; }
command -v cmake >/dev/null || { echo "Install CMake to build Hermes from source." >&2; exit 1; }
pnpm exec expo prebuild --platform ios --no-install --no-clean
(cd ios && pod install)
xcodebuild -jobs 4 -workspace ios/Relais.xcworkspace -scheme Relais -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath .native-tools/ios-build CODE_SIGNING_ALLOWED=YES CODE_SIGN_IDENTITY=- \
  ARCHS="$(uname -m)" ONLY_ACTIVE_ARCH=YES build "$@"
