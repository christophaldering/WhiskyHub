import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { Wine, Crown, GlassWater, ChevronRight, Users, Play } from "lucide-react";
import { ApplePage, AppleSection, AppleActionCard } from "@/components/apple";
import { c, cardStyle } from "@/lib/theme";
import { v, alpha } from "@/lib/themeVars";
import { NAV_VERSION } from "@/lib/config";
import { useQuery } from "@tanstack/react-query";
import { tastingApi, getParticipantId } from "@/lib/api";

function OrSeparator({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        margin: "4px 0",
      }}
      data-testid="separator-or"
    >
      <div style={{ flex: 1, height: 1, background: v.subtleBorder }} />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: v.muted,
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: v.subtleBorder }} />
    </div>
  );
}

function ActiveTastingCard({ tasting, t }: { tasting: any; t: any }) {
  const participantCount = tasting.participantCount || tasting.participants?.length || 0;
  const hostName = tasting.hostName || tasting.host?.name || "—";

  return (
    <Link href={`/tasting-room-simple/${tasting.id}`}>
      <div
        style={{
          ...cardStyle,
          padding: "14px 18px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 14,
          transition: "all 0.2s ease",
        }}
        data-testid={`card-active-tasting-${tasting.id}`}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, background: alpha(v.accent, "12"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Play style={{ width: 16, height: 16, color: v.accent }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text, letterSpacing: "-0.01em" }}>{tasting.title}</div>
          <div style={{ fontSize: 12, color: v.muted, marginTop: 3, lineHeight: 1.4, display: "flex", alignItems: "center", gap: 8 }}>
            <span>{hostName}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
              <Users style={{ width: 11, height: 11 }} strokeWidth={1.8} />
              {participantCount}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: v.accent }}>{t("tastingHub.continueTasting")}</span>
          <ChevronRight style={{ width: 16, height: 16, color: v.accent, opacity: 0.7 }} strokeWidth={1.8} />
        </div>
      </div>
    </Link>
  );
}

export default function TastingHubSimple() {
  const { t } = useTranslation();

  const pid = getParticipantId();
  const { data: tastings } = useQuery({
    queryKey: ["/api/tastings", pid],
    queryFn: () => tastingApi.getAll(pid || undefined),
    enabled: !!pid,
    refetchInterval: 30000,
  });

  const activeTastings = (tastings || []).filter(
    (s: any) => s.status === "open" || s.status === "reveal"
  );

  return (
    <SimpleShell showBack={false}>
      <div style={{ paddingTop: 24 }}>
        <ApplePage title={t("tastingHub.title")} subtitle={t("tastingHub.subtitle")} center>
          <AppleActionCard
            icon={Wine}
            title={t("tastingHub.joinTitle")}
            description={t("tastingHub.joinDesc")}
            href="/enter?from=/tasting"
            testId="card-join-tasting"
          />
          <AppleActionCard
            icon={Crown}
            title={t("tastingHub.hostTitle")}
            description={t("tastingHub.hostDesc")}
            href="/host?from=/tasting"
            testId="card-host-tasting"
          />

          <OrSeparator label={t("tastingHub.separator")} />

          <AppleActionCard
            icon={GlassWater}
            title={t("tastingHub.soloDramTitle")}
            description={t("tastingHub.soloDramDesc")}
            href="/log-simple?from=/tasting"
            testId="card-solo-dram"
          />

          {pid && (
            <AppleSection title={t("tastingHub.activeTastings")}>
              {activeTastings.length > 0 ? (
                activeTastings.map((tasting: any) => (
                  <ActiveTastingCard key={tasting.id} tasting={tasting} t={t} />
                ))
              ) : (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 16px",
                    fontSize: 13,
                    color: v.muted,
                    lineHeight: 1.5,
                  }}
                  data-testid="text-no-active-tastings"
                >
                  {t("tastingHub.noActiveTastings")}
                </div>
              )}
            </AppleSection>
          )}
        </ApplePage>
      </div>
    </SimpleShell>
  );
}
