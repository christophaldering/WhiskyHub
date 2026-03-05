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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-secondary/60 text-muted-foreground",
  open: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30",
  closed: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30",
  reveal: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-secondary/40 text-muted-foreground/60",
};

const OFFSET_OPTIONS = [
  { value: 1440, key: "offset1440" },
  { value: 360, key: "offset360" },
  { value: 60, key: "offset60" },
  { value: 30, key: "offset30" },
];

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
    queryKey: ["calendar"],
    queryFn: calendarApi.getAll,
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
    <div className={embedded ? "min-w-0 overflow-x-hidden" : "max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden"} data-testid="calendar-page">
      {!embedded && <BackButton fallback="/enter" />}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {!embedded && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <CalendarIcon className="w-7 h-7 text-primary" />
              <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-calendar-title">
                {t("calendar.title")}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("calendar.subtitle")}</p>
          </>
        )}

        <div className="flex items-center gap-2 mb-6" data-testid="calendar-filter-tabs">
          {(["all", "mine", "friends"] as CalendarFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              className="text-xs font-serif h-8"
              onClick={() => { setFilter(f); setSelectedDate(null); }}
              data-testid={`button-filter-${f}`}
            >
              {t(`calendar.filter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="h-80 bg-card/50 rounded-lg animate-pulse" />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-card rounded-lg border border-border/40 p-5">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="sm" onClick={prevMonth} data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-serif font-semibold">
                    {monthName} {currentYear}
                  </h2>
                  <Button variant="outline" size="sm" className="text-xs font-serif h-7" onClick={goToday} data-testid="button-today">
                    {t("calendar.today")}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={nextMonth} data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-px mb-1">
                {dayLabels.map(d => (
                  <div key={d} className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-semibold py-1">
                    {d}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-px">
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
                      className={cn(
                        "aspect-square rounded-md flex flex-col items-center justify-center relative transition-colors text-sm",
                        isToday && "ring-1 ring-primary/50",
                        isSelected && "bg-primary/10 text-primary font-bold",
                        !isSelected && !isToday && "hover:bg-secondary/50",
                        hasEvents && !isSelected && "font-semibold"
                      )}
                      data-testid={`button-day-${day}`}
                    >
                      {day}
                      {hasEvents && (
                        <div className="absolute bottom-1 flex gap-0.5">
                          {(eventsByDate.get(dateKey) || []).slice(0, 3).map((_, j) => (
                            <span key={j} className="w-1 h-1 rounded-full bg-primary/70" />
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedDate && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 border-t border-border/30 pt-4">
                  {selectedEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center italic">{t("calendar.noEvents")}</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvents.map(ev => (
                        <EventCard key={ev.id} event={ev} />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            <div className="space-y-4">
              <div className="bg-card rounded-lg border border-border/40 p-5">
                <h3 className="text-sm font-serif font-semibold mb-3">{t("calendar.upcoming")}</h3>
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">{t("calendar.noUpcoming")}</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.map(ev => (
                      <Link key={ev.id} href={`/tasting/${ev.id}`}>
                        <div className="group cursor-pointer py-2 border-b border-border/20 last:border-b-0 hover:border-primary/20 transition-colors" data-testid={`link-upcoming-${ev.id}`}>
                          <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{ev.title}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{ev.date} · {ev.location}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={cn("text-[9px] px-1.5 py-0.5 rounded border", STATUS_COLORS[ev.status] || STATUS_COLORS.draft)}>
                              {ev.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground/60">{ev.hostName}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-lg border border-border/40 p-5">
                <h3 className="text-sm font-serif font-semibold mb-2">{t("calendar.stats")}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-2xl font-serif font-bold text-primary">{filteredEvents.length}</p>
                    <p className="text-[10px] text-muted-foreground">{t("calendar.totalTastings")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif font-bold text-primary">
                      {filteredEvents.filter(e => e.status === "open" || e.status === "draft").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("calendar.active")}</p>
                  </div>
                </div>
              </div>

              {participantId && (
                <div className="bg-card rounded-lg border border-border/40 p-5 space-y-3" data-testid="calendar-reminders-section">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-serif font-semibold">{t("reminders.title")}</h3>
                  </div>

                  {!hasVerifiedEmail && (
                    <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">{t("reminders.emailRequired")}</p>
                    </div>
                  )}

                  {reminders.filter((r: any) => !r.tastingId).map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2" data-testid={`reminder-global-${r.id}`}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={r.enabled}
                          onCheckedChange={() => toggleReminderMutation.mutate(r)}
                          disabled={!hasVerifiedEmail}
                          className="scale-75"
                        />
                        <span className={cn("text-xs", !r.enabled && "text-muted-foreground line-through")}>
                          {t(`reminders.${OFFSET_OPTIONS.find(o => o.value === r.offsetMinutes)?.key || "offset60"}`)}
                        </span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteReminderMutation.mutate(r.id)} className="text-muted-foreground hover:text-destructive h-7 w-7 p-0">
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center gap-1.5">
                    <Select value={String(selectedOffset)} onValueChange={(v) => setSelectedOffset(Number(v))}>
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
                    <div className="border-t border-border/30 pt-2 space-y-2">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{t("reminders.perTasting")}</p>
                      {upcomingEvents.slice(0, 3).map(ev => {
                        const evReminders = reminders.filter((r: any) => r.tastingId === ev.id);
                        if (evReminders.length === 0) return null;
                        return (
                          <div key={ev.id} className="space-y-1">
                            <p className="text-xs font-semibold truncate">{ev.title}</p>
                            {evReminders.map((r: any) => (
                              <div key={r.id} className="flex items-center justify-between bg-muted/20 rounded px-2 py-1">
                                <div className="flex items-center gap-1.5">
                                  <Switch checked={r.enabled} onCheckedChange={() => toggleReminderMutation.mutate(r)} disabled={!hasVerifiedEmail} className="scale-[0.6]" />
                                  <span className={cn("text-[10px]", !r.enabled && "text-muted-foreground line-through")}>
                                    {t(`reminders.${OFFSET_OPTIONS.find(o => o.value === r.offsetMinutes)?.key || "offset60"}`)}
                                  </span>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => deleteReminderMutation.mutate(r.id)} className="text-muted-foreground hover:text-destructive h-6 w-6 p-0">
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
      </motion.div>
    </div>
  );
}

function EventCard({ event }: { event: CalendarEvent }) {
  const { t } = useTranslation();
  return (
    <Link href={`/tasting/${event.id}`}>
      <div className="bg-secondary/30 rounded-md p-3 hover:bg-secondary/50 transition-colors cursor-pointer" data-testid={`card-event-${event.id}`}>
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-serif font-semibold truncate">{event.title}</h4>
          <span className={cn("text-[9px] px-1.5 py-0.5 rounded border shrink-0 ml-2", STATUS_COLORS[event.status] || STATUS_COLORS.draft)}>
            {event.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {event.location}</span>
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {event.participantCount}</span>
          <span className="flex items-center gap-1"><Wine className="w-3 h-3" /> {event.whiskyCount}</span>
        </div>
        <p className="text-[10px] text-muted-foreground/60 mt-1">
          {t("calendar.host")}: {event.hostName}
        </p>
      </div>
    </Link>
  );
}
