import { useEffect, useState } from "react";
import { useOfflineQueue, type OfflineStatus } from "../hooks/useOfflineQueue";
import type { ThemeTokens } from "../tokens";
import type { Translations } from "../i18n";
import { FONT } from "../tokens";

interface OfflineBannerProps {
  th: ThemeTokens;
  t: Translations;
}

export default function OfflineBanner({ th, t }: OfflineBannerProps) {
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
    offline: "#d44",
    syncing: th.gold,
    online: th.green,
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
      ? t.offlineLabel
      : displayStatus === "syncing"
        ? t.syncingLabel
        : t.onlineLabel;

  const badge =
    displayStatus === "offline" && pendingCount > 0
      ? pendingCount === 1
        ? t.offlineQueued1
        : t.offlineQueuedN.replace("{n}", String(pendingCount))
      : null;

  return (
    <div
      data-testid="offline-banner"
      style={{
        position: "fixed",
        top: 56,
        left: 0,
        right: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "8px 16px",
        background: bgColor,
        backdropFilter: "blur(12px)",
        fontFamily: FONT.body,
        fontSize: 13,
        fontWeight: 500,
        color: color,
        transition: "background 0.3s, color 0.3s",
      }}
    >
      <span
        data-testid="offline-dot"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          flexShrink: 0,
          animation: displayStatus === "syncing" ? "pulse-dot 1.2s ease-in-out infinite" : "none",
        }}
      />
      <span data-testid="offline-label">{label}</span>
      {badge && (
        <span
          data-testid="offline-badge"
          style={{
            background: color,
            color: "#fff",
            borderRadius: 10,
            padding: "1px 7px",
            fontSize: 11,
            fontWeight: 600,
          }}
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
