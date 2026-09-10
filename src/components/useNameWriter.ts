import { useState } from 'react';
import { NameWriter, type NameWriteState } from '@/connections/NameWriter';

export function useNameWriter(initial: string, save: (name: string) => Promise<void>) {
  const [state, setState] = useState<NameWriteState>({ status: 'idle' });
  const [writer] = useState(() => new NameWriter(initial, save, setState));
  return {
    state,
    save: (value: string) => {
      void writer.save(value);
    },
  };
}
