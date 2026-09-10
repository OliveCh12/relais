#!/usr/bin/env bash
if [[ -z "${DEVELOPER_DIR:-}" ]] && [[ "$(xcode-select -p)" == "/Library/Developer/CommandLineTools" ]] && [[ -x /Applications/Xcode.app/Contents/Developer/usr/bin/xcodebuild ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
# RN 0.86.3: the published Hermes archive is missing; build the tag pinned by RN.
export RCT_BUILD_HERMES_FROM_SOURCE="${RCT_BUILD_HERMES_FROM_SOURCE:-true}"
