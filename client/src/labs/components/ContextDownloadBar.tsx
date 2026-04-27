import { useState, type ElementType } from "react";
import { Download, Loader2 } from "lucide-react";

export interface ContextDownloadAction {
  key: string;
  label: string;
  icon?: ElementType;
  testId: string;
  run: () => Promise<void>;
}

interface Props {
  actions: ContextDownloadAction[];
  testId?: string;
  align?: "start" | "end";
}

export default function ContextDownloadBar({ actions, testId, align = "start" }: Props) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onClick = async (action: ContextDownloadAction) => {
    setBusyKey(action.key);
    setError(null);
    try {
      await action.run();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusyKey(null);
    }
  };

  if (actions.length === 0) return null;

  return (
    <div data-testid={testId ?? "context-download-bar"} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: align === "end" ? "flex-end" : "stretch" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {actions.map(action => {
          const Icon = action.icon ?? Download;
          const isBusy = busyKey === action.key;
          return (
            <button
              key={action.key}
              onClick={() => onClick(action)}
              disabled={busyKey !== null}
              data-testid={action.testId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: 8,
                border: "1px solid var(--labs-border)",
                background: "transparent",
                color: isBusy ? "var(--labs-text-muted)" : "var(--labs-text)",
                fontSize: 12,
                fontWeight: 500,
                cursor: busyKey !== null ? "not-allowed" : "pointer",
                opacity: busyKey !== null && !isBusy ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              {isBusy
                ? <Loader2 className="w-3.5 h-3.5" style={{ animation: "spin 1s linear infinite" }} />
                : <Icon className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />}
              {action.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p style={{ fontSize: 11, color: "var(--labs-danger)", margin: 0 }} data-testid={`${testId ?? "context-download-bar"}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}
