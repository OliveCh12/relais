# Launch assets

The connection symbol matches the home screen: Material Symbols `wifi`, supplied by `@expo/material-symbols` 0.1.1. Paths come from `icons/wifi.xml` without geometric changes; only color, size and background were adapted for native assets.

- `splash-symbol.png` / `splash-symbol-dark.png`: transparent 288 × 288 images, displayed at 72 points by the Expo configuration.
- `icon.png`: 1024 × 1024 with an opaque background; iOS applies its own mask.
- `adaptive-icon.png`: Android foreground with a safe margin; the configuration supplies the background separately.

Material Symbols are distributed under Apache 2.0. Source: [Google Material Symbols](https://github.com/google/material-design-icons). `MATERIAL-LICENSE` preserves the distribution license.

Launch uses `expo-splash-screen` and system behavior. No artificial delay, spinner or animation is added. Asset changes require a new binary. Dev Client launcher and loading screens are separate from the production launch experience.
