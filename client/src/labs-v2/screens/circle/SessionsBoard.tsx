import { useState, useEffect, useMemo } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import type { V2Lang } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import { Live, Clock, Users } from "../../icons";

interface Session {
  id: string;
  name: string;
  host?: string;
  hostName?: string;
  date?: string;
  status: string;
  participantCount?: number;
  participants?: unknown[];
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  lang: V2Lang;
  participantId: string | null;
}

async function fetchSessions(pid: string): Promise<Session[]> {
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-participant-id": pid };
  const res = await fetch("/api/community/sessions", { headers });
  if (!res.ok) throw new Error("Failed");
  const d = await res.json();
  return Array.isArray(d) ? d : d?.sessions || [];
}

export default function SessionsBoard({ th, t, lang, participantId }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!participantId) { setLoading(false); return; }
    setLoading(true);
    fetchSessions(participantId)
      .then((d) => { setSessions(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [participantId]);

  const grouped = useMemo(() => {
    const live: Session[] = [];
    const upcoming: Session[] = [];
    const completed: Session[] = [];

    for (const s of sessions) {
      if (s.status === "open" || s.status === "live") live.push(s);
      else if (s.status === "draft" || s.status === "scheduled") upcoming.push(s);
      else completed.push(s);
    }

    completed.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return { live, upcoming, completed: completed.slice(0, 10) };
  }, [sessions]);

  if (loading) {
    return (
      <div style={{ padding: `${SP.lg}px 0` }}>
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} style={{
            height: 64, background: th.bgCard, borderRadius: RADIUS.md,
            marginBottom: SP.sm, opacity: 0.6,
          }} className="v2-pulse" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: `${SP.xxl}px 0` }} data-testid="v2-circle-sessions-empty">
        <Clock color={th.faint} size={40} style={{ marginBottom: SP.md }} />
        <p style={{ fontSize: 14, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{t.circleSessions}</p>
        <p style={{ fontSize: 12, color: th.muted }}>{t.circleNoSessions}</p>
      </div>
    );
  }

  const locale = lang === "de" ? "de-DE" : "en-US";
  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
    } catch { return d; }
  };

  const renderGroup = (
    label: string,
    items: Session[],
    accentColor: string,
    statusIcon: React.ReactNode,
    pulsing: boolean
  ) => {
    if (items.length === 0) return null;

    return (
      <div style={{ marginBottom: SP.lg }}>
        <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.sm }}>
          {statusIcon}
          <p style={{ fontSize: 11, fontWeight: 600, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
            {label} ({items.length})
          </p>
        </div>
        {items.map((s) => {
          const count = s.participantCount || (Array.isArray(s.participants) ? s.participants.length : 0);
          return (
            <div
              key={s.id}
              style={{
                display: "flex", alignItems: "center", gap: SP.sm,
                padding: `${SP.sm + 2}px ${SP.md}px`, borderRadius: RADIUS.md,
                background: th.bgCard, border: `1px solid ${th.border}`,
                marginBottom: SP.xs,
                borderLeft: `3px solid ${accentColor}`,
              }}
              data-testid={`v2-circle-session-${s.id}`}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.name || "Tasting"}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginTop: 2 }}>
                  {(s.host || s.hostName) && (
                    <span style={{ fontSize: 11, color: th.muted }}>
                      {t.circleHost}: {s.hostName || s.host}
                    </span>
                  )}
                  {s.date && (
                    <span style={{ fontSize: 11, color: th.faint }}>
                      {formatDate(s.date)}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: SP.xs, flexShrink: 0 }}>
                {count > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Users color={th.muted} size={12} />
                    <span style={{ fontSize: 11, color: th.muted }}>{count}</span>
                  </div>
                )}
                {pulsing && (
                  <div style={{
                    width: 8, height: 8, borderRadius: RADIUS.full,
                    background: accentColor,
                    animation: "pulse 2s infinite",
                  }} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="v2-fade-up" data-testid="v2-circle-sessions">
      {renderGroup(
        t.circleLive,
        grouped.live,
        th.green,
        <Live color={th.green} size={14} />,
        true
      )}
      {renderGroup(
        t.circleUpcoming,
        grouped.upcoming,
        th.gold,
        <Clock color={th.gold} size={14} />,
        false
      )}
      {renderGroup(
        t.circleCompleted,
        grouped.completed,
        th.faint,
        <Clock color={th.faint} size={14} />,
        false
      )}
    </div>
  );
}
