import { useTranslation } from "react-i18next";
import { RotateCcw, X, AlertTriangle } from "lucide-react";

const GOLD = "#c8861a";

interface ResumeRatingBannerProps {
  whiskyName: string;
  step: number;
  onResume: () => void;
  onDiscard: () => void;
}

export default function ResumeRatingBanner({
  whiskyName,
  step,
  onResume,
  onDiscard,
}: ResumeRatingBannerProps) {
  const { t } = useTranslation();

  const stepLabels: Record<number, string> = {
    0: t("m2.taste.rating.nose", "Nose"),
    1: t("m2.taste.rating.taste", "Taste"),
    2: t("m2.taste.rating.finish", "Finish"),
    3: t("m2.taste.rating.summary", "Summary"),
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(200,134,26,0.08)",
        border: `1px solid rgba(200,134,26,0.2)`,
        marginBottom: 16,
        animation: "labsFadeIn 200ms ease both",
      }}
      data-testid="resume-rating-banner"
    >
      <RotateCcw style={{ width: 16, height: 16, color: GOLD, flexShrink: 0 }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {whiskyName || t("soloQuick.untitled", "Untitled dram")}
        </div>
        <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
          {t("m2.taste.rating.resumeHint", "Step: {{step}}", {
            step: stepLabels[step] || "?",
          })}
        </div>
      </div>

      <button
        onClick={onResume}
        style={{
          padding: "6px 14px",
          borderRadius: 9999,
          border: "none",
          background: GOLD,
          color: "#1a1714",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        data-testid="resume-rating-continue"
      >
        {t("m2.taste.rating.resume", "Continue")}
      </button>

      <button
        onClick={onDiscard}
        style={{
          width: 28,
          height: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          border: "1px solid var(--labs-border)",
          background: "transparent",
          color: "var(--labs-text-muted)",
          cursor: "pointer",
          flexShrink: 0,
        }}
        data-testid="resume-rating-discard"
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}

interface ResumeOrSkipBannerProps {
  title?: string;
  hint?: string;
  onSave: () => void;
  onSkip: () => void;
  saveLabel?: string;
  skipLabel?: string;
}

export function ResumeOrSkipBanner({
  title,
  hint,
  onSave,
  onSkip,
  saveLabel,
  skipLabel,
}: ResumeOrSkipBannerProps) {
  const { t } = useTranslation();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(200,134,26,0.08)",
        border: "1px solid rgba(200,134,26,0.2)",
        marginTop: 8,
        marginBottom: 8,
        animation: "labsFadeIn 200ms ease both",
      }}
      data-testid="interrupt-banner"
    >
      <AlertTriangle style={{ width: 16, height: 16, color: "#c8861a", flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
          {title || t("m2.taste.rating.interruptTitle", "Incomplete rating")}
        </div>
        <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
          {hint || t("m2.taste.rating.interruptHint", "Host advanced to next dram")}
        </div>
      </div>
      <button
        onClick={onSave}
        style={{
          padding: "6px 14px",
          borderRadius: 9999,
          border: "none",
          background: "#c8861a",
          color: "#1a1714",
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        data-testid="interrupt-save"
      >
        {saveLabel || t("m2.taste.rating.interruptSave", "Save now")}
      </button>
      <button
        onClick={onSkip}
        style={{
          padding: "6px 14px",
          borderRadius: 9999,
          border: "1px solid var(--labs-border)",
          background: "transparent",
          color: "var(--labs-text-muted)",
          fontSize: 12,
          fontWeight: 500,
          fontFamily: "inherit",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
        data-testid="interrupt-skip"
      >
        {skipLabel || t("m2.taste.rating.interruptSkip", "Skip")}
      </button>
    </div>
  );
}
