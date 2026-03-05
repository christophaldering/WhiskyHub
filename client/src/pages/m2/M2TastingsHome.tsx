import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import { tastingApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { Wine, Crown, PenLine, ChevronRight } from "lucide-react";

export default function M2TastingsHome() {
  const { t } = useTranslation();
  const session = getSession();

  const { data: tastings = [], isLoading } = useQuery({
    queryKey: ["tastings", session.pid],
    queryFn: () => tastingApi.getAll(session.pid),
    enabled: !!session.pid,
  });

  const activeTastings = tastings.filter((s: any) => s.status === "open" || s.status === "reveal" || s.status === "closed");
  const pastTastings = tastings.filter((s: any) => s.status === "archived");

  const actions = [
    { href: "/m2/tastings/join", icon: Wine, labelKey: "m2.tastings.join", fallback: "Join Tasting", color: v.accent },
    { href: "/m2/tastings/host", icon: Crown, labelKey: "m2.tastings.host", fallback: "Host Tasting", color: v.success },
    { href: "/m2/tastings/solo", icon: PenLine, labelKey: "m2.tastings.solo", fallback: "Solo Dram", color: v.textSecondary },
  ];

  return (
    <div style={{ padding: "20px 16px" }} data-testid="m2-tastings-home">
      <h1
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 26,
          fontWeight: 700,
          color: v.text,
          margin: "0 0 20px",
        }}
        data-testid="text-m2-tastings-title"
      >
        {t("m2.tastings.title", "Tastings")}
      </h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 28 }}>
        {actions.map((a) => (
          <Link key={a.href} href={a.href} style={{ textDecoration: "none", flex: 1 }}>
            <div
              style={{
                background: v.card,
                border: `1px solid ${v.border}`,
                borderRadius: 14,
                padding: "16px 12px",
                textAlign: "center",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
              data-testid={`m2-action-${a.fallback.toLowerCase().replace(/\s/g, "-")}`}
            >
              <a.icon style={{ width: 24, height: 24, color: a.color, marginBottom: 6 }} />
              <div style={{ fontSize: 12, fontWeight: 600, color: v.text }}>{t(a.labelKey, a.fallback)}</div>
            </div>
          </Link>
        ))}
      </div>

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
          data-testid="m2-signin-prompt"
        >
          {t("m2.tastings.signInPrompt", "Sign in to see your tastings")}
        </div>
      )}

      {session.signedIn && (
        <>
          {activeTastings.length > 0 && (
            <section style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 12 }}>
                {t("m2.tastings.active", "Active Tastings")}
              </h2>
              {activeTastings.map((s: any) => (
                <TastingCard key={s.id} tasting={s} />
              ))}
            </section>
          )}

          {isLoading && (
            <div style={{ textAlign: "center", padding: 32, color: v.muted }}>
              {t("common.loading", "Loading...")}
            </div>
          )}

          {!isLoading && activeTastings.length === 0 && (
            <div
              style={{
                background: v.card,
                borderRadius: 12,
                padding: "24px 16px",
                textAlign: "center",
                color: v.textSecondary,
                fontSize: 14,
                marginBottom: 24,
                border: `1px solid ${v.border}`,
              }}
              data-testid="m2-no-active"
            >
              {t("m2.tastings.noActive", "No active tastings")}
            </div>
          )}

          {pastTastings.length > 0 && (
            <section>
              <h2 style={{ fontSize: 16, fontWeight: 600, color: v.text, marginBottom: 12 }}>
                {t("m2.tastings.past", "Past Tastings")}
              </h2>
              {pastTastings.slice(0, 5).map((s: any) => (
                <TastingCard key={s.id} tasting={s} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TastingCard({ tasting }: { tasting: any }) {
  const { t } = useTranslation();
  const statusColors: Record<string, string> = {
    open: v.success,
    closed: v.accent,
    reveal: v.accent,
    archived: v.muted,
    draft: v.muted,
  };

  return (
    <Link href={`/m2/tastings/session/${tasting.id}`} style={{ textDecoration: "none" }}>
      <div
        style={{
          background: v.card,
          border: `1px solid ${v.border}`,
          borderRadius: 12,
          padding: "14px 16px",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        data-testid={`m2-tasting-card-${tasting.id}`}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text }}>{tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}</div>
          <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>
            {tasting.date ? new Date(tasting.date).toLocaleDateString() : ""}
            {tasting.status && (
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: statusColors[tasting.status] || v.muted,
                }}
              >
                {tasting.status}
              </span>
            )}
          </div>
        </div>
        <ChevronRight style={{ width: 18, height: 18, color: v.muted }} />
      </div>
    </Link>
  );
}
