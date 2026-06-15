import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "@/labs/components/rating/theme";

const COUNT_KEY = "casksense.impressionIntroCount";
const VERBOSE_TIMES = 5;

function readCount(): number {
  try { return parseInt(localStorage.getItem(COUNT_KEY) || "0", 10) || 0; } catch { return 0; }
}

export default function ImpressionIntro({ onStart, onBack }: { onStart: () => void; onBack?: () => void }) {
  const { t } = useTranslation();
  const count = readCount();
  const [showFull, setShowFull] = useState(count < VERBOSE_TIMES);

  const handleStart = () => {
    try { localStorage.setItem(COUNT_KEY, String(count + 1)); } catch { /* ignore */ }
    onStart();
  };

  const bullets = [
    t("v2.solo.impressionBullet1", "Sag in eigenen Worten, was du wahrnimmst \u2014 ein Wort gen\u00fcgt."),
    t("v2.solo.impressionBullet2", "Wir fragen gezielt nach, mit Aromen zum Antippen."),
    t("v2.solo.impressionBullet3", "Dein Eindruck f\u00fchrt \u2014 wir pr\u00e4gen ihn nicht vor."),
    t("v2.solo.impressionBullet4", "Den Whisky kl\u00e4ren wir erst danach."),
  ];

  return (
    <div style={{ padding: SP.lg, display: "flex", flexDirection: "column", minHeight: "70vh" }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          data-testid="impression-intro-back"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: LABS_THEME.muted, font: "inherit", fontSize: 14, cursor: "pointer", padding: 0, marginBottom: SP.lg, alignSelf: "flex-start" }}
        >
          <ArrowLeft size={18} />
          {t("common.back", "Zur\u00fcck")}
        </button>
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <svg width="96" height="113" viewBox="0 0 124 146" fill="none" aria-hidden="true" style={{ marginBottom: SP.lg, opacity: 0.9 }}>
          <defs>
            <linearGradient id="csIntroLiquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a847" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#c47a3a" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <path d="M46 16 C45 16 44 17 44 19 C44 38 36 50 38 68 C40 90 50 106 62 106 C74 106 84 90 86 68 C88 50 80 38 80 19 C80 17 79 16 78 16 Z" fill="none" stroke="#d4a847" strokeWidth="1.5" strokeOpacity="0.7" />
          <path d="M39 65 C41 87 51 104 62 104 C73 104 83 87 85 65 C73 71 51 71 39 65 Z" fill="url(#csIntroLiquid)" />
          <ellipse cx="62" cy="65" rx="23" ry="4" fill="#d4a847" fillOpacity="0.3" />
          <path d="M62 106 L62 126" stroke="#d4a847" strokeWidth="1.5" strokeOpacity="0.6" />
          <path d="M48 130 C48 127 76 127 76 130 C76 133 48 133 48 130 Z" fill="none" stroke="#d4a847" strokeWidth="1.5" strokeOpacity="0.6" />
          <path d="M51 26 C49 40 48 52 51 64" stroke="#f5ede0" strokeWidth="1.5" strokeOpacity="0.22" fill="none" strokeLinecap="round" />
        </svg>

        <div style={{ fontFamily: FONT.display, fontSize: 28, color: LABS_THEME.text, lineHeight: 1.12, marginBottom: SP.md }}>
          {t("v2.solo.impressionFirstTitle", "Das Glas steht bereit.")}
        </div>

        {showFull ? (
          <div style={{ maxWidth: 440, marginBottom: SP.xl, width: "100%" }}>
            <div style={{ fontFamily: FONT.serif, fontSize: 16, color: LABS_THEME.muted, lineHeight: 1.4, marginBottom: SP.md }}>
              {t("v2.solo.impressionBulletsTitle", "So funktioniert die Sokratische Sch\u00e4rfung:")}
            </div>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, textAlign: "left", display: "flex", flexDirection: "column", gap: SP.sm }}>
              {bullets.map((b, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontFamily: FONT.body, fontSize: 15, color: LABS_THEME.text, lineHeight: 1.4 }}>
                  <span aria-hidden="true" style={{ color: LABS_THEME.gold, flexShrink: 0, marginTop: 1 }}>{"\u2022"}</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div style={{ maxWidth: 440, marginBottom: SP.md, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontFamily: FONT.serif, fontSize: 16, color: LABS_THEME.muted, lineHeight: 1.5, marginBottom: SP.sm }}>
              {t("v2.solo.impressionIntroShort", "Sag in eigenen Worten, was du wahrnimmst \u2014 den Rest sch\u00e4rfen wir gemeinsam.")}
            </div>
            <button
              type="button"
              onClick={() => setShowFull(true)}
              data-testid="impression-intro-how"
              style={{ background: "none", border: "none", color: LABS_THEME.gold, font: "inherit", fontSize: 14, cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              {t("v2.solo.impressionHowLink", "Wie funktioniert das?")}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={handleStart}
          data-testid="impression-intro-start"
          style={{ marginTop: SP.lg, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TOUCH_MIN, padding: "0 24px", borderRadius: RADIUS.md, background: LABS_THEME.gold, color: "#0B0906", fontFamily: FONT.body, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer" }}
        >
          {t("v2.solo.impressionFirstCta", "Eindruck festhalten")}
          <span aria-hidden="true">{"\u2192"}</span>
        </button>
      </div>
    </div>
  );
}
