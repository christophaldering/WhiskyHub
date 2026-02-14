import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Whisky, Tasting, Rating, MOCK_TASTINGS } from './mock-data';

export type SessionStatus = 'draft' | 'open' | 'closed' | 'reveal' | 'archived';
export type RevealAct = 'act1' | 'act2' | 'act3' | 'act4';

// Extended Whisky Interface for Taxonomy
export interface ExtendedWhisky extends Whisky {
  category?: string;
  region?: string;
  abvBand?: string;
  ageBand?: string;
  caskInfluence?: string;
  peatLevel?: string;
}

interface SessionState {
  currentSessionId: string | null;
  status: SessionStatus;
  currentAct: RevealAct;
  ratings: Rating[];
  sessions: Tasting[];
  currentUser: { id: string; name: string } | null;
  
  // Actions
  setSessionId: (id: string) => void;
  setStatus: (status: SessionStatus) => void;
  setAct: (act: RevealAct) => void;
  addRating: (rating: Rating) => void;
  updateRating: (rating: Rating) => void;
  setUser: (user: { id: string; name: string }) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSessionId: 't1',
      status: 'draft',
      currentAct: 'act1',
      ratings: [],
      sessions: MOCK_TASTINGS, // Initialize with mock data but persist changes
      currentUser: { id: 'u1', name: 'Host' },

      setSessionId: (id) => set({ currentSessionId: id }),
      setStatus: (status) => set({ status }),
      setAct: (act) => set({ currentAct: act }),
      
      addRating: (rating) => set((state) => ({ 
        ratings: [...state.ratings, rating] 
      })),
      
      updateRating: (rating) => set((state) => ({
        ratings: state.ratings.map(r => 
          (r.userId === rating.userId && r.whiskyId === rating.whiskyId) ? rating : r
        ).concat(state.ratings.find(r => r.userId === rating.userId && r.whiskyId === rating.whiskyId) ? [] : [rating])
      })),

      setUser: (user) => set({ currentUser: user }),
      reset: () => set({ status: 'draft', currentAct: 'act1', ratings: [] }),
    }),
    {
      name: 'casksense-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
