import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";
import Research from "@/pages/research";

export default function M2DiscoverResearch() {
  const { t } = useTranslation();
  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 700, margin: "0 auto" }} data-testid="m2-discover-research-page">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 16px" }}>
        <FlaskConical style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-research-title">
          {t("research.title", "Research")}
        </h1>
      </div>
      <Research />
    </div>
  );
}
