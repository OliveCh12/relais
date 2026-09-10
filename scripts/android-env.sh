#!/usr/bin/env bash
set -euo pipefail
if [[ -z "${JAVA_HOME:-}" ]]; then
  export JAVA_HOME="$(mise where java)"
fi
export NODE_ENV="${NODE_ENV:-development}"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
export PATH="${JAVA_HOME:+$JAVA_HOME/bin:}$ANDROID_HOME/platform-tools:$PATH"
if [[ ! -d "$ANDROID_HOME/platforms" ]]; then
  echo "Android SDK not found. Set ANDROID_HOME through Android Studio." >&2
  exit 1
fi
java -version
