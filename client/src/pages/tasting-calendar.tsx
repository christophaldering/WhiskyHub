import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { calendarApi } from "@/lib/api";
import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, MapPin, Users, Wine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  hostName: string;
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

export default function TastingCalendar() {
  const { t, i18n } = useTranslation();
  const isDE = i18n.language === "de";
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar"],
    queryFn: calendarApi.getAll,
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(ev => {
      const d = parseDate(ev.date);
      if (d) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(ev);
      }
    });
    return map;
  }, [events]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const monthNames = isDE
    ? ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"]
    : ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayLabels = isDE ? ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"] : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
    return events
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
  }, [events]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="calendar-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <CalendarIcon className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-calendar-title">
            {t("calendar.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8">{t("calendar.subtitle")}</p>

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
                    {monthNames[currentMonth]} {currentYear}
                  </h2>
                  <Button variant="outline" size="sm" className="text-xs font-serif h-7" onClick={goToday} data-testid="button-today">
                    {isDE ? "Heute" : "Today"}
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
                        <EventCard key={ev.id} event={ev} isDE={isDE} />
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
                    <p className="text-2xl font-serif font-bold text-primary">{events.length}</p>
                    <p className="text-[10px] text-muted-foreground">{t("calendar.totalTastings")}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-serif font-bold text-primary">
                      {events.filter(e => e.status === "open" || e.status === "draft").length}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{t("calendar.active")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function EventCard({ event, isDE }: { event: CalendarEvent; isDE: boolean }) {
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
          {isDE ? "Gastgeber" : "Host"}: {event.hostName}
        </p>
      </div>
    </Link>
  );
}
