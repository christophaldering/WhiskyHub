import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { hostDashboardApi, inviteApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  GlassWater, Users, Wine, Star, Calendar, Trophy, LayoutDashboard, Eye,
  Plus, FileText, Printer, ClipboardList, Download, Sparkles, ChevronLeft,
  ChevronRight, Copy, Mail, QrCode, Archive, BarChart3, BookOpen, Zap,
  Check, Send, Loader2, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";
import QRCodeLib from "qrcode";

interface HostSummary {
  totalTastings: number;
  totalParticipants: number;
  totalWhiskies: number;
  averageScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  topWhiskies: { name: string; distillery: string; averageScore: number; tastingTitle: string }[];
  recentTastings: { id: string; title: string; date: string; status: string; participantCount: number; code?: string }[];
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

interface InviteTasting {
  id: string;
  title: string;
  date: string;
  status: string;
  participantCount: number;
  code?: string;
}

interface InviteResult {
  email: string;
  status: string;
}

function InvitationsPanel({ tastings, isDE }: { tastings: InviteTasting[]; isDE: boolean }) {
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const activeTastings = tastings.filter(t => t.status !== "archived");
  const selectedTasting = activeTastings.find(t => t.id === selectedTastingId);

  const joinUrl = useMemo(() => {
    if (!selectedTasting?.code) return null;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/enter?code=${selectedTasting.code}`;
  }, [selectedTasting]);

  useEffect(() => {
    if (!joinUrl) { setQrDataUrl(null); return; }
    QRCodeLib.toDataURL(joinUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#f5f0e8" },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
  }, [joinUrl]);

  const handleCopyLink = useCallback(() => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }, [joinUrl]);

  const handleDownloadQr = useCallback(() => {
    if (!qrDataUrl || !selectedTasting) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `casksense-qr-${selectedTasting.title.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  }, [qrDataUrl, selectedTasting]);

  const handleSendEmails = useCallback(async () => {
    if (!selectedTastingId || !emails.trim()) return;
    const emailList = emails.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
    if (emailList.length === 0) return;
    setSending(true);
    setResults(null);
    try {
      const data = await inviteApi.sendInvites(selectedTastingId, emailList, personalNote || undefined);
      setResults(data.results || emailList.map(e => ({ email: e, status: "sent" })));
      setEmails("");
      setPersonalNote("");
    } catch {
      setResults(emailList.map(e => ({ email: e, status: "error" })));
    } finally {
      setSending(false);
    }
  }, [selectedTastingId, emails, personalNote]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        {isDE ? "Wähle ein Tasting und lade Teilnehmer per QR-Code oder Email ein." : "Select a tasting and invite participants via QR code or email."}
      </p>

      {/* Tasting selector */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-full flex items-center justify-between gap-2 p-3 rounded-lg border border-border/40 bg-background text-sm hover:border-primary/40 transition-colors"
          data-testid="invite-tasting-selector"
        >
          <span className={selectedTasting ? "text-foreground" : "text-muted-foreground"}>
            {selectedTasting ? selectedTasting.title : (isDE ? "Tasting auswählen..." : "Select a tasting...")}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
        </button>
        {dropdownOpen && (
          <div className="absolute z-20 top-full left-0 right-0 mt-1 rounded-lg border border-border/40 bg-card shadow-xl max-h-48 overflow-y-auto">
            {activeTastings.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">{isDE ? "Keine aktiven Tastings" : "No active tastings"}</p>
            )}
            {activeTastings.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTastingId(t.id); setDropdownOpen(false); setResults(null); }}
                className={`w-full text-left p-3 text-sm hover:bg-primary/5 transition-colors flex items-center justify-between ${t.id === selectedTastingId ? "bg-primary/10" : ""}`}
                data-testid={`invite-tasting-option-${t.id}`}
              >
                <span className="truncate">{t.title}</span>
                <Badge variant="outline" className={`text-[10px] ml-2 shrink-0 ${statusColors[t.status] || ""}`}>{t.status}</Badge>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTasting && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* QR Code section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <QrCode className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{isDE ? "QR-Code" : "QR Code"}</span>
            </div>
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="bg-[#f5f0e8] rounded-lg p-2 inline-block">
                  <img src={qrDataUrl} alt="QR Code" className="w-40 h-40" data-testid="invite-qr-image" />
                </div>
                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleDownloadQr}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    data-testid="invite-download-qr"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isDE ? "Speichern" : "Save"}
                  </button>
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                    data-testid="invite-copy-link"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                    {copiedLink ? (isDE ? "Kopiert!" : "Copied!") : (isDE ? "Link kopieren" : "Copy Link")}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                {isDE ? "Kein Session-Code verfügbar" : "No session code available"}
              </p>
            )}
          </div>

          {/* Email section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">{isDE ? "Email-Einladung" : "Email Invite"}</span>
            </div>
            <div>
              <input
                type="text"
                value={emails}
                onChange={e => setEmails(e.target.value)}
                placeholder={isDE ? "Emails (kommagetrennt)" : "Emails (comma separated)"}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50"
                data-testid="invite-email-input"
              />
            </div>
            <div>
              <textarea
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
                placeholder={isDE ? "Persönliche Nachricht (optional)" : "Personal note (optional)"}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-border/40 bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
                data-testid="invite-personal-note"
              />
            </div>
            <button
              onClick={handleSendEmails}
              disabled={sending || !emails.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="invite-send-button"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {sending ? (isDE ? "Wird gesendet..." : "Sending...") : (isDE ? "Einladungen senden" : "Send Invitations")}
            </button>

            {results && (
              <div className="space-y-1 mt-2" data-testid="invite-results">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.status === "sent" || r.status === "success" ? (
                      <Check className="w-3.5 h-3.5 text-green-400 shrink-0" />
                    ) : (
                      <Mail className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <span className="truncate text-muted-foreground">{r.email}</span>
                    <Badge variant="outline" className={`text-[10px] ml-auto shrink-0 ${r.status === "sent" || r.status === "success" ? "text-green-400 border-green-600/30" : "text-red-400 border-red-600/30"}`}>
                      {r.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
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

  if (isLoading && currentParticipant) {
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

  const emptySummary: HostSummary = {
    totalTastings: 0,
    totalParticipants: 0,
    totalWhiskies: 0,
    averageScores: { nose: 0, taste: 0, finish: 0, balance: 0, overall: 0 },
    topWhiskies: [],
    recentTastings: [],
  };
  const effectiveSummary = summary ?? emptySummary;
  const hasData = effectiveSummary.totalTastings > 0;

  const chartData = [
    { dimension: isDE ? "Nase" : "Nose", value: effectiveSummary.averageScores.nose },
    { dimension: isDE ? "Geschmack" : "Taste", value: effectiveSummary.averageScores.taste },
    { dimension: isDE ? "Abgang" : "Finish", value: effectiveSummary.averageScores.finish },
    { dimension: "Balance", value: effectiveSummary.averageScores.balance },
    { dimension: isDE ? "Gesamt" : "Overall", value: effectiveSummary.averageScores.overall },
  ];

  const statCards = [
    { key: "totalTastings", value: effectiveSummary.totalTastings, icon: Calendar, color: "text-amber-400" },
    { key: "totalParticipants", value: effectiveSummary.totalParticipants, icon: Users, color: "text-blue-400" },
    { key: "totalWhiskies", value: effectiveSummary.totalWhiskies, icon: Wine, color: "text-rose-400" },
  ];

  const draftTastings = effectiveSummary.recentTastings.filter((t) => t.status === "draft");
  const upcomingTasting = effectiveSummary.recentTastings.find(
    (t) => (t.status === "draft" || t.status === "open") && new Date(t.date) >= new Date(new Date().toDateString())
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="host-dashboard-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm -mx-4 px-4 pt-1 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <LayoutDashboard className="w-7 h-7 text-primary" />
            <h1 className="text-xl sm:text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-host-dashboard-title">
              {t("hostDashboard.title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground" data-testid="text-host-dashboard-subtitle">
            {t("hostDashboard.subtitle")}
          </p>
        </div>
        <div className="h-4" />

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

            {/* Row 2: Calendar + Next Tasting */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="lg:col-span-2">
                <SectionCard testId="section-dashboard-calendar">
                  <SectionTitle icon={Calendar} title={isDE ? "Kalender" : "Calendar"} />
                  <DashboardCalendar />
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

            {/* Row 3: Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="lg:col-span-2">
                <SectionCard testId="section-quick-actions">
                  <SectionTitle icon={Zap} title={isDE ? "Schnellzugriff" : "Quick Actions"} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Link href="/host">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer text-center" data-testid="action-new-tasting">
                        <Plus className="w-6 h-6 text-primary" />
                        <span className="text-xs font-semibold">{isDE ? "Neues Tasting" : "New Tasting"}</span>
                      </div>
                    </Link>
                    <Link href="/sessions">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card hover:bg-primary/5 transition-colors cursor-pointer border border-border/30 text-center" data-testid="action-manage-sessions">
                        <FileText className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs font-semibold">{isDE ? "Sessions" : "Sessions"}</span>
                      </div>
                    </Link>
                    <Link href="/data-export">
                      <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-card hover:bg-primary/5 transition-colors cursor-pointer border border-border/30 text-center" data-testid="action-export">
                        <Download className="w-6 h-6 text-muted-foreground" />
                        <span className="text-xs font-semibold">{isDE ? "Datenexport" : "Data Export"}</span>
                      </div>
                    </Link>
                    <Link href="/vocabulary">
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

            </div>

            {/* Row 4: Average Scores + Documents */}
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
              {effectiveSummary.topWhiskies.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
                  <SectionCard className="h-full" testId="host-dashboard-top-whiskies">
                    <SectionTitle icon={Trophy} title={t("hostDashboard.topWhiskies")} />
                    <div className="space-y-3">
                      {effectiveSummary.topWhiskies.map((whisky, i) => (
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
                    <ToolLink href="/data-export" icon={Download} label={isDE ? "Datenexport" : "Data Export"} desc={isDE ? "CSV, Excel, kompletter Export" : "CSV, Excel, full export"} />
                    <ToolLink href="/sessions" icon={Copy} label={isDE ? "Sessions verwalten" : "Manage Sessions"} desc={isDE ? "Duplizieren, archivieren, bearbeiten" : "Duplicate, archive, edit"} />
                    <ToolLink href="/vocabulary" icon={BookOpen} label={isDE ? "Tasting-Vokabular" : "Tasting Vocabulary"} desc={isDE ? "Beschreibungshilfen für jede Stilrichtung" : "Descriptors for every whisky style"} />
                    <ToolLink href="/ai-curation" icon={Sparkles} label={isDE ? "KI-Kuratierung" : "AI Curation"} desc={isDE ? "KI-gestützte Whisky-Vorschläge" : "AI-powered whisky suggestions"} />
                  </div>
                </SectionCard>
              </motion.div>
            </div>

            {/* Row 5: Recent Tastings (full-width) */}
            {effectiveSummary.recentTastings.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
                <SectionCard testId="host-dashboard-recent-tastings">
                  <SectionTitle icon={Calendar} title={t("hostDashboard.recentTastings")} />
                  <div className="space-y-2">
                    {effectiveSummary.recentTastings.map((tasting) => (
                      <div key={tasting.id} className="flex items-center gap-4 py-3 px-3 rounded-lg hover:bg-primary/5 transition-colors border-b border-border/10 last:border-0" data-testid={`recent-tasting-${tasting.id}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" data-testid={`recent-tasting-title-${tasting.id}`}>{tasting.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-muted-foreground">
                              {new Date(tasting.date).toLocaleDateString(isDE ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                            {tasting.code && (
                              <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded" data-testid={`recent-tasting-code-${tasting.id}`}>
                                {tasting.code}
                              </span>
                            )}
                          </div>
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

            {/* Row 6: Invitations */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5 }}>
              <SectionCard testId="section-invitations">
                <SectionTitle icon={Mail} title={isDE ? "Einladungen" : "Invitations"} />
                <InvitationsPanel tastings={effectiveSummary.recentTastings} isDE={isDE} />
              </SectionCard>
            </motion.div>

          </div>
        )}
      </motion.div>
    </div>
  );
}
