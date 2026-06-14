import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, RADIUS, LABS_THEME, TOUCH_MIN } from "@/labs/components/rating/theme";

/**
 * Namens-Nachtrag: erscheint NUR im Eindruck-zuerst-Pfad, nachdem der Eindruck
 * festgehalten und bewertet wurde. Bewahrt die Zuordnung (DNA / Signatur / Vergleiche),
 * ohne die Identifikation vor den ersten Eindruck zu schieben. Vollstaendig ueberspringbar.
 */
export default function SoloNamingStep({ onSubmit }: { onSubmit: (name: string | null) => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");

  return (
    <div
      className="labs-fade-in"
      style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center", maxWidth: 440, margin: "0 auto", padding: "0 var(--labs-space-md)" }}
    >
      <div style={{ fontFamily: FONT.display, fontSize: 26, color: LABS_THEME.text, marginBottom: SP.sm }}>
        {t("v2.solo.namingTitle", "Wie hie\u00df der Dram?")}
      </div>
      <div style={{ fontFamily: FONT.serif, fontSize: 17, color: LABS_THEME.muted, lineHeight: 1.45, marginBottom: SP.lg }}>
        {t("v2.solo.namingSub", "Damit dein Eindruck sp\u00e4ter zu diesem Whisky findet \u2014 f\u00fcr DNA, Signatur und Vergleiche. Du kannst das auch \u00fcberspringen.")}
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        placeholder={t("v2.solo.namingPlaceholder", "z.\u202fB. Lagavulin 16")}
        data-testid="solo-naming-input"
        onKeyDown={(e) => { if (e.key === "Enter" && value.trim()) onSubmit(value.trim()); }}
        style={{
          width: "100%",
          boxSizing: "border-box",
          fontFamily: FONT.body,
          fontSize: 16,
          color: LABS_THEME.text,
          background: LABS_THEME.inputBg,
          border: `1px solid ${LABS_THEME.border}`,
          borderRadius: RADIUS.md,
          padding: "12px 14px",
          minHeight: TOUCH_MIN,
          marginBottom: SP.lg,
          outline: "none",
        }}
      />

      <button
        type="button"
        onClick={() => onSubmit(value.trim() || null)}
        data-testid="solo-naming-save"
        className="labs-btn-primary"
        style={{ width: "100%", minHeight: TOUCH_MIN, marginBottom: SP.sm }}
      >
        {t("v2.solo.namingSave", "Speichern")}
      </button>
      <button
        type="button"
        onClick={() => onSubmit(null)}
        data-testid="solo-naming-skip"
        className="labs-btn-ghost"
        style={{ width: "100%", minHeight: TOUCH_MIN, color: LABS_THEME.muted }}
      >
        {t("v2.solo.namingSkip", "Ohne Namen speichern")}
      </button>
    </div>
  );
}
