import { useTranslation } from "react-i18next";
import { v } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { Users, Trophy, MessageCircle, Heart } from "lucide-react";

export default function M2CircleHome() {
  const { t } = useTranslation();
  const session = getSession();

  return (
    <div style={{ padding: "20px 16px" }} data-testid="m2-circle-home">
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26,
          fontWeight: 700,
          color: v.text,
          margin: "0 0 8px",
        }}
        data-testid="text-m2-circle-title"
      >
        {t("m2.circle.title", "Circle")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 24 }}>
        {t("m2.circle.subtitle", "Connect with fellow whisky enthusiasts")}
      </p>

      {!session.signedIn && (
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            color: v.textSecondary,
            fontSize: 14,
          }}
          data-testid="m2-circle-signin-prompt"
        >
          {t("m2.circle.signInPrompt", "Sign in to join the community")}
        </div>
      )}

      {session.signedIn && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {[
              { icon: Trophy, label: t("m2.circle.rankings", "Community Rankings"), testId: "m2-circle-rankings" },
              { icon: Users, label: t("m2.circle.tasteTwins", "Taste Twins"), testId: "m2-circle-taste-twins" },
              { icon: MessageCircle, label: t("m2.circle.activity", "Activity Feed"), testId: "m2-circle-activity" },
              { icon: Heart, label: t("m2.circle.friends", "Whisky Friends"), testId: "m2-circle-friends" },
            ].map((item) => (
              <div
                key={item.testId}
                style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: 0.5,
                }}
                data-testid={item.testId}
              >
                <item.icon style={{ width: 20, height: 20, color: v.accent }} />
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: v.text }}>
                  {item.label}
                </span>
                <span style={{ fontSize: 11, color: v.muted, fontWeight: 500 }}>
                  {t("m2.circle.soon", "Soon")}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              background: v.elevated,
              borderRadius: 14,
              padding: "32px 20px",
              textAlign: "center",
            }}
            data-testid="m2-circle-coming-soon"
          >
            <Users style={{ width: 40, height: 40, color: v.muted, marginBottom: 12 }} />
            <h3 style={{ fontSize: 16, fontWeight: 600, color: v.text, margin: "0 0 6px" }}>
              {t("m2.circle.comingSoonTitle", "More coming soon")}
            </h3>
            <p style={{ fontSize: 13, color: v.textSecondary, margin: 0 }}>
              {t("m2.circle.comingSoonDesc", "Taste twins, friend activity, and tasting groups are on the way.")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
