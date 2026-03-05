import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { getSession } from "@/lib/session";

export default function M2TasteProfile() {
  const { t } = useTranslation();
  const session = getSession();

  const { data: profile } = useQuery({
    queryKey: ["participant", session.pid],
    queryFn: async () => {
      if (!session.pid) return null;
      const res = await fetch(`/api/participants/${session.pid}`, {
        headers: { "x-participant-id": session.pid },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!session.pid,
  });

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-profile">
      <M2BackButton />
      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, margin: "16px 0 12px" }}>
        {t("m2.taste.profile", "My CaskSense Profile")}
      </h1>

      {!session.signedIn ? (
        <div style={{ background: v.elevated, borderRadius: 12, padding: "24px 16px", textAlign: "center", color: v.textSecondary, fontSize: 14 }}>
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px 16px" }}>
            <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("m2.profile.name", "Name")}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: v.text }}>{profile?.name || session.name || "—"}</div>
          </div>
          <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px 16px" }}>
            <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 8 }}>
              {t("m2.profile.level", "Experience Level")}
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: v.text }}>{profile?.experienceLevel || "Connoisseur"}</div>
          </div>
          {profile?.smokeAffinityIndex != null && (
            <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 14, padding: "20px 16px" }}>
              <div style={{ fontSize: 12, color: v.muted, textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.05em", marginBottom: 8 }}>
                {t("m2.profile.smokeAffinity", "Smoke Affinity")}
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: v.text }}>{Math.round(profile.smokeAffinityIndex * 100)}%</div>
            </div>
          )}
          <div style={{ background: v.elevated, borderRadius: 12, padding: "20px 16px", textAlign: "center", color: v.textSecondary, fontSize: 13, marginTop: 8 }}>
            {t("m2.profile.moreComingSoon", "Detailed flavor profile and radar chart coming soon")}
          </div>
        </div>
      )}
    </div>
  );
}
