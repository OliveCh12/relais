import { useCallback, useMemo, useState } from 'react';
import type { CameraCapabilities } from '@/domain/camera';
import { defaultConfiguration } from '@/capabilities/validate';
import {
  qualityGroups,
  reconcileConfiguration,
  selectQualityOption,
  type QualityField,
} from '@/capabilities/selection';

export function useQualityModel(capabilities: CameraCapabilities) {
  const [draft, setDraft] = useState(() => defaultConfiguration(capabilities));
  const configuration = useMemo(
    () => reconcileConfiguration(capabilities, draft),
    [capabilities, draft],
  );
  const groups = useMemo(
    () => qualityGroups(capabilities, configuration),
    [capabilities, configuration],
  );
  const select = useCallback(
    (field: QualityField, value: string) => {
      setDraft((previous) => selectQualityOption(capabilities, previous, field, value));
    },
    [capabilities],
  );
  return {
    configuration,
    groups,
    source: capabilities.source,
    select,
  };
}

export type QualityModel = ReturnType<typeof useQualityModel>;
