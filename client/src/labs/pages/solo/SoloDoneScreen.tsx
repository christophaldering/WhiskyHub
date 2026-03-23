import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";

interface Props {
  whiskyName: string;
  score: number;
  onAnother: () => void;
  onHub: () => void;
}

export default function SoloDoneScreen({ whiskyName, score, onAnother, onHub }: Props) {
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
      <div style={{
        width: 72,
        height: 72,
        borderRadius: "50%",
        background: "var(--labs-phase-overall-dim)",
        border: "2px solid var(--labs-phase-overall)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }} data-testid="solo-done-check">
        <Check size={36} style={{ color: "var(--labs-phase-overall)" }} />
      </div>

      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        fontWeight: 700,
        color: "var(--labs-text)",
        margin: 0,
        textAlign: "center",
      }} data-testid="solo-done-whisky">
        {whiskyName}
      </h2>

      <div style={{
        fontSize: 48,
        fontWeight: 700,
        fontFamily: "var(--font-ui)",
        color: scoreBand,
        fontVariantNumeric: "tabular-nums",
      }} data-testid="solo-done-score">
        {score}
      </div>

      <p className="ty-body" style={{
        color: "var(--labs-text-muted)",
        margin: 0,
      }} data-testid="solo-done-saved">
        {t("v2.solo.saved", "Saved to diary")}
      </p>

      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--labs-space-sm)", marginTop: "var(--labs-space-md)" }}>
        <button
          onClick={onAnother}
          data-testid="solo-another-btn"
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: "var(--labs-radius-xl)",
            border: "none",
            background: "var(--labs-phase-nose)",
            color: "#0e0b05",
            fontFamily: "var(--font-display)",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {t("v2.solo.another", "Log another dram")}
        </button>

        <button
          onClick={onHub}
          data-testid="solo-to-hub-btn"
          style={{
            width: "100%",
            minHeight: 44,
            borderRadius: "var(--labs-radius-xl)",
            border: "1px solid var(--labs-border)",
            background: "none",
            color: "var(--labs-text)",
            fontFamily: "var(--font-ui)",
            fontSize: 15,
            cursor: "pointer",
          }}
        >
          {t("v2.solo.toHub", "Back to overview")}
        </button>
      </div>
    </div>
  );
}
