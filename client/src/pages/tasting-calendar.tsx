import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import BackButton from "@/components/back-button";
import { calendarApi, friendsApi } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Users, Wine, Bell, BellOff, Plus, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { v } from "@/lib/themeVars";

type CalendarFilter = "all" | "mine" | "friends";

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

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

const STATUS_COLORS: Record<string, React.CSSProperties> = {
  draft: { color: v.muted, background: v.elevated, border: `1px solid ${v.border}` },
  open: { color: v.deltaPositive, background: `color-mix(in srgb, ${v.deltaPositive} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${v.deltaPositive} 30%, transparent)` },
  closed: { color: v.accent, background: `color-mix(in srgb, ${v.accent} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${v.accent} 30%, transparent)` },
  reveal: { color: v.accent, background: v.pillBg, border: `1px solid color-mix(in srgb, ${v.accent} 30%, transparent)` },
  archived: { color: v.muted, background: v.elevated, border: `1px solid ${v.border}` },
};

const OFFSET_OPTIONS = [
  { value: 1440, key: "offset1440" },
  { value: 360, key: "offset360" },
  { value: 60, key: "offset60" },
  { value: 30, key: "offset30" },
];

function getTastingRoute(ev: CalendarEvent, embedded: boolean, participantId?: string): string {
  if (!embedded) return `/tasting/${ev.id}`;
  if (ev.status === "draft" && ev.hostId === participantId) return `/m2/tastings/host/${ev.id}`;
  return `/m2/tastings/session/${ev.id}`;
}

export default function TastingCalendar({ embedded = false }: { embedded?: boolean } = {}) {
  const { t, i18n } = useTranslation();
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<CalendarFilter>("all");
  const [selectedOffset, setSelectedOffset] = useState<number>(1440);
  const currentParticipant = useAppStore((s) => s.currentParticipant);
  const participantId = currentParticipant?.id;
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar", participantId],
    queryFn: () => calendarApi.getAll(participantId || undefined),
    enabled: !!participantId,
  });

  const { data: reminders = [] } = useQuery<any[]>({
    queryKey: ["/api/reminders", participantId],
    queryFn: () => fetch(`/api/reminders/${participantId}`).then(r => r.json()),
    enabled: !!participantId,
  });

  const { data: participant } = useQuery<any>({
    queryKey: [`/api/participants/${participantId}`],
    enabled: !!participantId,
  });

  const hasVerifiedEmail = participant?.email && participant?.emailVerified;

  const addReminderMutation = useMutation({
    mutationFn: async (data: { tastingId?: string; enabled: boolean; offsetMinutes: number }) => {
      const res = await apiRequest("POST", `/api/reminders/${participantId}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t("reminders.saved") });
    },
  });

  const deleteReminderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/reminders/${participantId}/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reminders"] });
      toast({ title: t("reminders.deleted") });
    },
  });

  const toggleReminderMutation = useMutation({
    mutationFn: async (reminder: any) => {
      const res = await apiRequest("POST", `/api/reminders/${participantId}`, {
        tastingId: reminder.tastingId,
        enabled: !reminder.enabled,
        offsetMinutes: reminder.offsetMinutes,
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/reminders"] });
    },
  });

  const { data: friends = [] } = useQuery<{ id: string; friendParticipantId?: string }[]>({
    queryKey: ["friends", participantId],
    queryFn: () => friendsApi.getAll(participantId!),
    enabled: !!participantId,
  });

  const friendParticipantIds = useMemo(() => {
    const ids = new Set<string>();
    friends.forEach((f: any) => {
      if (f.friendParticipantId) ids.add(f.friendParticipantId);
    });
    return ids;
  }, [friends]);

  const filteredEvents = useMemo(() => {
    if (filter === "all" || !participantId) return events;
    if (filter === "mine") {
      return events.filter(
        (ev) => ev.hostId === participantId || ev.participantIds?.includes(participantId)
      );
    }
    if (filter === "friends") {
      return events.filter((ev) => {
        if (friendParticipantIds.has(ev.hostId)) return true;
        return ev.participantIds?.some((pid) => friendParticipantIds.has(pid));
      });
    }
    return events;
  }, [events, filter, participantId, friendParticipantIds]);

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

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const locale = i18n.language === "de" ? "de-DE" : "en-US";
  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(currentYear, currentMonth));
  const dayLabels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 1);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
  });

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

  type StatusFilterAll = "all" | "draft" | "open" | "closed" | "archived";
  const [statusFilter, setStatusFilter] = useState<StatusFilterAll>("all");

  const allTastingsList = useMemo(() => {
    let items = [...filteredEvents];
    if (statusFilter !== "all") {
      items = items.filter(ev => statusFilter === "open" ? (ev.status === "open" || ev.status === "reveal") : ev.status === statusFilter);
    }
    items.sort((a, b) => {
      const da = parseDate(a.date)?.getTime() || 0;
      const db = parseDate(b.date)?.getTime() || 0;
      return db - da;
    });
    return items;
  }, [filteredEvents, statusFilter]);

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) || [] : [];

  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter(ev => {
        const d = parseDate(ev.date);
        return d && d.getTime() >= now.getTime() - 86400000;
      })
      .sort((a, b) => {
        const da = parseDate(a.date);
        const db = parseDate(b.date);
        return (da?.getTime() || 0) - (db?.getTime() || 0);
      })
      .slice(0, 5);
  }, [filteredEvents]);

  return (
    <div
      className={embedded ? "min-w-0 overflow-x-hidden" : "max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden"}
      style={{ background: embedded ? undefined : v.bg }}
      data-testid="calendar-page"
    >
      {!embedded && <BackButton fallback="/enter" />}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {!embedded && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="w-7 h-7" style={{ color: v.accent }} />
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-serif font-bold"
                style={{ color: v.accent }}
                data-testid="text-calendar-title"
              >
                {t("calendar.title")}
              </h1>
            </div>
            <p className="text-sm mb-4" style={{ color: v.muted }}>{t("calendar.subtitle")}</p>
          </>
        )}

        <div className="flex items-center gap-2 mb-6" data-testid="calendar-filter-tabs">
          {(["all", "mine", "friends"] as CalendarFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setSelectedDate(null); }}
              style={{
                padding: "6px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 600,
                fontFamily: "'Playfair Display', Georgia, serif",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s",
                background: filter === f ? v.pillBg : "transparent",
                color: filter === f ? v.pillText : v.muted,
              }}
              data-testid={`button-filter-${f}`}
            >
              {t(`calendar.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div
            className="h-80 rounded-lg animate-pulse"
            style={{ background: v.card, opacity: 0.5 }}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div
              className="lg:col-span-2 rounded-lg p-5"
              style={{ background: v.card, border: `1px solid ${v.border}` }}
            >
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={prevMonth}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: v.textSecondary,
                    padding: 8,
                    borderRadius: 8,
                  }}
                  data-testid="button-prev-month"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-serif font-semibold" style={{ color: v.text }}>
                    {monthName} {currentYear}
                  </h2>
                  <button
                    onClick={goToday}
                    style={{
                      padding: "4px 12px",
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'Playfair Display', Georgia, serif",
                      border: `1px solid ${v.border}`,
                      background: v.elevated,
                      color: v.textSecondary,
                      cursor: "pointer",
                    }}
                    data-testid="button-today"
                  >
                    {t("calendar.today")}
                  </button>
                </div>
                <button
                  onClick={nextMonth}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: v.textSecondary,
                    padding: 8,
                    borderRadius: 8,
                  }}
                  data-testid="button-next-month"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {dayLabels.map(d => (
                  <div
                    key={d}
                    className="text-center text-[11px] uppercase tracking-wider font-semibold py-1.5"
                    style={{ color: v.muted }}
                  >
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasEvents = eventsByDate.has(dateKey);
                  const isToday = dateKey === today;
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
                        transition: "all 0.15s",
                        fontSize: 14,
                        fontWeight: isToday || hasEvents ? 700 : 500,
                        border: isSelected ? `2px solid ${v.accent}` : isToday ? "none" : "1px solid transparent",
                        cursor: "pointer",
                        background: isToday && !isSelected
                          ? v.pillBg
                          : isSelected
                          ? v.elevated
                          : "transparent",
                        color: isToday
                          ? v.accent
                          : isSelected
                          ? v.accent
                          : v.textSecondary,
                      }}
                      data-testid={`button-day-${day}`}
                    >
                      {day}
                      {hasEvents && (
                        <div style={{ position: "absolute", bottom: 3, display: "flex", gap: 2 }}>
                          {(eventsByDate.get(dateKey) || []).slice(0, 3).map((_, j) => (
                            <span
                              key={j}
                              style={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                background: v.accent,
                                opacity: 0.8,
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ marginTop: 16, borderTop: `1px solid ${v.border}`, paddingTop: 16 }}
                >
                  {selectedEvents.length === 0 ? (
                    <p className="text-sm text-center italic" style={{ color: v.muted }}>{t("calendar.noEvents")}</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map(ev => (
                        <EventCard key={ev.id} event={ev} embedded={embedded} participantId={participantId} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              <div
                className="rounded-lg p-5"
                style={{ background: v.card, border: `1px solid ${v.border}` }}
              >
                <h3 className="text-sm font-serif font-semibold mb-3" style={{ color: v.text }}>{t("calendar.upcoming")}</h3>
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs italic" style={{ color: v.muted }}>{t("calendar.noUpcoming")}</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map(ev => (
                      <Link key={ev.id} href={getTastingRoute(ev, embedded, participantId)}>
                        <div
                          className="group cursor-pointer py-2 last:border-b-0 transition-colors"
                          style={{ borderBottom: `1px solid color-mix(in srgb, ${v.border} 50%, transparent)` }}
                          data-testid={`link-upcoming-${ev.id}`}
                        >
                          <p className="text-sm font-semibold truncate transition-colors" style={{ color: v.text }}>{ev.title}</p>
                          <p className="mt-0.5" style={{ fontSize: 10, color: v.muted }}>{ev.date} · {ev.location}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              style={{
                                fontSize: 9,
                                padding: "2px 6px",
                                borderRadius: 4,
                                ...(STATUS_COLORS[ev.status] || STATUS_COLORS.draft),
                              }}
                            >
                              {ev.status}
                            </span>
                            <span style={{ fontSize: 10, color: v.muted, opacity: 0.7 }}>{ev.hostName}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="rounded-lg p-5"
                style={{ background: v.card, border: `1px solid ${v.border}` }}
              >
                <h3 className="text-sm font-serif font-semibold mb-2" style={{ color: v.text }}>{t("calendar.stats")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-serif font-bold" style={{ color: v.accent }}>{filteredEvents.length}</p>
                    <p style={{ fontSize: 10, color: v.muted }}>{t("calendar.totalTastings")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif font-bold" style={{ color: v.accent }}>
                      {filteredEvents.filter(e => e.status === "open" || e.status === "draft").length}
                    </p>
                    <p style={{ fontSize: 10, color: v.muted }}>{t("calendar.active")}</p>
                  </div>
                </div>
              </div>

              {participantId && (
                <div
                  className="rounded-lg p-5 space-y-3"
                  style={{ background: v.card, border: `1px solid ${v.border}` }}
                  data-testid="calendar-reminders-section"
                >
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" style={{ color: v.accent }} />
                    <h3 className="text-sm font-serif font-semibold" style={{ color: v.text }}>{t("reminders.title")}</h3>
                  </div>

                  {!hasVerifiedEmail && (
                    <div
                      className="flex items-start gap-2 rounded-lg p-2.5"
                      style={{
                        background: `color-mix(in srgb, ${v.accent} 10%, transparent)`,
                        border: `1px solid color-mix(in srgb, ${v.accent} 20%, transparent)`,
                      }}
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: v.accent }} />
                      <p style={{ fontSize: 11, color: v.textSecondary }}>{t("reminders.emailRequired")}</p>
                    </div>
                  )}

                  {reminders.filter((r: any) => !r.tastingId).map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2"
                      style={{ background: v.elevated }}
                      data-testid={`reminder-global-${r.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={r.enabled}
                          onCheckedChange={() => toggleReminderMutation.mutate(r)}
                          disabled={!hasVerifiedEmail}
                          className="scale-75"
                        />
                        <span
                          className="text-xs"
                          style={{
                            color: r.enabled ? v.textSecondary : v.muted,
                            textDecoration: r.enabled ? "none" : "line-through",
                          }}
                        >
                          {t(`reminders.${OFFSET_OPTIONS.find(o => o.value === r.offsetMinutes)?.key || "offset60"}`)}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteReminderMutation.mutate(r.id)} className="h-7 w-7 p-0" style={{ color: v.muted }}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-1.5">
                    <Select value={String(selectedOffset)} onValueChange={(val) => setSelectedOffset(Number(val))}>
                      <SelectTrigger className="h-8 text-xs flex-1" data-testid="select-reminder-offset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OFFSET_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
                            {t(`reminders.${opt.key}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => addReminderMutation.mutate({ enabled: true, offsetMinutes: selectedOffset })}
                      disabled={!hasVerifiedEmail || addReminderMutation.isPending}
                      data-testid="button-add-calendar-reminder"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {t("calendar.add")}
                    </Button>
                  </div>

                  {upcomingEvents.length > 0 && reminders.filter((r: any) => r.tastingId).length > 0 && (
                    <div style={{ borderTop: `1px solid ${v.border}`, paddingTop: 8 }} className="space-y-2">
                      <p className="uppercase tracking-wider font-semibold" style={{ fontSize: 10, color: v.muted }}>{t("reminders.perTasting")}</p>
                      {upcomingEvents.slice(0, 3).map(ev => {
                        const evReminders = reminders.filter((r: any) => r.tastingId === ev.id);
                        if (evReminders.length === 0) return null;
                        return (
                          <div key={ev.id} className="space-y-1">
                            <p className="text-xs font-semibold truncate" style={{ color: v.text }}>{ev.title}</p>
                            {evReminders.map((r: any) => (
                              <div
                                key={r.id}
                                className="flex items-center justify-between rounded px-2 py-1"
                                style={{ background: v.elevated }}
                              >
                                <div className="flex items-center gap-1.5">
                                  <Switch checked={r.enabled} onCheckedChange={() => toggleReminderMutation.mutate(r)} disabled={!hasVerifiedEmail} className="scale-[0.6]" />
                                  <span
                                    style={{
                                      fontSize: 10,
                                      color: r.enabled ? v.textSecondary : v.muted,
                                      textDecoration: r.enabled ? "none" : "line-through",
                                    }}
                                  >
                                    {t(`reminders.${OFFSET_OPTIONS.find(o => o.value === r.offsetMinutes)?.key || "offset60"}`)}
                                  </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => deleteReminderMutation.mutate(r.id)} className="h-6 w-6 p-0" style={{ color: v.muted }}>
                                  <Trash2 className="w-2.5 h-2.5" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }}>
              {t("calendar.allTastings", "Alle Tastings")}
            </h3>
            <span style={{ fontSize: 12, color: v.muted }}>{allTastingsList.length}</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
            {(["all", "draft", "open", "closed", "archived"] as StatusFilterAll[]).map(sf => (
              <button
                key={sf}
                onClick={() => setStatusFilter(sf)}
                style={{
                  padding: "5px 12px", fontSize: 11, fontWeight: statusFilter === sf ? 600 : 400,
                  color: statusFilter === sf ? v.accent : v.muted,
                  background: statusFilter === sf ? `color-mix(in srgb, ${v.accent} 10%, transparent)` : "transparent",
                  border: `1px solid ${statusFilter === sf ? `color-mix(in srgb, ${v.accent} 40%, transparent)` : v.border}`,
                  borderRadius: 16, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid={`status-filter-${sf}`}
              >
                {sf === "all" ? t("calendar.filterAll", "Alle") : t(`calendar.status_${sf}`, sf.charAt(0).toUpperCase() + sf.slice(1))}
              </button>
            ))}
          </div>
          {allTastingsList.length === 0 ? (
            <p style={{ textAlign: "center", fontSize: 13, color: v.muted, padding: "24px 0", fontStyle: "italic" }}>
              {t("calendar.noTastingsFound", "Keine Tastings gefunden")}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {allTastingsList.map(ev => (
                <Link key={ev.id} href={getTastingRoute(ev, embedded, participantId)} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px",
                      background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, cursor: "pointer",
                    }}
                    data-testid={`all-tasting-${ev.id}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: v.text, fontFamily: "'Playfair Display', serif", marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize: 11, color: v.muted }}>
                        {ev.date} · {ev.location || "–"} · {ev.hostName}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 9, padding: "2px 8px", borderRadius: 4, marginLeft: 8, flexShrink: 0,
                        ...(STATUS_COLORS[ev.status] || STATUS_COLORS.draft),
                      }}
                    >
                      {ev.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function EventCard({ event, embedded = false, participantId }: { event: CalendarEvent; embedded?: boolean; participantId?: string }) {
  const { t } = useTranslation();
  return (
    <Link href={getTastingRoute(event, embedded, participantId)}>
      <div
        className="rounded-md p-3 transition-colors cursor-pointer"
        style={{ background: v.elevated, border: `1px solid ${v.border}` }}
        data-testid={`card-event-${event.id}`}
      >
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-serif font-semibold truncate" style={{ color: v.text }}>{event.title}</h4>
          <span
            className="shrink-0 ml-2"
            style={{
              fontSize: 9,
              padding: "2px 6px",
              borderRadius: 4,
              ...(STATUS_COLORS[event.status] || STATUS_COLORS.draft),
            }}
          >
            {event.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: v.muted }}>
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.participantCount}</span>
          <span className="flex items-center gap-1"><Wine className="w-3 h-3" /> {event.whiskyCount}</span>
        </div>
        <p className="mt-1" style={{ fontSize: 10, color: v.muted, opacity: 0.7 }}>
          {t("calendar.host")}: {event.hostName}
        </p>
      </div>
    </Link>
  );
}
