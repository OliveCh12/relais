import { Stack } from 'expo-router';
import { Button, Host, Text } from '@expo/ui/jetpack-compose';
import type { DeviceConnectProps } from './DeviceConnect.types';
export function DeviceConnect({ connected, disabled, onConnect }: DeviceConnectProps) {
  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Host matchContents style={{ minHeight: 48 }}>
            <Button onClick={onConnect} enabled={!disabled}>
              <Text>{connected ? 'Live' : 'Connect'}</Text>
            </Button>
          </Host>
        ),
      }}
    />
  );
}
