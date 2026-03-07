import { useState, useMemo, useEffect, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import { tastingApi } from "@/lib/api";
import { getSession, useSession } from "@/lib/session";
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
  const [rawSession, setRawSession] = useState(getSession());
  const { currentParticipant } = useAppStore();

  const refreshSession = useCallback(() => {
    setRawSession(getSession());
  }, []);

  useEffect(() => {
    window.addEventListener("session-change", refreshSession);
    return () => window.removeEventListener("session-change", refreshSession);
  }, [refreshSession]);

  const session = {
    ...rawSession,
    signedIn: rawSession.signedIn || !!currentParticipant,
    pid: currentParticipant?.id || rawSession.pid,
  };

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
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

  const isHost = (ta: any) => !!(session.pid && ta.hostId === session.pid);

  const actions = [
    { href: "/m2/tastings/join", icon: Wine, labelKey: "m2.tastings.join", fallback: "Joyn", subKey: "m2.tastings.joinSub", subFallback: "An Tasting teilnehmen", color: v.accent },
    { href: "/m2/tastings/host", icon: Crown, labelKey: "m2.tastings.host", fallback: "Host", subKey: "m2.tastings.hostSub", subFallback: "Eigenes Tasting leiten", color: v.success },
    { href: "/m2/tastings/solo", icon: PenLine, labelKey: "m2.tastings.solo", fallback: "Solo", subKey: "m2.tastings.soloSub", subFallback: "Dram für dich loggen", color: v.textSecondary },
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
    <div style={{ padding: "32px 16px" }} data-testid="m2-tastings-home">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
            color: v.text,
            margin: 0,
            letterSpacing: "-0.02em",
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
      <p style={{ fontSize: 15, color: v.textSecondary, marginTop: -16, marginBottom: 24, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif", lineHeight: 1.4 }} data-testid="text-m2-tastings-subtitle">
        {t("m2.tastings.subtitle", "Your sessions — past and upcoming")}
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 32, alignItems: "stretch" }}>
        {actions.map((a) => (
          <Link key={a.href} href={a.href} style={{ textDecoration: "none", flex: 1, display: "flex" }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${alpha(a.color, "08")} 0%, ${v.card} 60%)`,
                border: `1px solid ${alpha(a.color, "15")}`,
                borderRadius: 16,
                padding: "20px 12px 18px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                WebkitTapHighlightColor: "transparent",
                flex: 1,
              }}
              onPointerDown={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(0.96)"; }}
              onPointerUp={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
              onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
              onPointerCancel={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
              data-testid={`m2-action-${a.fallback.toLowerCase().replace(/\s/g, "-")}`}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: alpha(a.color, "12"),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 10px",
              }}>
                <a.icon style={{ width: 24, height: 24, color: a.color }} strokeWidth={1.8} />
              </div>
              <div style={{
                fontSize: 14,
                fontWeight: 600,
                color: v.text,
                fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
                letterSpacing: "-0.01em",
                marginBottom: 3,
              }}>
                {t(a.labelKey, a.fallback)}
              </div>
              <div style={{
                fontSize: 11,
                fontWeight: 400,
                color: v.textSecondary,
                fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
                lineHeight: 1.3,
              }}>
                {t(a.subKey, a.subFallback)}
              </div>
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
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 16,
                  padding: "16px",
                  overflow: "hidden",
                  position: "relative",
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ width: 4, height: 40, borderRadius: 2, background: v.border }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ width: "60%", height: 14, borderRadius: 6, background: v.border, marginBottom: 8 }} />
                      <div style={{ width: "40%", height: 10, borderRadius: 4, background: v.border }} />
                    </div>
                    <div style={{ width: 48, height: 20, borderRadius: 6, background: v.border }} />
                  </div>
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.03) 50%, transparent 75%)",
                    animation: "m2shimmer 1.5s infinite",
                  }} />
                </div>
              ))}
              <style>{`@keyframes m2shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }`}</style>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div
              style={{
                background: `radial-gradient(ellipse at center, ${alpha(v.accent, "04")} 0%, ${v.card} 70%)`,
                borderRadius: 16,
                padding: "48px 24px",
                textAlign: "center",
                border: `1px solid ${v.border}`,
              }}
              data-testid="m2-no-results"
            >
              <Wine style={{ width: 48, height: 48, color: alpha(v.accent, "25"), margin: "0 auto 16px" }} strokeWidth={1.2} />
              <p style={{ margin: "0 0 8px", color: v.text, fontSize: 16, fontWeight: 600, fontFamily: "'Playfair Display', Georgia, serif" }}>
                {statusFilter === "all" && timeFilter === "all"
                  ? t("m2.tastings.noTastingsTitle", "No tastings yet")
                  : t("m2.tastings.noMatchTitle", "No matching tastings")}
              </p>
              <p style={{ margin: "0 0 16px", color: v.muted, fontSize: 13, lineHeight: 1.5, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
                {statusFilter === "all" && timeFilter === "all"
                  ? t("m2.tastings.noTastingsDesc", "Create or join your first tasting to get started")
                  : t("m2.tastings.noMatchDesc", "Try adjusting your filters")}
              </p>
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((tasting: any, idx: number) => (
                <TastingCard
                  key={tasting.id}
                  tasting={tasting}
                  host={isHost(tasting)}
                  formatDate={formatDate}
                  navigate={navigate}
                  index={idx}
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
  index = 0,
}: {
  tasting: any;
  host: boolean;
  formatDate: (d: string) => string;
  navigate: (to: string) => void;
  index?: number;
}) {
  const { t } = useTranslation();

  const colors = statusBadgeColors[tasting.status] || { color: v.muted, bg: alpha(v.muted, "20") };
  const statusLabel = t("m2.tastings.status" + tasting.status.charAt(0).toUpperCase() + tasting.status.slice(1), tasting.status);
  const isOpen = tasting.status === "open" || tasting.status === "reveal";

  return (
    <div
      style={{
        background: v.card,
        border: `1px solid ${isOpen ? alpha(colors.color, "25") : v.border}`,
        borderRadius: 16,
        padding: "16px 16px 16px 12px",
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        display: "flex",
        gap: 12,
        boxShadow: isOpen ? `0 0 12px ${alpha(colors.color, "08")}` : "none",
        WebkitTapHighlightColor: "transparent",
        animation: `m2fadeInUp 0.35s ease both`,
        animationDelay: `${index * 50}ms`,
      }}
      onPointerDown={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(0.98)"; }}
      onPointerUp={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
      onPointerCancel={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1)"; }}
      data-testid={`m2-tasting-card-${tasting.id}`}
      onClick={() => {
        if (tasting.status === "draft" && host) {
          navigate(`/m2/tastings/host/${tasting.id}`);
        } else {
          navigate(`/m2/tastings/session/${tasting.id}`);
        }
      }}
    >
      <div style={{
        width: 4,
        borderRadius: 2,
        background: colors.color,
        flexShrink: 0,
        opacity: 0.7,
        alignSelf: "stretch",
        ...(isOpen ? { animation: "m2livePulse 2.5s ease-in-out infinite" } : {}),
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 16,
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
                background: alpha(v.accent, "12"),
                padding: "2px 6px",
                borderRadius: 4,
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
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
              <Crown style={{ width: 11, height: 11 }} />
              {tasting.hostName}
            </span>
          )}
          {tasting.date && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
              <Calendar style={{ width: 11, height: 11 }} />
              {formatDate(tasting.date)}
            </span>
          )}
          {tasting.location && tasting.location !== "—" && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
              <MapPin style={{ width: 11, height: 11 }} />
              {tasting.location}
            </span>
          )}
          {tasting.participantCount != null && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: v.muted, fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif" }}>
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
            padding: "3px 10px",
            borderRadius: 8,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            ...(isOpen ? { animation: "m2badgePulse 2.5s ease-in-out infinite", "--pulse-color": alpha(colors.color, "15") } as React.CSSProperties : {}),
          }}
          data-testid={`badge-status-${tasting.id}`}
        >
          {statusLabel}
        </span>
        <ChevronRight style={{ width: 16, height: 16, color: v.muted }} />
      </div>
    </div>
  );
}
