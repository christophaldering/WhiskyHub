import { useState, useEffect, useMemo } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS } from "../../tokens";
import SubScreenHeader from "./SubScreenHeader";

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string;
  onBack: () => void;
}

interface CalEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  hostName: string;
  participantIds: string[];
  participantCount: number;
  whiskyCount: number;
}

type FilterTab = "all" | "mine" | "friends";

const WEEKDAYS_DE = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const WEEKDAYS_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function TastingCalendar({ th, t, participantId, onBack }: Props) {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const isDE = t.back === "Zur\u00fcck";
  const weekdays = isDE ? WEEKDAYS_DE : WEEKDAYS_EN;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/calendar?participantId=${participantId}`, {
          headers: { "x-participant-id": participantId },
        });
        if (!cancelled && res.ok) {
          setEvents(await res.json());
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [participantId]);

  const filtered = useMemo(() => {
    if (filter === "mine") return events.filter((e) => e.participantIds?.includes(participantId));
    if (filter === "friends") return events.filter((e) => e.participantIds && !e.participantIds.includes(participantId) && e.participantIds.length > 0);
    return events;
  }, [events, filter, participantId]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();

  const eventsByDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    for (const ev of filtered) {
      if (!ev.date) continue;
      const d = new Date(ev.date);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    }
    return map;
  }, [filtered, year, month]);

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  const prevMonth = () => { setViewDate(new Date(year, month - 1, 1)); setSelectedDay(null); };
  const nextMonth = () => { setViewDate(new Date(year, month + 1, 1)); setSelectedDay(null); };

  const monthLabel = viewDate.toLocaleString(isDE ? "de-DE" : "en-US", { month: "long", year: "numeric" });

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: t.mwCalendarAll },
    { key: "mine", label: t.mwCalendarMine },
    { key: "friends", label: t.mwCalendarFriends },
  ];

  const statusColor = (status: string) => {
    if (status === "completed" || status === "closed") return th.green;
    if (status === "live" || status === "active") return th.amber;
    return th.gold;
  };

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="v2-fade-up" style={{ padding: `${SP.lg}px ${SP.md}px` }}>
      <SubScreenHeader th={th} title={t.mwCalendarTitle} onBack={onBack} />

      <div style={{ display: "flex", gap: SP.xs, marginBottom: SP.lg }} data-testid="mw-cal-filters">
        {filterTabs.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            data-testid={`mw-cal-filter-${f.key}`}
            style={{
              flex: 1,
              padding: `${SP.sm}px ${SP.md}px`,
              fontSize: 13,
              fontWeight: filter === f.key ? 600 : 400,
              fontFamily: FONT.body,
              background: filter === f.key ? th.bgCard : "transparent",
              color: filter === f.key ? th.gold : th.muted,
              border: `1px solid ${filter === f.key ? th.gold : th.border}`,
              borderRadius: RADIUS.full,
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: SP.xxl, color: th.muted }}>...</div>
      ) : (
        <div style={{ display: "flex", gap: SP.lg, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px" }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: SP.md,
            }}>
              <button onClick={prevMonth} data-testid="mw-cal-prev" style={{ background: "none", border: "none", color: th.text, fontSize: 18, cursor: "pointer", padding: SP.sm }}>
                \u2039
              </button>
              <span style={{ fontSize: 16, fontWeight: 600, fontFamily: FONT.display, color: th.text }}>{monthLabel}</span>
              <button onClick={nextMonth} data-testid="mw-cal-next" style={{ background: "none", border: "none", color: th.text, fontSize: 18, cursor: "pointer", padding: SP.sm }}>
                \u203a
              </button>
            </div>

            <div style={{
              display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2,
              background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: RADIUS.lg, padding: SP.sm,
            }} data-testid="mw-cal-grid">
              {weekdays.map((wd) => (
                <div key={wd} style={{ textAlign: "center", fontSize: 10, fontWeight: 600, color: th.muted, padding: `${SP.xs}px 0` }}>
                  {wd}
                </div>
              ))}
              {cells.map((day, i) => {
                const dayEvents = day ? (eventsByDay[day] || []) : [];
                const isSelected = day === selectedDay;
                const isToday = day != null && new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
                return (
                  <button
                    key={i}
                    onClick={() => day && setSelectedDay(isSelected ? null : day)}
                    disabled={!day}
                    data-testid={day ? `mw-cal-day-${day}` : undefined}
                    style={{
                      aspectRatio: "1",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontFamily: FONT.body,
                      background: isSelected ? `${th.gold}22` : "transparent",
                      color: day ? (isToday ? th.gold : th.text) : "transparent",
                      border: isSelected ? `1px solid ${th.gold}` : "1px solid transparent",
                      borderRadius: RADIUS.sm,
                      cursor: day ? "pointer" : "default",
                      fontWeight: isToday ? 700 : 400,
                      position: "relative",
                      padding: 0,
                    }}
                  >
                    {day || ""}
                    {dayEvents.length > 0 && (
                      <div style={{ display: "flex", gap: 2, marginTop: 1 }}>
                        {dayEvents.slice(0, 3).map((ev, j) => (
                          <span key={j} style={{ width: 4, height: 4, borderRadius: "50%", background: statusColor(ev.status) }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDay && selectedEvents.length > 0 && (
            <div style={{ flex: "1 1 250px" }} data-testid="mw-cal-details">
              <div style={{ fontSize: 13, fontWeight: 600, color: th.muted, marginBottom: SP.sm, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {selectedDay}. {monthLabel}
              </div>
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    background: th.bgCard,
                    border: `1px solid ${th.border}`,
                    borderRadius: RADIUS.lg,
                    padding: SP.md,
                    marginBottom: SP.sm,
                  }}
                  data-testid={`mw-cal-event-${ev.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: SP.xs }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: th.text }}>{ev.title}</div>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: `2px ${SP.sm}px`, borderRadius: RADIUS.full,
                      background: `${statusColor(ev.status)}22`, color: statusColor(ev.status),
                    }}>
                      {ev.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: th.muted }}>
                    {ev.location && <div>{ev.location}</div>}
                    <div>{ev.hostName} \u00b7 {ev.participantCount} \u00b7 {ev.whiskyCount} whiskies</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
