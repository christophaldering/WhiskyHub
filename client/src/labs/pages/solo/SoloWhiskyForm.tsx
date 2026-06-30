import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check } from "lucide-react";
import type { CapturedWhisky } from "./SoloCaptureScreen";
import WhiskyImageUpload from "@/components/WhiskyImageUpload";

interface Props {
  initial?: Partial<CapturedWhisky>;
  fromAI?: boolean;
  initialImageFile?: File | null;
  onSubmit: (w: CapturedWhisky, imageFile?: File | null) => void;
  onBack: () => void;
  onChange?: (w: Partial<CapturedWhisky>) => void;
  submitLabel?: string;
  voiceIdentity?: Partial<CapturedWhisky>;
}

type VoiceField = "name" | "distillery" | "country" | "region" | "age" | "abv";

export default function SoloWhiskyForm({ initial, fromAI, initialImageFile, onSubmit, onBack, onChange, submitLabel, voiceIdentity }: Props) {
  const { t } = useTranslation();
  const initVal = (k: VoiceField) => (initial?.[k] || "") || (voiceIdentity?.[k] || "");
  const [name, setName] = useState(initVal("name"));
  const [distillery, setDistillery] = useState(initVal("distillery"));
  const [country, setCountry] = useState(initVal("country"));
  const [region, setRegion] = useState(initVal("region"));
  const [cask, setCask] = useState(initial?.cask || "");
  const [age, setAge] = useState(initVal("age"));
  const [abv, setAbv] = useState(initVal("abv"));
  const [imageFile, setImageFile] = useState<File | null>(initialImageFile || null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialImageFile ? URL.createObjectURL(initialImageFile) : null
  );

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, []);

  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    onChange?.({ name, distillery, country, region, cask, age, abv, fromAI: fromAI || false });
  }, [name, distillery, country, region, cask, age, abv]);

  const canSubmit = name.trim().length > 0;

  const conflictOf = (k: VoiceField) => {
    const pv = (initial?.[k] ?? "").toString().trim();
    const vv = (voiceIdentity?.[k] ?? "").toString().trim();
    return pv && vv && pv.toLowerCase() !== vv.toLowerCase() ? { photo: pv, voice: vv } : null;
  };

  const renderConflict = (k: VoiceField, current: string, set: (v: string) => void) => {
    const c = conflictOf(k);
    if (!c) return null;
    const opts = [
      { v: c.voice, src: t("v2.solo.sourceVoice", "Cooper"), id: "voice" },
      { v: c.photo, src: t("v2.solo.sourcePhoto", "Photo"), id: "photo" },
    ];
    return (
      <div data-testid={`solo-conflict-${k}`} style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-ui)", fontSize: 12, color: "var(--labs-text-secondary)" }}>
          {t("v2.solo.conflictHint", "Two sources \u2014 tap one:")}
        </span>
        {opts.map((opt) => {
          const active = current.trim().toLowerCase() === opt.v.toLowerCase();
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => set(opt.v)}
              data-testid={`solo-conflict-${k}-${opt.id}`}
              style={{
                cursor: "pointer",
                borderRadius: 999,
                padding: "4px 10px",
                fontFamily: "var(--font-ui)",
                fontSize: 12,
                border: active ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                background: active ? "var(--labs-accent)" : "transparent",
                color: active ? "var(--labs-accent-dark)" : "var(--labs-text)",
              }}
            >
              {opt.v} · {opt.src}
            </button>
          );
        })}
      </div>
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      name: name.trim(),
      distillery: distillery.trim(),
      country: country.trim(),
      region: region.trim(),
      cask: cask.trim(),
      age: age.trim(),
      abv: abv.trim(),
      fromAI: fromAI || false,
    }, imageFile);
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
        <WhiskyImageUpload
          imageUrl={imagePreview}
          onFileSelected={(file) => {
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
          }}
          onImageDeleted={() => {
            setImageFile(null);
            setImagePreview(null);
          }}
          variant="labs"
          size="sm"
          testIdPrefix="solo-image"
        />

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
          {renderConflict("name", name, setName)}
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
          {renderConflict("distillery", distillery, setDistillery)}
        </div>

        <div>
          <span className="labs-section-label">{t("v2.solo.country", "Country")}</span>
          <input
            type="text"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder={t("v2.solo.countryPH", "e.g. Scotland")}
            className="labs-input"
            data-testid="solo-input-country"
          />
          {renderConflict("country", country, setCountry)}
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
          {renderConflict("region", region, setRegion)}
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
            {renderConflict("age", age, setAge)}
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
            {renderConflict("abv", abv, setAbv)}
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
        {submitLabel ?? t("v2.solo.toRating", "Continue to Rating")}
      </button>
    </div>
  );
}
