import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import SimpleShell from "@/components/simple/simple-shell";
import { getSession } from "@/lib/session";
import { useQuery } from "@tanstack/react-query";
import { c, cardStyle } from "@/lib/theme";
import { Eye, Play, BarChart3, Users, Calendar, MapPin, Wine, ChevronRight, Filter } from "lucide-react";

type StatusFilter = "all" | "draft" | "open" | "closed" | "archived";

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

export default function SessionsDark() {
  const [, navigate] = useLocation();
  const session = getSession();
  const [filter, setFilter] = useState<StatusFilter>("all");

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

  const filters: { id: StatusFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "draft", label: "Draft" },
    { id: "open", label: "Open" },
    { id: "closed", label: "Closed" },
    { id: "archived", label: "Archived" },
  ];

  const filtered = useMemo(() => {
    const list = filter === "all" ? tastings : tastings.filter((t: any) => t.status === filter || (filter === "open" && t.status === "reveal"));
    return [...list].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [tastings, filter]);

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

  const content = (
    <div style={{ width: "100%" }}>
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
      <p style={{ fontSize: 13, color: c.muted, margin: 0, marginBottom: 24 }}>
        All your tastings at a glance
      </p>

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
              gap: 6,
              marginBottom: 20,
              overflowX: "auto",
              paddingBottom: 4,
            }}
            data-testid="filter-bar"
          >
            {filters.map((f) => {
              const active = filter === f.id;
              const count = f.id === "all"
                ? tastings.length
                : tastings.filter((t: any) => t.status === f.id || (f.id === "open" && t.status === "reveal")).length;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${active ? c.accent + "60" : c.border}`,
                    background: active ? c.accent + "18" : "transparent",
                    color: active ? c.accent : c.muted,
                    fontSize: 13,
                    fontWeight: active ? 600 : 400,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontFamily: "system-ui, sans-serif",
                    transition: "all 0.2s",
                  }}
                  data-testid={`filter-${f.id}`}
                >
                  {f.label}
                  <span
                    style={{
                      fontSize: 11,
                      color: active ? c.accent : c.mutedLight,
                      fontWeight: 500,
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
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
                {filter === "all" ? "No sessions yet" : `No ${filter} sessions`}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((tasting: any) => {
                const actions = getActions(tasting);
                const host = isHost(tasting);
                return (
                  <div
                    key={tasting.id}
                    style={{
                      ...cardStyle,
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    data-testid={`card-session-${tasting.id}`}
                    onClick={() => navigate(`/tasting-room-simple/${tasting.id}`)}
                  >
                    <div style={{ padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 15,
                              fontWeight: 600,
                              color: c.text,
                              fontFamily: "'Playfair Display', serif",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            data-testid={`text-session-title-${tasting.id}`}
                          >
                            {tasting.title}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: c.muted }}>
                              <Calendar style={{ width: 12, height: 12 }} />
                              {formatDate(tasting.date)}
                            </span>
                            {tasting.location && tasting.location !== "—" && (
                              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: c.muted }}>
                                <MapPin style={{ width: 12, height: 12 }} />
                                {tasting.location}
                              </span>
                            )}
                            {tasting.participantCount != null && (
                              <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 12, color: c.muted }}>
                                <Users style={{ width: 12, height: 12 }} />
                                {tasting.participantCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
                          <StatusBadge status={tasting.status} />
                          {host && (
                            <span style={{ fontSize: 10, color: c.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                              Host
                            </span>
                          )}
                        </div>
                      </div>

                      {actions.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: `1px solid ${c.border}`,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {actions.map((action) => (
                            <button
                              key={action.testId}
                              type="button"
                              onClick={action.onClick}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 5,
                                padding: "6px 12px",
                                borderRadius: 8,
                                border: `1px solid ${c.border}`,
                                background: "transparent",
                                color: c.accent,
                                fontSize: 12,
                                fontWeight: 500,
                                cursor: "pointer",
                                fontFamily: "system-ui, sans-serif",
                                transition: "all 0.2s",
                              }}
                              data-testid={action.testId}
                            >
                              <action.icon style={{ width: 14, height: 14 }} />
                              {action.label}
                            </button>
                          ))}
                        </div>
                      )}
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
