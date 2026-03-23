import { useState } from "react";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { THEMES, type V2Theme } from "@/labs-v2/tokens";
import { getT, type V2Lang } from "@/labs-v2/i18n";
import SoloFlow from "@/labs-v2/screens/solo/SoloFlow";

function getStoredTheme(): V2Theme {
  try {
    const stored = localStorage.getItem("v2_theme");
    if (stored === "dark" || stored === "light") return stored;
  } catch {}
  return "dark";
}

function getStoredLang(): V2Lang {
  try {
    const stored = localStorage.getItem("v2_lang");
    if (stored === "de" || stored === "en") return stored;
  } catch {}
  const browserLang = navigator.language?.startsWith("de") ? "de" : "en";
  return browserLang;
}

export default function LabsSolo() {
  const goBack = useBackNavigation("/labs/taste");

  const [theme] = useState<V2Theme>(getStoredTheme);
  const [lang] = useState<V2Lang>(getStoredLang);

  const th = THEMES[theme];
  const t = getT(lang);

  return (
    <div style={{ minHeight: "60vh" }}>
      <SoloFlow th={th} t={t} onBack={goBack} />
    </div>
  );
}
