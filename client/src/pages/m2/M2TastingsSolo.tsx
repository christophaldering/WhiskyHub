import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { Link } from "wouter";

export default function M2TastingsSolo() {
  const { t } = useTranslation();

  return (
    <div style={{ padding: "16px" }} data-testid="m2-solo-page">
      <M2BackButton />
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 24,
          fontWeight: 700,
          color: v.text,
          margin: "16px 0",
        }}
        data-testid="text-m2-solo-title"
      >
        {t("m2.solo.title", "Solo Dram")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 20 }}>
        {t("m2.solo.subtitle", "Log a whisky on your own — take notes, rate, and remember.")}
      </p>

      <Link href="/log-simple?from=/m2/tastings" style={{ textDecoration: "none" }}>
        <div
          style={{
            background: v.card,
            border: `1px solid ${v.border}`,
            borderRadius: 14,
            padding: "20px 16px",
            textAlign: "center",
            cursor: "pointer",
          }}
          data-testid="m2-solo-start"
        >
          <div style={{ fontSize: 15, fontWeight: 600, color: v.accent }}>
            {t("m2.solo.start", "Start Solo Tasting")}
          </div>
          <div style={{ fontSize: 12, color: v.muted, marginTop: 4 }}>
            {t("m2.solo.hint", "Opens the dram logger")}
          </div>
        </div>
      </Link>
    </div>
  );
}
