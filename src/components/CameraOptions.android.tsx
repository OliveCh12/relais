import {
  Column,
  Host,
  ModalBottomSheet,
  Row,
  Switch,
  Text,
  Button,
  FlowRow,
  FilterChip,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  paddingAll,
  verticalScroll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import type { CameraOptionsProps } from './CameraOptions.types';
import {
  closestRecordingProfile,
  recordingResolutionLabel,
} from '../../modules/relais-camera-engine/src/recordingProfiles';

export function CameraOptions(props: CameraOptionsProps) {
  if (!props.visible) return null;
  const selected = props.selectedProfile;
  const heights = [...new Set(props.profiles.map((profile) => profile.height))].sort(
    (a, b) => b - a,
  );
  const rates = [
    ...new Set(
      props.profiles
        .filter((profile) => profile.height === selected?.height && profile.hdr === selected?.hdr)
        .map((profile) => profile.fps),
    ),
  ].sort((a, b) => a - b);
  const select = (changes: Partial<NonNullable<typeof selected>>) => {
    if (!selected) return;
    const next = closestRecordingProfile(props.profiles, { ...selected, ...changes });
    if (next) props.onProfile(next);
  };
  return (
    <Host style={{ width: '100%', height: 0 }} colorScheme="dark">
      <ModalBottomSheet onDismissRequest={props.onClose} skipPartiallyExpanded>
        <Column
          verticalArrangement={{ spacedBy: 20 }}
          modifiers={[fillMaxWidth(), paddingAll(24), verticalScroll()]}
        >
          <Text style={{ typography: 'titleLarge' }}>Camera settings</Text>
          <Text>Focus, exposure, color and stabilization adjust automatically.</Text>
          <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
            <Text modifiers={[weight(1)]}>Grid</Text>
            <Switch value={props.grid} onCheckedChange={props.onGrid} />
          </Row>
          {props.mode !== 'photo' && (
            <>
              <Text style={{ typography: 'titleSmall' }}>Resolution</Text>
              <FlowRow horizontalArrangement={{ spacedBy: 8 }}>
                {heights.map((height) => (
                  <FilterChip
                    key={height}
                    selected={selected?.height === height}
                    enabled={!props.disabled}
                    onClick={() => select({ height })}
                  >
                    <FilterChip.Label>
                      <Text>{recordingResolutionLabel(height)}</Text>
                    </FilterChip.Label>
                  </FilterChip>
                ))}
              </FlowRow>
              <Text style={{ typography: 'titleSmall' }}>Frames per second</Text>
              <FlowRow horizontalArrangement={{ spacedBy: 8 }}>
                {rates.map((fps) => (
                  <FilterChip
                    key={fps}
                    selected={selected?.fps === fps}
                    enabled={!props.disabled}
                    onClick={() => select({ fps })}
                  >
                    <FilterChip.Label>
                      <Text>{`${fps} fps`}</Text>
                    </FilterChip.Label>
                  </FilterChip>
                ))}
              </FlowRow>
              <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
                <Text modifiers={[weight(1)]}>HDR video</Text>
                <Switch
                  value={selected?.hdr ?? false}
                  enabled={
                    !props.disabled &&
                    props.profiles.some(
                      (profile) =>
                        profile.height === selected?.height &&
                        profile.fps === selected?.fps &&
                        profile.hdr,
                    )
                  }
                  onCheckedChange={(hdr) => select({ hdr })}
                />
              </Row>
              <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
                <Text modifiers={[weight(1)]}>Record audio</Text>
                <Switch
                  value={props.audio}
                  enabled={!props.disabled}
                  onCheckedChange={props.onAudio}
                />
              </Row>
              <Text style={{ typography: 'titleMedium' }}>
                {props.quality || 'Opening camera…'}
              </Text>
              <Text>
                The displayed quality is used for the recorded file. Each recording is added to the
                gallery. Available options depend on this camera.
              </Text>
            </>
          )}
          <Button onClick={props.onClose} modifiers={[fillMaxWidth()]}>
            <Text>Done</Text>
          </Button>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
