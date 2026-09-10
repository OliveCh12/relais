import {
  Button,
  Column,
  Host,
  Icon,
  IconButton,
  ListItem,
  ModalBottomSheet,
  OutlinedTextField,
  Row,
  Text,
  TextButton,
  useNativeState,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  clickable,
  fillMaxWidth,
  paddingAll,
  size,
  verticalScroll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import phone from '@expo/material-symbols/mobile.xml';
import info from '@expo/material-symbols/info.xml';
import refresh from '@expo/material-symbols/refresh.xml';
import { availabilityLabels } from '../connections/model';
import type { DeviceDetailsProps, DeviceListProps } from './DeviceList.types';

export function DeviceList(props: DeviceListProps) {
  return (
    <Host colorScheme="dark" matchContents={{ vertical: true }} style={{ width: '100%' }}>
      <Column verticalArrangement={{ spacedBy: 8 }} modifiers={[fillMaxWidth()]}>
        <Row verticalAlignment="center">
          <Text style={{ typography: 'titleMedium' }} modifiers={[weight(1)]}>
            My devices
          </Text>
          <IconButton onClick={props.onRefresh}>
            <Icon source={refresh} contentDescription="Refresh devices" />
          </IconButton>
        </Row>
        {!props.rows.length && (
          <Text color="#C7C7CC">Your phones will appear here after their first QR connection.</Text>
        )}
        {props.rows.map((row) => (
          <ListItem
            key={row.device.id}
            colors={{ containerColor: '#000000' }}
            modifiers={[clickable(() => props.onSelect(row))]}
          >
            <ListItem.LeadingContent>
              <Icon
                source={phone}
                tint={row.availability === 'available' ? '#81C784' : '#9E9E9E'}
              />
            </ListItem.LeadingContent>
            <ListItem.HeadlineContent>
              <Text>{row.device.name}</Text>
            </ListItem.HeadlineContent>
            <ListItem.SupportingContent>
              <Text color={row.availability === 'available' ? '#81C784' : '#BDBDBD'}>
                {availabilityLabels[row.availability]}
              </Text>
            </ListItem.SupportingContent>
            <ListItem.TrailingContent>
              <IconButton onClick={() => props.onDetails(row)} modifiers={[size(48, 48)]}>
                <Icon source={info} contentDescription={`Details for ${row.device.name}`} />
              </IconButton>
            </ListItem.TrailingContent>
          </ListItem>
        ))}
        {props.rows.length > 0 && (
          <Text color="#C7C7CC" style={{ typography: 'bodySmall' }}>
            Start sharing on the other phone. Tap its name when it is available.
          </Text>
        )}
      </Column>
    </Host>
  );
}

export function DeviceDetails(props: DeviceDetailsProps) {
  const colors = useMaterialColors();
  const name = useNativeState(props.row.device.name);
  return (
    <Host style={{ width: '100%', height: 0 }}>
      <ModalBottomSheet onDismissRequest={props.onClose} skipPartiallyExpanded>
        <Column
          modifiers={[fillMaxWidth(), paddingAll(24), verticalScroll()]}
          verticalArrangement={{ spacedBy: 20 }}
        >
          <Text style={{ typography: 'titleLarge' }}>Device saved</Text>
          <OutlinedTextField value={name} maxLength={60} singleLine modifiers={[fillMaxWidth()]}>
            <OutlinedTextField.Label>
              <Text>Name on this phone</Text>
            </OutlinedTextField.Label>
          </OutlinedTextField>
          <TextButton onClick={() => props.onRename(name.get())}>
            <Text>Save name</Text>
          </TextButton>
          <Text>{availabilityLabels[props.row.availability]}</Text>
          <Text>{`Last connected: ${new Date(props.row.device.lastConnectedAt).toLocaleString('en-US')}`}</Text>
          <Text>
            Both apps must be open on the same Wi-Fi network, with the Camera phone sharing its
            view.
          </Text>
          <Button
            enabled={props.row.availability === 'available'}
            onClick={props.onConnect}
            modifiers={[fillMaxWidth()]}
          >
            <Text>Connect</Text>
          </Button>
          <TextButton onClick={props.onForget}>
            <Text color={colors.error}>Forget this device</Text>
          </TextButton>
          <TextButton onClick={props.onClose}>
            <Text>Done</Text>
          </TextButton>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
