import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";

export interface TastingContextValue {
  place: string;
  placeCustom?: string;
  company: string;
  companyCustom?: string;
  mood: string;
}

interface Props {
  initial: TastingContextValue | null;
  onContinue: (ctx: TastingContextValue | null) => void;
  onSkip: () => void;
  onBack: () => void;
}

const PLACE_OPTIONS = ["atHome", "fair", "restaurant", "bar", "onTheGo", "other"] as const;
const COMPANY_OPTIONS = ["alone", "withFriends", "withFamily", "withColleagues", "other"] as const;
const MOOD_OPTIONS = ["relaxed", "focused", "celebratory", "curious"] as const;

const PLACE_LABEL_KEY: Record<string, string> = {
  atHome: "v2.contextAtHome",
  fair: "v2.contextFair",
  restaurant: "v2.contextRestaurant",
  bar: "v2.contextBar",
  onTheGo: "v2.contextOnTheGo",
  other: "v2.contextOther",
};

const COMPANY_LABEL_KEY: Record<string, string> = {
  alone: "v2.contextAlone",
  withFriends: "v2.contextWithFriends",
  withFamily: "v2.contextWithFamily",
  withColleagues: "v2.contextWithColleagues",
  other: "v2.contextOther",
};

const MOOD_LABEL_KEY: Record<string, string> = {
  relaxed: "v2.contextRelaxed",
  focused: "v2.contextFocused",
  celebratory: "v2.contextCelebratory",
  curious: "v2.contextCurious",
};

export default function SoloContextStep({ initial, onContinue, onSkip, onBack }: Props) {
  const { t } = useTranslation();
  const [place, setPlace] = useState<string>(initial?.place ?? "");
  const [placeCustom, setPlaceCustom] = useState<string>(initial?.placeCustom ?? "");
  const [company, setCompany] = useState<string>(initial?.company ?? "");
  const [companyCustom, setCompanyCustom] = useState<string>(initial?.companyCustom ?? "");
  const [mood, setMood] = useState<string>(initial?.mood ?? "");

  const hasAny = useMemo(() => Boolean(place || company || mood), [place, company, mood]);

  const handleContinue = () => {
    if (!hasAny) {
      onContinue(null);
      return;
    }
    onContinue({
      place,
      ...(place === "other" && placeCustom.trim() ? { placeCustom: placeCustom.trim() } : {}),
      company,
      ...(company === "other" && companyCustom.trim() ? { companyCustom: companyCustom.trim() } : {}),
      mood,
    });
  };

  const renderRow = (
    label: string,
    options: readonly string[],
    labelMap: Record<string, string>,
    value: string,
    setValue: (v: string) => void,
    testIdPrefix: string,
  ) => (
    <div style={{ marginBottom: "var(--labs-space-lg)" }}>
      <span className="labs-section-label" style={{ display: "block", marginBottom: "var(--labs-space-sm)" }}>
        {label}
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--labs-space-xs)" }}>
        {options.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              data-testid={`${testIdPrefix}-${opt}`}
              onClick={() => setValue(active ? "" : opt)}
              className={active ? "labs-chip labs-chip-active" : "labs-chip"}
              style={{ minHeight: 44 }}
            >
              {t(labelMap[opt], opt)}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)" }}>
      <button
        onClick={onBack}
        data-testid="solo-context-back-btn"
        className="labs-btn-ghost"
        style={{ padding: 0, marginBottom: "var(--labs-space-lg)", display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}
      >
        <ArrowLeft size={18} />
        {t("v2.back", "Back")}
      </button>

      <h2 className="labs-h2" data-testid="solo-context-title" style={{ marginBottom: "var(--labs-space-xs)" }}>
        {t("v2.tastingContext", "Context")}
      </h2>
      <p style={{
        fontFamily: "var(--font-ui)",
        fontSize: 14,
        color: "var(--labs-text-muted)",
        marginBottom: "var(--labs-space-xl)",
        lineHeight: 1.5,
      }}>
        {t("v2.tastingContextDesc", "Optional — where, with whom, and in what mood are you tasting?")}
      </p>

      {renderRow(
        t("v2.contextPlaceLabel", "Place / Occasion"),
        PLACE_OPTIONS,
        PLACE_LABEL_KEY,
        place,
        setPlace,
        "context-place",
      )}
      {place === "other" && (
        <input
          type="text"
          value={placeCustom}
          onChange={(e) => setPlaceCustom(e.target.value)}
          placeholder={t("v2.contextPlaceCustomPH", "Where are you tasting?")}
          className="labs-input"
          data-testid="context-place-custom"
          style={{ marginTop: "calc(-1 * var(--labs-space-md))", marginBottom: "var(--labs-space-lg)" }}
        />
      )}

      {renderRow(
        t("v2.contextCompanyLabel", "Company"),
        COMPANY_OPTIONS,
        COMPANY_LABEL_KEY,
        company,
        setCompany,
        "context-company",
      )}
      {company === "other" && (
        <input
          type="text"
          value={companyCustom}
          onChange={(e) => setCompanyCustom(e.target.value)}
          placeholder={t("v2.contextCompanyCustomPH", "Who are you with?")}
          className="labs-input"
          data-testid="context-company-custom"
          style={{ marginTop: "calc(-1 * var(--labs-space-md))", marginBottom: "var(--labs-space-lg)" }}
        />
      )}

      {renderRow(
        t("v2.contextMoodLabel", "Mood"),
        MOOD_OPTIONS,
        MOOD_LABEL_KEY,
        mood,
        setMood,
        "context-mood",
      )}

      <button
        type="button"
        onClick={handleContinue}
        data-testid="context-continue-btn"
        className="labs-btn-primary"
        style={{ width: "100%", minHeight: 44, marginTop: "var(--labs-space-md)" }}
      >
        {t("v2.contextContinue", "Continue")}
      </button>

      <button
        type="button"
        onClick={onSkip}
        data-testid="context-skip-btn"
        className="labs-btn-ghost"
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: "var(--labs-space-sm)",
          color: "var(--labs-text-muted)",
          fontSize: 14,
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        {t("v2.skipContext", "Skip →")}
      </button>
    </div>
  );
}
