# Platform UI decision — September 11, 2026

## Decision

Share the product journey, camera settings model and connection protocol. Keep platform-specific layouts and controls. Use SwiftUI on iOS and Jetpack Compose/Material 3 on Android through the existing Expo UI bindings. Keep the stable native stack for page navigation. A single generic screen skin would lose useful platform behavior; two independent products would duplicate connection and capture rules.

The existing `.ios.tsx` and `.android.tsx` boundaries are the right architecture. A new UI framework or a rewrite of the camera engines is not justified by the problems found here. React Native still coordinates routes, state and the shared Monitor layout; it does not process video frames. “Native” describes the actual underlying controls, not a promise that every screen is an unmodified Apple or Pixel application.

| Responsibility            | iOS                                                                      | Android                                                                |
| ------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Settings and device lists | SwiftUI Form/Section/List with inset grouping                            | Compose Surface groups and Material ListItem                           |
| Text                      | System text styles and Dynamic Type                                      | Material typography roles and system font scaling                      |
| Settings interactions     | Button, Toggle, TextField, LabeledContent                                | Button, Switch, OutlinedTextField, RadioButton; native row interaction |
| Icons                     | SF Symbols                                                               | Individually imported Material Symbols                                 |
| Navigation                | Native navigation controller, system back button and gestures            | Native screen stack, toolbar and Android Back dispatcher               |
| Local Camera              | SwiftUI and one AVFoundation session                                     | Compose controls and one CameraX/VisionCamera session                  |
| Monitor                   | Shared session/layout with platform buttons, native remote video surface | Same responsibilities; Android controls and video surface              |
| Media                     | PhotoKit after native finalization                                       | MediaStore after native finalization                                   |

Compose is Google's native app toolkit, distributed with the app. Pixel Settings is not an embeddable system screen. Use its hierarchy and Material conventions without claiming to import its proprietary interface. [Compose](https://developer.android.com/develop/ui/compose/documentation), [Expo UI](https://docs.expo.dev/versions/v57.0.0/sdk/ui/).

## Findings and corrections

This is a code and dependency review informed by the user's screenshots. The current Pixel capture was black; its window state confirmed a locked screen. It is not visual evidence of Relais. No current two-phone visual, screen-reader or frame-rate audit is claimed.

1. **Android typography lost native context.** Expo UI 57.0.17's `TextView.kt` used `TextStyle.Default` when no explicit style was provided, overriding the typography supplied by Material ListItem/Button slots. The versioned pnpm patch now inherits `LocalTextStyle.current`. This repairs text size, weight and line-height inheritance at the binding, rather than adding a font size to every button.
2. **Android navigation rows lacked a clear hierarchy.** Home and settings category titles use Material `titleLarge`; setting values use `bodyLarge`; supporting text inherits its Material slot and explanatory footers use `bodyMedium`. Device names use `titleMedium`. Native groups use the Material extra-large shape with separate row surfaces. Minimum row heights allow text to grow rather than clipping it. [Material typography](https://developer.android.com/develop/ui/compose/designsystems/material3).
3. **Selection controls had small independent interaction regions.** Settings toggles and options now make the whole row interactive with native `toggleable`/`selectable` semantics. The child control is non-interactive. Expo UI's optional Switch callback previously still created a native clickable child; the patch forwards its absence to native `onCheckedChange = null`. Disabled settings remain non-interactive. Native controls retain touch feedback. [Android accessibility defaults](https://developer.android.com/develop/ui/compose/accessibility/api-defaults).
4. **The Android Connect button had a fixed 110 × 48 host.** Its host now measures native content, retaining a minimum touch height and allowing a larger system font. Camera and Monitor captions also no longer use 11–12 point Android text.
5. **iOS rows constrained readable content and touch regions.** Navigation rows have a full rectangular hit area, system body/subheadline styles and wrapping content. Value rows use SwiftUI LabeledContent instead of a manually spaced pair of labels. Native Form layout controls value placement; it can adapt to content and text settings. Decorative chevrons are hidden from accessibility. [Apple typography](https://developer.apple.com/design/human-interface-guidelines/typography), [LabeledContent](https://developer.apple.com/documentation/swiftui/labeledcontent).
6. **Stack configuration diverged.** Root and capture stacks now share presentation options. The hardcoded English “Back” caption is removed so iOS chooses its appropriate native back label. Inactive settings pages can freeze; the Camera/Monitor containers and capture index remain unfrozen to preserve recording, transport updates and acknowledgements while another page is visible. This is lifecycle containment, not a measured latency improvement.
7. **Android's modern Back integration was opted out.** The app config now enables `predictiveBackGestureEnabled`; prebuild propagates it to the manifest. Existing recording confirmation and Back handlers remain intact. See the distinction below.

The Expo UI patch changes three files, pins the original package version and is recorded in the lockfile. Remove it only after an upstream version preserves native typography inheritance and optional Switch interaction; verify these behaviors during that dependency upgrade. It does not replace Material or add another component library.

## Navigation: native behavior and limits

Keep ordinary destinations as stack pages: Home → Settings; My cameras → Device → Camera Settings → category → choice. Keep the Android local camera's Material bottom sheet where it provides useful quick access. No custom drawer, simulated back button or global gesture recognizer is added.

On iOS in a left-to-right interface, Back is a swipe from the left edge toward the right. Leave the installed native stack's OS-specific behavior in control. The pinned screens library uses the system full-content pop gesture on iOS 26+ by default; explicitly forcing a full-screen gesture on older iOS would select a different implementation. Camera dismissal remains guarded separately from navigation inside its settings. [Expo Stack](https://docs.expo.dev/router/advanced/stack/), [pinned screens props](https://github.com/software-mansion/react-native-screens/blob/4.26.2/src/types.tsx).

On Android, enabling the manifest callback restores participation in the modern system Back path. It does **not** by itself prove an interactive predictive preview for every in-app stack transition. Expo's current ExperimentalStack offers that transition but is alpha and supports fewer header options. Keep the stable stack for this release: replacing capture navigation to obtain one animation would introduce disproportionate lifecycle and toolbar risk. System Back dispatch and the capture confirmation remain required; full predictive in-app animation is a separate adoption gate. [Android predictive Back](https://developer.android.com/guide/navigation/custom-back/predictive-back-gesture), [Expo ExperimentalStack](https://docs.expo.dev/versions/v57.0.0/sdk/router/experimental-stack/).

## Boundaries and acceptance

Reviewed against Expo 57.0.21, Expo UI 57.0.17, Expo Router 57.0.20, RN 0.86.3 and screens 4.26.2. No dependency version upgrade, second navigation owner or second camera owner is introduced. App and camera preferences still auto-save; a Connect action remains an explicit connection request, not a Save button. Camera settings are still validated and acknowledged by the capturing phone.

Build and installation evidence is recorded in [STATUS](../../STATUS.md). The code gates include TypeScript, zero-warning ESLint, regression tests, architecture boundaries and formatting. Native compiler and dependency diagnostics are assessed separately; successful builds do not imply globally warning-free tooling.

The build review also corrected three deprecated Gradle property assignments in the Relais module. On iOS, Pod cleanup had removed the Hermes compiler while leaving its CMake import manifest, allowing Xcode to skip the compiler build. The config plugin now tracks the binary as an output as well. The following Release build rebuilt the compiler and completed. Dependency/compiler diagnostics remain unsuppressed and are recorded separately from application checks.

Short owner checks on both phones:

- Open Home, Settings, My cameras and a device category. Tap a row's label and trailing control. Each tap should cause one action.
- Increase system text size, then check wrapping, Connect and keyboard Done. No Save button should appear.
- Use system Back through nested pages; on iOS also cancel a partially completed back swipe. While recording, opening/closing settings must not stop capture.
- With the other phone as Camera, change a supported setting and return to Monitor. Check the camera acknowledgement and uninterrupted preview, then reverse the roles.

The protocol, original-file quality, gallery finalization, proprietary camera modes and autonomous discovery remain separate product concerns. Native controls improve integration but do not establish 120 fps, zero network latency or stock-camera feature parity.
