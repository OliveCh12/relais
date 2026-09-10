# Native device list and camera controls

Reviewed September 10, 2026. Scope: make saved cameras the main Monitor entry point, separate pairing, and simplify the connected preview. Remote camera settings remain deferred.

## Decisions

| Area                | iOS                                       | Android                                                          |
| ------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Saved cameras       | SwiftUI inset-grouped List and Section    | Compose LazyColumn with Material ListItem                        |
| Add camera          | Native trailing toolbar +                 | Material FloatingActionButton                                    |
| Secondary actions   | Native toolbar menu; pull to refresh      | Material DropdownMenu with explicit expanded/dismiss state       |
| Pairing             | SwiftUI BottomSheet with Form actions     | Material ModalBottomSheet with ListItem actions                  |
| Connection strength | Variable SF Symbol beside the camera name | Material signal bars beside the camera name                      |
| Shutter             | Existing iOS camera control               | Material OutlinedIconButton, official filled circle/stop symbols |

Use system text styles and appearance for device management. Keep the viewfinder controls in dark appearance. Device names truncate in the preview header but remain readable in the list and details. The link symbol represents measured WebRTC quality, not Wi-Fi signal strength.

Back from the live preview returns to the list without immediately reconnecting. Choosing a camera still connects explicitly. Pairing reuses the existing sheet rather than stacking another modal, and the scanner unmounts as soon as scanning ends. Neither navigation nor transport disconnect stops local recording.

There is no claim that these controls embed the private Apple Camera or Pixel Camera interface. They use public SwiftUI/Compose components and camera-app conventions. No UI dependency, capture engine or network protocol was replaced.

## Focused inspection

| Step                      | Evidence                              | Result                                                                                              |
| ------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Find a remembered camera  | Physical Pixel and iOS Simulator      | Native rows, availability, details action and a separate +; iOS title contrast corrected            |
| Add a camera              | Physical Pixel                        | Native bottom sheet with Scan code and Enter code; row backgrounds follow the sheet surface         |
| Use Camera                | Physical Pixel                        | Filled photo shutter and surrounding controls visible; native circle radius corrected               |
| View the connected camera | Pixel Camera to iOS Simulator Monitor | Remote quality, device name and variable link symbol visible together; authoritative state received |

Local screenshots are ignored under `e2e/artifacts/device-ui-pass/`. They are development evidence, not public assets. No physical-iPhone screenshot or comprehensive accessibility/performance certification is claimed. No shutter was activated by the agent during this pass.

Incremental iPhone and Android builds passed and were installed on the physical devices. Existing capture tests, TypeScript, ESLint, formatting, architecture checks and production exports are the code gates. Native modules are unchanged; Metro delivers the revised interface to the debug builds.

## Public references

- [Apple: Lists and tables](https://developer.apple.com/design/human-interface-guidelines/lists-and-tables): readable rows, grouped content and distinct detail actions.
- [Apple: Toolbars](https://developer.apple.com/design/human-interface-guidelines/toolbars): prioritize actions, use familiar symbols and let the system present the toolbar.
- [Android: Icon buttons](https://developer.android.com/develop/ui/compose/components/icon-button): native button variants, enabled state and accessible icon descriptions; page updated July 21, 2026.
- [Google: Jetpack Camera App](https://github.com/google/jetpack-camera-app): public CameraX/Compose implementation reference.
- [Expo Material Symbols](https://github.com/expo/material-symbols): individually imported Android vector assets and the filled-symbol download workflow.
