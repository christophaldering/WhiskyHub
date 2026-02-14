import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SessionStatus = 'draft' | 'open' | 'closed' | 'reveal' | 'archived';
export type RevealAct = 'act1' | 'act2' | 'act3' | 'act4';

interface AppState {
  currentParticipant: { id: string; name: string; role?: string } | null;
  setParticipant: (participant: { id: string; name: string; role?: string } | null) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      currentParticipant: null,
      setParticipant: (participant) => set({ currentParticipant: participant }),
      language: "en",
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'casksense-app',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
