import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { FONT, SP, RADIUS, TOUCH_MIN, LABS_THEME } from "@/labs/components/rating/theme";

const SEEN_KEY = "casksense.impressionIntroSeen";

export default function ImpressionIntro({ onStart, onBack }: { onStart: () => void; onBack?: () => void }) {
  const { t } = useTranslation();
  let seen = false;
  try { seen = localStorage.getItem(SEEN_KEY) === "1"; } catch { /* ignore */ }

  const handleStart = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    onStart();
  };

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

        <div style={{ fontFamily: FONT.serif, fontSize: 16, color: LABS_THEME.muted, lineHeight: 1.5, marginBottom: SP.xl, maxWidth: 440 }}>
          {seen
            ? t("v2.solo.impressionIntroShort", "Sag in eigenen Worten, was du wahrnimmst \u2014 den Rest sch\u00e4rfen wir gemeinsam.")
            : t("v2.solo.impressionIntroLong", "Bevor du an Punkte und Kategorien denkst: Sag einfach in eigenen Worten, was dir in die Nase und auf die Zunge kommt. Ein Wort gen\u00fcgt zum Anfang. Daraus machen wir gemeinsam mehr \u2014 mit ein paar gezielten R\u00fcckfragen und passenden Aromen zum Antippen sch\u00e4rfen wir deinen Eindruck Schritt f\u00fcr Schritt, ohne ihn dir vorzugeben. Das ist die Sokratische Sch\u00e4rfung: Dein Eindruck f\u00fchrt, wir helfen nur beim Sch\u00e4rfen. Den Whisky selbst kl\u00e4ren wir erst danach \u2014 damit der erste Eindruck unverf\u00e4lscht bleibt.")}
        </div>

        <button
          type="button"
          onClick={handleStart}
          data-testid="impression-intro-start"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: TOUCH_MIN, padding: "0 24px", borderRadius: RADIUS.md, background: LABS_THEME.gold, color: "#0B0906", fontFamily: FONT.body, fontSize: 16, fontWeight: 600, border: "none", cursor: "pointer" }}
        >
          {t("v2.solo.impressionFirstCta", "Eindruck festhalten")}
          <span aria-hidden="true">{"\u2192"}</span>
        </button>
      </div>
    </div>
  );
}
