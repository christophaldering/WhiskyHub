import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { v } from "@/lib/themeVars";
import { popRoute } from "@/lib/navStack";

function getM2Fallback(currentPath: string): string {
  if (currentPath.startsWith("/m2/tastings")) return "/m2/tastings";
  if (currentPath.startsWith("/m2/taste")) return "/m2/taste";
  if (currentPath.startsWith("/m2/circle")) return "/m2/circle";
  return "/m2/tastings";
}

export default function M2BackButton() {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();

  const goBack = () => {
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    if (from && /^\/[a-zA-Z0-9\-_/]*$/.test(from)) {
      navigate(from);
      return;
    }
    const prev = popRoute();
    if (prev) {
      navigate(prev);
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate(getM2Fallback(location));
  };

  return (
    <button
      onClick={goBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 14,
        color: v.accent,
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "8px 0",
        fontFamily: "system-ui, sans-serif",
        fontWeight: 500,
      }}
      data-testid="m2-back-button"
    >
      <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2} />
      {t("common.back", "Zurück")}
    </button>
  );
}

export { getM2Fallback };
