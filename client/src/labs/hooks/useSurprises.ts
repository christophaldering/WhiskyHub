import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { tastingApi } from "@/lib/api";

export type SurpriseType = "individual_ai_analysis";

export interface Surprise {
  id: string;
  tastingId: string;
  tastingTitle: string;
  type: SurpriseType;
  updatedAt: string;
}

interface AiReportSummary {
  exists: boolean;
  enabled: boolean;
  individualReportsUpdatedAt: string | null;
  hasIndividualForMe: boolean;
  visibleToMe: boolean;
}

interface TastingListEntry {
  id: string;
  title?: string | null;
  invitePending?: boolean;
  aiReportSummary?: AiReportSummary | null;
}

const STORAGE_PREFIX = "caskSense.surprises.seen";
const STORAGE_EVENT = "casksense:surprises:changed";

function storageKey(participantId: string, tastingId: string, type: SurpriseType) {
  return `${STORAGE_PREFIX}.${participantId}.${tastingId}.${type}`;
}

function getSeenAt(participantId: string, tastingId: string, type: SurpriseType): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(participantId, tastingId, type));
    if (!raw) return null;
    const t = Date.parse(raw);
    return Number.isFinite(t) ? t : null;
  } catch {
    return null;
  }
}

function setSeenAt(participantId: string, tastingId: string, type: SurpriseType, isoOrNow: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(participantId, tastingId, type), isoOrNow);
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT));
  } catch {
    /* ignore quota errors */
  }
}

function subscribeToSeenChanges(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(STORAGE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(STORAGE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function getSeenSnapshot(): string {
  if (typeof window === "undefined") return "";
  // Cheap snapshot key — only the keys that matter for the prefix.
  try {
    let acc = "";
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) acc += `${k}=${window.localStorage.getItem(k)};`;
    }
    return acc;
  } catch {
    return "";
  }
}

export function useSurprises() {
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id;

  const { data: tastings } = useQuery({
    queryKey: ["tastings", participantId],
    queryFn: () => tastingApi.getAll(participantId),
    enabled: !!participantId,
    staleTime: 60_000,
  });

  // Subscribe so dismissals update immediately across components.
  useSyncExternalStore(subscribeToSeenChanges, getSeenSnapshot, () => "");

  const surprises = useMemo<Surprise[]>(() => {
    if (!participantId || !Array.isArray(tastings)) return [];
    const out: Surprise[] = [];
    for (const t of tastings as TastingListEntry[]) {
      if (t.invitePending) continue;
      const summary = t.aiReportSummary;
      if (!summary) continue;
      // Only surface for participants with their own analysis the host has unlocked.
      if (!summary.visibleToMe || !summary.hasIndividualForMe) continue;
      const updatedAt = summary.individualReportsUpdatedAt;
      if (!updatedAt) continue;
      const updatedTs = Date.parse(updatedAt);
      if (!Number.isFinite(updatedTs)) continue;
      const seenTs = getSeenAt(participantId, t.id, "individual_ai_analysis");
      if (seenTs !== null && seenTs >= updatedTs) continue;
      out.push({
        id: `${t.id}:individual_ai_analysis`,
        tastingId: t.id,
        tastingTitle: t.title || "",
        type: "individual_ai_analysis",
        updatedAt,
      });
    }
    return out.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [participantId, tastings]);

  const dismiss = useCallback((surprise: Surprise) => {
    if (!participantId) return;
    setSeenAt(participantId, surprise.tastingId, surprise.type, surprise.updatedAt);
  }, [participantId]);

  const dismissAll = useCallback(() => {
    if (!participantId) return;
    for (const s of surprises) {
      setSeenAt(participantId, s.tastingId, s.type, s.updatedAt);
    }
  }, [participantId, surprises]);

  const hasSurpriseForTasting = useCallback(
    (tastingId: string) => surprises.some((s) => s.tastingId === tastingId),
    [surprises],
  );

  return { surprises, dismiss, dismissAll, hasSurpriseForTasting };
}
