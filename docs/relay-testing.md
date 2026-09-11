# Relay and viewfinder acceptance

Both phones must run the updated development build and load the current bundle. Keep Relais open on both phones, on the same Wi-Fi network. This prototype still uses the Mac for Metro and LAN rendezvous; it does not require Expo Go.

## iPhone camera → Android monitor

1. On the iPhone, open **Camera**. Allow camera access, microphone access when recording audio, and permission to add captures to Photos.
2. On the Pixel, open **Monitor → My cameras**. Tap the iPhone, then **Connect** in the top-right corner. For a new pairing, use **+ → Scan code** and display the connection code from **Connect a monitor** on the iPhone.
3. Confirm a moving image appears, without the GestureHandlerRootView error. Switch Photo/Video and front/rear camera. Rotate the capturing phone between portrait and both landscape directions; the monitor should preserve the image proportions. Taps in black letterboxing must not change focus.
4. On the local or remote viewfinder, touch and hold a subject, then slide up/down without lifting. The focus square and sun/exposure rail should appear. Up brightens; down darkens, bounded by the capturing phone's actual EV range. Test near/far subjects and points away from the center. Focus and white balance remain automatic.
5. Take one photo and a short video using the Pixel's shutter. Wait for the save confirmation. Check the **iPhone's Photos library**, not the Pixel gallery.
6. Open the device page from the monitor's settings icon. Confirm settings identify the iPhone and affect that camera. Connect/Live stays in the app bar; information expands on the same page.

## Android camera → iPhone monitor

Finish any recording and return both phones to Home. Open **Camera** on the Pixel, then **Monitor** on the iPhone. Repeat the steps above with roles reversed. Check the **Pixel's gallery** for the originals. Test front/rear cameras, both orientations, focus/exposure and Photo/Video independently in this direction.

## Reconnection and presets

After one connection with this version, disconnect. Open the device page while it is offline. Expand the camera settings groups and choose a preset. Choices are saved locally; they do not claim to have changed an offline phone. Open Camera on the other phone, then tap Connect. Wait until **Applying camera preset…** disappears. Each setting uses the camera's newly acknowledged revision and is revalidated against its live capabilities.

A different mode or lens can require connecting to load its format catalogue. Unsupported presets remain saved with an error for review; they are not silently described as applied. Discard the preset on the device page when needed. Rename the camera and leave the field with Done or by tapping another control; the name should survive reopening the page.

## Scope of automated evidence

TypeScript/lint, protocol/controller tests, production bundles and native builds are separate from physical acceptance. The automated tests cover letterboxing/cropping and rotation transforms, validated/idempotent focus commands, latest-value command coalescing, native capability validation and preset persistence. They do not measure real autofocus accuracy, preview latency, display frame rate or gallery results. The owner performs the capture and visual checks above.
