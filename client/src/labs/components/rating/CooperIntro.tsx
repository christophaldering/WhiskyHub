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
    ? t("v2.cooperIntroShort", "Deine Worte, gesch\u00e4rft \u2014 nicht ersetzt. Je sicherer du wirst, desto stiller wird Cooper.")
    : t("v2.cooperIntroLong", "Mit Worten \u00f6ffnet sich, was du schmeckst. Cooper schreibt nicht f\u00fcr dich \u2014 er hilft dir, deine eigenen Worte zu finden, und wird stiller, je sicherer du wirst. So wird aus Verkosten Reflexion.");

  return (
    <p style={{ fontFamily: FONT.serif, fontStyle: "italic", fontSize: 19, lineHeight: 1.55, color: LABS_THEME.muted, margin: 0, marginBottom: SP.md }}>
      {text}
    </p>
  );
}
