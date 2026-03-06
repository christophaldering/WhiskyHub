import { useState, useMemo, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import { tastingApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import {
  Wine, Crown, PenLine, ChevronRight, ChevronDown,
  Calendar, CalendarDays, List, MapPin, Users, Eye,
  Play, BarChart3,
} from "lucide-react";

const TastingCalendar = lazy(() => import("@/pages/tasting-calendar"));

type ViewMode = "list" | "calendar";
type StatusFilter = "all" | "draft" | "open" | "closed" | "archived";
type TimeFilter = "upcoming" | "30d" | "90d" | "1y" | "all";

const statusBadgeColors: Record<string, { color: string; bg: string }> = {
  draft: { color: v.muted, bg: alpha(v.muted, "20") },
  open: { color: v.success, bg: alpha(v.success, "20") },
  closed: { color: v.accent, bg: alpha(v.accent, "20") },
  reveal: { color: v.accent, bg: alpha(v.accent, "12") },
  archived: { color: v.mutedLight, bg: alpha(v.mutedLight, "20") },
};

export default function M2TastingsHome() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const rawSession = getSession();
  const { currentParticipant } = useAppStore();
  const session = {
    ...rawSession,
    signedIn: rawSession.signedIn || !!currentParticipant,
    pid: currentParticipant?.id || rawSession.pid,
  };

  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const { data: tastings = [], isLoading } = useQuery({
    queryKey: ["tastings", session.pid],
    queryFn: () => tastingApi.getAll(session.pid),
    enabled: !!session.pid,
    staleTime: 0,
    refetchOnMount: "always" as const,
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tastings.length, draft: 0, open: 0, closed: 0, archived: 0 };
    for (const ta of tastings) {
      const s = (ta as any).status === "reveal" ? "open" : (ta as any).status;
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [tastings]);

  const filtered = useMemo(() => {
    let list = tastings as any[];

    if (statusFilter !== "all") {
      list = list.filter((ta) => ta.status === statusFilter || (statusFilter === "open" && ta.status === "reveal"));
    }

    if (timeFilter === "upcoming") {
      const now = Date.now();
      list = list.filter((ta) => {
        const d = new Date(ta.date).getTime();
        return !isNaN(d) && d > now;
      });
    } else if (timeFilter !== "all") {
      const now = Date.now();
      const cutoff = timeFilter === "30d" ? 30 : timeFilter === "90d" ? 90 : 365;
      const minDate = now - cutoff * 86400000;
      const maxDate = now + cutoff * 86400000;
      list = list.filter((ta) => {
        const d = new Date(ta.date).getTime();
        return !isNaN(d) && d >= minDate && d <= maxDate;
      });
    }

    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tastings, statusFilter, timeFilter]);

  const isHost = (ta: any) => session.pid && ta.hostId === session.pid;

  const actions = [
    { href: "/m2/tastings/join", icon: Wine, labelKey: "m2.tastings.join", fallback: "Joyn", color: v.accent },
    { href: "/m2/tastings/host", icon: Crown, labelKey: "m2.tastings.host", fallback: "Host", color: v.success },
    { href: "/m2/tastings/solo", icon: PenLine, labelKey: "m2.tastings.solo", fallback: "Solo", color: v.textSecondary },
  ];

  const selectStyle: React.CSSProperties = {
    padding: "7px 30px 7px 12px",
    borderRadius: 10,
    border: `1px solid ${v.border}`,
    background: v.card,
    color: v.text,
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "system-ui, sans-serif",
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    cursor: "pointer",
    outline: "none",
    minWidth: 0,
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div style={{ padding: "20px 16px" }} data-testid="m2-tastings-home">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 20 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 26,
            fontWeight: 700,
            color: v.text,
            margin: 0,
          }}
          data-testid="text-m2-tastings-title"
        >
          {t("m2.tastings.title", "Tastings")}
        </h1>

        <div
          style={{
            display: "inline-flex",
            borderRadius: 10,
            border: `1px solid ${v.border}`,
            overflow: "hidden",
          }}
          data-testid="toggle-view-mode"
        >
          {([
            { value: "list" as ViewMode, Icon: List },
            { value: "calendar" as ViewMode, Icon: CalendarDays },
          ] as const).map(({ value, Icon }) => (
            <button
              key={value}
              onClick={() => setViewMode(value)}
              style={{
                padding: "6px 12px",
                background: viewMode === value ? alpha(v.accent, "15") : "transparent",
                border: "none",
                cursor: "pointer",
                color: viewMode === value ? v.accent : v.muted,
                display: "flex",
                alignItems: "center",
              }}
              data-testid={`button-view-${value}`}
            >
              <Icon style={{ width: 16, height: 16 }} />
            </button>
          ))}
        </div>
      </div>
      <p style={{ fontSize: 14, color: v.textSecondary, marginTop: -12, marginBottom: 20 }} data-testid="text-m2-tastings-subtitle">
        {t("m2.tastings.subtitle", "Your sessions — past and upcoming")}
      </p>

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

      {session.signedIn && viewMode === "calendar" && (
        <Suspense
          fallback={
            <div style={{ textAlign: "center", padding: 60 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: `3px solid ${v.border}`,
                  borderTopColor: v.accent,
                  borderRadius: "50%",
                  animation: "m2spin 0.8s linear infinite",
                  margin: "0 auto",
                }}
              />
              <style>{`@keyframes m2spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          }
        >
          <TastingCalendar embedded />
        </Suspense>
      )}

      {session.signedIn && viewMode === "list" && (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 16,
              flexWrap: "wrap",
              alignItems: "center",
            }}
            data-testid="m2-filter-bar"
          >
            <div style={{ position: "relative" }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                style={selectStyle}
                data-testid="select-m2-status-filter"
              >
                <option value="all">{t("m2.tastings.filterAll", "All Status")} ({statusCounts.all})</option>
                <option value="draft">{t("m2.tastings.filterDraft", "Draft")} ({statusCounts.draft})</option>
                <option value="open">{t("m2.tastings.filterOpen", "Open")} ({statusCounts.open})</option>
                <option value="closed">{t("m2.tastings.filterClosed", "Closed")} ({statusCounts.closed})</option>
                <option value="archived">{t("m2.tastings.filterArchived", "Archived")} ({statusCounts.archived})</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: v.muted, pointerEvents: "none" }} />
            </div>

            <div style={{ position: "relative" }}>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                style={selectStyle}
                data-testid="select-m2-time-filter"
              >
                <option value="all">{t("m2.tastings.timeAll", "All Time")}</option>
                <option value="upcoming">{t("m2.tastings.timeUpcoming", "Upcoming")}</option>
                <option value="30d">{t("m2.tastings.time30d", "30 days")}</option>
                <option value="90d">{t("m2.tastings.time90d", "3 months")}</option>
                <option value="1y">{t("m2.tastings.time1y", "1 year")}</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: v.muted, pointerEvents: "none" }} />
            </div>

            <span style={{ fontSize: 12, color: v.muted, marginLeft: "auto" }} data-testid="text-m2-result-count">
              {filtered.length} {filtered.length === 1 ? t("m2.tastings.session", "session") : t("m2.tastings.sessions", "sessions")}
            </span>
          </div>

          {isLoading && (
            <div style={{ textAlign: "center", padding: 32, color: v.muted }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  border: `3px solid ${v.border}`,
                  borderTopColor: v.accent,
                  borderRadius: "50%",
                  animation: "m2spin 0.8s linear infinite",
                  margin: "0 auto",
                }}
              />
              <style>{`@keyframes m2spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div
              style={{
                background: v.card,
                borderRadius: 12,
                padding: "32px 16px",
                textAlign: "center",
                color: v.textSecondary,
                fontSize: 14,
                border: `1px solid ${v.border}`,
              }}
              data-testid="m2-no-results"
            >
              <Wine style={{ width: 36, height: 36, color: v.mutedLight, margin: "0 auto 10px" }} />
              <p style={{ margin: 0, color: v.muted }}>
                {statusFilter === "all" && timeFilter === "all"
                  ? t("m2.tastings.noTastings", "No tastings yet")
                  : t("m2.tastings.noMatch", "No matching tastings")}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((tasting: any) => (
                <TastingCard
                  key={tasting.id}
                  tasting={tasting}
                  host={isHost(tasting)}
                  formatDate={formatDate}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function TastingCard({
  tasting,
  host,
  formatDate,
  navigate,
}: {
  tasting: any;
  host: boolean;
  formatDate: (d: string) => string;
  navigate: (to: string) => void;
}) {
  const { t } = useTranslation();

  const colors = statusBadgeColors[tasting.status] || { color: v.muted, bg: alpha(v.muted, "20") };

  const statusLabel = t("m2.tastings.status" + tasting.status.charAt(0).toUpperCase() + tasting.status.slice(1), tasting.status);

  return (
    <div
      style={{
        background: v.card,
        border: `1px solid ${v.border}`,
        borderRadius: 12,
        padding: "14px 16px",
        cursor: "pointer",
        transition: "border-color 0.2s",
      }}
      data-testid={`m2-tasting-card-${tasting.id}`}
      onClick={() => {
        if (tasting.status === "draft" && host) {
          navigate(`/m2/tastings/host/${tasting.id}`);
        } else {
          navigate(`/m2/tastings/session/${tasting.id}`);
        }
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 600,
                color: v.text,
                fontFamily: "'Playfair Display', Georgia, serif",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
                minWidth: 0,
              }}
              data-testid={`text-m2-tasting-title-${tasting.id}`}
            >
              {tasting.title || t("m2.tastings.untitled", "Untitled Tasting")}
            </span>
            {host && (
              <span
                style={{
                  fontSize: 9,
                  color: v.accent,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  flexShrink: 0,
                }}
                data-testid={`badge-host-${tasting.id}`}
              >
                {t("m2.tastings.hostBadge", "HOST")}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            {tasting.hostName && !host && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted }}>
                <Crown style={{ width: 11, height: 11 }} />
                {tasting.hostName}
              </span>
            )}
            {tasting.date && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted }}>
                <Calendar style={{ width: 11, height: 11 }} />
                {formatDate(tasting.date)}
              </span>
            )}
            {tasting.location && tasting.location !== "—" && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted }}>
                <MapPin style={{ width: 11, height: 11 }} />
                {tasting.location}
              </span>
            )}
            {tasting.participantCount != null && (
              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted }}>
                <Users style={{ width: 11, height: 11 }} />
                {tasting.participantCount}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: colors.color,
              background: colors.bg,
              padding: "2px 8px",
              borderRadius: 6,
            }}
            data-testid={`badge-status-${tasting.id}`}
          >
            {statusLabel}
          </span>
          <ChevronRight style={{ width: 18, height: 18, color: v.muted }} />
        </div>
      </div>
    </div>
  );
}
