import { useMemo } from "react";
import type { Tasting, Whisky } from "@shared/schema";

export type BlindState = {
  showName: boolean;
  showMeta: boolean;
  showImage: boolean;
};

const FULLY_VISIBLE: BlindState = { showName: true, showMeta: true, showImage: true };

interface UseBlindStateOptions {
  ignoreStatus?: boolean;
  ignoreHost?: boolean;
}

export function useBlindState(
  tasting: Tasting | null | undefined,
  isHost: boolean,
  options: UseBlindStateOptions = {},
) {
  const { ignoreStatus = false, ignoreHost = false } = options;

  const isBlind = useMemo(() => {
    if (!tasting) return false;
    if (ignoreStatus) return !!tasting.blindMode;
    return !!(tasting.blindMode && (tasting.status === "draft" || tasting.status === "open" || tasting.status === "closed"));
  }, [tasting?.blindMode, tasting?.status, ignoreStatus]);

  const revealIndex = tasting?.revealIndex ?? 0;
  const revealStep = tasting?.revealStep ?? 0;

  const getBlindState = useMemo(() => {
    return (whiskyIdx: number, whisky?: Whisky, forEval = false): BlindState => {
      if (!isBlind) return FULLY_VISIBLE;
      if (isHost && !ignoreHost && !forEval) return FULLY_VISIBLE;
      if (whiskyIdx < revealIndex) return FULLY_VISIBLE;
      const photoRevealed = whisky?.photoRevealed ?? false;
      if (whiskyIdx === revealIndex) {
        return {
          showName: revealStep >= 1,
          showMeta: revealStep >= 2,
          showImage: revealStep >= 3 || photoRevealed,
        };
      }
      return { showName: false, showMeta: false, showImage: photoRevealed };
    };
  }, [isBlind, isHost, ignoreHost, revealIndex, revealStep]);

  return {
    isBlind,
    revealIndex,
    revealStep,
    getBlindState,
  };
}
