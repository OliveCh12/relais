import { useState } from 'react';
import type { CameraCapabilities } from '../domain/camera';
import { defaultConfiguration, validateConfiguration } from '../capabilities/validate';
import { AppText, ChoiceChips } from './ui';

export function QualitySettings({ capabilities }: { capabilities: CameraCapabilities }) {
  const [configuration, setConfiguration] = useState(() => defaultConfiguration(capabilities));
  const lens = capabilities.lenses.find(({ id }) => id === configuration.lens);
  if (!lens) return <AppText>Profil indisponible.</AppText>;
  const qualities = lens.fileQualities;
  const resolutions = [...new Set(qualities.map(({ height }) => height))];
  const fps = [
    ...new Set(
      qualities
        .filter(({ height }) => height === configuration.fileQuality.height)
        .map(({ fps }) => fps),
    ),
  ];
  const selectQuality = (predicate: (quality: (typeof qualities)[number]) => boolean) => {
    const fileQuality = qualities.find(predicate);
    if (!fileQuality) return;
    const next = { ...configuration, fileQuality };
    validateConfiguration(capabilities, next);
    setConfiguration(next);
  };
  return (
    <>
      <AppText variant="heading">Qualité du fichier</AppText>
      <AppText variant="muted">
        Profils de démonstration. Aucun réglage n’est envoyé à une caméra.
      </AppText>
      <ChoiceChips
        label="OPTIQUE"
        options={capabilities.lenses.map(({ id, label }) => ({ value: id, label }))}
        selected={lens.id}
        onSelect={(id) => {
          const nextLens = capabilities.lenses.find((item) => item.id === id);
          const fileQuality = nextLens?.fileQualities[0];
          if (nextLens && fileQuality)
            setConfiguration({
              ...configuration,
              lens: id,
              fileQuality,
              zoom: nextLens.zoom.min,
              torch: false,
            });
        }}
      />
      <ChoiceChips
        label="RÉSOLUTION"
        options={resolutions.map((value) => ({ value: String(value), label: `${value}p` }))}
        selected={String(configuration.fileQuality.height)}
        onSelect={(value) => selectQuality((quality) => quality.height === Number(value))}
      />
      <ChoiceChips
        label="IMAGES / SECONDE"
        options={fps.map((value) => ({ value: String(value), label: `${value} fps` }))}
        selected={String(configuration.fileQuality.fps)}
        onSelect={(value) =>
          selectQuality(
            (quality) =>
              quality.height === configuration.fileQuality.height && quality.fps === Number(value),
          )
        }
      />
      {qualities.some((quality) => quality.hdr) && (
        <ChoiceChips
          label="DYNAMIQUE"
          options={[
            { value: 'false', label: 'SDR' },
            { value: 'true', label: 'HDR' },
          ].filter(({ value }) =>
            qualities.some(
              (quality) =>
                quality.height === configuration.fileQuality.height &&
                quality.fps === configuration.fileQuality.fps &&
                String(quality.hdr) === value,
            ),
          )}
          selected={String(configuration.fileQuality.hdr)}
          onSelect={(value) =>
            selectQuality(
              (quality) =>
                quality.height === configuration.fileQuality.height &&
                quality.fps === configuration.fileQuality.fps &&
                String(quality.hdr) === value,
            )
          }
        />
      )}
      <AppText variant="muted">
        {configuration.fileQuality.codec.toUpperCase()} ·{' '}
        {configuration.fileQuality.hdr ? 'HDR' : 'SDR'} · Preview séparé : 720p30
      </AppText>
    </>
  );
}
