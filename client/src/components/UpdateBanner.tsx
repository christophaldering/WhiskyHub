import { useEffect, useState } from "react";
import { onUpdateAvailable, applyUpdate } from "@/lib/swRegistration";

export default function UpdateBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const unsubscribe = onUpdateAvailable((available) => setShow(available));
    return () => { unsubscribe(); };
  }, []);

  if (!show) return null;

  return (
    <div
      data-testid="update-banner"
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 20px",
        borderRadius: 12,
        background: "rgba(26, 23, 20, 0.95)",
        border: "1px solid rgba(212, 165, 116, 0.3)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        color: "#e8dcc8",
        fontSize: 14,
        fontFamily: "system-ui, sans-serif",
        maxWidth: "calc(100vw - 32px)",
      }}
    >
      <span style={{ flexShrink: 0, width: 8, height: 8, borderRadius: "50%", background: "#d4a574" }} />
      <span>Neue Version verfügbar</span>
      <button
        data-testid="button-apply-update"
        onClick={applyUpdate}
        style={{
          padding: "5px 14px",
          borderRadius: 8,
          background: "#d4a574",
          color: "#1a1714",
          border: "none",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        Jetzt aktualisieren
      </button>
    </div>
  );
}
