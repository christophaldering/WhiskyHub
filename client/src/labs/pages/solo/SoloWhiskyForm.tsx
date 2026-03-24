import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check } from "lucide-react";
import type { CapturedWhisky } from "./SoloCaptureScreen";

interface Props {
  initial?: Partial<CapturedWhisky>;
  fromAI?: boolean;
  onSubmit: (w: CapturedWhisky) => void;
  onBack: () => void;
  onChange?: (w: Partial<CapturedWhisky>) => void;
}

export default function SoloWhiskyForm({ initial, fromAI, onSubmit, onBack, onChange }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || "");
  const [distillery, setDistillery] = useState(initial?.distillery || "");
  const [region, setRegion] = useState(initial?.region || "");
  const [cask, setCask] = useState(initial?.cask || "");
  const [age, setAge] = useState(initial?.age || "");
  const [abv, setAbv] = useState(initial?.abv || "");

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    onChange?.({ name, distillery, region, cask, age, abv, fromAI: fromAI || false });
  }, [name, distillery, region, cask, age, abv]);

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

  return (
    <div className="labs-fade-in" style={{ padding: "var(--labs-space-xl) var(--labs-space-md)" }}>
      <button
        onClick={onBack}
        data-testid="solo-form-back-btn"
        className="labs-btn-ghost"
        style={{ padding: 0, marginBottom: "var(--labs-space-lg)", display: "flex", alignItems: "center", gap: "var(--labs-space-sm)" }}
      >
        <ArrowLeft size={18} />
        {t("v2.back", "Back")}
      </button>

      <h2 className="labs-h2" data-testid="solo-form-title" style={{ marginBottom: "var(--labs-space-lg)" }}>
        {t("v2.solo.title", "Log a Dram")}
      </h2>

      {fromAI && (
        <div
          data-testid="solo-recognized-banner"
          className="labs-card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--labs-space-sm)",
            padding: "var(--labs-space-sm) var(--labs-space-md)",
            background: "var(--labs-phase-overall-dim)",
            borderColor: "var(--labs-phase-overall)",
            marginBottom: "var(--labs-space-lg)",
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--labs-phase-overall-dim)",
          }}>
            <Check size={16} style={{ color: "var(--labs-phase-overall)" }} />
          </div>
          <span style={{ fontFamily: "var(--font-ui)", fontSize: 14, color: "var(--labs-phase-overall)" }}>
            {t("v2.solo.recognized", "Identified from photo")}
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--labs-space-lg)" }}>
        <div>
          <span className="labs-section-label">{t("v2.solo.name", "Name")} *</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("v2.solo.namePH", "e.g. Lagavulin 16")}
            className="labs-input"
            data-testid="solo-input-name"
          />
        </div>

        <div>
          <span className="labs-section-label">{t("v2.solo.distillery", "Distillery")}</span>
          <input
            type="text"
            value={distillery}
            onChange={(e) => setDistillery(e.target.value)}
            placeholder={t("v2.solo.distilleryPH", "e.g. Lagavulin")}
            className="labs-input"
            data-testid="solo-input-distillery"
          />
        </div>

        <div>
          <span className="labs-section-label">{t("v2.solo.region", "Region")}</span>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t("v2.solo.regionPH", "e.g. Islay")}
            className="labs-input"
            data-testid="solo-input-region"
          />
        </div>

        <div>
          <span className="labs-section-label">{t("v2.solo.cask", "Cask Type")}</span>
          <input
            type="text"
            value={cask}
            onChange={(e) => setCask(e.target.value)}
            placeholder={t("v2.solo.caskPH", "e.g. Sherry")}
            className="labs-input"
            data-testid="solo-input-cask"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--labs-space-md)" }}>
          <div>
            <span className="labs-section-label">{t("v2.solo.age", "Age")}</span>
            <input
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={t("v2.solo.agePH", "Years")}
              className="labs-input"
              data-testid="solo-input-age"
            />
          </div>
          <div>
            <span className="labs-section-label">{t("v2.solo.abv", "ABV")}</span>
            <input
              type="text"
              inputMode="decimal"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder={t("v2.solo.abvPH", "%")}
              className="labs-input"
              data-testid="solo-input-abv"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        data-testid="solo-to-rating-btn"
        className="labs-btn-primary"
        style={{ width: "100%", minHeight: 44, marginTop: "var(--labs-space-xl)" }}
      >
        {t("v2.solo.toRating", "Continue to Rating")}
      </button>
    </div>
  );
}
