import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { useAppStore } from "@/lib/store";
import { calendarApi, friendsApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight,
  MapPin, Users, Wine, Loader2,
} from "lucide-react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  hostId: string;
  hostName: string;
  participantIds: string[];
  participantCount: number;
  whiskyCount: number;
  code: string;
}

type CalendarFilter = "all" | "mine" | "friends";

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const parts = dateStr.match(/(\d{1,2})[./\-](\d{1,2})[./\-](\d{2,4})/);
  if (parts) {
    const [, day, month, year] = parts;
    const fullYear = year.length === 2 ? `20${year}` : year;
    return new Date(parseInt(fullYear), parseInt(month) - 1, parseInt(day));
  }
  return null;
}

const statusColor = (status: string) => {
  if (status === "open" || status === "reveal") return "var(--labs-success)";
  if (status === "draft") return "var(--labs-text-muted)";
  if (status === "closed") return "var(--labs-accent)";
  return "var(--labs-text-muted)";
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: statusColor(status),
        padding: "3px 8px",
        borderRadius: 6,
        border: `1px solid color-mix(in srgb, ${statusColor(status)} 30%, transparent)`,
        background: `color-mix(in srgb, ${statusColor(status)} 12%, transparent)`,
        whiteSpace: "nowrap",
      }}
    >
      {t(`session.status.${status}`, status)}
    </span>
  );
}

function getTastingRoute(ev: CalendarEvent, participantId?: string): string {
  if (ev.status === "draft" && ev.hostId === participantId) return `/labs/host/${ev.id}`;
  if (ev.status === "closed" || ev.status === "archived") return `/labs/results/${ev.id}`;
  return `/labs/tastings/${ev.id}`;
}

export default function LabsCalendar() {
  const { t, i18n } = useTranslation();
  useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const { currentParticipant } = useAppStore();
  const participantId = currentParticipant?.id;
  const locale = i18n.language === "de" ? "de-DE" : "en-US";

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar", participantId],
    queryFn: () => calendarApi.getAll(participantId || undefined),
    enabled: !!participantId,
  });

  const { data: friends = [] } = useQuery<{ id: string; friendParticipantId?: string }[]>({
    queryKey: ["friends", participantId],
    queryFn: () => friendsApi.getAll(participantId!),
    enabled: !!participantId,
  });

  const friendPids = useMemo(() => {
    const ids = new Set<string>();
    friends.forEach((f: any) => { if (f.friendParticipantId) ids.add(f.friendParticipantId); });
    return ids;
  }, [friends]);

  const filteredEvents = useMemo(() => {
    if (filter === "all" || !participantId) return events;
    if (filter === "mine") return events.filter(ev => ev.hostId === participantId || ev.participantIds?.includes(participantId));
    if (filter === "friends") return events.filter(ev => friendPids.has(ev.hostId) || ev.participantIds?.some(pid => friendPids.has(pid)));
    return events;
  }, [events, filter, participantId, friendPids]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    filteredEvents.forEach(ev => {
      const d = parseDate(ev.date);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    return map;
  }, [filteredEvents]);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayRaw = new Date(currentYear, currentMonth, 1).getDay();
  const firstDay = firstDayRaw === 0 ? 6 : firstDayRaw - 1;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(currentYear, currentMonth));
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 1);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d).slice(0, 2);
  });
  const selectedEvents = selectedDate ? (eventsByDate.get(selectedDate) || []) : [];

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11); }
    else setCurrentMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0); }
    else setCurrentMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(null);
  };

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(ev => { const d = parseDate(ev.date); return d && d.getTime() >= now.getTime() - 86400000; })
      .sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0))
      .slice(0, 5);
  }, [filteredEvents]);

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-calendar-page">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-calendar-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Tastings
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <CalendarIcon style={{ width: 22, height: 22, color: "var(--labs-accent)" }} />
        <h1
          className="labs-serif"
          style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: 0 }}
          data-testid="text-calendar-title"
        >
          {t("calendar.title", "Tasting Calendar")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 16px" }}>
        {t("calendar.subtitle", "Keep track of upcoming and past tasting events")}
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 16 }} data-testid="calendar-filter-tabs">
        {(["all", "mine", "friends"] as CalendarFilter[]).map(f => (
          <button
            key={f}
            onClick={() => { setFilter(f); setSelectedDate(null); }}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
              background: filter === f ? "var(--labs-accent-muted)" : "transparent",
              color: filter === f ? "var(--labs-accent)" : "var(--labs-text-muted)",
              fontFamily: "inherit",
            }}
            data-testid={`button-filter-${f}`}
          >
            {t(`calendar.filter${f.charAt(0).toUpperCase() + f.slice(1)}`, f.charAt(0).toUpperCase() + f.slice(1))}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Loader2 style={{ width: 28, height: 28, color: "var(--labs-accent)", margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>Loading calendar...</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
          <div className="labs-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text)", padding: 6 }} data-testid="button-prev-month">
                <ChevronLeft style={{ width: 20, height: 20 }} />
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="labs-serif" style={{ fontSize: 17, fontWeight: 700, color: "var(--labs-text)" }}>{monthName} {currentYear}</span>
                <button onClick={goToday} className="labs-btn-secondary" style={{ fontSize: 11, padding: "3px 10px" }} data-testid="button-today">
                  {t("calendar.today", "Today")}
                </button>
              </div>
              <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text)", padding: 6 }} data-testid="button-next-month">
                <ChevronRight style={{ width: 20, height: 20 }} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
              {dayLabels.map(d => (
                <div key={d} style={{ textAlign: "center", fontSize: 11, fontWeight: 600, color: "var(--labs-text-muted)", textTransform: "uppercase", padding: "4px 0" }}>{d}</div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} style={{ aspectRatio: "1" }} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasEvents = eventsByDate.has(dateKey);
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateKey)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      fontSize: 14,
                      fontWeight: isToday || hasEvents ? 700 : 500,
                      border: isSelected ? "2px solid var(--labs-accent)" : "1px solid transparent",
                      cursor: "pointer",
                      background: isToday && !isSelected ? "var(--labs-accent-muted)" : isSelected ? "var(--labs-surface-elevated)" : "transparent",
                      color: isToday ? "var(--labs-accent)" : isSelected ? "var(--labs-accent)" : "var(--labs-text-secondary)",
                      fontFamily: "system-ui, sans-serif",
                      transition: "all 0.15s",
                    }}
                    data-testid={`button-day-${day}`}
                  >
                    {day}
                    {hasEvents && (
                      <div style={{ position: "absolute", bottom: 3, display: "flex", gap: 2 }}>
                        {(eventsByDate.get(dateKey) || []).slice(0, 3).map((ev, j) => (
                          <span key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--labs-accent)", opacity: 0.8, display: "block" }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {selectedDate && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--labs-border)", paddingTop: 14 }}>
                {selectedEvents.length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center", fontStyle: "italic" }}>{t("calendar.noEvents", "No events on this day")}</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {selectedEvents.map(ev => (
                      <Link key={ev.id} href={getTastingRoute(ev, participantId)}>
                        <div
                          className="labs-card-interactive"
                          style={{
                            padding: "12px 14px",
                            borderLeft: `3px solid ${statusColor(ev.status)}`,
                          }}
                          data-testid={`cal-event-${ev.id}`}
                        >
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{ev.title}</p>
                            <StatusBadge status={ev.status} />
                          </div>
                          <div style={{ display: "flex", gap: 12, fontSize: 11, color: "var(--labs-text-muted)" }}>
                            {ev.location && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin style={{ width: 10, height: 10 }} /> {ev.location}</span>}
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Wine style={{ width: 10, height: 10 }} /> {ev.whiskyCount}</span>
                            <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Users style={{ width: 10, height: 10 }} /> {ev.participantCount}</span>
                          </div>
                          <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "4px 0 0" }}>{t("calendar.hostedBy", "Hosted by")} {stripGuestSuffix(ev.hostName)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="labs-card" style={{ padding: 16 }}>
              <h3 className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", marginBottom: 10, marginTop: 0 }}>{t("calendar.upcoming", "Upcoming")}</h3>
              {upcomingEvents.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--labs-text-muted)", fontStyle: "italic" }}>{t("calendar.noUpcoming", "No upcoming events")}</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {upcomingEvents.map(ev => (
                    <Link key={ev.id} href={getTastingRoute(ev, participantId)}>
                      <div style={{ cursor: "pointer", paddingBottom: 8, borderBottom: "1px solid var(--labs-border)" }} data-testid={`link-upcoming-${ev.id}`}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</p>
                        <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{ev.date} · {ev.location || ""}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                          <StatusBadge status={ev.status} />
                          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{stripGuestSuffix(ev.hostName)}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="labs-card" style={{ padding: 16 }}>
              <h3 className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", marginBottom: 10, marginTop: 0 }}>{t("calendar.stats", "Stats")}</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ textAlign: "center" }}>
                  <div className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)" }}>{filteredEvents.length}</div>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{t("calendar.totalTastings", "Total Tastings")}</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div className="labs-serif" style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)" }}>
                    {filteredEvents.filter(e => e.status === "open" || e.status === "draft").length}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{t("calendar.active", "Active")}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
