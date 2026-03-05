import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { v } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { Activity, BookOpen, Wine, BarChart3, ChevronRight } from "lucide-react";

export default function M2TasteHome() {
  const { t } = useTranslation();
  const session = getSession();

  const links = [
    { href: "/my-taste/profile", icon: Activity, labelKey: "m2.taste.profile", fallback: "My CaskSense Profile" },
    { href: "/my-taste/analytics", icon: BarChart3, labelKey: "m2.taste.analytics", fallback: "Analytics" },
    { href: "/my-taste/drams", icon: BookOpen, labelKey: "m2.taste.journal", fallback: "My Drams" },
    { href: "/my-taste/collection", icon: Wine, labelKey: "m2.taste.collection", fallback: "Collection" },
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {links.map((link) => (
            <Link key={link.href} href={`${link.href}?from=/m2/taste`} style={{ textDecoration: "none" }}>
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
                data-testid={`m2-taste-link-${link.fallback.toLowerCase().replace(/\s/g, "-")}`}
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
      )}
    </div>
  );
}
