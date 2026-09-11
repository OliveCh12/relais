import { View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export function PairingCodeImage({ value }: { value: string }) {
  return (
    <View
      accessible
      accessibilityLabel="Connection QR code. Use View code if you cannot scan it."
      style={{ padding: 16, backgroundColor: 'white', alignSelf: 'center' }}
    >
      <QRCode value={value} size={200} />
    </View>
  );
}
