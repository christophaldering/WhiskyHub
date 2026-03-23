import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check } from "lucide-react";
import type { CapturedWhisky } from "./SoloCaptureScreen";

interface Props {
  initial?: Partial<CapturedWhisky>;
  fromAI?: boolean;
  onSubmit: (w: CapturedWhisky) => void;
  onBack: () => void;
}

export default function SoloWhiskyForm({ initial, fromAI, onSubmit, onBack }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || "");
  const [distillery, setDistillery] = useState(initial?.distillery || "");
  const [region, setRegion] = useState(initial?.region || "");
  const [cask, setCask] = useState(initial?.cask || "");
  const [age, setAge] = useState(initial?.age || "");
  const [abv, setAbv] = useState(initial?.abv || "");

  const canSubmit = name.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      distillery: distillery.trim(),
      region: region.trim(),
      cask: cask.trim(),
      age: age.trim(),
      abv: abv.trim(),
      fromAI: fromAI || false,
    });
  };

  const inputClass = "w-full min-h-[44px] px-3 py-2 rounded-lg text-[15px] outline-none";
  const inputStyle: React.CSSProperties = {
    border: "1px solid var(--labs-border)",
    background: "var(--labs-surface)",
    color: "var(--labs-text)",
    fontFamily: "var(--font-ui)",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-ui)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--labs-text-muted)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: 4,
    display: "block",
  };

  return (
    <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)" }}>
      <button
        onClick={onBack}
        data-testid="solo-form-back-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--labs-space-sm)",
          background: "none",
          border: "none",
          color: "var(--labs-accent)",
          fontFamily: "var(--font-ui)",
          fontSize: 15,
          cursor: "pointer",
          padding: 0,
          marginBottom: "var(--labs-space-lg)",
        }}
      >
        <ArrowLeft size={18} />
        {t("v2.back", "Back")}
      </button>

      <h2 className="ty-section-title" data-testid="solo-form-title" style={{ marginBottom: "var(--labs-space-lg)" }}>
        {t("v2.solo.title", "Log a Dram")}
      </h2>

      {fromAI && (
        <div
          data-testid="solo-recognized-banner"
          className="rounded-xl"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--labs-space-sm)",
            padding: "var(--labs-space-sm) var(--labs-space-md)",
            background: "var(--labs-phase-overall-dim)",
            border: "1px solid var(--labs-phase-overall)",
            marginBottom: "var(--labs-space-lg)",
          }}
        >
          <Check size={18} style={{ color: "var(--labs-phase-overall)" }} />
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--labs-phase-overall)" }}>
            {t("v2.solo.recognized", "Identified from photo")}
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-md)" }}>
        <div>
          <label style={labelStyle}>{t("v2.solo.name", "Name")} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("v2.solo.namePH", "e.g. Lagavulin 16")}
            className={inputClass}
            style={inputStyle}
            data-testid="solo-input-name"
          />
        </div>

        <div>
          <label style={labelStyle}>{t("v2.solo.distillery", "Distillery")}</label>
          <input
            type="text"
            value={distillery}
            onChange={(e) => setDistillery(e.target.value)}
            placeholder={t("v2.solo.distilleryPH", "e.g. Lagavulin")}
            className={inputClass}
            style={inputStyle}
            data-testid="solo-input-distillery"
          />
        </div>

        <div>
          <label style={labelStyle}>{t("v2.solo.region", "Region")}</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t("v2.solo.regionPH", "e.g. Islay")}
            className={inputClass}
            style={inputStyle}
            data-testid="solo-input-region"
          />
        </div>

        <div>
          <label style={labelStyle}>{t("v2.solo.cask", "Cask Type")}</label>
          <input
            type="text"
            value={cask}
            onChange={(e) => setCask(e.target.value)}
            placeholder={t("v2.solo.caskPH", "e.g. Sherry")}
            className={inputClass}
            style={inputStyle}
            data-testid="solo-input-cask"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--labs-space-md)" }}>
          <div>
            <label style={labelStyle}>{t("v2.solo.age", "Age")}</label>
            <input
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={t("v2.solo.agePH", "Years")}
              className={inputClass}
              style={inputStyle}
              data-testid="solo-input-age"
            />
          </div>
          <div>
            <label style={labelStyle}>{t("v2.solo.abv", "ABV")}</label>
            <input
              type="text"
              inputMode="decimal"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder={t("v2.solo.abvPH", "%")}
              className={inputClass}
              style={inputStyle}
              data-testid="solo-input-abv"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        data-testid="solo-to-rating-btn"
        style={{
          width: "100%",
          minHeight: 44,
          marginTop: "var(--labs-space-xl)",
          borderRadius: "var(--labs-radius-xl)",
          border: "none",
          background: canSubmit ? "var(--labs-phase-nose)" : "var(--labs-surface-hover)",
          color: canSubmit ? "#0e0b05" : "var(--labs-text-muted)",
          fontFamily: "var(--font-display)",
          fontSize: 16,
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "default",
          opacity: canSubmit ? 1 : 0.5,
          transition: "all 0.2s",
        }}
      >
        {t("v2.solo.toRating", "Continue to Rating")}
      </button>
    </div>
  );
}
