#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
xcodebuild -version
command -v pod >/dev/null || { echo "Installer CocoaPods avant le build iOS." >&2; exit 1; }
pnpm exec expo prebuild --platform ios --no-install
(cd ios && pod install)
xcodebuild -workspace ios/Relais.xcworkspace -scheme Relais -configuration Debug \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath .native-tools/ios-build CODE_SIGNING_ALLOWED=NO build "$@"
