import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SessionStatus = 'draft' | 'open' | 'closed' | 'reveal' | 'archived';
export type RevealAct = 'act1' | 'act2' | 'act3' | 'act4';

type Theme = 'dark' | 'light';
type Soundscape = 'fireplace' | 'rain' | 'night' | 'bagpipe';

interface AmbientState {
  ambientPlaying: boolean;
  ambientSoundscape: Soundscape;
  ambientVolume: number;
}

interface AppState extends AmbientState {
  currentParticipant: { id: string; name: string; role?: string } | null;
  setParticipant: (participant: { id: string; name: string; role?: string } | null) => void;
  language: string;
  setLanguage: (lang: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAmbientPlaying: (playing: boolean) => void;
  setAmbientSoundscape: (soundscape: Soundscape) => void;
  setAmbientVolume: (volume: number) => void;
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.add('light');
  } else {
    root.classList.remove('light');
  }
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentParticipant: null,
      setParticipant: (participant) => set({ currentParticipant: participant }),
      language: "en",
      setLanguage: (lang) => set({ language: lang }),
      ambientPlaying: false,
      ambientSoundscape: "fireplace" as Soundscape,
      ambientVolume: 0.3,
      setAmbientPlaying: (playing) => set({ ambientPlaying: playing }),
      setAmbientSoundscape: (soundscape) => set({ ambientSoundscape: soundscape }),
      setAmbientVolume: (volume) => set({ ambientVolume: volume }),
      theme: "dark" as Theme,
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: 'casksense-app',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);
