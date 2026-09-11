import type { CaptureState } from '../capture/protocol';
import { closestRecordingProfile } from '../../modules/relais-camera-engine/src/recordingProfiles';
import type { PreferredQuality } from './Preferences';

export function preferredProfile(state: CaptureState, preference: PreferredQuality) {
  if (preference === 'camera' || state.mode === 'photo' || !state.settings) return undefined;
  const settings = state.settings;
  const current = settings.profiles.find((profile) => profile.id === settings.profile);
  const next = closestRecordingProfile(settings.profiles, {
    height: preference === 'best' ? 2160 : 1080,
    fps: preference === 'best' ? 60 : 30,
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
