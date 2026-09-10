import { useKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import { AppText, Badge, Button, Card, PreviewPlaceholder, Screen } from '@/components/ui';
import { useCapabilities } from '@/capabilities/useCapabilities';

export default function CameraScreen() {
  useKeepAwake();
  const { capabilities, error } = useCapabilities();
  return (
    <Screen>
      <Badge>CAMERA · NOT CONNECTED</Badge>
      <PreviewPlaceholder label="CAMERA PREVIEW" />
      <Card>
        <AppText variant="heading">Keep the app open</AppText>
        <AppText variant="muted">
          During a session, this phone will keep the local file. This foundation does not open the
          sensor.
        </AppText>
      </Card>
      <AppText variant="muted">
        {error ??
          (capabilities
            ? 'RelaisCameraEngine responding · mock capabilities · capture disabled'
            : 'Loading camera module…')}
      </AppText>
      <Button label="View quality profiles" secondary onPress={() => router.push('/settings')} />
    </Screen>
  );
}
