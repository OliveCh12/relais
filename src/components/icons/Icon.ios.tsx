import { Host, Image } from '@expo/ui/swift-ui';
import { accessibilityHidden, accessibilityLabel } from '@expo/ui/swift-ui/modifiers';
import { sfSymbols, type IconProps } from './types';

export function NativeIcon({ name, size = 24, color, label }: IconProps) {
  return (
    <Image
      systemName={sfSymbols[name]}
      size={size}
      {...(name.startsWith('link') ? { variableValue: Number(name.slice(-1)) / 3 } : {})}
      {...(color ? { color } : {})}
      modifiers={[label ? accessibilityLabel(label) : accessibilityHidden()]}
    />
  );
}

export function Icon(props: IconProps) {
  return (
    <Host matchContents style={{ alignSelf: 'center' }}>
      <NativeIcon {...props} />
    </Host>
  );
}
