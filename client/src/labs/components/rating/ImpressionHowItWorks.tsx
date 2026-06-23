import { useTranslation } from "react-i18next";
import { MessageCircle, Ear, CircleCheck } from "lucide-react";
import { FONT, SP, LABS_THEME } from "./theme";
import CooperIntro from "./CooperIntro";

export default function ImpressionHowItWorks() {
  const { t } = useTranslation();

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
    <>
    <CooperIntro />
    <ul style={{ listStyle: "none", padding: 0, margin: 0, marginBottom: SP.md, display: "flex", flexDirection: "column", gap: SP.sm }}>
      {points.map(({ Icon, lead, text }, i) => (
        <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span aria-hidden="true" style={{ flexShrink: 0, display: "flex", marginTop: 1, color: LABS_THEME.gold, opacity: 0.85 }}>
            <Icon size={18} strokeWidth={1.75} />
          </span>
          <span style={{ fontFamily: FONT.body, fontSize: 13, lineHeight: 1.45 }}>
            <span style={{ fontWeight: 600, color: LABS_THEME.muted }}>{lead} </span>
            <span style={{ color: LABS_THEME.faint }}>{text}</span>
          </span>
        </li>
      ))}
    </ul>
    </>
  );
}
