import { createContext, useContext, type ReactNode } from "react";

const EmbeddedExploreContext = createContext(false);

export function EmbeddedExploreProvider({ children }: { children: ReactNode }) {
  return (
    <EmbeddedExploreContext.Provider value={true}>
      {children}
    </EmbeddedExploreContext.Provider>
  );
}

export function useIsEmbeddedInExplore(): boolean {
  return useContext(EmbeddedExploreContext);
}
