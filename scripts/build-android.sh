#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/android-env.sh
pnpm exec expo prebuild --platform android --no-install
cd android
./gradlew :app:assembleDebug --no-daemon --console=plain "$@"
