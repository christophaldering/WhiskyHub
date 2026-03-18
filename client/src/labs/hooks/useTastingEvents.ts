import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";

type SSEEventType = "reveal_triggered" | "status_changed" | "presentation_changed" | "dram_advanced";

interface UseTastingEventsOptions {
  tastingId: string;
  enabled?: boolean;
  onReveal?: (data: Record<string, unknown>) => void;
  onStatusChange?: (data: Record<string, unknown>) => void;
  onPresentationChange?: (data: Record<string, unknown>) => void;
  onDramAdvanced?: (data: Record<string, unknown>) => void;
}

export function useTastingEvents({
  tastingId,
  enabled = true,
  onReveal,
  onStatusChange,
  onPresentationChange,
  onDramAdvanced,
}: UseTastingEventsOptions) {
  const queryClient = useQueryClient();
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const sourceRef = useRef<EventSource | null>(null);
  const callbacksRef = useRef({ onReveal, onStatusChange, onPresentationChange, onDramAdvanced });
  callbacksRef.current = { onReveal, onStatusChange, onPresentationChange, onDramAdvanced };

  const invalidateTasting = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
  }, [queryClient, tastingId]);

  useEffect(() => {
    if (!enabled || !tastingId || !pid || typeof EventSource === "undefined") return;

    const es = new EventSource(`/api/tastings/${tastingId}/events?pid=${encodeURIComponent(pid)}`);
    sourceRef.current = es;

    const handle = (eventType: SSEEventType) => (e: MessageEvent) => {
      let data: Record<string, unknown> = {};
      try { data = JSON.parse(e.data); } catch {}

      invalidateTasting();

      if (eventType === "reveal_triggered") {
        callbacksRef.current.onReveal?.(data);
      } else if (eventType === "status_changed") {
        queryClient.invalidateQueries({ queryKey: ["tastings"] });
        callbacksRef.current.onStatusChange?.(data);
      } else if (eventType === "presentation_changed") {
        callbacksRef.current.onPresentationChange?.(data);
      } else if (eventType === "dram_advanced") {
        callbacksRef.current.onDramAdvanced?.(data);
      }
    };

    es.addEventListener("reveal_triggered", handle("reveal_triggered"));
    es.addEventListener("status_changed", handle("status_changed"));
    es.addEventListener("presentation_changed", handle("presentation_changed"));
    es.addEventListener("dram_advanced", handle("dram_advanced"));

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [tastingId, enabled, pid, invalidateTasting, queryClient]);
}
