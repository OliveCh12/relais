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
        if (__DEV__) console.info('Relais capabilities unavailable:', reason);
        if (active) setError('Camera settings unavailable. Reopen this screen to try again.');
      },
    );
    return () => {
      active = false;
    };
  }, []);
  return { capabilities, error };
}
