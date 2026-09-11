# Relay and viewfinder acceptance

Install the latest Release build on both phones. These builds embed their JavaScript and do not require Metro or Expo Go. Keep Relais open on both phones on the same Wi-Fi network. The current prototype still requires the Mac LAN rendezvous service; two-phone-only setup is not implemented yet.

## iPhone camera → Android monitor

1. On the iPhone, open **Camera**. Allow camera access, microphone access when recording audio, and permission to add captures to Photos.
2. On the Pixel, open **Monitor → My cameras**. Tap the iPhone, then **Connect** in the top-right corner. For a new pairing, use **+ → Scan code** and display the connection code from **Connect a monitor** on the iPhone.
3. Confirm a moving image appears, without the GestureHandlerRootView error. Switch Photo/Video and front/rear camera. Rotate the capturing phone between portrait and both landscape directions; the monitor should preserve the image proportions. Taps in black letterboxing must not change focus.
4. On the local or remote viewfinder, touch and hold a subject, then slide up/down without lifting. The focus square and sun/exposure rail should appear. Up brightens; down darkens, bounded by the capturing phone's actual EV range. Test near/far subjects and points away from the center. Focus and white balance remain automatic.
5. Take one photo and a short video using the Pixel's shutter. Wait for the save confirmation. Check the **iPhone's Photos library**, not the Pixel gallery.
6. Open Camera Settings from the monitor's settings icon. Confirm the title identifies the iPhone and the controls affect that camera. From My cameras, tap its device row: Connect/Live stays in the app bar, and Connection and Camera Settings open stack pages.

## Android camera → iPhone monitor

Finish any recording and return both phones to Home. Open **Camera** on the Pixel, then **Monitor** on the iPhone. Repeat the steps above with roles reversed. Check the **Pixel's gallery** for the originals. Test front/rear cameras, both orientations, focus/exposure and Photo/Video independently in this direction.

## Reconnection and presets

After one connection with this version, disconnect. Open the device page while it is offline. Open Camera Settings and its child pages to choose a preset. Choices are saved locally; they do not claim to have changed an offline phone. Open Camera on the other phone, then tap Connect. Wait until **Applying camera settings…** disappears. Each setting uses the camera's newly acknowledged revision and is revalidated against its live capabilities.

A different mode or lens can require connecting to load its format catalogue. Unsupported presets remain saved with an error for review; they are not silently described as applied. Discard the preset on the device page when needed. Rename the camera and leave the field with Done or by tapping another control; the name should survive reopening the page.

## Stop while adjusting settings

Run this sequence in both cross-platform directions; arrows above mean Camera → Monitor.

1. Start a video from Monitor. While it is recording, adjust brightness or focus and immediately press Stop. Stop must stay accessible while the adjustment is pending, including while recording startup is being acknowledged.
2. Queued adjustments are cancelled without interrupting Stop with a settings alert. Repeat Stop taps must not start another native stop/save operation. New adjustments wait until Stop finishes.
3. Confirm the camera stops, finalizes the original and reports the gallery result. A late adjustment reply must not return Monitor to Recording. If the gallery import fails, the camera retains the original and Monitor offers the existing retry-save path.
4. In Photo mode, enable a timer, trigger a photo and cancel before the countdown ends. Confirm no photo is taken. Cancellation after the native shutter has already fired is expected to fail explicitly.
5. Separately, start a video and disconnect Monitor. The camera must keep recording; stop it locally and check its gallery. Do not conflate connection disposal with recording Stop.

Automated client/host tests exercise dispatch priority, duplicate taps, queue cancellation, stale replies, disconnect/reset isolation and gallery-error propagation. They cannot certify timing or file output on physical hardware.

## Scope of automated evidence

TypeScript/lint, protocol/controller tests, production bundles and native builds are separate from physical acceptance. The automated tests cover letterboxing/cropping and rotation transforms, validated/idempotent focus commands, latest-value command coalescing, native capability validation and preset persistence. They do not measure real autofocus accuracy, preview latency, display frame rate or gallery results. The owner performs the capture and visual checks above.
