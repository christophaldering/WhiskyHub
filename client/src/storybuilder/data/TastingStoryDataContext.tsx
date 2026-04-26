import { createContext, useContext, type ReactNode } from "react";
import type { TastingStoryDataResponse } from "@/lib/tastingStoryDataApi";

const TastingStoryDataContext = createContext<TastingStoryDataResponse | null>(null);

type ProviderProps = {
  data: TastingStoryDataResponse | null;
  children: ReactNode;
};

export function TastingStoryDataProvider({ data, children }: ProviderProps) {
  return (
    <TastingStoryDataContext.Provider value={data}>{children}</TastingStoryDataContext.Provider>
  );
}

export function useTastingStoryData(): TastingStoryDataResponse | null {
  return useContext(TastingStoryDataContext);
}
