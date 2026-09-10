#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/android-env.sh
pnpm exec expo prebuild --platform android --no-install --no-clean
cd android
./gradlew :app:assembleDebug --no-daemon --console=plain "$@"
