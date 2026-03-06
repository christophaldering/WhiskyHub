import { v } from "@/lib/themeVars";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

export function M2Loading({ message }: { message?: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        gap: 12,
      }}
      data-testid="m2-loading"
    >
      <Loader2
        style={{
          width: 28,
          height: 28,
          color: v.accent,
          animation: "spin 1s linear infinite",
        }}
      />
      {message && (
        <span style={{ fontSize: 14, color: v.muted, fontFamily: "system-ui, sans-serif" }}>
          {message}
        </span>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function M2Error({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        gap: 12,
        textAlign: "center",
      }}
      data-testid="m2-error"
    >
      <AlertCircle style={{ width: 32, height: 32, color: v.danger, opacity: 0.7 }} />
      <p style={{ fontSize: 14, color: v.muted, margin: 0, maxWidth: 280 }}>
        {message || "Laden fehlgeschlagen"}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 20px",
            fontSize: 14,
            fontWeight: 600,
            background: v.accent,
            color: v.bg,
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
            marginTop: 4,
          }}
          data-testid="button-retry"
        >
          <RefreshCw style={{ width: 14, height: 14 }} />
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
