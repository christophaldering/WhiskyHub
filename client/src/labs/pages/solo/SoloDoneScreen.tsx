import { useTranslation } from "react-i18next";
import { Check, FileEdit, Wine } from "lucide-react";

interface Props {
  whiskyName: string;
  score: number;
  onAnother: () => void;
  onHub: () => void;
  showAddToCollection?: boolean;
  onAddToCollection?: () => void;
  added?: boolean;
  isDraft?: boolean;
}

export default function SoloDoneScreen({ whiskyName, score, onAnother, onHub, showAddToCollection, onAddToCollection, added, isDraft }: Props) {
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
          background: isDraft ? "rgba(200,134,26,0.1)" : "var(--labs-phase-overall-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }} data-testid="solo-done-check">
          {isDraft ? (
            <FileEdit size={32} style={{ color: "#c8861a" }} />
          ) : (
            <Check size={32} style={{ color: "var(--labs-phase-overall)" }} />
          )}
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
          color: isDraft ? "#c8861a" : "var(--labs-text-muted)",
          margin: 0,
        }} data-testid="solo-done-saved">
          {isDraft
            ? t("v2.solo.draftSaved", "Entwurf gespeichert")
            : t("v2.solo.saved", "Saved to diary")}
        </p>

        {isDraft && (
          <p style={{
            fontFamily: "var(--font-ui)",
            fontSize: 13,
            color: "var(--labs-text-muted)",
            margin: 0,
            textAlign: "center",
          }} data-testid="solo-done-draft-hint">
            {t("v2.solo.draftHint", "Du kannst den Entwurf jederzeit unter \"My Drams\" vervollständigen.")}
          </p>
        )}

        {showAddToCollection && (
          <button
            type="button"
            data-testid="solo-add-to-collection-link"
            onClick={() => { if (!added) onAddToCollection?.(); }}
            disabled={added}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              background: "none",
              border: "none",
              fontFamily: "var(--font-ui)",
              fontSize: 13,
              color: "var(--labs-accent, #d4a847)",
              cursor: added ? "default" : "pointer",
              opacity: added ? 0.7 : 1,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {added ? (
              <Check size={16} style={{ color: "var(--labs-accent, #d4a847)" }} />
            ) : (
              <Wine size={16} style={{ color: "var(--labs-accent, #d4a847)" }} />
            )}
            <span>
              {added
                ? t("v2.solo.bottleAdded", "Added") + " \u2713"
                : t("v2.solo.addBottleToCollection", "Add bottle to collection")}
            </span>
          </button>
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
