import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FONT, SP, LABS_THEME } from "./theme";

const SEEN_KEY = "labs_cooper_intro_seen";

export default function CooperIntro() {
  const { t } = useTranslation();
  const [seen] = useState(() => {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch { return false; }
  });
  useEffect(() => {
    if (!seen) { try { localStorage.setItem(SEEN_KEY, "1"); } catch { /* ignore */ } }
  }, [seen]);

  const text = seen
    ? t("v2.cooperIntroShort", "Cooper hilft dir, Wahrnehmung in Worte zu fassen \u2014 und mit den Worten w\u00e4chst, was du wahrnimmst.")
    : t("v2.cooperIntroLong", "Cooper hilft dir, Wahrnehmung in Worte zu fassen \u2014 und mit den Worten \u00f6ffnet sich, was du schmeckst. So wird aus Verkosten Reflexion.");

  return (
    <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: 19, lineHeight: 1.55, color: LABS_THEME.muted, margin: 0, marginBottom: SP.md }}>
      {text}
    </p>
  );
}
