import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";

export type OfflineStatus = "online" | "offline" | "syncing";

export function signalRatingQueued() {
  window.dispatchEvent(new CustomEvent("casksense:rating-queued"));
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineQueue() {
  const isOnline = useOnlineStatus();
  const [status, setStatus] = useState<OfflineStatus>(
    navigator.onLine ? "online" : "offline"
  );
  const [pendingCount, setPendingCount] = useState(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "GET_QUEUE_LENGTH" });
    }
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setStatus("offline");
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    } else if (status === "offline" || pendingCount > 0) {
      setStatus("syncing");
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "FLUSH_QUEUE" });
      }
    }
  }, [isOnline]);

  useEffect(() => {
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

    window.addEventListener("casksense:rating-queued", onRatingQueued);

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", onSwMessage);
    }

    return () => {
      window.removeEventListener("casksense:rating-queued", onRatingQueued);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", onSwMessage);
      }
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  return { status, pendingCount };
}

export default function OfflineBanner() {
  const { t } = useTranslation();
  const { status, pendingCount } = useOfflineQueue();
  const [visible, setVisible] = useState(false);
  const [lastStatus, setLastStatus] = useState<OfflineStatus>("online");

  useEffect(() => {
    if (status === "offline" || status === "syncing") {
      setVisible(true);
      setLastStatus(status);
    } else if (lastStatus === "offline" || lastStatus === "syncing") {
      setLastStatus("online");
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [status, lastStatus]);

  if (!visible) return null;

  const displayStatus = status === "online" && lastStatus === "online" ? "online" : status;

  const colors: Record<OfflineStatus, string> = {
    offline: "var(--labs-danger, #d44)",
    syncing: "var(--labs-accent, #d4a847)",
    online: "var(--labs-success, #4caf50)",
  };

  const bgColors: Record<OfflineStatus, string> = {
    offline: "rgba(221, 68, 68, 0.12)",
    syncing: "rgba(212, 168, 71, 0.12)",
    online: "rgba(134, 198, 120, 0.12)",
  };

  const color = colors[displayStatus];
  const bgColor = bgColors[displayStatus];

  const label =
    displayStatus === "offline"
      ? t("v2.offline.label", "No connection — ratings saved locally")
      : displayStatus === "syncing"
        ? t("v2.offline.syncing", "Syncing…")
        : t("v2.offline.online", "Back online");

  const badge =
    displayStatus === "offline" && pendingCount > 0
      ? pendingCount === 1
        ? t("v2.offline.queued1", "1 pending")
        : t("v2.offline.queuedN", "{{count}} pending", { count: pendingCount })
      : null;

  return (
    <div
      data-testid="offline-banner"
      className="mx-4 mt-3 rounded-xl flex items-center justify-center gap-2 px-4 py-2 labs-fade-in"
      style={{
        background: bgColor,
        backdropFilter: "blur(12px)",
        fontSize: 13,
        fontWeight: 500,
        color: color,
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <span
        data-testid="offline-dot"
        className="flex-shrink-0 rounded-full"
        style={{
          width: 8,
          height: 8,
          background: color,
          animation: displayStatus === "syncing" ? "pulse-dot 1.2s ease-in-out infinite" : "none",
        }}
      />
      <span data-testid="offline-label">{label}</span>
      {badge && (
        <span
          data-testid="offline-badge"
          className="rounded-full text-[11px] font-semibold px-2 py-0"
          style={{ background: color, color: "#fff" }}
        >
          {badge}
        </span>
      )}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
