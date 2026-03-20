import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { ArrowLeft } from "lucide-react";
import { v } from "@/lib/themeVars";
import { popRoute, getSmartFallback, markBackNavigation } from "@/lib/navStack";

export default function BackButton({ fallback }: { fallback?: string }) {
  const [location, navigate] = useLocation();
  const { t } = useTranslation();

  const goBack = () => {
    markBackNavigation();

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

    navigate(fallback || getSmartFallback(location));
  };

  return (
    <button
      onClick={goBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        background: "none",
        border: "none",
        padding: 0,
        fontSize: 14,
        color: v.accent,
        cursor: "pointer",
        fontFamily: "system-ui, sans-serif",
        opacity: 0.85,
        marginBottom: 8,
      }}
      data-testid="button-back"
    >
      <ArrowLeft style={{ width: 16, height: 16 }} strokeWidth={2} />
      {t("common.back")}
    </button>
  );
}
