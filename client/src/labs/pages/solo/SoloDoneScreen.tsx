import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

interface Props {
  whiskyName: string;
  score: number;
  onAnother: () => void;
  onHub: () => void;
  showAddToCollection?: boolean;
  addToCollection?: boolean;
  onToggleAddToCollection?: (val: boolean) => void;
}

export default function SoloDoneScreen({ whiskyName, score, onAnother, onHub, showAddToCollection, addToCollection, onToggleAddToCollection }: Props) {
  const { t } = useTranslation();

  const scoreBand =
    score >= 90 ? "var(--labs-success)" :
    score >= 80 ? "var(--labs-gold)" :
    "var(--labs-accent)";

  return (
    <div className="labs-fade-in" style={{
      padding: "var(--labs-space-xl) var(--labs-space-md)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "var(--labs-space-lg)",
    }}>
      <div className="labs-card" style={{
        width: "100%",
        padding: "var(--labs-space-xl)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--labs-space-lg)",
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: "var(--labs-phase-overall-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }} data-testid="solo-done-check">
          <Check size={32} style={{ color: "var(--labs-phase-overall)" }} />
        </div>

        <h2 className="labs-h2" style={{ margin: 0, textAlign: "center" }} data-testid="solo-done-whisky">
          {whiskyName}
        </h2>

        <div style={{
          fontSize: 48,
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          color: scoreBand,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
        }} data-testid="solo-done-score">
          {score}
        </div>

        <p style={{
          fontFamily: "var(--font-ui)",
          fontSize: 14,
          color: "var(--labs-text-muted)",
          margin: 0,
        }} data-testid="solo-done-saved">
          {t("v2.solo.saved", "Saved to diary")}
        </p>

        {showAddToCollection && (
          <div
            data-testid="solo-add-to-collection-toggle"
            onClick={() => onToggleAddToCollection?.(!addToCollection)}
            role="switch"
            aria-checked={addToCollection}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggleAddToCollection?.(!addToCollection); } }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "12px 0",
              borderTop: "0.5px solid var(--labs-border, rgba(255,255,255,0.1))",
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <span style={{
              fontFamily: "var(--font-ui)",
              fontSize: 14,
              color: "var(--labs-text)",
            }}>
              {t("v2.solo.addToCollection", "Add to my collection")}
            </span>
            <div
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: addToCollection ? "var(--labs-accent)" : "var(--labs-surface-alt, rgba(255,255,255,0.15))",
                position: "relative",
                transition: "background 0.2s ease",
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                background: "#fff",
                position: "absolute",
                top: 2,
                left: addToCollection ? 22 : 2,
                transition: "left 0.2s ease",
                boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
              }} />
            </div>
          </div>
        )}
      </div>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)" }}>
        <button
          onClick={onAnother}
          data-testid="solo-another-btn"
          className="labs-btn-primary"
          style={{ width: "100%", minHeight: 44 }}
        >
          {t("v2.solo.another", "Log another dram")}
        </button>

        <button
          onClick={onHub}
          data-testid="solo-to-hub-btn"
          className="labs-btn-secondary"
          style={{ width: "100%", minHeight: 44 }}
        >
          {t("v2.solo.toHub", "Back to overview")}
        </button>
      </div>
    </div>
  );
}
