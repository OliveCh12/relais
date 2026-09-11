interface MeteringCapabilities {
  supportsFocusMetering: boolean;
  supportsExposureMetering: boolean;
  supportsWhiteBalanceMetering: boolean;
}

export function meteringModes(device: MeteringCapabilities | undefined): ('AF' | 'AE' | 'AWB')[] {
  const modes: ('AF' | 'AE' | 'AWB')[] = [];
  if (device?.supportsFocusMetering) modes.push('AF');
  if (device?.supportsExposureMetering) modes.push('AE');
  if (device?.supportsWhiteBalanceMetering) modes.push('AWB');
  return modes;
}
