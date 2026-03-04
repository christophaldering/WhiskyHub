import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { hostDashboardApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  GlassWater, Users, Wine, Star, Calendar, Trophy, LayoutDashboard, Eye,
  Plus, FileText, Printer, ClipboardList, Download, Sparkles, ChevronLeft,
  ChevronRight, Copy, Mail, QrCode, Archive, BarChart3, BookOpen, Zap,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";

interface HostSummary {
  totalTastings: number;
  totalParticipants: number;
  totalWhiskies: number;
  averageScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  topWhiskies: { name: string; distillery: string; averageScore: number; tastingTitle: string }[];
  recentTastings: { id: string; title: string; date: string; status: string; participantCount: number }[];
}

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  status: string;
  code: string;
  hostName: string;
  participantCount: number;
  whiskyCount: number;
}

function parseCalendarDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const iso = new Date(dateStr);
  if (!isNaN(iso.getTime()) && dateStr.includes("-")) return iso;
  const euMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euMatch) return new Date(+euMatch[3], +euMatch[2] - 1, +euMatch[1]);
  return null;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
};

const statusColors: Record<string, string> = {
  draft: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  open: "bg-green-600/20 text-green-400 border-green-600/30",
  closed: "bg-red-600/20 text-red-400 border-red-600/30",
  reveal: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  archived: "bg-muted text-muted-foreground border-border",
};

const calStatusColor = (status: string) => {
  if (status === "open" || status === "reveal") return "#4ade80";
  if (status === "draft") return "#888";
  return "#c8a864";
};

function SectionCard({ children, className = "", testId }: { children: React.ReactNode; className?: string; testId?: string }) {
  return (
    <div className={`bg-card rounded-lg border border-border/40 p-5 ${className}`} data-testid={testId}>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="text-base font-serif font-semibold">{title}</h2>
    </div>
  );
}

function ToolLink({ href, icon: Icon, label, desc }: { href: string; icon: React.ElementType; label: string; desc: string }) {
  return (
    <Link href={href}>
      <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors cursor-pointer group" data-testid={`tool-link-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{label}</p>
          <p className="text-[11px] text-muted-foreground truncate">{desc}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
      </div>
    </Link>
  );
}

function DashboardCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const { data: events = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
    queryFn: async () => {
      const res = await fetch("/api/calendar");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const d = parseCalendarDate(ev.date);
      if (!d) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = (firstDay + 6) % 7;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedEvents = selectedDay ? (eventsByDate.get(selectedDay) || []) : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))} className="p-1 text-foreground hover:text-primary transition-colors" data-testid="button-cal-prev">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-bold">{monthNames[month]} {year}</span>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))} className="p-1 text-foreground hover:text-primary transition-colors" data-testid="button-cal-next">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {dayNames.map((d) => (
          <div key={d} className="text-[11px] font-semibold text-muted-foreground py-1 uppercase">{d}</div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = dateKey === todayKey;
          const isSelected = dateKey === selectedDay;

          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : dateKey)}
              className={`rounded-lg flex flex-col items-center gap-0.5 py-1.5 text-sm transition-colors ${
                isSelected ? "bg-primary text-primary-foreground font-bold" :
                isToday ? "bg-primary/15 font-bold" : "hover:bg-primary/5"
              }`}
              data-testid={`cal-day-${dateKey}`}
            >
              {day}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5">
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <div key={idx} className="w-[5px] h-[5px] rounded-full" style={{ background: isSelected ? "currentColor" : calStatusColor(ev.status) }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <div className="flex flex-col gap-2 mt-1">
          {selectedEvents.map((ev) => (
            <Link key={ev.id} href={ev.status === "closed" || ev.status === "archived" ? `/tasting-results/${ev.id}` : `/host`}>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/30 hover:bg-primary/5 transition-colors cursor-pointer" style={{ borderLeft: `3px solid ${calStatusColor(ev.status)}` }} data-testid={`cal-event-${ev.id}`}>
                <div>
                  <p className="text-sm font-semibold">{ev.title}</p>
                  <p className="text-[11px] text-muted-foreground">{ev.whiskyCount} whiskies · {ev.participantCount} participants</p>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[ev.status] ?? ""}`}>{ev.status}</Badge>
              </div>
            </Link>
          ))}
        </div>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No tastings on this day.</p>
      )}
    </div>
  );
}

export default function HostDashboard() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const lang = isDE ? "de" : "en";

  const { data: summary, isLoading } = useQuery<HostSummary>({
    queryKey: ["host-dashboard", currentParticipant?.id],
    queryFn: () => hostDashboardApi.getSummary(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]" data-testid="host-dashboard-login-required">
        <p className="text-muted-foreground font-serif">{t("hostDashboard.loginRequired")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8" data-testid="host-dashboard-loading">
        <div className="h-8 w-56 bg-card/50 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-card/50 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-64 bg-card/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const hasData = summary && summary.totalTastings > 0;

  const chartData = summary?.averageScores
    ? [
        { dimension: isDE ? "Nase" : "Nose", value: summary.averageScores.nose },
        { dimension: isDE ? "Geschmack" : "Taste", value: summary.averageScores.taste },
        { dimension: isDE ? "Abgang" : "Finish", value: summary.averageScores.finish },
        { dimension: "Balance", value: summary.averageScores.balance },
        { dimension: isDE ? "Gesamt" : "Overall", value: summary.averageScores.overall },
      ]
    : [];

  const statCards = [
    { key: "totalTastings", value: summary?.totalTastings ?? 0, icon: Calendar, color: "text-amber-400" },
    { key: "totalParticipants", value: summary?.totalParticipants ?? 0, icon: Users, color: "text-blue-400" },
    { key: "totalWhiskies", value: summary?.totalWhiskies ?? 0, icon: Wine, color: "text-rose-400" },
  ];

  const draftTastings = summary?.recentTastings?.filter((t) => t.status === "draft") ?? [];
  const upcomingTasting = summary?.recentTastings?.find(
    (t) => (t.status === "draft" || t.status === "open") && new Date(t.date) >= new Date(new Date().toDateString())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="host-dashboard-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <LayoutDashboard className="w-7 h-7 text-primary" />
          <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-host-dashboard-title">
            {t("hostDashboard.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-8" data-testid="text-host-dashboard-subtitle">
          {t("hostDashboard.subtitle")}
        </p>

        {!hasData ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 text-muted-foreground" data-testid="host-dashboard-empty">
            <GlassWater className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-serif text-lg mb-2">{t("hostDashboard.emptyTitle")}</p>
            <p className="text-sm mb-6">{t("hostDashboard.emptyMessage")}</p>
            <Link href="/host">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-semibold text-sm cursor-pointer hover:bg-primary/90 transition-colors" data-testid="button-create-first">
                <Plus className="w-4 h-4" /> {isDE ? "Erstes Tasting erstellen" : "Create your first tasting"}
              </span>
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-6">

            {/* Row 1: Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {statCards.map((card, i) => (
                <motion.div key={card.key} custom={i} variants={cardVariants} initial="hidden" animate="visible"
                  className="bg-card rounded-lg border border-border/40 p-5 flex items-center gap-4" data-testid={`stat-card-${card.key}`}>
                  <card.icon className={`w-10 h-10 ${card.color} shrink-0`} />
                  <div>
                    <p className="text-2xl font-serif font-bold text-foreground" data-testid={`stat-value-${card.key}`}>{card.value}</p>
                    <p className="text-xs text-muted-foreground">{t(`hostDashboard.${card.key}`)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Row 2: Quick Actions + Next Tasting */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-2">
                <SectionCard testId="section-quick-actions">
                  <SectionTitle icon={Zap} title={isDE ? "Schnellzugriff" : "Quick Actions"} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link href="/host">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer text-center" data-testid="action-new-tasting">
                        <Plus className="w-6 h-6 text-primary" />
                        <span className="text-xs font-semibold">{isDE ? "Neues Tasting" : "New Tasting"}</span>
                      </div>
                    </Link>
                    <Link href="/legacy/tasting/sessions">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card hover:bg-primary/5 transition-colors cursor-pointer border border-border/30 text-center" data-testid="action-manage-sessions">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs font-semibold">{isDE ? "Sessions" : "Sessions"}</span>
                      </div>
                    </Link>
                    <Link href="/legacy/data-export">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card hover:bg-primary/5 transition-colors cursor-pointer border border-border/30 text-center" data-testid="action-export">
                        <Download className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs font-semibold">{isDE ? "Datenexport" : "Data Export"}</span>
                      </div>
                    </Link>
                    <Link href="/legacy/tasting?tab=templates">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card hover:bg-primary/5 transition-colors cursor-pointer border border-border/30 text-center" data-testid="action-templates">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs font-semibold">{isDE ? "Vokabular" : "Vocabulary"}</span>
                      </div>
                    </Link>
                  </div>
                  {draftTastings.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border/20">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {isDE ? "Entwürfe fortsetzen" : "Resume Drafts"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {draftTastings.slice(0, 4).map((dt) => (
                          <Link key={dt.id} href="/host">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-600/10 text-yellow-400 text-xs font-medium cursor-pointer hover:bg-yellow-600/20 transition-colors" data-testid={`draft-resume-${dt.id}`}>
                              <FileText className="w-3 h-3" /> {dt.title}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </SectionCard>
              </motion.div>

              <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible">
                <SectionCard className="h-full" testId="section-next-tasting">
                  <SectionTitle icon={Calendar} title={isDE ? "Nächstes Tasting" : "Next Tasting"} />
                  {upcomingTasting ? (
                    <div className="flex flex-col items-center text-center gap-3 py-4">
                      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                        <Wine className="w-7 h-7 text-primary" />
                      </div>
                      <div>
                        <p className="font-serif font-bold text-lg" data-testid="next-tasting-title">{upcomingTasting.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(upcomingTasting.date).toLocaleDateString(isDE ? "de-DE" : "en-US", { weekday: "long", day: "numeric", month: "long" })}
                        </p>
                        <div className="flex items-center justify-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" /> {upcomingTasting.participantCount} {isDE ? "Teilnehmer" : "participants"}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[upcomingTasting.status] ?? ""}`}>
                        {t(`session.status.${upcomingTasting.status}`)}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center gap-3 py-6 text-muted-foreground">
                      <Calendar className="w-10 h-10 opacity-20" />
                      <p className="text-sm">{isDE ? "Kein anstehendes Tasting" : "No upcoming tasting"}</p>
                      <Link href="/host">
                        <span className="text-xs text-primary cursor-pointer hover:underline" data-testid="link-plan-next">
                          {isDE ? "Jetzt planen" : "Plan one now"} →
                        </span>
                      </Link>
                    </div>
                  )}
                </SectionCard>
              </motion.div>
            </div>

            {/* Row 3: Average Scores + Documents */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {chartData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="lg:col-span-2">
                  <SectionCard testId="host-dashboard-scores-chart">
                    <h2 className="text-base font-serif font-semibold mb-1">{t("hostDashboard.averageScores")}</h2>
                    <p className="text-xs text-muted-foreground mb-4">{t("hostDashboard.averageScoresSubtitle")}</p>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                          <XAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "serif" }} axisLine={{ stroke: "hsl(var(--border))" }} />
                          <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={{ stroke: "hsl(var(--border))" }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontFamily: "serif" }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value: number) => [value.toFixed(1), isDE ? "Durchschnitt" : "Average"]}
                          />
                          <Bar dataKey="value" fill="#c8a864" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </SectionCard>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
                <SectionCard className="h-full" testId="section-documents">
                  <SectionTitle icon={Printer} title={isDE ? "Dokumente" : "Documents"} />
                  <p className="text-xs text-muted-foreground mb-4">
                    {isDE ? "Blanko-Vorlagen als PDF herunterladen" : "Download blank printable templates (PDF)"}
                  </p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => generateBlankTastingSheet(lang)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left cursor-pointer border border-primary/10"
                      data-testid="button-dl-scoresheet"
                    >
                      <ClipboardList className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{isDE ? "Verkostungsbogen" : "Score Sheet"}</p>
                        <p className="text-[11px] text-muted-foreground">{isDE ? "A4 Hochformat · 6 Whiskies" : "A4 Portrait · 6 whiskies"}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => generateBlankTastingMat(lang)}
                      className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left cursor-pointer border border-primary/10"
                      data-testid="button-dl-tasting-mat"
                    >
                      <Printer className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-semibold">{isDE ? "Tasting-Matte" : "Tasting Mat"}</p>
                        <p className="text-[11px] text-muted-foreground">{isDE ? "A4 Querformat · Glaskreise" : "A4 Landscape · Glass circles"}</p>
                      </div>
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 italic">
                    {isDE ? "Session-spezifische Menüs im Live-Tasting-Raum" : "Session-specific menus in the live tasting room"}
                  </p>
                </SectionCard>
              </motion.div>
            </div>

            {/* Row 4: Top Whiskies + Tools */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {summary?.topWhiskies && summary.topWhiskies.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                  <SectionCard className="h-full" testId="host-dashboard-top-whiskies">
                    <SectionTitle icon={Trophy} title={t("hostDashboard.topWhiskies")} />
                    <div className="space-y-3">
                      {summary.topWhiskies.map((whisky, i) => (
                        <div key={`${whisky.name}-${i}`} className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0" data-testid={`top-whisky-${i}`}>
                          <span className="text-lg font-serif font-bold text-primary/60 w-8">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate" data-testid={`top-whisky-name-${i}`}>{whisky.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{[whisky.distillery, whisky.tastingTitle].filter(Boolean).join(" · ")}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-lg font-serif font-bold text-primary" data-testid={`top-whisky-score-${i}`}>{whisky.averageScore.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </SectionCard>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}>
                <SectionCard className="h-full" testId="section-tools">
                  <SectionTitle icon={BarChart3} title={isDE ? "Tools & Analyse" : "Tools & Analytics"} />
                  <div className="flex flex-col gap-1">
                    <ToolLink href="/legacy/data-export" icon={Download} label={isDE ? "Datenexport" : "Data Export"} desc={isDE ? "CSV, Excel, kompletter Export" : "CSV, Excel, full export"} />
                    <ToolLink href="/legacy/tasting/sessions" icon={Copy} label={isDE ? "Sessions verwalten" : "Manage Sessions"} desc={isDE ? "Duplizieren, archivieren, bearbeiten" : "Duplicate, archive, edit"} />
                    <ToolLink href="/legacy/tasting?tab=templates" icon={BookOpen} label={isDE ? "Tasting-Vokabular" : "Tasting Vocabulary"} desc={isDE ? "Beschreibungshilfen für jede Stilrichtung" : "Descriptors for every whisky style"} />
                    <ToolLink href="/legacy/tasting?tab=ai" icon={Sparkles} label={isDE ? "KI-Kuratierung" : "AI Curation"} desc={isDE ? "KI-gestützte Whisky-Vorschläge" : "AI-powered whisky suggestions"} />
                  </div>
                </SectionCard>
              </motion.div>
            </div>

            {/* Row 5: Recent Tastings (full-width) */}
            {summary?.recentTastings && summary.recentTastings.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
                <SectionCard testId="host-dashboard-recent-tastings">
                  <SectionTitle icon={Calendar} title={t("hostDashboard.recentTastings")} />
                  <div className="space-y-2">
                    {summary.recentTastings.map((tasting) => (
                      <div key={tasting.id} className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-primary/5 transition-colors border-b border-border/10 last:border-0" data-testid={`recent-tasting-${tasting.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" data-testid={`recent-tasting-title-${tasting.id}`}>{tasting.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(tasting.date).toLocaleDateString(isDE ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                          </p>
                        </div>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${statusColors[tasting.status] ?? ""}`} data-testid={`recent-tasting-status-${tasting.id}`}>
                          {t(`session.status.${tasting.status}`)}
                        </Badge>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                          <Users className="w-3.5 h-3.5" />
                          <span data-testid={`recent-tasting-participants-${tasting.id}`}>{tasting.participantCount}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal") && (
                            <Link href={`/tasting-results/${tasting.id}`}>
                              <span className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors cursor-pointer" data-testid={`results-link-${tasting.id}`}>
                                <Trophy className="w-3 h-3" /> {isDE ? "Ergebnisse" : "Results"}
                              </span>
                            </Link>
                          )}
                          {(tasting.status === "open" || tasting.status === "closed") && (
                            <Link href={`/join/${tasting.id}?preview=true`}>
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 hover:text-amber-500 transition-colors cursor-pointer" data-testid={`preview-guest-${tasting.id}`}>
                                <Eye className="w-3 h-3" /> {t("hostDashboard.previewGuest")}
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </motion.div>
            )}

            {/* Row 6: Calendar + Invitations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }}>
                <SectionCard className="h-full" testId="section-dashboard-calendar">
                  <SectionTitle icon={Calendar} title={isDE ? "Kalender" : "Calendar"} />
                  <DashboardCalendar />
                </SectionCard>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}>
                <SectionCard className="h-full" testId="section-invitations">
                  <SectionTitle icon={Mail} title={isDE ? "Einladungen" : "Invitations"} />
                  <p className="text-xs text-muted-foreground mb-4">
                    {isDE ? "Teilnehmer zu deinen Tastings einladen" : "Invite participants to your tastings"}
                  </p>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <QrCode className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{isDE ? "QR-Code" : "QR Code"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isDE ? "Erstelle einen QR-Code zum Scannen und Beitreten" : "Generate a QR code for scan-to-join"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{isDE ? "Email-Einladung" : "Email Invite"}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {isDE ? "Sende Einladungen direkt per Email" : "Send invitations directly via email"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-3 italic">
                    {isDE ? "QR-Codes und Email-Einladungen sind beim Erstellen eines Tastings verfügbar" : "QR codes and email invites are available when creating a tasting"}
                  </p>
                </SectionCard>
              </motion.div>
            </div>

          </div>
        )}
      </motion.div>
    </div>
  );
}
