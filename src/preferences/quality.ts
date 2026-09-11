import type { CaptureState } from '../capture/protocol';
import { closestRecordingProfile } from '../../modules/relais-camera-engine/src/recordingProfiles';
import type { PreferredQuality } from './Preferences';

export function preferredProfile(state: CaptureState, preference: PreferredQuality) {
  if (preference === 'camera' || state.mode === 'photo' || !state.settings) return undefined;
  const settings = state.settings;
  const current = settings.profiles.find((profile) => profile.id === settings.profile);
  if (preference === 'best')
    return settings.profiles.reduce<(typeof settings.profiles)[number] | undefined>(
      (best, profile) =>
        !best ||
        profile.height > best.height ||
        (profile.height === best.height && profile.fps > best.fps) ||
        (profile.height === best.height &&
          profile.fps === best.fps &&
          profile.hdr === (current?.hdr ?? false))
          ? profile
          : best,
      undefined,
    );
  const next = closestRecordingProfile(settings.profiles, {
    height: 1080,
    fps: 30,
    hdr: current?.hdr ?? false,
  });
  return settings.profiles.find(
    (profile) =>
      next &&
      profile.height === next.height &&
      profile.fps === next.fps &&
      profile.hdr === next.hdr,
  );
}
