import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { TastingStoryImageItem } from "../../lib/tastingStoryDataApi";

export type OpenPickerOptions = {
  filterCategory?: string | null;
  filterParticipantId?: string | null;
};

export type ImagePoolPickerContextValue = {
  available: boolean;
  openPicker: (onPick: (item: TastingStoryImageItem) => void, options?: OpenPickerOptions) => void;
  poolItems: TastingStoryImageItem[];
  refreshPool: () => void;
};

const noopValue: ImagePoolPickerContextValue = {
  available: false,
  openPicker: () => undefined,
  poolItems: [],
  refreshPool: () => undefined,
};

const ImagePoolPickerContext = createContext<ImagePoolPickerContextValue>(noopValue);

export function useImagePoolPicker(): ImagePoolPickerContextValue {
  return useContext(ImagePoolPickerContext);
}

type ProviderProps = {
  value: ImagePoolPickerContextValue;
  children: ReactNode;
};

export function ImagePoolPickerProvider({ value, children }: ProviderProps) {
  const memo = useMemo(() => value, [value]);
  return <ImagePoolPickerContext.Provider value={memo}>{children}</ImagePoolPickerContext.Provider>;
}
