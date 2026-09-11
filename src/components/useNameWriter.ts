import { useState, useCallback } from 'react';
import { NameWriter, type NameWriteState } from '@/connections/NameWriter';

export function useNameWriter(
  initial: string,
  save: (name: string) => Promise<void>,
  validate?: (value: string) => string | undefined,
) {
  const [state, setState] = useState<NameWriteState>({ status: 'idle' });
  const [writer] = useState(() => new NameWriter(initial, save, setState, validate));
  const edit = useCallback((value: string) => writer.edit(value), [writer]);
  const saveDraft = useCallback(() => {
    void writer.commit();
  }, [writer]);
  return { state, edit, commit: saveDraft };
}
