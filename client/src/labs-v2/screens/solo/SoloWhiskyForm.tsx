import { useState } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Check } from "../../icons";
import type { CapturedWhisky } from "./SoloCaptureScreen";
import SubScreenHeader from "../meinewelt/SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  initial?: Partial<CapturedWhisky>;
  fromAI?: boolean;
  onSubmit: (w: CapturedWhisky) => void;
  onBack: () => void;
}

export default function SoloWhiskyForm({ th, t, initial, fromAI, onSubmit, onBack }: Props) {
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: TOUCH_MIN,
    padding: `${SP.sm}px ${SP.md}px`,
    borderRadius: RADIUS.md,
    border: `1px solid ${th.border}`,
    background: th.inputBg,
    color: th.text,
    fontFamily: FONT.body,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: FONT.body,
    fontSize: 12,
    fontWeight: 600,
    color: th.muted,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: SP.xs,
    display: "block",
  };

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.xl}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.soloTitle} onBack={onBack} backTestId="solo-form-back-btn" titleTestId="solo-form-title" />

      {fromAI && (
        <div
          data-testid="solo-recognized-banner"
          style={{
            display: "flex",
            alignItems: "center",
            gap: SP.sm,
            padding: `${SP.sm}px ${SP.md}px`,
            borderRadius: RADIUS.md,
            background: th.phases.overall.dim,
            border: `1px solid ${th.phases.overall.accent}`,
            marginBottom: SP.lg,
          }}
        >
          <Check color={th.phases.overall.accent} size={18} />
          <span style={{ fontFamily: FONT.body, fontSize: 14, color: th.phases.overall.accent }}>
            {t.soloRecognized}
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
        <div>
          <label style={labelStyle}>{t.soloName} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t.soloNamePH}
            style={inputStyle}
            data-testid="solo-input-name"
          />
        </div>

        <div>
          <label style={labelStyle}>{t.soloDistillery}</label>
          <input
            type="text"
            value={distillery}
            onChange={(e) => setDistillery(e.target.value)}
            placeholder={t.soloDistilleryPH}
            style={inputStyle}
            data-testid="solo-input-distillery"
          />
        </div>

        <div>
          <label style={labelStyle}>{t.soloRegion}</label>
          <input
            type="text"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            placeholder={t.soloRegionPH}
            style={inputStyle}
            data-testid="solo-input-region"
          />
        </div>

        <div>
          <label style={labelStyle}>{t.soloCask}</label>
          <input
            type="text"
            value={cask}
            onChange={(e) => setCask(e.target.value)}
            placeholder={t.soloCaskPH}
            style={inputStyle}
            data-testid="solo-input-cask"
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md }}>
          <div>
            <label style={labelStyle}>{t.soloAge}</label>
            <input
              type="text"
              inputMode="numeric"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder={t.soloAgePH}
              style={inputStyle}
              data-testid="solo-input-age"
            />
          </div>
          <div>
            <label style={labelStyle}>{t.soloAbv}</label>
            <input
              type="text"
              inputMode="decimal"
              value={abv}
              onChange={(e) => setAbv(e.target.value)}
              placeholder={t.soloAbvPH}
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
          minHeight: TOUCH_MIN,
          marginTop: SP.xl,
          borderRadius: RADIUS.full,
          border: "none",
          background: canSubmit ? th.phases.nose.accent : th.bgHover,
          color: canSubmit ? "#0e0b05" : th.faint,
          fontFamily: FONT.display,
          fontSize: 16,
          fontWeight: 700,
          cursor: canSubmit ? "pointer" : "default",
          opacity: canSubmit ? 1 : 0.5,
          transition: "all 0.2s",
        }}
      >
        {t.soloToRating}
      </button>
    </div>
  );
}
