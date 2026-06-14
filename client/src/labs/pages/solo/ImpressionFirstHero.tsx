import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, LABS_THEME } from "@/labs/components/rating/theme";

/**
 * Hero-Einstieg im Solo-Flow: stellt den ersten Eindruck am Glas VOR die Logistik
 * der Whisky-Identifikation. Bewusst gross, warm und einladend — der "heilige Moment"
 * als Bild, die Methoden-Kacheln folgen darunter zurueckgenommen.
 */
export default function ImpressionFirstHero({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="solo-impression-first"
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        textAlign: "left",
        border: "1px solid rgba(212,168,71,0.35)",
        borderRadius: RADIUS.lg,
        padding: SP.lg,
        marginBottom: SP.lg,
        cursor: "pointer",
        overflow: "hidden",
        minHeight: 158,
        font: "inherit",
        color: "inherit",
        background:
          "radial-gradient(130% 110% at 88% 0%, rgba(212,168,71,0.22), rgba(196,122,58,0.08) 45%, rgba(14,11,5,0) 78%), linear-gradient(135deg, rgba(196,122,58,0.16), rgba(14,11,5,0.25))",
        boxShadow: "0 10px 36px rgba(212,168,71,0.14), inset 0 1px 0 rgba(255,255,255,0.05)",
      }}
    >
      <svg
        width="124"
        height="146"
        viewBox="0 0 124 146"
        fill="none"
        aria-hidden="true"
        style={{ position: "absolute", right: 6, bottom: -4, opacity: 0.55, pointerEvents: "none" }}
      >
        <defs>
          <linearGradient id="csImpressionLiquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4a847" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#c47a3a" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <path
          d="M46 16 C45 16 44 17 44 19 C44 38 36 50 38 68 C40 90 50 106 62 106 C74 106 84 90 86 68 C88 50 80 38 80 19 C80 17 79 16 78 16 Z"
          fill="none"
          stroke="#d4a847"
          strokeWidth="1.5"
          strokeOpacity="0.7"
        />
        <path d="M39 65 C41 87 51 104 62 104 C73 104 83 87 85 65 C73 71 51 71 39 65 Z" fill="url(#csImpressionLiquid)" />
        <ellipse cx="62" cy="65" rx="23" ry="4" fill="#d4a847" fillOpacity="0.3" />
        <path d="M62 106 L62 126" stroke="#d4a847" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d="M48 130 C48 127 76 127 76 130 C76 133 48 133 48 130 Z" fill="none" stroke="#d4a847" strokeWidth="1.5" strokeOpacity="0.6" />
        <path d="M51 26 C49 40 48 52 51 64" stroke="#f5ede0" strokeWidth="1.5" strokeOpacity="0.22" fill="none" strokeLinecap="round" />
      </svg>

      <div style={{ position: "relative", maxWidth: "70%" }}>
        <div style={{ fontFamily: FONT.display, fontSize: 27, color: LABS_THEME.text, lineHeight: 1.12, marginBottom: SP.sm }}>
          {t("v2.solo.impressionFirstTitle", "Das Glas steht bereit.")}
        </div>
        <div style={{ fontFamily: FONT.serif, fontSize: 17, color: LABS_THEME.muted, lineHeight: 1.4, marginBottom: SP.md }}>
          {t("v2.solo.impressionFirstSub", "Sag, was du wahrnimmst \u2014 den Whisky kl\u00e4ren wir danach.")}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT.body, fontSize: 15, fontWeight: 600, color: LABS_THEME.gold }}>
          {t("v2.solo.impressionFirstCta", "Eindruck festhalten")}
          <span aria-hidden="true">{"\u2192"}</span>
        </span>
      </div>
    </button>
  );
}
