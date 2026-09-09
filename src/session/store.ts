import { create } from 'zustand';
import { initialSession, transition, type SessionEvent, type SessionState } from './machine';

interface SessionStore {
  session: SessionState;
  dispatch: (event: SessionEvent) => void;
}

export const useSessionStore = create<SessionStore>((set) => ({
  session: initialSession,
  dispatch: (event) => set(({ session }) => ({ session: transition(session, event) })),
}));
