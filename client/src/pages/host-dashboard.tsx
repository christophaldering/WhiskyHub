import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { hostDashboardApi, inviteApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  GlassWater, Users, Wine, Star, Calendar, Trophy, Eye,
  Plus, FileText, Printer, ClipboardList, Download, Sparkles,
  ChevronLeft, ChevronRight, Copy, Mail, QrCode, BarChart3, Zap,
  Check, Send, Loader2, Link as LinkIcon, ChevronDown,
} from "lucide-react";
import { Link } from "wouter";
import { generateBlankTastingSheet, generateBlankTastingMat } from "@/components/printable-tasting-sheets";
import QRCodeLib from "qrcode";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle, inputStyle, pageTitleStyle } from "@/lib/theme";
import { downloadDataUrl } from "@/lib/download";

interface HostSummary {
  totalTastings: number;
  totalParticipants: number;
  totalWhiskies: number;
  averageScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  topWhiskies: { name: string; distillery: string; imageUrl: string | null; averageScore: number; tastingTitle: string }[];
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

const sectionCard: React.CSSProperties = {
  ...cardStyle,
  marginBottom: 0,
};

const statusColor = (status: string) => {
  if (status === "open" || status === "reveal") return c.success;
  if (status === "draft") return "#b8a040";
  if (status === "closed") return c.error;
  if (status === "archived") return c.muted;
  return c.muted;
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  const col = statusColor(status);
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: col,
        background: `${col}20`,
        padding: "3px 8px",
        borderRadius: 6,
        border: `1px solid ${col}30`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
      <Icon style={{ width: 18, height: 18, color: c.accent }} />
      <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: 0, fontFamily: "'Playfair Display', serif" }}>{title}</h2>
    </div>
  );
}

function ToolLink({ href, icon: Icon, label, desc }: { href: string; icon: React.ElementType; label: string; desc: string }) {
  return (
    <Link href={href}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 12px",
          borderRadius: 10,
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = `${c.accent}08`)}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        data-testid={`tool-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: `${c.accent}15`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Icon style={{ width: 16, height: 16, color: c.accent }} />
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: c.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</p>
          <p style={{ fontSize: 11, color: c.muted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{desc}</p>
        </div>
        <ChevronRight style={{ width: 14, height: 14, color: c.muted, flexShrink: 0 }} />
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "de" ? "de-DE" : "en-US";

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

  const monthName = new Intl.DateTimeFormat(locale, { month: "long" }).format(currentMonth);
  const dayNames = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(2024, 0, i + 1);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d).slice(0, 2);
  });
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const selectedEvents = selectedDay ? (eventsByDate.get(selectedDay) || []) : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: c.text, padding: 4 }} data-testid="button-cal-prev">
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>
        <span style={{ fontSize: 15, fontWeight: 700, color: c.text }}>{monthName} {year}</span>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: c.text, padding: 4 }} data-testid="button-cal-next">
          <ChevronRight style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, textAlign: "center" }}>
        {dayNames.map((d) => (
          <div key={d} style={{ fontSize: 11, fontWeight: 600, color: c.muted, padding: "4px 0", textTransform: "uppercase" }}>{d}</div>
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
              style={{
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "6px 0",
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? c.bg : c.text,
                background: isSelected ? c.accent : isToday ? `${c.accent}20` : "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: "system-ui, sans-serif",
                transition: "background 0.15s",
              }}
              data-testid={`cal-day-${dateKey}`}
            >
              {day}
              {dayEvents.length > 0 && (
                <div style={{ display: "flex", gap: 2 }}>
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <div key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: isSelected ? c.bg : statusColor(ev.status) }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
          {selectedEvents.map((ev) => (
            <Link key={ev.id} href={ev.status === "closed" || ev.status === "archived" ? `/tasting-results/${ev.id}` : `/host`}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${c.border}`,
                  borderLeft: `3px solid ${statusColor(ev.status)}`,
                  cursor: "pointer",
                  background: c.bg,
                }}
                data-testid={`cal-event-${ev.id}`}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: c.text, margin: 0 }}>{ev.title}</p>
                  <p style={{ fontSize: 11, color: c.muted, margin: "2px 0 0" }}>{ev.whiskyCount} whiskies · {ev.participantCount} {t("hostDashboard.calParticipants")}</p>
                </div>
                <StatusBadge status={ev.status} label={t(`session.status.${ev.status}`)} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <p style={{ fontSize: 12, color: c.muted, textAlign: "center", padding: "8px 0" }}>
          {t("hostDashboard.noTastingsDay")}
        </p>
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

function InvitationsPanel({ tastings }: { tastings: InviteTasting[] }) {
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t } = useTranslation();

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
      color: { dark: "#1a1714", light: "#f5f0e8" },
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
    downloadDataUrl(qrDataUrl, `casksense-qr-${selectedTasting.title.replace(/\s+/g, "-").toLowerCase()}.png`);
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

  const btnSmall: React.CSSProperties = {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: 8,
    background: `${c.accent}15`,
    color: c.accent,
    fontSize: 12,
    fontWeight: 600,
    border: "none",
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 12, color: c.muted }}>
        {t("hostDashboard.inviteDesc")}
      </p>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            ...inputStyle,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: "pointer",
            color: selectedTasting ? c.text : c.muted,
          }}
          data-testid="invite-tasting-selector"
        >
          <span>{selectedTasting ? selectedTasting.title : t("hostDashboard.selectTasting")}</span>
          <ChevronDown style={{ width: 14, height: 14, color: c.muted, transition: "transform 0.15s", transform: dropdownOpen ? "rotate(180deg)" : "none" }} />
        </button>
        {dropdownOpen && (
          <div style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 10,
            border: `1px solid ${c.border}`,
            background: c.card,
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            maxHeight: 200,
            overflowY: "auto",
          }}>
            {activeTastings.length === 0 && (
              <p style={{ padding: 12, fontSize: 12, color: c.muted }}>{t("hostDashboard.noActiveTastings")}</p>
            )}
            {activeTastings.map(t => (
              <button
                key={t.id}
                onClick={() => { setSelectedTastingId(t.id); setDropdownOpen(false); setResults(null); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  fontSize: 13,
                  background: t.id === selectedTastingId ? `${c.accent}15` : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: c.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid={`invite-tasting-option-${t.id}`}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
                <StatusBadge status={t.status} label={t.status} />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTasting && (
        <div className="hd-invite-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <QrCode style={{ width: 14, height: 14, color: c.accent }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{t("hostDashboard.qrCode")}</span>
            </div>
            {qrDataUrl ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#f5f0e8", borderRadius: 10, padding: 8, display: "inline-block" }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 160, height: 160 }} data-testid="invite-qr-image" />
                </div>
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  <button onClick={handleDownloadQr} style={btnSmall} data-testid="invite-download-qr">
                    <Download style={{ width: 13, height: 13 }} /> {t("hostDashboard.save")}
                  </button>
                  <button onClick={handleCopyLink} style={btnSmall} data-testid="invite-copy-link">
                    {copiedLink ? <Check style={{ width: 13, height: 13 }} /> : <LinkIcon style={{ width: 13, height: 13 }} />}
                    {copiedLink ? t("hostDashboard.copied") : t("hostDashboard.link")}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: c.muted, fontStyle: "italic" }}>
                {t("hostDashboard.noCode")}
              </p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Mail style={{ width: 14, height: 14, color: c.accent }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{t("hostDashboard.emailInvite")}</span>
            </div>
            <input
              type="text"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder={t("hostDashboard.emailsPlaceholder")}
              style={{ ...inputStyle, fontSize: 13, padding: "10px 12px" }}
              data-testid="invite-email-input"
            />
            <textarea
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder={t("hostDashboard.personalNote")}
              rows={2}
              style={{ ...inputStyle, fontSize: 13, padding: "10px 12px", resize: "none" } as React.CSSProperties}
              data-testid="invite-personal-note"
            />
            <button
              onClick={handleSendEmails}
              disabled={sending || !emails.trim()}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                background: c.accent,
                color: c.bg,
                fontSize: 13,
                fontWeight: 600,
                border: "none",
                cursor: sending || !emails.trim() ? "not-allowed" : "pointer",
                opacity: sending || !emails.trim() ? 0.5 : 1,
                fontFamily: "system-ui, sans-serif",
              }}
              data-testid="invite-send-button"
            >
              {sending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
              {sending ? t("hostDashboard.sending") : t("hostDashboard.sendInvitations")}
            </button>

            {results && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }} data-testid="invite-results">
                {results.map((r, i) => {
                  const ok = r.status === "sent" || r.status === "success";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      {ok
                        ? <Check style={{ width: 13, height: 13, color: c.success, flexShrink: 0 }} />
                        : <Mail style={{ width: 13, height: 13, color: c.error, flexShrink: 0 }} />
                      }
                      <span style={{ color: c.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.email}</span>
                      <StatusBadge status={ok ? "open" : "closed"} label={r.status} />
                    </div>
                  );
                })}
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
  const lang = i18n.language === "de" ? "de" : "en";

  const { data: summary, isLoading } = useQuery<HostSummary>({
    queryKey: ["host-dashboard", currentParticipant?.id],
    queryFn: () => hostDashboardApi.getSummary(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  if ((isLoading && currentParticipant) || (currentParticipant && !summary)) {
    return (
      <SimpleShell maxWidth={600}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "20px 0" }} data-testid="host-dashboard-loading">
          <div style={{ height: 32, width: 220, background: `${c.card}80`, borderRadius: 8, animation: "pulse 2s infinite" }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 90, background: `${c.card}80`, borderRadius: 12, animation: "pulse 2s infinite" }} />)}
          </div>
          <div style={{ height: 240, background: `${c.card}80`, borderRadius: 12, animation: "pulse 2s infinite" }} />
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
      </SimpleShell>
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
    { dimension: t("hostDashboard.dimNose"), value: effectiveSummary.averageScores.nose },
    { dimension: t("hostDashboard.dimTaste"), value: effectiveSummary.averageScores.taste },
    { dimension: t("hostDashboard.dimFinish"), value: effectiveSummary.averageScores.finish },
    { dimension: t("hostDashboard.dimBalance"), value: effectiveSummary.averageScores.balance },
    { dimension: t("hostDashboard.dimOverall"), value: effectiveSummary.averageScores.overall },
  ];

  const statCards = [
    { key: "totalTastings", value: effectiveSummary.totalTastings, icon: Calendar, color: c.accent },
    { key: "totalParticipants", value: effectiveSummary.totalParticipants, icon: Users, color: "#6aa4d4" },
    { key: "totalWhiskies", value: effectiveSummary.totalWhiskies, icon: Wine, color: "#d46a6a" },
  ];

  const draftTastings = effectiveSummary.recentTastings.filter((t) => t.status === "draft");
  const upcomingTasting = effectiveSummary.recentTastings.find(
    (t) => (t.status === "draft" || t.status === "open") && new Date(t.date) >= new Date(new Date().toDateString())
  );

  return (
    <SimpleShell maxWidth={600}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Wine style={{ width: 22, height: 22, color: c.accent }} strokeWidth={1.8} />
            <h1 style={pageTitleStyle} data-testid="text-host-dashboard-title">
              {t("hostDashboard.title")}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: c.muted, margin: 0 }} data-testid="text-host-dashboard-subtitle">
            {t("hostDashboard.subtitle")}
          </p>
        </div>

        {!hasData ? (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: "center", padding: "48px 0" }} data-testid="host-dashboard-empty">
            <GlassWater style={{ width: 48, height: 48, color: c.muted, opacity: 0.3, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 18, fontWeight: 600, color: c.text, fontFamily: "'Playfair Display', serif", marginBottom: 8 }}>
              {t("hostDashboard.emptyTitle")}
            </p>
            <p style={{ fontSize: 13, color: c.muted, marginBottom: 24 }}>
              {t("hostDashboard.emptyMessage")}
            </p>
            <Link href="/host">
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 20px",
                  background: c.accent,
                  color: c.bg,
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                data-testid="button-create-first"
              >
                <Plus style={{ width: 16, height: 16 }} /> {t("hostDashboard.createFirst")}
              </span>
            </Link>
          </motion.div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="host-dashboard-page">

            <div className="hd-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {statCards.map((card, i) => (
                <motion.div key={card.key} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08, duration: 0.4 }}>
                  <div
                    style={{ ...sectionCard, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "16px 10px", textAlign: "center" }}
                    data-testid={`stat-card-${card.key}`}
                  >
                    <card.icon style={{ width: 22, height: 22, color: card.color, flexShrink: 0 }} strokeWidth={1.8} />
                    <p style={{ fontSize: 24, fontWeight: 700, color: c.text, margin: 0, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }} data-testid={`stat-value-${card.key}`}>
                      {card.value}
                    </p>
                    <p style={{ fontSize: 10, color: c.muted, margin: 0, lineHeight: 1.3 }}>{t(`hostDashboard.${card.key}`)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}>
              <div style={sectionCard} data-testid="section-quick-actions">
                <SectionTitle icon={Zap} title={t("hostDashboard.quickActions")} />
                <div className="hd-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                  {[
                    { href: "/host", icon: Plus, label: t("hostDashboard.newTasting"), accent: true },
                    { href: "/sessions", icon: FileText, label: t("hostDashboard.tastings"), accent: false },
                  ].map(item => (
                    <Link key={item.href} href={item.href}>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 8,
                          padding: 16,
                          borderRadius: 12,
                          background: item.accent ? `${c.accent}15` : c.bg,
                          border: item.accent ? "none" : `1px solid ${c.border}`,
                          cursor: "pointer",
                          textAlign: "center",
                        }}
                        data-testid={`action-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <item.icon style={{ width: 22, height: 22, color: item.accent ? c.accent : c.muted }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: c.text }}>{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
                {draftTastings.length > 0 && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${c.border}` }}>
                    <p style={{ fontSize: 11, fontWeight: 600, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      {t("hostDashboard.resumeDrafts")}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {draftTastings.slice(0, 4).map((dt) => (
                        <Link key={dt.id} href="/host">
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "5px 12px",
                              borderRadius: 20,
                              background: "#b8a04015",
                              color: "#b8a040",
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: "pointer",
                            }}
                            data-testid={`draft-resume-${dt.id}`}
                          >
                            <FileText style={{ width: 12, height: 12 }} /> {dt.title}
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="hd-grid-2-1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              {chartData.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.4 }}>
                  <div style={sectionCard} data-testid="host-dashboard-scores-chart">
                    <h2 style={{ fontSize: 15, fontWeight: 600, color: c.text, margin: "0 0 4px", fontFamily: "'Playfair Display', serif" }}>
                      {t("hostDashboard.averageScores")}
                    </h2>
                    <p style={{ fontSize: 12, color: c.muted, marginBottom: 16 }}>{t("hostDashboard.averageScoresSubtitle")}</p>
                    <div style={{ height: 250 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={c.border} opacity={0.4} />
                          <XAxis dataKey="dimension" tick={{ fill: c.muted, fontSize: 12, fontFamily: "'Playfair Display', serif" }} axisLine={{ stroke: c.border }} />
                          <YAxis domain={[0, 100]} tick={{ fill: c.muted, fontSize: 10 }} axisLine={{ stroke: c.border }} />
                          <Tooltip
                            contentStyle={{ backgroundColor: c.card, border: `1px solid ${c.border}`, borderRadius: 8, color: c.text }}
                            labelStyle={{ color: c.text }}
                            formatter={(value: number) => [value.toFixed(1), t("hostDashboard.average")]}
                          />
                          <Bar dataKey="value" fill={c.accent} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.4 }}>
                <div style={{ ...sectionCard, height: "100%", display: "flex", flexDirection: "column" }} data-testid="section-documents">
                  <SectionTitle icon={Printer} title={t("hostDashboard.documents")} />
                  <p style={{ fontSize: 12, color: c.muted, marginBottom: 14 }}>
                    {t("hostDashboard.documentsDesc")}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => generateBlankTastingSheet(lang)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px",
                        borderRadius: 10,
                        background: `${c.accent}08`,
                        border: `1px solid ${c.accent}15`,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "system-ui, sans-serif",
                        color: c.text,
                      }}
                      data-testid="button-dl-scoresheet"
                    >
                      <ClipboardList style={{ width: 18, height: 18, color: c.accent, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t("hostDashboard.scoreSheet")}</p>
                        <p style={{ fontSize: 11, color: c.muted, margin: "2px 0 0" }}>{t("hostDashboard.scoreSheetDesc")}</p>
                      </div>
                    </button>
                    <button
                      onClick={() => generateBlankTastingMat(lang)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px",
                        borderRadius: 10,
                        background: `${c.accent}08`,
                        border: `1px solid ${c.accent}15`,
                        cursor: "pointer",
                        textAlign: "left",
                        fontFamily: "system-ui, sans-serif",
                        color: c.text,
                      }}
                      data-testid="button-dl-tasting-mat"
                    >
                      <Printer style={{ width: 18, height: 18, color: c.accent, flexShrink: 0 }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{t("hostDashboard.tastingMat")}</p>
                        <p style={{ fontSize: 11, color: c.muted, margin: "2px 0 0" }}>{t("hostDashboard.tastingMatDesc")}</p>
                      </div>
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: c.muted, marginTop: 12, fontStyle: "italic" }}>
                    {t("hostDashboard.tastingSpecificMenus")}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="hd-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {effectiveSummary.topWhiskies.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.4 }}>
                  <div style={{ ...sectionCard, height: "100%" }} data-testid="host-dashboard-top-whiskies">
                    <SectionTitle icon={Trophy} title={t("hostDashboard.topWhiskies")} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {effectiveSummary.topWhiskies.map((whisky, i) => (
                        <div key={`${whisky.name}-${i}`}
                          style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: i < effectiveSummary.topWhiskies.length - 1 ? `1px solid ${c.border}` : "none" }}
                          data-testid={`top-whisky-${i}`}
                        >
                          <span style={{ fontSize: 16, fontWeight: 700, color: `${c.accent}60`, width: 28, fontFamily: "'Playfair Display', serif" }}>{i + 1}</span>
                          {whisky.imageUrl && (
                            <img src={whisky.imageUrl} alt="" style={{ width: 28, height: 38, objectFit: "cover", borderRadius: 5, flexShrink: 0, background: c.bg }} data-testid={`img-top-whisky-${i}`} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: c.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`top-whisky-name-${i}`}>
                              {whisky.name}
                            </p>
                            <p style={{ fontSize: 11, color: c.muted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {[whisky.distillery, whisky.tastingTitle].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <Star style={{ width: 14, height: 14, color: c.accent, fill: c.accent }} />
                            <span style={{ fontSize: 16, fontWeight: 700, color: c.accent, fontFamily: "'Playfair Display', serif" }} data-testid={`top-whisky-score-${i}`}>
                              {whisky.averageScore.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.4 }}>
                <div style={{ ...sectionCard, height: "100%" }} data-testid="section-tools">
                  <SectionTitle icon={BarChart3} title={t("hostDashboard.toolsAnalytics")} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <ToolLink href="/my-taste/export" icon={Download} label={t("hostDashboard.dataExport")} desc={t("hostDashboard.dataExportDesc")} />
                    <ToolLink href="/sessions" icon={Copy} label={t("hostDashboard.manageTastings")} desc={t("hostDashboard.manageTastingsDesc")} />
                    <ToolLink href="/ai-curation" icon={Sparkles} label={t("hostDashboard.aiCuration")} desc={t("hostDashboard.aiCurationDesc")} />
                  </div>
                </div>
              </motion.div>
            </div>

            {effectiveSummary.recentTastings.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.4 }}>
                <div style={sectionCard} data-testid="host-dashboard-recent-tastings">
                  <SectionTitle icon={Calendar} title={t("hostDashboard.recentTastings")} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {effectiveSummary.recentTastings.map((tasting) => (
                      <div key={tasting.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: "10px 12px",
                          borderRadius: 8,
                          borderBottom: `1px solid ${c.border}`,
                        }}
                        data-testid={`recent-tasting-${tasting.id}`}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: c.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} data-testid={`recent-tasting-title-${tasting.id}`}>
                            {tasting.title}
                          </p>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <p style={{ fontSize: 11, color: c.muted, margin: 0 }}>
                              {new Date(tasting.date).toLocaleDateString(i18n.language === "de" ? "de-DE" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                            </p>
                            {tasting.code && (
                              <span style={{ fontSize: 10, fontFamily: "monospace", background: `${c.accent}15`, color: c.accent, padding: "2px 6px", borderRadius: 4 }} data-testid={`recent-tasting-code-${tasting.id}`}>
                                {tasting.code}
                              </span>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={tasting.status} label={t(`session.status.${tasting.status}`)} />
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: c.muted, flexShrink: 0 }}>
                          <Users style={{ width: 13, height: 13 }} />
                          <span data-testid={`recent-tasting-participants-${tasting.id}`}>{tasting.participantCount}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {(tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal") && (
                            <>
                              <Link href={`/tasting-results/${tasting.id}`}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.accent, cursor: "pointer" }} data-testid={`results-link-${tasting.id}`}>
                                  <Trophy style={{ width: 12, height: 12 }} /> {t("hostDashboard.results")}
                                </span>
                              </Link>
                              <Link href={`/recap/${tasting.id}`}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.accentDim, cursor: "pointer" }} data-testid={`recap-link-${tasting.id}`}>
                                  <ClipboardList style={{ width: 12, height: 12 }} /> Recap
                                </span>
                              </Link>
                            </>
                          )}
                          {(tasting.status === "open" || tasting.status === "closed") && (
                            <Link href={`/join/${tasting.id}?preview=true`}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c.accentDim, cursor: "pointer" }} data-testid={`preview-guest-${tasting.id}`}>
                                <Eye style={{ width: 12, height: 12 }} /> {t("hostDashboard.previewGuest")}
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.4 }}>
              <div style={sectionCard} data-testid="section-invitations">
                <SectionTitle icon={Mail} title={t("hostDashboard.invitations")} />
                <InvitationsPanel tastings={effectiveSummary.recentTastings} />
              </div>
            </motion.div>

          </div>
        )}
      </motion.div>
      <style>{`
        .hd-grid-3 { grid-template-columns: repeat(3, 1fr) !important; }
        .hd-grid-2 { grid-template-columns: 1fr !important; }
        .hd-grid-2-1 { grid-template-columns: 1fr !important; }
        .hd-invite-grid { grid-template-columns: 1fr !important; }
        @media (min-width: 768px) {
          .hd-grid-2 { grid-template-columns: 1fr 1fr !important; }
          .hd-grid-2-1 { grid-template-columns: 2fr 1fr !important; }
          .hd-invite-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </SimpleShell>
  );
}
