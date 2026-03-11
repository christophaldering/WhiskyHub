import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAppStore } from "@/lib/store";
import { hostDashboardApi, inviteApi, pidHeaders, calendarApi } from "@/lib/api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  GlassWater, Users, Wine, Star, Calendar, Trophy,
  Plus, ChevronLeft, ChevronRight, Copy, Mail, QrCode,
  BarChart3, Check, Send, Loader2, Download,
  Link as LinkIcon, ChevronDown, ClipboardList, Archive, Sparkles,
} from "lucide-react";
import QRCodeLib from "qrcode";
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

const statusColor = (status: string) => {
  if (status === "open" || status === "reveal") return "var(--labs-success)";
  if (status === "draft") return "var(--labs-text-muted)";
  if (status === "closed") return "var(--labs-accent)";
  if (status === "archived") return "var(--labs-text-muted)";
  return "var(--labs-text-muted)";
};

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      style={{
        fontSize: 10,
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
      data-testid={`status-badge-${status}`}
    >
      {label}
    </span>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <Icon style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
      <h2 className="labs-serif" style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{title}</h2>
    </div>
  );
}

function LabsDashboardCalendar() {
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
      const res = await fetch("/api/calendar", { headers: pidHeaders() });
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
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text)", padding: 4 }} data-testid="button-cal-prev">
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>
        <span className="labs-serif" style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-text)" }}>{monthName} {year}</span>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text)", padding: 4 }} data-testid="button-cal-next">
          <ChevronRight style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {dayNames.map((d) => (
          <div key={d} style={{ fontSize: 10, fontWeight: 600, color: "var(--labs-text-muted)", padding: "4px 0", textTransform: "uppercase" }}>{d}</div>
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
                padding: "5px 0",
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? "var(--labs-bg)" : isToday ? "var(--labs-accent)" : "var(--labs-text)",
                background: isSelected ? "var(--labs-accent)" : isToday ? "var(--labs-accent-muted)" : "transparent",
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
                    <div key={idx} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? "var(--labs-bg)" : statusColor(ev.status) }} />
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
            <Link key={ev.id} href={ev.status === "closed" || ev.status === "archived" ? `/labs/results/${ev.id}` : `/labs/host/${ev.id}`}>
              <div
                className="labs-card-interactive"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderLeft: `3px solid ${statusColor(ev.status)}`,
                }}
                data-testid={`cal-event-${ev.id}`}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{ev.title}</p>
                  <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{ev.whiskyCount} whiskies · {ev.participantCount} guests</p>
                </div>
                <StatusBadge status={ev.status} label={t(`session.status.${ev.status}`, ev.status)} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center", padding: "8px 0" }}>
          {t("hostDashboard.noTastingsDay", "No tastings on this day")}
        </p>
      )}
    </div>
  );
}

interface InviteResult { email: string; status: string; }

function LabsInvitationsPanel({ tastings }: { tastings: { id: string; title: string; status: string; code?: string }[] }) {
  const [selectedTastingId, setSelectedTastingId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t } = useTranslation();

  const activeTastings = tastings.filter(ta => ta.status !== "archived");
  const selectedTasting = activeTastings.find(ta => ta.id === selectedTastingId);

  const joinUrl = useMemo(() => {
    if (!selectedTasting?.code) return null;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    return `${base}/enter?code=${selectedTasting.code}`;
  }, [selectedTasting]);

  useEffect(() => {
    if (!joinUrl) { setQrDataUrl(null); return; }
    QRCodeLib.toDataURL(joinUrl, {
      width: 280, margin: 2,
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
        {t("hostDashboard.inviteDesc", "Select a tasting and invite participants via QR code or email.")}
      </p>

      <div style={{ position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="labs-input"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            cursor: "pointer",
            color: selectedTasting ? "var(--labs-text)" : "var(--labs-text-muted)",
            textAlign: "left",
            width: "100%",
          }}
          data-testid="invite-tasting-selector"
        >
          <span>{selectedTasting ? selectedTasting.title : t("hostDashboard.selectTasting", "Select a tasting...")}</span>
          <ChevronDown style={{ width: 14, height: 14, color: "var(--labs-text-muted)", transition: "transform 0.15s", transform: dropdownOpen ? "rotate(180deg)" : "none" }} />
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
            border: "1px solid var(--labs-border)",
            background: "var(--labs-surface-elevated)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            maxHeight: 200,
            overflowY: "auto",
          }}>
            {activeTastings.length === 0 && (
              <p style={{ padding: 12, fontSize: 12, color: "var(--labs-text-muted)" }}>{t("hostDashboard.noActiveTastings", "No active tastings")}</p>
            )}
            {activeTastings.map(ta => (
              <button
                key={ta.id}
                onClick={() => { setSelectedTastingId(ta.id); setDropdownOpen(false); setResults(null); }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 14px",
                  fontSize: 13,
                  background: ta.id === selectedTastingId ? "var(--labs-accent-muted)" : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--labs-text)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontFamily: "system-ui, sans-serif",
                }}
                data-testid={`invite-tasting-option-${ta.id}`}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ta.title}</span>
                <StatusBadge status={ta.status} label={t(`session.status.${ta.status}`, ta.status)} />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedTasting && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <QrCode style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>QR Code</span>
            </div>
            {qrDataUrl ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ background: "#f5f0e8", borderRadius: 10, padding: 8, display: "inline-block" }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 140, height: 140 }} data-testid="invite-qr-image" />
                </div>
                <div style={{ display: "flex", gap: 8, width: "100%" }}>
                  <button onClick={handleDownloadQr} className="labs-btn-secondary" style={{ flex: 1, fontSize: 12, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} data-testid="invite-download-qr">
                    <Download style={{ width: 13, height: 13 }} /> Save
                  </button>
                  <button onClick={handleCopyLink} className="labs-btn-secondary" style={{ flex: 1, fontSize: 12, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }} data-testid="invite-copy-link">
                    {copiedLink ? <Check style={{ width: 13, height: 13 }} /> : <LinkIcon style={{ width: 13, height: 13 }} />}
                    {copiedLink ? "Copied!" : "Link"}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", fontStyle: "italic" }}>No join code available</p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Mail style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>Email Invite</span>
            </div>
            <input
              type="text"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="email@example.com, ..."
              className="labs-input"
              data-testid="invite-email-input"
            />
            <textarea
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder="Add a personal note (optional)"
              rows={2}
              className="labs-input"
              style={{ resize: "none" }}
              data-testid="invite-personal-note"
            />
            <button
              onClick={handleSendEmails}
              disabled={sending || !emails.trim()}
              className="labs-btn-primary"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                opacity: sending || !emails.trim() ? 0.5 : 1,
                cursor: sending || !emails.trim() ? "not-allowed" : "pointer",
              }}
              data-testid="invite-send-button"
            >
              {sending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
              {sending ? "Sending..." : "Send Invitations"}
            </button>

            {results && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }} data-testid="invite-results">
                {results.map((r, i) => {
                  const ok = r.status === "sent" || r.status === "success";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      {ok
                        ? <Check style={{ width: 13, height: 13, color: "var(--labs-success)", flexShrink: 0 }} />
                        : <Mail style={{ width: 13, height: 13, color: "var(--labs-danger)", flexShrink: 0 }} />
                      }
                      <span style={{ color: "var(--labs-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.email}</span>
                      <StatusBadge status={ok ? "open" : "closed"} label={ok ? "Sent" : "Failed"} />
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

export default function LabsHostDashboard() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const { data: summary, isLoading, isError, refetch } = useQuery<HostSummary>({
    queryKey: ["host-dashboard", pid],
    queryFn: () => hostDashboardApi.getSummary(pid!),
    enabled: !!pid,
  });

  if (!pid) {
    return (
      <div className="labs-fade-in" style={{ padding: "60px 20px", textAlign: "center" }}>
        <GlassWater style={{ width: 40, height: 40, color: "var(--labs-text-muted)", margin: "0 auto 16px", display: "block" }} />
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>Sign in to access your dashboard</p>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>Your host command center awaits</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-fade-in" style={{ padding: "60px 20px", textAlign: "center" }}>
        <Loader2 style={{ width: 28, height: 28, color: "var(--labs-accent)", margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>Loading dashboard...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="labs-fade-in" style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ color: "var(--labs-danger)", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Could not load dashboard</p>
        <button onClick={() => refetch()} className="labs-btn-secondary">Retry</button>
      </div>
    );
  }

  const s = summary ?? {
    totalTastings: 0, totalParticipants: 0, totalWhiskies: 0,
    averageScores: { nose: 0, taste: 0, finish: 0, balance: 0, overall: 0 },
    topWhiskies: [], recentTastings: [],
  };
  const hasData = s.totalTastings > 0;

  const chartData = [
    { dim: "Nose", score: Math.round(s.averageScores.nose), fill: "var(--labs-dim-nose)" },
    { dim: "Taste", score: Math.round(s.averageScores.taste), fill: "var(--labs-dim-taste)" },
    { dim: "Finish", score: Math.round(s.averageScores.finish), fill: "var(--labs-dim-finish)" },
    { dim: "Balance", score: Math.round(s.averageScores.balance), fill: "var(--labs-dim-balance)" },
    { dim: "Overall", score: Math.round(s.averageScores.overall), fill: "var(--labs-accent)" },
  ];

  return (
    <div className="px-4 py-5 max-w-3xl mx-auto labs-fade-in" style={{ paddingBottom: 100 }} data-testid="labs-host-dashboard">
      <h1
        className="labs-serif"
        style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-text)", margin: "0 0 4px" }}
        data-testid="text-dashboard-title"
      >
        {t("m2.hostDash.title", "Host Dashboard")}
      </h1>
      <p style={{ fontSize: 13, color: "var(--labs-text-muted)", margin: "0 0 20px" }}>
        {t("m2.hostDash.subtitle", "Your command center for tasting management")}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { icon: GlassWater, value: s.totalTastings, label: t("m2.hostDash.statTastings", "Tastings") },
          { icon: Users, value: s.totalParticipants, label: t("m2.hostDash.statParticipants", "Guests") },
          { icon: Wine, value: s.totalWhiskies, label: t("m2.hostDash.statWhiskies", "Whiskies") },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            className="labs-card"
            style={{ padding: "14px 8px", textAlign: "center" }}
            data-testid={`stat-${label.toLowerCase()}`}
          >
            <Icon style={{ width: 16, height: 16, color: "var(--labs-accent)", margin: "0 auto 6px", display: "block" }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
            <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</div>
          </div>
        ))}
      </div>

      {hasData && (
        <div className="labs-card" style={{ padding: 16, marginBottom: 20 }}>
          <SectionTitle icon={BarChart3} title={t("m2.hostDash.avgScores", "Average Scores")} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
              <XAxis dataKey="dim" tick={{ fill: "var(--labs-text-secondary)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: "var(--labs-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)", borderRadius: 8, fontSize: 12, color: "var(--labs-text)" }}
                labelStyle={{ color: "var(--labs-text)" }}
                itemStyle={{ color: "var(--labs-accent)" }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} fill="var(--labs-accent)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div className="labs-card" style={{ padding: 16 }}>
          <SectionTitle icon={Calendar} title={t("m2.hostDash.calendar", "Calendar")} />
          <LabsDashboardCalendar />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="labs-card" style={{ padding: 16 }}>
            <SectionTitle icon={Star} title={t("m2.hostDash.recentTastings", "Recent Tastings")} />
            {s.recentTastings.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", fontStyle: "italic" }}>No tastings yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.recentTastings.slice(0, 5).map(rt => (
                  <Link key={rt.id} href={`/labs/tastings/${rt.id}`}>
                    <div
                      className="labs-card-interactive"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                      }}
                      data-testid={`recent-tasting-${rt.id}`}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rt.title}</p>
                        <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: "2px 0 0" }}>{rt.date} · {rt.participantCount} guests</p>
                      </div>
                      <StatusBadge status={rt.status} label={t(`session.status.${rt.status}`, rt.status)} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="labs-card" style={{ padding: 16 }}>
            <SectionTitle icon={Trophy} title={t("m2.hostDash.topWhiskies", "Top Whiskies")} />
            {s.topWhiskies.length === 0 ? (
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", fontStyle: "italic" }}>No ratings yet</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {s.topWhiskies.slice(0, 5).map((w, i) => {
                  const medalColor = i === 0 ? "#d4a256" : i === 1 ? "#a8a8a8" : i === 2 ? "#cd7f32" : "var(--labs-text-muted)";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }} data-testid={`top-whisky-${i}`}>
                      <span style={{ width: 20, textAlign: "right", color: medalColor, fontWeight: i < 3 ? 700 : 400, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{i + 1}.</span>
                      <span style={{ flex: 1, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[w.distillery, w.name].filter(Boolean).join(" — ")}
                      </span>
                      <span style={{ color: "var(--labs-accent)", fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{Math.round(w.averageScore)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }}>
        <SectionTitle icon={Mail} title={t("m2.hostDash.invitations", "Invitations")} />
        <LabsInvitationsPanel tastings={s.recentTastings} />
      </div>

      <div className="labs-card" style={{ padding: 16, marginBottom: 20 }}>
        <SectionTitle icon={Sparkles} title={t("m2.hostDash.quickTools", "Quick Tools")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {[
            { href: "/labs/host", icon: Plus, label: t("m2.hostDash.newTasting", "New Tasting"), desc: "Create a new session" },
            { href: "/labs/host/calendar", icon: Calendar, label: t("m2.hostDash.fullCalendar", "Full Calendar"), desc: "View all events" },
            { href: "/labs/host/history", icon: Archive, label: t("m2.hostDash.archive", "Historical Archive"), desc: "Browse past events" },
            { href: "/labs/host/history/insights", icon: BarChart3, label: t("m2.hostDash.insights", "Cross-Tasting Insights"), desc: "Top whiskies & trends" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <div
                className="labs-card-interactive"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                }}
                data-testid={`tool-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: "var(--labs-accent-muted)",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon style={{ width: 15, height: 15, color: "var(--labs-accent)" }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)", margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0 }}>{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
