import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { Wine, Crown, GlassWater, Calendar, LayoutDashboard, ChevronRight } from "lucide-react";
import { ApplePage, AppleSection, AppleActionCard } from "@/components/apple";
import { c, cardStyle } from "@/lib/theme";
import { v, alpha } from "@/lib/themeVars";
import { NAV_VERSION } from "@/lib/config";

interface NavCardProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
}

function NavCard({ icon: Icon, label, description, href, testId }: NavCardProps) {
  return (
    <Link href={href}>
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
        data-testid={testId}
      >
        <div style={{ width: 38, height: 38, borderRadius: 12, background: alpha(v.accent, "12"), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon style={{ width: 18, height: 18, color: v.accent }} strokeWidth={1.8} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: v.text, letterSpacing: "-0.01em" }}>{label}</div>
          <div style={{ fontSize: 12, color: v.muted, marginTop: 3, lineHeight: 1.4 }}>{description}</div>
        </div>
        <ChevronRight style={{ width: 16, height: 16, color: v.muted, opacity: 0.5, flexShrink: 0 }} strokeWidth={1.8} />
      </div>
    </Link>
  );
}

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

export default function TastingHubSimple() {
  const { t } = useTranslation();
  const isTwoTab = NAV_VERSION === "v2_two_tab";

  return (
    <SimpleShell showBack={false}>
      <div style={{ paddingTop: 24 }}>
        <ApplePage title={t("tastingHub.title")} subtitle={t("tastingHub.subtitle")} center>
          <AppleActionCard
            icon={Wine}
            title={t("tastingHub.joinTitle")}
            description={t("tastingHub.joinDesc")}
            href="/enter"
            testId="card-join-tasting"
          />
          <AppleActionCard
            icon={Crown}
            title={t("tastingHub.hostTitle")}
            description={t("tastingHub.hostDesc")}
            href="/host"
            testId="card-host-tasting"
          />

          <OrSeparator label={t("tastingHub.separator")} />

          <AppleActionCard
            icon={GlassWater}
            title={t("tastingHub.soloDramTitle")}
            description={t("tastingHub.soloDramDesc")}
            href="/log-simple"
            testId="card-solo-dram"
          />

          {isTwoTab && (
            <AppleSection title={t("tastingHub.sectionMore")}>
              <NavCard
                icon={LayoutDashboard}
                label={t("tastingHub.hostDashboard")}
                description={t("tastingHub.hostDashboardDesc")}
                href="/host-dashboard"
                testId="link-host-dashboard"
              />
              <NavCard
                icon={Calendar}
                label={t("tastingHub.tastingCalendar")}
                description={t("tastingHub.tastingCalendarDesc")}
                href="/tasting-calendar"
                testId="link-tasting-calendar"
              />
            </AppleSection>
          )}
        </ApplePage>
      </div>
    </SimpleShell>
  );
}
