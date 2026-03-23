import { useState, useEffect, useRef } from "react";

export type OfflineStatus = "online" | "offline" | "syncing";

export function signalRatingQueued() {
  window.dispatchEvent(new CustomEvent("casksense:rating-queued"));
}

export function useOfflineQueue() {
  const [status, setStatus] = useState<OfflineStatus>(
    navigator.onLine ? "online" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const [swReady, setSwReady] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          setSwReady(true);
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "GET_QUEUE_LENGTH" });
          }
        })
        .catch(() => setSwReady(false));
    }
  }, []);

  useEffect(() => {
    const goOffline = () => {
      setStatus("offline");
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };

    const goOnline = () => {
      setStatus("syncing");
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "FLUSH_QUEUE" });
      }
    };

    const onRatingQueued = () => {
      setPendingCount((c) => c + 1);
      setStatus("offline");
    };

    const onSwMessage = (event: MessageEvent) => {
      if (event.data?.type === "QUEUE_FLUSHED") {
        const remaining = event.data.remaining ?? 0;
        setPendingCount(remaining);
        if (remaining === 0 && navigator.onLine) {
          setStatus("online");
          if (hideTimer.current) clearTimeout(hideTimer.current);
          hideTimer.current = setTimeout(() => setStatus("online"), 2000);
        } else if (remaining > 0) {
          setStatus(navigator.onLine ? "syncing" : "offline");
        }
      }
      if (event.data?.type === "QUEUE_UPDATED") {
        setPendingCount(event.data.count ?? 0);
      }
      if (event.data?.type === "QUEUE_LENGTH") {
        const count = event.data.count ?? 0;
        setPendingCount(count);
        if (count > 0 && !navigator.onLine) {
          setStatus("offline");
        }
      }
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    window.addEventListener("casksense:rating-queued", onRatingQueued);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("casksense:rating-queued", onRatingQueued);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return { status, pendingCount, swReady };
}
