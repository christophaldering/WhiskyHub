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

interface WishlistTransfer {
  wishlistEntryId: string;
  whiskyName: string;
  distillery?: string;
  region?: string;
  age?: string;
  abv?: string;
  caskType?: string;
}

export const LANDING_VERSION = 3;

interface AppState extends AmbientState {
  currentParticipant: { id: string; name: string; role?: string; canAccessWhiskyDb?: boolean; experienceLevel?: string } | null;
  setParticipant: (participant: { id: string; name: string; role?: string; canAccessWhiskyDb?: boolean; experienceLevel?: string } | null) => void;
  previewExperienceLevel: string;
  setPreviewExperienceLevel: (level: string) => void;
  lastSeenLandingVersion: number;
  setLastSeenLandingVersion: (version: number) => void;
  storageConsentDismissed: boolean;
  setStorageConsentDismissed: (dismissed: boolean) => void;
  language: string;
  setLanguage: (lang: string) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAmbientPlaying: (playing: boolean) => void;
  setAmbientSoundscape: (soundscape: Soundscape) => void;
  setAmbientVolume: (volume: number) => void;
  wishlistTransfer: WishlistTransfer | null;
  setWishlistTransfer: (data: WishlistTransfer | null) => void;
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
      previewExperienceLevel: "guest",
      setPreviewExperienceLevel: (level) => set({ previewExperienceLevel: level }),
      lastSeenLandingVersion: 0,
      setLastSeenLandingVersion: (version) => set({ lastSeenLandingVersion: version }),
      storageConsentDismissed: false,
      setStorageConsentDismissed: (dismissed) => set({ storageConsentDismissed: dismissed }),
      language: "en",
      setLanguage: (lang) => set({ language: lang }),
      ambientPlaying: false,
      ambientSoundscape: "fireplace" as Soundscape,
      ambientVolume: 0.3,
      setAmbientPlaying: (playing) => set({ ambientPlaying: playing }),
      setAmbientSoundscape: (soundscape) => set({ ambientSoundscape: soundscape }),
      setAmbientVolume: (volume) => set({ ambientVolume: volume }),
      wishlistTransfer: null,
      setWishlistTransfer: (data) => set({ wishlistTransfer: data }),
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
      partialize: (state) => {
        const { wishlistTransfer, ...rest } = state;
        return rest;
      },
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);
