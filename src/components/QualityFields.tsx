import { AppText, ChoiceChips } from './ui';
import type { QualityModel } from './useQualityModel';

export function QualityFields({ model }: { model: QualityModel }) {
  const quality = model.configuration.fileQuality;
  return (
    <>
      <AppText variant="heading">Video quality</AppText>
      <AppText variant="muted">Demo profiles. No settings are sent to a camera.</AppText>
      {model.groups.map((group) => (
        <ChoiceChips
          key={group.id}
          label={group.label}
          options={group.options}
          selected={group.value}
          onSelect={(value) => model.select(group.id, value)}
        />
      ))}
      <AppText variant="muted">
        {quality.codec.toUpperCase()} · {quality.hdr ? 'HDR' : 'SDR'}
      </AppText>
    </>
  );
}
