import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { participantApi } from "@/lib/api";

export interface RatingScale {
  max: number;
  step: number;
  bigStep: number;
  label: string;
  normalize: (val: number) => number;
  denormalize: (normalized: number) => number;
}

const SCALE_CONFIGS: Record<number, { step: number; bigStep: number }> = {
  100: { step: 1, bigStep: 5 },
  20: { step: 1, bigStep: 2 },
  10: { step: 1, bigStep: 1 },
  5: { step: 1, bigStep: 1 },
};

const VALID_SCALES = [5, 10, 20, 100];

function buildScale(max: number): RatingScale {
  const safeMax = VALID_SCALES.includes(max) ? max : 100;
  const config = SCALE_CONFIGS[safeMax];

  return {
    max: safeMax,
    step: config.step,
    bigStep: config.bigStep,
    label: `1–${safeMax}`,
    normalize: (val: number) => {
      if (safeMax === 100) return Math.round(Math.max(0, Math.min(val, 100)));
      const clamped = Math.max(0, Math.min(val, safeMax));
      return Math.round((clamped / safeMax) * 1000) / 10;
    },
    denormalize: (normalized: number) => {
      if (safeMax === 100) return Math.round(Math.max(0, Math.min(normalized, 100)));
      const raw = (normalized / 100) * safeMax;
      return Math.round(raw * 10) / 10;
    },
  };
}

export function useRatingScale(tastingScale?: number | null): RatingScale {
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const { data: participant } = useQuery({
    queryKey: ["participant", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
    staleTime: 5 * 60 * 1000,
  });

  return useMemo(() => {
    if (tastingScale && VALID_SCALES.includes(tastingScale)) {
      return buildScale(tastingScale);
    }

    const profileScale = (participant as any)?.preferredRatingScale;
    if (profileScale && VALID_SCALES.includes(profileScale)) {
      return buildScale(profileScale);
    }

    return buildScale(100);
  }, [tastingScale, participant]);
}

export { buildScale, VALID_SCALES };
