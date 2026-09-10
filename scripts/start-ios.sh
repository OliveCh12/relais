#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/ios-env.sh
xcodebuild -version
pnpm exec expo run:ios "$@"
