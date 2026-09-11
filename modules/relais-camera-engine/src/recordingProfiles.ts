export interface RecordingProfile {
  height: number;
  fps: number;
  hdr: boolean;
}

export function closestRecordingProfile(
  profiles: RecordingProfile[],
  requested: RecordingProfile,
): RecordingProfile | null {
  const score = (profile: RecordingProfile) =>
    Math.abs(Math.log(profile.height / requested.height)) * 1000 +
    Math.abs(profile.fps - requested.fps) * 10 +
    (profile.hdr === requested.hdr ? 0 : 1);
  return profiles.reduce<RecordingProfile | null>(
    (best, profile) => (!best || score(profile) < score(best) ? profile : best),
    null,
  );
}

export function recordingResolutionLabel(height: number) {
  return height === 2160 ? '4K' : height === 4320 ? '8K' : `${height}p`;
}
