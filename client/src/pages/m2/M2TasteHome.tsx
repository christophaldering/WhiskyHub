import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { Activity, BookOpen, Wine, BarChart3, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function M2TasteHome() {
  const { t } = useTranslation();
  const session = getSession();

  const { data: journal = [] } = useQuery({
    queryKey: ["journal", session.pid],
    queryFn: async () => {
      if (!session.pid) return [];
      const res = await fetch(`/api/journal?participantId=${session.pid}`, {
        headers: { "x-participant-id": session.pid },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session.pid,
  });

  const { data: tastings = [] } = useQuery({
    queryKey: ["tastings", session.pid],
    queryFn: async () => {
      if (!session.pid) return [];
      const res = await fetch(`/api/tastings?participantId=${session.pid}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session.pid,
  });

  const links = [
    { id: "profile", href: "/m2/taste/profile", icon: Activity, labelKey: "m2.taste.profile", fallback: "My CaskSense Profile" },
    { id: "analytics", href: "/m2/taste/analytics", icon: BarChart3, labelKey: "m2.taste.analytics", fallback: "Analytics" },
    { id: "drams", href: "/m2/taste/drams", icon: BookOpen, labelKey: "m2.taste.journal", fallback: "My Drams" },
    { id: "collection", href: "/m2/taste/collection", icon: Wine, labelKey: "m2.taste.collection", fallback: "Collection" },
  ];

  return (
    <div style={{ padding: "20px 16px" }} data-testid="m2-taste-home">
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26,
          fontWeight: 700,
          color: v.text,
          margin: "0 0 8px",
        }}
        data-testid="text-m2-taste-title"
      >
        {t("m2.taste.title", "Taste")}
      </h1>
      <p style={{ fontSize: 14, color: v.textSecondary, marginBottom: 24 }}>
        {t("m2.taste.subtitle", "Your personal whisky world")}
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
          data-testid="m2-taste-signin-prompt"
        >
          {t("m2.taste.signInPrompt", "Sign in to access your taste profile")}
        </div>
      )}

      {session.signedIn && (
        <>
          <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
            <div style={{ flex: 1, background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{journal.length}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("m2.taste.dramCount", "Drams")}</div>
            </div>
            <div style={{ flex: 1, background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: v.accent, fontVariantNumeric: "tabular-nums" }}>{tastings.length}</div>
              <div style={{ fontSize: 11, color: v.muted }}>{t("m2.taste.tastingCount", "Tastings")}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {links.map((link) => (
              <Link key={link.id} href={link.href} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: v.card,
                    border: `1px solid ${v.border}`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    cursor: "pointer",
                  }}
                  data-testid={`m2-taste-link-${link.id}`}
                >
                  <link.icon style={{ width: 20, height: 20, color: v.accent }} />
                  <span style={{ flex: 1, fontSize: 15, fontWeight: 500, color: v.text }}>
                    {t(link.labelKey, link.fallback)}
                  </span>
                  <ChevronRight style={{ width: 16, height: 16, color: v.muted }} />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
