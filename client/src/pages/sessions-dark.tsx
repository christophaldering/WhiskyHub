import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { c, cardStyle } from "@/lib/theme";
import { Eye, Play, BarChart3, Users, Calendar, MapPin, Wine, ChevronDown } from "lucide-react";

type StatusFilter = "all" | "draft" | "open" | "closed" | "archived";
type TimeFilter = "30d" | "90d" | "1y" | "all";

const statusBadgeColors: Record<string, { color: string; bg: string }> = {
  draft: { color: "#888", bg: "#88888820" },
  open: { color: c.success, bg: `${c.success}20` },
  closed: { color: c.accent, bg: `${c.accent}20` },
  reveal: { color: "#c084fc", bg: "#c084fc20" },
  archived: { color: "#666", bg: "#66666620" },
};

function StatusBadge({ status }: { status: string }) {
  const colors = statusBadgeColors[status] || { color: c.muted, bg: `${c.muted}20` };
  return (
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
      data-testid={`badge-status-${status}`}
    >
      {status}
    </span>
  );
}

const selectStyle: React.CSSProperties = {
  padding: "7px 30px 7px 12px",
  borderRadius: 10,
  border: `1px solid ${c.border}`,
  background: c.card,
  color: c.text,
  fontSize: 13,
  fontWeight: 500,
  fontFamily: "system-ui, sans-serif",
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  cursor: "pointer",
  outline: "none",
  minWidth: 0,
};

export default function SessionsDark() {
  const [, navigate] = useLocation();
  const session = getSession();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  const { data: tastings = [], isLoading } = useQuery({
    queryKey: ["tastings", session.pid],
    queryFn: async () => {
      if (!session.pid) return [];
      const res = await fetch(`/api/tastings?participantId=${session.pid}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!session.pid,
    staleTime: 0,
    refetchOnMount: "always" as const,
  });

  const filtered = useMemo(() => {
    let list = tastings;

    if (statusFilter !== "all") {
      list = list.filter((t: any) => t.status === statusFilter || (statusFilter === "open" && t.status === "reveal"));
    }

    if (timeFilter !== "all") {
      const now = Date.now();
      const cutoff = timeFilter === "30d" ? 30 : timeFilter === "90d" ? 90 : 365;
      const minDate = now - cutoff * 86400000;
      list = list.filter((t: any) => {
        const d = new Date(t.date).getTime();
        return !isNaN(d) && d >= minDate;
      });
    }

    return [...list].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tastings, statusFilter, timeFilter]);

  const isHost = (t: any) => session.pid && t.hostId === session.pid;

  const getActions = (tasting: any) => {
    const actions: { label: string; icon: React.ElementType; onClick: () => void; testId: string }[] = [];

    if (tasting.status === "draft" && isHost(tasting)) {
      actions.push({
        label: "Resume",
        icon: Play,
        onClick: () => navigate(`/tasting-room-simple/${tasting.id}`),
        testId: `action-resume-${tasting.id}`,
      });
    }

    if (tasting.status === "open" || tasting.status === "reveal") {
      actions.push({
        label: "Preview",
        icon: Eye,
        onClick: () => navigate(`/tasting-room-simple/${tasting.id}`),
        testId: `action-preview-${tasting.id}`,
      });
    }

    if (tasting.status === "closed" || tasting.status === "reveal" || tasting.status === "archived") {
      actions.push({
        label: "Results",
        icon: BarChart3,
        onClick: () => navigate(`/tasting-results/${tasting.id}`),
        testId: `action-results-${tasting.id}`,
      });
    }

    return actions;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tastings.length, draft: 0, open: 0, closed: 0, archived: 0 };
    for (const t of tastings) {
      const s = t.status === "reveal" ? "open" : t.status;
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [tastings]);

  const content = (
    <div style={{ width: "100%" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: c.bg,
          paddingTop: 4,
          paddingBottom: 16,
          marginLeft: -20,
          marginRight: -20,
          paddingLeft: 20,
          paddingRight: 20,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 24,
            fontWeight: 700,
            color: c.text,
            margin: 0,
            marginBottom: 4,
          }}
          data-testid="text-sessions-dark-title"
        >
          Sessions
        </h1>
        <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>
          All your tastings at a glance
        </p>
      </div>

      {!session.signedIn ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: 40,
          }}
          data-testid="sessions-dark-signin-prompt"
        >
          <Wine style={{ width: 40, height: 40, color: c.mutedLight, margin: "0 auto 12px" }} />
          <p style={{ fontSize: 15, color: c.text, marginBottom: 4 }}>Sign in to see your sessions</p>
          <p style={{ fontSize: 13, color: c.muted }}>Tap the account icon above to get started</p>
        </div>
      ) : isLoading ? (
        <div style={{ textAlign: "center", padding: 60 }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${c.border}`,
              borderTopColor: c.accent,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 20,
              flexWrap: "wrap",
              alignItems: "center",
            }}
            data-testid="filter-bar"
          >
            <div style={{ position: "relative" }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                style={selectStyle}
                data-testid="select-status-filter"
              >
                <option value="all">All Status ({statusCounts.all})</option>
                <option value="draft">Draft ({statusCounts.draft})</option>
                <option value="open">Open ({statusCounts.open})</option>
                <option value="closed">Closed ({statusCounts.closed})</option>
                <option value="archived">Archived ({statusCounts.archived})</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: c.muted, pointerEvents: "none" }} />
            </div>

            <div style={{ position: "relative" }}>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
                style={selectStyle}
                data-testid="select-time-filter"
              >
                <option value="all">All Time</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
                <option value="1y">Last year</option>
              </select>
              <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: c.muted, pointerEvents: "none" }} />
            </div>

            <span style={{ fontSize: 12, color: c.muted, marginLeft: "auto" }} data-testid="text-result-count">
              {filtered.length} {filtered.length === 1 ? "session" : "sessions"}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div
              style={{
                ...cardStyle,
                textAlign: "center",
                padding: 40,
              }}
              data-testid="sessions-dark-empty"
            >
              <Wine style={{ width: 36, height: 36, color: c.mutedLight, margin: "0 auto 10px" }} />
              <p style={{ fontSize: 14, color: c.muted }}>
                {statusFilter === "all" && timeFilter === "all" ? "No sessions yet" : "No matching sessions"}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((tasting: any) => {
                const actions = getActions(tasting);
                const host = isHost(tasting);
                return (
                  <div
                    key={tasting.id}
                    style={{
                      ...cardStyle,
                      padding: "12px 14px",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    data-testid={`card-session-${tasting.id}`}
                    onClick={() => navigate(`/tasting-room-simple/${tasting.id}`)}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: c.text,
                              fontFamily: "'Playfair Display', serif",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              flex: 1,
                              minWidth: 0,
                            }}
                            data-testid={`text-session-title-${tasting.id}`}
                          >
                            {tasting.title}
                          </span>
                          {host && (
                            <span style={{ fontSize: 9, color: c.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
                              HOST
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: c.muted }}>
                            <Calendar style={{ width: 11, height: 11 }} />
                            {formatDate(tasting.date)}
                          </span>
                          {tasting.location && tasting.location !== "—" && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: c.muted }}>
                              <MapPin style={{ width: 11, height: 11 }} />
                              {tasting.location}
                            </span>
                          )}
                          {tasting.participantCount != null && (
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: c.muted }}>
                              <Users style={{ width: 11, height: 11 }} />
                              {tasting.participantCount}
                            </span>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                        <StatusBadge status={tasting.status} />
                        {actions.length > 0 && (
                          <div
                            style={{ display: "flex", gap: 4 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {actions.map((action) => (
                              <button
                                key={action.testId}
                                type="button"
                                onClick={action.onClick}
                                title={action.label}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 30,
                                  height: 30,
                                  borderRadius: 8,
                                  border: `1px solid ${c.border}`,
                                  background: "transparent",
                                  color: c.accent,
                                  cursor: "pointer",
                                  fontFamily: "system-ui, sans-serif",
                                  transition: "all 0.2s",
                                }}
                                data-testid={action.testId}
                              >
                                <action.icon style={{ width: 14, height: 14 }} />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );

  return <SimpleShell maxWidth={520}>{content}</SimpleShell>;
}
