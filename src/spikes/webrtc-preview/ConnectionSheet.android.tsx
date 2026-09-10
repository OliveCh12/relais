import {
  Button,
  Column,
  Host,
  ModalBottomSheet,
  OutlinedTextField,
  RNHostView,
  Row,
  Switch,
  Text,
  TextButton,
  useNativeState,
  useMaterialColors,
} from '@expo/ui/jetpack-compose';
import {
  fillMaxWidth,
  paddingAll,
  verticalScroll,
  weight,
} from '@expo/ui/jetpack-compose/modifiers';
import { PairingCodeImage } from './PairingCodeImage';
import {
  connectionTitles,
  previewExplanation,
  qrInstructions,
  serverExplanation,
  type ConnectionSheetProps,
} from './ConnectionSheet.types';

export function ConnectionSheet(props: ConnectionSheetProps) {
  const colors = useMaterialColors();
  const code = useNativeState('');
  const address = useNativeState(props.server);
  if (!props.panel) return null;
  return (
    <Host style={{ width: '100%', height: 0 }}>
      <ModalBottomSheet onDismissRequest={props.onClose} skipPartiallyExpanded>
        <Column
          modifiers={[fillMaxWidth(), verticalScroll(), paddingAll(24)]}
          verticalArrangement={{ spacedBy: 20 }}
        >
          <Text style={{ typography: 'titleLarge' }}>{connectionTitles[props.panel]}</Text>
          {props.panel === 'qr' && props.qr && (
            <>
              <Text>{qrInstructions}</Text>
              <Row horizontalArrangement="center" modifiers={[fillMaxWidth()]}>
                <RNHostView matchContents>
                  <PairingCodeImage value={props.qr} />
                </RNHostView>
              </Row>
              <Button onClick={props.onShare} modifiers={[fillMaxWidth()]}>
                <Text>Share code</Text>
              </Button>
              <Text style={{ typography: 'bodySmall' }}>
                Keep both apps open on the same Wi-Fi network. Dismissing this sheet keeps sharing
                active.
              </Text>
            </>
          )}
          {props.panel === 'options' &&
            (props.active ? (
              <>
                <Text style={{ typography: 'titleMedium' }}>
                  {props.deviceName ?? 'Connection'}
                </Text>
                <Text>{props.status}</Text>
                <Row verticalAlignment="center" modifiers={[fillMaxWidth()]}>
                  <Text modifiers={[weight(1)]}>Fill screen</Text>
                  <Switch value={props.fill} onCheckedChange={props.onFill} />
                </Row>
                {props.qr && (
                  <TextButton onClick={() => props.onPanel('qr')}>
                    <Text>Show QR code</Text>
                  </TextButton>
                )}
                <Text style={{ typography: 'bodySmall' }}>{previewExplanation}</Text>
              </>
            ) : (
              <>
                <TextButton onClick={() => props.onPanel('code')}>
                  <Text>Paste a connection code</Text>
                </TextButton>
                <TextButton onClick={() => props.onPanel('server')}>
                  <Text>Mac connection</Text>
                </TextButton>
                <Text style={{ typography: 'bodySmall' }}>{serverExplanation}</Text>
              </>
            ))}
          {props.panel === 'code' && (
            <>
              <Text>On the phone sharing its view, choose Share code, then paste it here.</Text>
              <OutlinedTextField value={code} maxLength={2048} modifiers={[fillMaxWidth()]}>
                <OutlinedTextField.Label>
                  <Text>Connection code</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
              {props.error && <Text color={colors.error}>{props.error}</Text>}
              <Button onClick={() => props.onCode(code.get())}>
                <Text>Continue</Text>
              </Button>
            </>
          )}
          {props.panel === 'server' && (
            <>
              <Text>{serverExplanation}</Text>
              <OutlinedTextField
                value={address}
                maxLength={300}
                singleLine
                modifiers={[fillMaxWidth()]}
              >
                <OutlinedTextField.Label>
                  <Text>Mac address</Text>
                </OutlinedTextField.Label>
              </OutlinedTextField>
              {props.error && <Text color={colors.error}>{props.error}</Text>}
              <Button onClick={() => props.onServer(address.get())}>
                <Text>Save</Text>
              </Button>
            </>
          )}
          <TextButton onClick={props.onClose}>
            <Text>Done</Text>
          </TextButton>
        </Column>
      </ModalBottomSheet>
    </Host>
  );
}
