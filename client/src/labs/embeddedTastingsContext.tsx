import { createContext, useContext, type ReactNode } from "react";

const EmbeddedTastingsContext = createContext(false);

export function EmbeddedTastingsProvider({ children }: { children: ReactNode }) {
  return (
    <EmbeddedTastingsContext.Provider value={true}>
      {children}
    </EmbeddedTastingsContext.Provider>
  );
}

export function useIsEmbeddedInTastings(): boolean {
  return useContext(EmbeddedTastingsContext);
}
