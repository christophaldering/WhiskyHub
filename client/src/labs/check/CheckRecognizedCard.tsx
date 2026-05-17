import { useTranslation } from "react-i18next";
import { Wine, Sparkles } from "lucide-react";
import { FONT } from "@/labs/components/rating/theme";
import CheckActionCard from "./CheckActionCard";
import type { CheckCandidateMeta } from "./checkActions";
import type { CheckIdentifyCandidate } from "./checkApi";

type Props = {
  candidate: CheckIdentifyCandidate;
  pid: string | null;
  onReset: () => void;
};

export default function CheckRecognizedCard({ candidate, pid, onReset }: Props) {
  const { t } = useTranslation();

  const ageStr = candidate.age != null ? String(candidate.age) : null;
  const abvNum =
    typeof candidate.abv === "number"
      ? candidate.abv
      : typeof candidate.abv === "string"
        ? parseFloat(candidate.abv.replace(",", ".")) || null
        : null;

  const meta: CheckCandidateMeta = {
    whiskyId: undefined,
    name: candidate.name || t("check.unknownWhisky", "Unbekannter Whisky"),
    distillery: candidate.distillery ?? null,
    region: candidate.region ?? null,
    age: ageStr,
    abv: abvNum,
    caskType: candidate.caskType ?? null,
    imageUrl: null,
    whiskybaseId: null,
  };

  const subtitleParts: string[] = [];
  if (candidate.distillery) subtitleParts.push(candidate.distillery);
  if (candidate.region) subtitleParts.push(candidate.region);
  if (ageStr) subtitleParts.push(`${ageStr} ${t("check.years", "Jahre")}`);
  if (abvNum != null) subtitleParts.push(`${abvNum}% Vol.`);

  const confidencePct = Math.round((candidate.confidence ?? 0) * 100);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
      data-testid="check-recognized-card"
    >
      <div
        style={{
          padding: "20px 16px",
          borderRadius: 16,
          border: "1px solid var(--labs-border)",
          background: "var(--labs-surface-elevated)",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
        data-testid="check-recognized-header"
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: "var(--labs-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            color: "var(--labs-accent)",
          }}
        >
          <Wine className="w-6 h-6" />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{
              fontFamily: FONT.display,
              fontSize: 18,
              fontWeight: 600,
              color: "var(--labs-text)",
              lineHeight: 1.2,
            }}
            data-testid="text-check-recognized-name"
          >
            {meta.name}
          </div>
          {subtitleParts.length > 0 && (
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 12,
                color: "var(--labs-text-secondary)",
                marginTop: 4,
              }}
              data-testid="text-check-recognized-subtitle"
            >
              {subtitleParts.join(" · ")}
            </div>
          )}
          <div
            style={{
              fontFamily: FONT.body,
              fontSize: 11,
              color: "var(--labs-accent)",
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              fontWeight: 600,
            }}
            data-testid="text-check-recognized-confidence"
          >
            <Sparkles className="w-3 h-3" />
            <span>{t("check.recognized.byAi", "KI-erkannt · {{p}}% Konfidenz", { p: confidencePct })}</span>
          </div>
        </div>
      </div>

      <CheckActionCard pid={pid} meta={meta} />

      <button
        onClick={onReset}
        style={{
          padding: "10px 16px",
          background: "transparent",
          border: "1px solid var(--labs-border)",
          borderRadius: 8,
          color: "var(--labs-text-secondary)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: FONT.body,
          alignSelf: "flex-start",
        }}
        data-testid="button-check-recognized-reset"
      >
        {t("check.tryAgain", "Erneut versuchen")}
      </button>
    </div>
  );
}
