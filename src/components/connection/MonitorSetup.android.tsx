import {
  Column,
  Host,
  IconButton,
  ListItem,
  Text,
  TextButton,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  fillMaxSize,
  paddingAll,
  verticalScroll,
} from '@expo/ui/jetpack-compose/modifiers';
import { availabilityLabels } from '@/connections/model';
import { NativeIcon } from '../icons/Icon.android';
import type { MonitorSetupProps } from './MonitorSetup.types';
export function MonitorSetup(props: MonitorSetupProps) {
  const colors = useMaterialColors();
  return (
    <Host style={{ flex: 1 }}>
      <Column
        modifiers={[fillMaxSize(), verticalScroll(), paddingAll(24)]}
        verticalArrangement={{ spacedBy: 20 }}
      >
        <Text style={{ typography: 'headlineSmall' }}>
          {props.connecting ? 'Connecting to your camera…' : 'Your camera, from here'}
        </Text>
        <Text color={colors.onSurfaceVariant}>
          {props.connecting
            ? props.status
            : 'Open Camera on your other phone. Keep both apps open on the same Wi-Fi network.'}
        </Text>
        {props.connecting && (
          <TextButton onClick={props.onCancel}>
            <Text>Cancel connection</Text>
          </TextButton>
        )}
        <Text style={{ typography: 'titleMedium' }}>My cameras</Text>
        {props.rows.length === 0 && (
          <Text color={colors.onSurfaceVariant}>No saved cameras yet.</Text>
        )}
        {props.rows.map((row) => (
          <ListItem
            key={row.device.id}
            modifiers={[
              clickable(() => {
                if (!props.connecting) props.onSelect(row);
              }),
            ]}
          >
            <ListItem.LeadingContent>
              <NativeIcon name="camera" size={24} color={colors.primary} />
            </ListItem.LeadingContent>
            <ListItem.HeadlineContent>
              <Text>{row.device.name}</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text>{availabilityLabels[row.availability]}</Text>
            </ListItem.SupportingContent>
            <ListItem.TrailingContent>
              <IconButton onClick={() => props.onDetails(row)}>
                <NativeIcon
                  name="info"
                  label={`Details for ${row.device.name}`}
                  size={24}
                  color={colors.onSurfaceVariant}
                />
              </IconButton>
            </ListItem.TrailingContent>
          </ListItem>
        ))}
        <TextButton enabled={!props.connecting} onClick={props.onRefresh}>
          <Text>Refresh cameras</Text>
        </TextButton>
        <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
          Saved cameras reconnect automatically when only one is available.
        </Text>
        <Text style={{ typography: 'titleMedium' }}>Add a camera</Text>
        <TextButton enabled={!props.connecting} onClick={props.onScan}>
          <NativeIcon name="qr" color={colors.primary} />
          <Text> Scan connection code</Text>
        </TextButton>
        <TextButton enabled={!props.connecting} onClick={props.onCode}>
          <Text>Paste a code</Text>
        </TextButton>
        <TextButton onClick={props.onSettings}>
          <Text>Connection settings</Text>
        </TextButton>
        <Text color={colors.onSurfaceVariant} style={{ typography: 'bodySmall' }}>
          {props.status}
        </Text>
      </Column>
    </Host>
  );
}
