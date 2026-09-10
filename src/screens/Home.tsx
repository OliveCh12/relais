import { router } from 'expo-router';
import { AppText, Badge, Button, Card, Screen } from '@/components/ui';
import { useSessionStore } from '@/session/store';
import type { Role } from '@/domain/camera';

export default function HomeScreen() {
  const dispatch = useSessionStore((state) => state.dispatch);
  const chooseRole = (role: Role) => {
    dispatch({ type: 'close' });
    dispatch({ type: 'choose-role', role });
    router.push('/pairing');
  };
  return (
    <Screen>
      <Badge>RELAIS · FOUNDATION</Badge>
      <AppText variant="title">One phone records.{'\n'}The other frames.</AppText>
      <AppText variant="muted">Choose this phone’s role.</AppText>
      <Card>
        <AppText variant="label">01 / ON THE TRIPOD</AppText>
        <AppText variant="heading">Camera</AppText>
        <AppText variant="muted">
          The file stays on this phone. Keep the app in the foreground.
        </AppText>
        <Button testID="choose-camera" label="Use as Camera" onPress={() => chooseRole('camera')} />
      </Card>
      <Card>
        <AppText variant="label">02 / IN YOUR HAND</AppText>
        <AppText variant="heading">Monitor</AppText>
        <AppText variant="muted">
          Frame and control the shot from the other side of the lens.
        </AppText>
        <Button
          testID="choose-monitor"
          label="Use as Monitor"
          secondary
          onPress={() => chooseRole('monitor')}
        />
      </Card>
      <AppText variant="muted">
        Interactive prototype · Product capture and connection coming later.
      </AppText>
      {__DEV__ && (
        <Button label="Open live preview" secondary onPress={() => router.push('/dev/webrtc')} />
      )}
    </Screen>
  );
}
