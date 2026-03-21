import { useState, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { EyeOff, Eye } from "../../icons";
import type { TastingConfig } from "../../types/host";

interface Props {
  th: ThemeTokens;
  t: Translations;
  config: TastingConfig;
  onDone: (config: TastingConfig, tastingId: string, tastingCode: string, hostId: string) => void;
}

const REVEAL_OPTIONS = [
  { key: "nose", labelKey: "hostRevealNose" as const },
  { key: "palate", labelKey: "hostRevealPalate" as const },
  { key: "full", labelKey: "hostRevealFull" as const },
  { key: "immediate", labelKey: "hostRevealImmediate" as const },
];

const RATING_SCALES = ["0-100", "0-20", "0-10"] as const;

const REVEAL_PRESETS: Record<string, string[]> = {
  nose: ["nose", "palate", "finish", "name"],
  palate: ["palate", "finish", "name"],
  full: ["name"],
  immediate: [],
};

export default function HostStep1Setup({ th, t, config, onDone }: Props) {
  const [form, setForm] = useState<TastingConfig>(config);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealPreset, setRevealPreset] = useState("nose");

  const update = useCallback(<K extends keyof TastingConfig>(key: K, val: TastingConfig[K]) => {
    setForm(prev => ({ ...prev, [key]: val }));
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    minHeight: TOUCH_MIN,
    padding: `${SP.sm}px ${SP.md}px`,
    background: th.inputBg,
    border: `1px solid ${th.border}`,
    borderRadius: RADIUS.md,
    color: th.text,
    fontSize: 15,
    fontFamily: FONT.body,
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: th.muted,
    marginBottom: SP.xs,
    display: "block",
    fontFamily: FONT.body,
  };

  const handleSubmit = useCallback(async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const maxScore = form.ratingScale === "0-100" ? 100 : form.ratingScale === "0-20" ? 20 : 10;
      const body = {
        title: form.name.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim() || undefined,
        blindMode: form.blindMode,
        revealOrder: JSON.stringify(REVEAL_PRESETS[revealPreset] || form.revealOrder),
        maxScore,
        status: "draft",
      };
      const res = await fetch("/api/tastings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || "Failed to create tasting");
      }
      const tasting = await res.json();
      onDone(form, tasting.id, tasting.code || tasting.id, tasting.hostId || "");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [form, revealPreset, onDone]);

  const canSubmit = form.name.trim().length > 0 && !loading;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: SP.lg }}>
      <div>
        <label style={labelStyle}>{t.hostName}</label>
        <input
          data-testid="host-name-input"
          type="text"
          value={form.name}
          onChange={e => update("name", e.target.value)}
          placeholder={t.hostName}
          style={inputStyle}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
        <div>
          <label style={labelStyle}>{t.hostDate}</label>
          <input
            data-testid="host-date-input"
            type="date"
            value={form.date}
            onChange={e => update("date", e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{t.hostTime}</label>
          <input
            data-testid="host-time-input"
            type="time"
            value={form.time}
            onChange={e => update("time", e.target.value)}
            style={inputStyle}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>{t.hostLoc}</label>
        <input
          data-testid="host-location-input"
          type="text"
          value={form.location}
          onChange={e => update("location", e.target.value)}
          placeholder={t.hostLoc}
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>{t.hostFormat}</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.sm }}>
          {([true, false] as const).map(blind => {
            const isSelected = form.blindMode === blind;
            return (
              <button
                key={String(blind)}
                data-testid={`host-format-${blind ? "blind" : "open"}`}
                onClick={() => update("blindMode", blind)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: SP.sm,
                  padding: SP.md,
                  minHeight: TOUCH_MIN,
                  background: isSelected ? th.bgHover : th.bgCard,
                  border: `2px solid ${isSelected ? th.gold : th.border}`,
                  borderRadius: RADIUS.lg,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                {blind ? <EyeOff color={isSelected ? th.gold : th.muted} size={28} /> : <Eye color={isSelected ? th.gold : th.muted} size={28} />}
                <span style={{ fontSize: 15, fontWeight: 600, color: isSelected ? th.gold : th.text, fontFamily: FONT.body }}>
                  {blind ? t.hostBlind : t.hostOpen}
                </span>
                <span style={{ fontSize: 12, color: th.muted, fontFamily: FONT.body, textAlign: "center" }}>
                  {blind ? t.hostBlindDesc : t.hostOpenDesc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {form.blindMode && (
        <div>
          <label style={labelStyle}>{t.hostRevealOrder}</label>
          <div style={{ display: "flex", flexDirection: "column", gap: SP.xs }}>
            {REVEAL_OPTIONS.map(opt => {
              const isSelected = revealPreset === opt.key;
              return (
                <button
                  key={opt.key}
                  data-testid={`host-reveal-${opt.key}`}
                  onClick={() => setRevealPreset(opt.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: SP.sm,
                    padding: `${SP.sm}px ${SP.md}px`,
                    minHeight: TOUCH_MIN,
                    background: isSelected ? th.bgHover : "transparent",
                    border: `1px solid ${isSelected ? th.gold : th.border}`,
                    borderRadius: RADIUS.md,
                    cursor: "pointer",
                    fontFamily: FONT.body,
                    fontSize: 14,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? th.gold : th.text,
                    transition: "all 0.2s ease",
                  }}
                >
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: RADIUS.full,
                      border: `2px solid ${isSelected ? th.gold : th.faint}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && (
                      <div style={{ width: 10, height: 10, borderRadius: RADIUS.full, background: th.gold }} />
                    )}
                  </div>
                  {t[opt.labelKey]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label style={labelStyle}>{t.hostRatingScale}</label>
        <div style={{ display: "flex", gap: SP.sm }}>
          {RATING_SCALES.map(scale => {
            const isSelected = form.ratingScale === scale;
            return (
              <button
                key={scale}
                data-testid={`host-scale-${scale}`}
                onClick={() => update("ratingScale", scale)}
                style={{
                  flex: 1,
                  minHeight: TOUCH_MIN,
                  background: isSelected ? th.bgHover : th.bgCard,
                  border: `2px solid ${isSelected ? th.gold : th.border}`,
                  borderRadius: RADIUS.md,
                  cursor: "pointer",
                  fontFamily: FONT.body,
                  fontSize: 15,
                  fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? th.gold : th.text,
                  transition: "all 0.2s ease",
                }}
              >
                {scale}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: SP.sm,
            background: "rgba(220,50,50,0.1)",
            borderRadius: RADIUS.md,
            color: "#e55",
            fontSize: 13,
            fontFamily: FONT.body,
          }}
          data-testid="host-setup-error"
        >
          {error}
        </div>
      )}

      <button
        data-testid="host-create-btn"
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: "100%",
          minHeight: TOUCH_MIN,
          background: canSubmit ? th.gold : th.bgCard,
          color: canSubmit ? "#fff" : th.faint,
          border: "none",
          borderRadius: RADIUS.lg,
          fontSize: 16,
          fontWeight: 600,
          fontFamily: FONT.body,
          cursor: canSubmit ? "pointer" : "not-allowed",
          opacity: loading ? 0.7 : 1,
          transition: "all 0.2s ease",
        }}
      >
        {loading ? "…" : t.hostCreateTasting}
      </button>
    </div>
  );
}
