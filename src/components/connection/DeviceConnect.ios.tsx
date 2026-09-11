import { Stack } from 'expo-router';
import type { DeviceConnectProps } from './DeviceConnect.types';
export function DeviceConnect({ connected, disabled, onConnect }: DeviceConnectProps) {
  return (
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.Button
        onPress={onConnect}
        disabled={disabled}
        accessibilityLabel={connected ? 'Show live camera' : 'Connect to this camera'}
      >
        {connected ? 'Live' : 'Connect'}
      </Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}
