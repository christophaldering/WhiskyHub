import { createContext, useContext, type ReactNode } from "react";

const EmbeddedMeineWeltContext = createContext(false);

export function EmbeddedMeineWeltProvider({ children }: { children: ReactNode }) {
  return (
    <EmbeddedMeineWeltContext.Provider value={true}>
      {children}
    </EmbeddedMeineWeltContext.Provider>
  );
}

export function useIsEmbeddedInMeineWelt(): boolean {
  return useContext(EmbeddedMeineWeltContext);
}
