import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Ear, CircleCheck } from "lucide-react";
import { FONT, SP, RADIUS, LABS_THEME } from "./theme";

export default function ImpressionHowItWorks() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const points = [
    { Icon: MessageCircle,
      lead: t("v2.impressionHow1Lead", "Du beginnst."),
      text: t("v2.impressionHow1", "Sag oder tippe frei, was du wahrnimmst — roh, unfertig, in deinen eigenen Worten. Es gibt kein Richtig, Fachbegriffe brauchst du nicht.") },
    { Icon: Ear,
      lead: t("v2.impressionHow2Lead", "Cooper hört zu."),
      text: t("v2.impressionHow2", "Er fragt nur dort behutsam nach, wo es dir hilft — und gibt dir nichts vor.") },
    { Icon: CircleCheck,
      lead: t("v2.impressionHow3Lead", "Du behältst das letzte Wort."),
      text: t("v2.impressionHow3", "Aus deinen Worten wird deine Notiz und ein Wertungsvorschlag. Aufhören kannst du jederzeit.") },
  ];

  return (
    <div style={{ marginBottom: SP.md }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="impression-how-link"
        style={{ background: "none", border: "none", color: LABS_THEME.gold, font: "inherit", fontFamily: FONT.body, fontSize: 14, cursor: "pointer", padding: 0, textDecoration: "underline", textUnderlineOffset: 3 }}
      >
        {t("v2.impressionHowLink", "Wie funktioniert das?")}
      </button>

      {open && (
        <div style={{ marginTop: SP.sm, padding: SP.md, borderRadius: RADIUS.md, border: `1px solid ${LABS_THEME.border}`, background: LABS_THEME.bgCard }}>
          <div style={{ fontFamily: FONT.display, fontSize: 16, color: LABS_THEME.text, marginBottom: SP.sm }}>
            {t("v2.impressionHowTitle", "So funktioniert es")}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: SP.sm }}>
            {points.map(({ Icon, lead, text }, i) => (
              <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span aria-hidden="true" style={{ flexShrink: 0, display: "flex", marginTop: 2, color: LABS_THEME.gold }}>
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <span style={{ fontFamily: FONT.body, fontSize: 14, color: LABS_THEME.text, lineHeight: 1.5 }}>
                  <span style={{ fontWeight: 600 }}>{lead} </span>
                  <span style={{ color: LABS_THEME.muted }}>{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
