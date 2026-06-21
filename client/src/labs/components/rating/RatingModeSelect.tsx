import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SP, FONT, RADIUS, TOUCH_MIN } from "./theme";
import { BackIcon } from "./icons";
import PhaseSignature from "./PhaseSignature";

interface RatingLabels {
  modeQ: string;
  modeSub: string;
  guided: string;
  guidedD: string;
  guidedH: string;
  compact: string;
  compactD: string;
  compactH: string;
  quick?: string;
  quickD?: string;
  quickH?: string;
  tisch?: string;
  tischNew?: string;
  tischD?: string;
  tischH?: string;
  back: string;
  rememberDefault?: string;
}

interface RatingModeSelectProps {
  labels: RatingLabels;
  onSelect: (mode: "guided" | "compact" | "quick" | "tisch", remember?: boolean) => void;
  onBack: () => void;
  hideQuick?: boolean;
  showTisch?: boolean;
  tischIsNew?: boolean;
  showRememberToggle?: boolean;
}

export default function RatingModeSelect({ labels, onSelect, onBack, hideQuick, showTisch, tischIsNew, showRememberToggle }: RatingModeSelectProps) {
  const { t } = useTranslation();
  const [remember, setRemember] = useState(false);
  const allCards: Array<{
    mode: "guided" | "compact" | "quick" | "tisch";
    title: string;
    desc: string;
    hint: string;
    phaseId: "nose" | "palate" | "finish" | "overall";
  }> = [
    { mode: "quick", title: labels.quick || "Quick", desc: labels.quickD || "Overall score only — two taps and done.", hint: labels.quickH || "When time is short.", phaseId: "overall" },
    ...(showTisch ? [{ mode: "tisch" as const, title: labels.tisch || "Tisch", desc: labels.tischD || "Ein Tap pro Phase.", hint: labels.tischH || "", phaseId: "finish" as const }] : []),
    { mode: "compact", title: labels.compact, desc: labels.compactD, hint: labels.compactH, phaseId: "palate" },
    { mode: "guided", title: labels.guided, desc: labels.guidedD, hint: labels.guidedH, phaseId: "nose" },
  ];
  const cards = hideQuick ? allCards.filter(c => c.mode !== "quick") : allCards;
  const singleCards = cards.filter((c) => c.mode !== "compact" && c.mode !== "guided");
  const inDepthModes = cards.filter((c) => c.mode === "compact" || c.mode === "guided");

  return (
    <div className="labs-fade-in" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <button
        onClick={onBack}
        data-testid="rating-mode-back"
        style={{
          display: "flex",
          alignItems: "center",
          gap: SP.sm,
          minHeight: TOUCH_MIN,
          background: "none",
          border: "none",
          color: "var(--labs-text)",
          cursor: "pointer",
          padding: 0,
          fontFamily: FONT.body,
          fontSize: 15,
          marginBottom: SP.lg,
        }}
      >
        <BackIcon color="var(--labs-text)" size={20} />
        <span>{labels.back}</span>
      </button>

      <h1
        data-testid="rating-mode-title"
        style={{
          fontFamily: FONT.display,
          fontSize: 28,
          fontWeight: 600,
          color: "var(--labs-text)",
          marginBottom: SP.sm,
        }}
      >
        {labels.modeQ}
      </h1>

      <p style={{
        fontFamily: FONT.body,
        fontSize: 14,
        color: "var(--labs-text-muted)",
        marginBottom: SP.xl,
        lineHeight: 1.5,
      }}>
        {labels.modeSub}
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
        {singleCards.map(({ mode, title, desc, hint, phaseId }) => {
          const accentVar = `var(--labs-phase-${phaseId})`;
          const dimVar = `var(--labs-phase-${phaseId}-dim)`;
          return (
            <button
              key={mode}
              data-testid={`rating-mode-${mode}`}
              onClick={() => onSelect(mode, showRememberToggle ? remember : undefined)}
              style={{
                display: "flex",
                gap: SP.md,
                padding: SP.lg,
                background: "var(--labs-surface)",
                border: "1px solid var(--labs-border)",
                borderRadius: RADIUS.lg,
                cursor: "pointer",
                textAlign: "left",
                transition: "border-color 0.2s, background 0.2s",
                minHeight: TOUCH_MIN,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `color-mix(in srgb, ${accentVar} 40%, transparent)`;
                e.currentTarget.style.background = dimVar;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--labs-border)";
                e.currentTarget.style.background = "var(--labs-surface)";
              }}
            >
              <PhaseSignature phaseId={phaseId} size="large" />
              <div style={{ flex: 1 }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: SP.sm,
                  fontFamily: FONT.display,
                  fontSize: 20,
                  fontWeight: 600,
                  color: "var(--labs-text)",
                  marginBottom: SP.xs,
                }}>
                  <span>{title}</span>
                  {mode === "tisch" && tischIsNew && labels.tischNew && (
                    <span
                      data-testid="badge-tisch-new"
                      style={{
                        fontFamily: FONT.body,
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        padding: "2px 7px",
                        borderRadius: RADIUS.full,
                        background: "var(--labs-accent-muted)",
                        color: "var(--labs-accent)",
                        border: "1px solid var(--labs-accent)",
                      }}
                    >
                      {labels.tischNew}
                    </span>
                  )}
                </div>
                <div style={{
                  fontFamily: FONT.body,
                  fontSize: 14,
                  color: "var(--labs-text-muted)",
                  marginBottom: SP.sm,
                  lineHeight: 1.5,
                }}>
                  {desc}
                </div>
                <div style={{
                  fontFamily: FONT.serif,
                  fontSize: 13,
                  fontStyle: "italic",
                  color: "var(--labs-text-secondary)",
                }}>
                  {hint}
                </div>
              </div>
            </button>
          );
        })}

        {inDepthModes.length > 0 && (
          <div style={{
            display: "flex",
            gap: SP.md,
            padding: SP.lg,
            background: "var(--labs-surface)",
            border: "1px solid var(--labs-border)",
            borderRadius: RADIUS.lg,
          }}>
            <PhaseSignature phaseId="palate" size="large" />
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: FONT.display,
                fontSize: 20,
                fontWeight: 600,
                color: "var(--labs-text)",
                marginBottom: SP.xs,
              }}>
                {t("v2.ratingInDepthTitle", "In Depth")}
              </div>
              <div style={{
                fontFamily: FONT.body,
                fontSize: 14,
                color: "var(--labs-text-muted)",
                marginBottom: SP.md,
                lineHeight: 1.5,
              }}>
                {t("v2.ratingInDepthDesc", "Alle vier Dimensionen \u2014 mit Aromen & Notizen.")}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: SP.sm }}>
                {inDepthModes.map((c) => (
                  <button
                    key={c.mode}
                    data-testid={`rating-mode-${c.mode}`}
                    onClick={() => onSelect(c.mode, showRememberToggle ? remember : undefined)}
                    style={{
                      padding: "10px 18px",
                      borderRadius: RADIUS.full,
                      border: "1px solid var(--labs-border)",
                      background: "var(--labs-bg)",
                      color: "var(--labs-text)",
                      fontFamily: FONT.body,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      minHeight: TOUCH_MIN,
                      transition: "border-color 0.2s, background 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "color-mix(in srgb, var(--labs-phase-palate) 40%, transparent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--labs-border)";
                    }}
                  >
                    {c.mode === "compact"
                      ? t("v2.ratingLayoutAtOnce", "Auf einmal")
                      : t("v2.ratingLayoutStepwise", "Schritt f\u00fcr Schritt")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {showRememberToggle && (
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            marginTop: SP.lg,
            padding: SP.md,
            cursor: "pointer",
            color: "var(--labs-text-muted)",
            fontFamily: FONT.body,
            fontSize: 13,
          }}
          data-testid="label-remember-mode"
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: "var(--labs-accent)" }}
            data-testid="checkbox-remember-mode"
          />
          <span>{labels.rememberDefault || "Remember as my default"}</span>
        </label>
      )}
    </div>
  );
}
