import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";

type SSEEventType = "reveal_triggered" | "status_changed" | "presentation_changed";

interface UseTastingEventsOptions {
  tastingId: string;
  enabled?: boolean;
  onReveal?: (data: Record<string, unknown>) => void;
  onStatusChange?: (data: Record<string, unknown>) => void;
  onPresentationChange?: (data: Record<string, unknown>) => void;
}

export function useTastingEvents({
  tastingId,
  enabled = true,
  onReveal,
  onStatusChange,
  onPresentationChange,
}: UseTastingEventsOptions) {
  const queryClient = useQueryClient();
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const sourceRef = useRef<EventSource | null>(null);
  const callbacksRef = useRef({ onReveal, onStatusChange, onPresentationChange });
  callbacksRef.current = { onReveal, onStatusChange, onPresentationChange };

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
      }
    };

    es.addEventListener("reveal_triggered", handle("reveal_triggered"));
    es.addEventListener("status_changed", handle("status_changed"));
    es.addEventListener("presentation_changed", handle("presentation_changed"));

    return () => {
      es.close();
      sourceRef.current = null;
    };
  }, [tastingId, enabled, pid, invalidateTasting, queryClient]);
}
