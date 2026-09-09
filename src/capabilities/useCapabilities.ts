import { useEffect, useState } from 'react';
import { cameraEngine } from '../camera/engine';
import type { CameraCapabilities } from '../domain/camera';

export function useCapabilities() {
  const [capabilities, setCapabilities] = useState<CameraCapabilities | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    cameraEngine.getCapabilities().then(
      (result) => {
        if (active) setCapabilities(result);
      },
      (reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Module indisponible');
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return { capabilities, error };
}
