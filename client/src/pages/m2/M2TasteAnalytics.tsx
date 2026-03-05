import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession } from "@/lib/session";
import { BarChart3 } from "lucide-react";

export default function M2TasteAnalytics() {
  const { t } = useTranslation();
  const session = getSession();

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-analytics">
      <M2BackButton />
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0 12px" }}>
        {t("m2.taste.analytics", "Analytics")}
      </h1>

      {!session.signedIn ? (
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      ) : (
        <div style={{ background: v.elevated, borderRadius: 14, padding: "32px 20px", textAlign: "center" }}>
          <BarChart3 style={{ width: 40, height: 40, color: v.muted, marginBottom: 12 }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>
            {t("m2.taste.analyticsComingSoon", "Analytics coming soon")}
          </h3>
          <p style={{ fontSize: 13, color: v.textSecondary, margin: 0 }}>
            {t("m2.taste.analyticsDesc", "Your tasting statistics, rating trends, and flavor preferences will appear here.")}
          </p>
        </div>
      )}
    </div>
  );
}
