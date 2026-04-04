import { useState, useMemo, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useAppStore } from "@/lib/store";
import { hostDashboardApi, inviteApi, friendsApi, pidHeaders, tastingApi, whiskyApi } from "@/lib/api";
import type { SessionInvite, WhiskyFriend } from "@shared/schema";
import FriendsQuickSelect from "@/labs/components/FriendsQuickSelect";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  GlassWater, Users, Wine, Star, Calendar, Trophy,
  Plus, ChevronLeft, ChevronRight, Copy, Mail, QrCode,
  BarChart3, Check, Send, Loader2, Download,
  Link as LinkIcon, ChevronDown, ClipboardList, Archive, Sparkles,
} from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import QRCodeLib from "qrcode";
import { downloadDataUrl } from "@/lib/download";
import { useAppleTheme, SP, withAlpha } from "@/labs/hooks/useAppleTheme";

interface HostSummary {
  totalTastings: number;
  totalParticipants: number;
  totalWhiskies: number;
  averageScores: { nose: number; taste: number; finish: number; overall: number };
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

function useStatusColor() {
  const th = useAppleTheme();
  return (status: string) => {
    if (status === "open" || status === "reveal") return th.green;
    if (status === "draft") return th.faint;
    if (status === "closed") return th.gold;
    if (status === "archived") return th.faint;
    return th.faint;
  };
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  const getColor = useStatusColor();
  const color = getColor(status);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: color,
        padding: "3px 8px",
        borderRadius: 8,
        border: `1px solid ${withAlpha(color, 0.3)}`,
        background: withAlpha(color, 0.12),
        whiteSpace: "nowrap",
      }}
      data-testid={`status-badge-${status}`}
    >
      {label}
    </span>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  const th = useAppleTheme();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
      <Icon style={{ width: 16, height: 16, color: th.gold }} />
      <h2 style={{ fontFamily: "Playfair Display, serif", fontSize: 15, fontWeight: 600, color: th.text, margin: 0 }}>{title}</h2>
    </div>
  );
}

function LabsDashboardCalendar() {
  const th = useAppleTheme();
  const getStatusColor = useStatusColor();
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
    <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: th.text, padding: 4 }} data-testid="button-cal-prev">
          <ChevronLeft style={{ width: 18, height: 18 }} />
        </button>
        <span style={{ fontFamily: "Playfair Display, serif", fontSize: 15, fontWeight: 700, color: th.text }}>{monthName} {year}</span>
        <button type="button" onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
          style={{ background: "none", border: "none", cursor: "pointer", color: th.text, padding: 4 }} data-testid="button-cal-next">
          <ChevronRight style={{ width: 18, height: 18 }} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, textAlign: "center" }}>
        {dayNames.map((d) => (
          <div key={d} style={{ fontSize: 11, fontWeight: 700, color: th.faint, padding: "4px 0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>
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
                borderRadius: 10,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                padding: "5px 0",
                fontSize: 13,
                fontWeight: isToday || isSelected ? 700 : 400,
                color: isSelected ? th.bg : isToday ? th.gold : th.text,
                background: isSelected ? th.gold : isToday ? withAlpha(th.gold, 0.12) : "transparent",
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
                    <div key={idx} style={{ width: 4, height: 4, borderRadius: "50%", background: isSelected ? th.bg : getStatusColor(ev.status) }} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && selectedEvents.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: SP.xs }}>
          {selectedEvents.map((ev) => (
            <Link key={ev.id} href={ev.status === "closed" || ev.status === "archived" ? `/labs/results/${ev.id}` : `/labs/host/${ev.id}`}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  borderLeft: `3px solid ${getStatusColor(ev.status)}`,
                  background: th.bgHover,
                  borderRadius: 12,
                  cursor: "pointer",
                }}
                data-testid={`cal-event-${ev.id}`}
              >
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0 }}>{ev.title}</p>
                  <p style={{ fontSize: 11, color: th.faint, margin: "2px 0 0" }}>{ev.whiskyCount} whiskies · {ev.participantCount} guests</p>
                </div>
                <StatusBadge status={ev.status} label={t(`session.status.${ev.status}`, ev.status)} />
              </div>
            </Link>
          ))}
        </div>
      )}
      {selectedDay && selectedEvents.length === 0 && (
        <p style={{ fontSize: 12, color: th.faint, textAlign: "center", padding: "8px 0" }}>
          {t("hostDashboard.noTastingsDay", "No tastings on this day")}
        </p>
      )}
    </div>
  );
}

interface InviteResult { email: string; status: string; }

function LabsInvitationsPanel({ tastings }: { tastings: { id: string; title: string; status: string; code?: string }[] }) {
  const th = useAppleTheme();
  const [selectedTastingId, setSelectedTastingId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [emails, setEmails] = useState("");
  const [personalNote, setPersonalNote] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();

  const { data: allInvites = [] } = useQuery<SessionInvite[]>({
    queryKey: ["invites", selectedTastingId],
    queryFn: () => inviteApi.getForTasting(selectedTastingId),
    enabled: !!selectedTastingId,
  });

  const { data: friends = [] } = useQuery<WhiskyFriend[]>({
    queryKey: ["friends", currentParticipant?.id],
    queryFn: () => friendsApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant?.id,
  });

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
      queryClient.invalidateQueries({ queryKey: ["invites", selectedTastingId] });
    } catch {
      setResults(emailList.map(e => ({ email: e, status: "error" })));
    } finally {
      setSending(false);
    }
  }, [selectedTastingId, emails, personalNote, queryClient]);

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: 14,
    borderRadius: 12,
    background: th.inputBg,
    border: `1px solid ${th.border}`,
    color: th.text,
    outline: "none",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ fontSize: 12, color: th.faint }}>
        {t("hostDashboard.inviteDesc", "Select a tasting and invite participants via QR code or email.")}
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
            color: selectedTasting ? th.text : th.faint,
            textAlign: "left",
          }}
          data-testid="invite-tasting-selector"
        >
          <span>{selectedTasting ? selectedTasting.title : t("hostDashboard.selectTasting", "Select a tasting...")}</span>
          <ChevronDown style={{ width: 14, height: 14, color: th.faint, transition: "transform 0.15s", transform: dropdownOpen ? "rotate(180deg)" : "none" }} />
        </button>
        {dropdownOpen && (
          <div style={{
            position: "absolute",
            zIndex: 20,
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            borderRadius: 14,
            border: `1px solid ${th.border}`,
            background: th.bgCard,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            maxHeight: 200,
            overflowY: "auto",
          }}>
            {activeTastings.length === 0 && (
              <p style={{ padding: 12, fontSize: 12, color: th.faint }}>{t("hostDashboardUi.noTastingsYet", "No active tastings")}</p>
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
                  background: ta.id === selectedTastingId ? withAlpha(th.gold, 0.12) : "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: th.text,
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

      {selectedTasting && (<>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
              <QrCode style={{ width: 14, height: 14, color: th.gold }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{t("hostDashboardUi.qrCode")}</span>
            </div>
            {qrDataUrl ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <div style={{ background: th.inputBg, borderRadius: 14, padding: 8, display: "inline-block" }}>
                  <img src={qrDataUrl} alt="QR Code" style={{ width: 140, height: 140 }} data-testid="invite-qr-image" />
                </div>
                <div style={{ display: "flex", gap: SP.sm, width: "100%" }}>
                  <button onClick={handleDownloadQr} style={{
                    flex: 1, fontSize: 12, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: th.inputBg, border: `1px solid ${th.border}`, borderRadius: 10, color: th.text, cursor: "pointer",
                  }} data-testid="invite-download-qr">
                    <Download style={{ width: 13, height: 13 }} /> {t("ui.save")}
                  </button>
                  <button onClick={handleCopyLink} style={{
                    flex: 1, fontSize: 12, padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                    background: th.inputBg, border: `1px solid ${th.border}`, borderRadius: 10, color: th.text, cursor: "pointer",
                  }} data-testid="invite-copy-link">
                    {copiedLink ? <Check style={{ width: 13, height: 13 }} /> : <LinkIcon style={{ width: 13, height: 13 }} />}
                    {copiedLink ? t("ui.copied") : t("ui.link")}
                  </button>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: 12, color: th.faint, fontStyle: "italic" }}>{t("hostDashboardUi.noJoinCode")}</p>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.xs }}>
              <Mail style={{ width: 14, height: 14, color: th.gold }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: th.text }}>{t("hostDashboardUi.emailInvite")}</span>
            </div>
            {currentParticipant?.id && selectedTastingId && (
              <FriendsQuickSelect
                participantId={currentParticipant.id}
                tastingId={selectedTastingId}
                selectedEmails={emails.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean)}
                onToggle={(email, selected) => {
                  const current = emails.split(/[,;\s]+/).map(e => e.trim()).filter(Boolean);
                  if (selected) {
                    if (!current.some(e => e.toLowerCase() === email.toLowerCase())) {
                      setEmails([...current, email].join(", "));
                    }
                  } else {
                    setEmails(current.filter(e => e.toLowerCase() !== email.toLowerCase()).join(", "));
                  }
                }}
              />
            )}
            <input
              type="text"
              value={emails}
              onChange={e => setEmails(e.target.value)}
              placeholder="email@example.com, ..."
              style={inputStyle}
              data-testid="invite-email-input"
            />
            <textarea
              value={personalNote}
              onChange={e => setPersonalNote(e.target.value)}
              placeholder={t("hostDashboardUi.personalNotePlaceholder")}
              rows={2}
              style={{ ...inputStyle, resize: "none" }}
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
              {sending ? t("hostDashboardUi.sending") : t("hostDashboardUi.sendInvitations")}
            </button>

            {results && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }} data-testid="invite-results">
                {results.map((r, i) => {
                  const ok = r.status === "sent" || r.status === "success";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                      {ok
                        ? <Check style={{ width: 13, height: 13, color: th.green, flexShrink: 0 }} />
                        : <Mail style={{ width: 13, height: 13, color: "#e06060", flexShrink: 0 }} />
                      }
                      <span style={{ color: th.faint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.email}</span>
                      <StatusBadge status={ok ? "open" : "closed"} label={ok ? t("hostDashboardUi.sent") : t("hostDashboardUi.failed")} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {allInvites.length > 0 ? (
          <div style={{ marginTop: 4 }} data-testid="sent-invitations-list">
            <div style={{ height: 1, background: th.border, marginBottom: 12 }} />
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: th.faint, marginBottom: 8 }}>
              {t("hostDashboardUi.sentInvitations")} ({allInvites.length})
            </p>
            <div style={{
              maxHeight: 200,
              overflowY: "auto",
              borderRadius: 8,
              border: `1px solid ${th.border}`,
            }}>
              {allInvites.map((invite) => {
                const matchedFriend = friends.find(
                  (f) => f.email && f.email.toLowerCase() === invite.email.toLowerCase() && f.status === "accepted"
                );
                return (
                  <div
                    key={invite.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      borderBottom: `1px solid ${th.border}`,
                    }}
                    data-testid={`sent-invite-${invite.id}`}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {matchedFriend && (
                        <p style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: th.text,
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }} data-testid={`text-sent-invite-name-${invite.id}`}>
                          {String(matchedFriend.firstName ?? "")} {String(matchedFriend.lastName ?? "")}
                        </p>
                      )}
                      <p style={{
                        fontSize: 12,
                        color: matchedFriend ? th.faint : th.text,
                        margin: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }} data-testid={`text-sent-invite-email-${invite.id}`}>
                        {String(invite.email ?? "")}
                      </p>
                    </div>
                    {invite.createdAt && (
                      <span style={{ fontSize: 11, color: th.faint, flexShrink: 0, marginRight: 8 }} data-testid={`text-sent-invite-date-${invite.id}`}>
                        {new Date(invite.createdAt).toLocaleDateString()}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 999,
                        flexShrink: 0,
                        background: invite.status === "joined" ? withAlpha("#34c759", 0.15) : withAlpha(th.gold, 0.15),
                        color: invite.status === "joined" ? "#34c759" : th.gold,
                      }}
                      data-testid={`badge-sent-invite-status-${invite.id}`}
                    >
                      {String(invite.status ?? "")}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: 12, color: th.faint, fontStyle: "italic", marginTop: 8 }} data-testid="no-invitations-hint">
            No invitations sent yet for this tasting.
          </p>
        )}
      </>)}
    </div>
  );
}

const WHISKY_COUNTS = [3, 4, 5, 6, 8];

function QuickStartCard({ pid, onCreated }: { pid: string; onCreated: (id: string) => void }) {
  const th = useAppleTheme();
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [count, setCount] = useState(4);
  const [blind, setBlind] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const result = await tastingApi.create({
        title: title.trim(),
        date: new Date().toISOString().split("T")[0],
        location: "",
        description: "",
        hostId: pid,
        code,
        blindMode: blind,
        ratingScale: 100,
        guidedMode: false,
        guestMode: "standard",
        status: "draft",
      });
      if (result?.id) {
        for (let i = 0; i < count; i++) {
          try {
            await whiskyApi.create({
              tastingId: result.id,
              name: `Dram ${String.fromCharCode(65 + i)}`,
              sortOrder: i,
            });
          } catch {}
        }
        onCreated(result.id);
      }
    } catch {
      setCreating(false);
    }
  };

  return (
    <div
      style={{
        background: th.bgCard,
        border: `1px solid ${withAlpha(th.gold, 0.2)}`,
        borderRadius: 20,
        padding: `${SP.lg}px ${SP.lg}px ${SP.lg + 2}px`,
        marginBottom: SP.lg,
      }}
      data-testid="card-quick-start"
    >
      <div style={{ fontSize: 16, fontWeight: 600, color: th.text, marginBottom: SP.md }}>
        {t("hostQuickStart.title", "Start a new tasting")}
      </div>

      <input
        type="text"
        placeholder={t("hostQuickStart.namePlaceholder", "Name of the evening")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        style={{
          width: "100%",
          padding: "12px 16px",
          marginBottom: SP.md,
          fontSize: 14,
          borderRadius: 12,
          background: th.inputBg,
          border: `1px solid ${withAlpha(th.gold, 0.18)}`,
          color: th.text,
          outline: "none",
          fontFamily: "system-ui, sans-serif",
          boxSizing: "border-box",
        }}
        data-testid="input-quick-title"
      />

      <div style={{ fontSize: 13, color: th.muted, marginBottom: SP.sm }}>
        {t("hostQuickStart.howMany", "How many whiskies?")}
      </div>
      <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.md }}>
        {WHISKY_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setCount(n)}
            style={{
              flex: 1,
              padding: "10px 0",
              borderRadius: 12,
              border: count === n ? `1.5px solid ${th.gold}` : `1px solid ${th.border}`,
              background: count === n ? `linear-gradient(135deg, ${th.gold}, ${th.amber})` : th.inputBg,
              color: count === n ? "#1a1714" : th.muted,
              fontSize: 15,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.16,1,0.3,1)",
              fontFamily: "system-ui, sans-serif",
            }}
            data-testid={`chip-whisky-count-${n}`}
          >
            {n === 8 ? "8+" : n}
          </button>
        ))}
      </div>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SP.lg, padding: "0 2px" }}
      >
        <span style={{ fontSize: 14, color: th.text }}>
          {t("hostQuickStart.blind", "Blind Tasting")}
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={blind}
          onClick={() => setBlind(!blind)}
          style={{
            width: 48,
            height: 28,
            borderRadius: 14,
            border: "none",
            padding: 2,
            cursor: "pointer",
            background: blind ? th.gold : th.border,
            transition: "background 0.2s",
            position: "relative",
          }}
          data-testid="toggle-blind"
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: 12,
              background: "#fff",
              transition: "transform 0.2s cubic-bezier(0.16,1,0.3,1)",
              transform: blind ? "translateX(20px)" : "translateX(0)",
            }}
          />
        </button>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: SP.sm,
          padding: "12px 16px",
          background: withAlpha(th.gold, 0.06),
          border: `1px solid ${withAlpha(th.gold, 0.15)}`,
          borderRadius: 12,
          marginBottom: SP.md,
        }}
        data-testid="quick-start-ai-hint"
      >
        <Sparkles style={{ width: 14, height: 14, color: th.gold, flexShrink: 0, marginTop: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 300, color: th.muted, lineHeight: 1.4 }}>
          {t("labs.aiImport.hint", "Add your lineup after creating — a photo is all you need.")}
        </span>
      </div>

      <button
        onClick={handleCreate}
        disabled={!title.trim() || creating}
        className="labs-btn-primary"
        style={{
          width: "100%",
          padding: "14px 20px",
          fontSize: 15,
          borderRadius: 50,
          opacity: !title.trim() || creating ? 0.5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
        }}
        data-testid="button-quick-create"
      >
        {creating ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} /> : <Plus style={{ width: 16, height: 16 }} />}
        {t("hostQuickStart.create", "Create tasting & generate code")}
      </button>
    </div>
  );
}

export default function LabsHostDashboard() {
  const th = useAppleTheme();
  const { t, i18n } = useTranslation();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;

  const { data: summary, isLoading, isError, refetch } = useQuery<HostSummary>({
    queryKey: ["host-dashboard", pid],
    queryFn: () => hostDashboardApi.getSummary(pid!),
    enabled: !!pid,
  });

  const cardStyle = { background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 20, padding: SP.md };

  if (!pid) {
    return (
      <AuthGateMessage
        icon={<GlassWater style={{ width: 40, height: 40, color: th.faint }} />}
        title={t("authGate.hostDashboard.title")}
        bullets={[t("authGate.hostDashboard.bullet1"), t("authGate.hostDashboard.bullet2"), t("authGate.hostDashboard.bullet3")]}
      />
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <Loader2 style={{ width: 28, height: 28, color: th.gold, margin: "0 auto 12px", display: "block", animation: "spin 1s linear infinite" }} />
        <p style={{ fontSize: 13, color: th.faint }}>Loading dashboard...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: "60px 20px", textAlign: "center" }}>
        <p style={{ color: "#e06060", fontSize: 15, fontWeight: 600, marginBottom: SP.sm }}>{t("hostDashboardUi.couldNotLoadDashboard")}</p>
        <button onClick={() => refetch()} style={{
          background: th.inputBg, border: `1px solid ${th.border}`, borderRadius: 10,
          padding: "8px 16px", color: th.text, cursor: "pointer", fontSize: 13,
        }}>{t("ui.retry")}</button>
      </div>
    );
  }

  const s = summary ?? {
    totalTastings: 0, totalParticipants: 0, totalWhiskies: 0,
    averageScores: { nose: 0, taste: 0, finish: 0, overall: 0 },
    topWhiskies: [], recentTastings: [],
  };
  const hasData = s.totalTastings > 0;

  const chartData = [
    { dim: t("cockpitUi.nose"), score: Math.round(s.averageScores.nose) },
    { dim: t("cockpitUi.taste"), score: Math.round(s.averageScores.taste) },
    { dim: t("cockpitUi.finish"), score: Math.round(s.averageScores.finish) },
    { dim: t("cockpitUi.overall"), score: Math.round(s.averageScores.overall) },
  ];

  return (
    <div style={{ padding: `${SP.lg}px ${SP.md}px`, maxWidth: 768, margin: "0 auto", paddingBottom: 100 }} data-testid="labs-host-dashboard">
      <button
        onClick={goBack}
        style={{
          display: "flex", alignItems: "center", gap: 4, background: "none", border: "none",
          color: th.muted, cursor: "pointer", fontSize: 14, marginLeft: -8, marginBottom: SP.md, padding: 0,
        }}
        data-testid="labs-host-dashboard-back"
      >
        <ChevronLeft style={{ width: 16, height: 16 }} />
        Tastings
      </button>
      <h1
        style={{ fontFamily: "Playfair Display, serif", fontSize: 26, fontWeight: 700, color: th.text, margin: "0 0 4px" }}
        data-testid="text-dashboard-title"
      >
        {t("m2.hostDash.title", "Host Dashboard")}
      </h1>
      <p style={{ fontSize: 13, color: th.muted, margin: `0 0 ${SP.lg}px` }}>
        {t("m2.hostDash.subtitle", "Your command center for tasting management")}
      </p>

      <QuickStartCard pid={pid} onCreated={(id) => navigate(`/labs/host/${id}`)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: SP.sm, marginBottom: SP.lg }}>
        {[
          { icon: GlassWater, value: s.totalTastings, label: t("m2.hostDash.statTastings", "Tastings") },
          { icon: Users, value: s.totalParticipants, label: t("m2.hostDash.statParticipants", "Guests") },
          { icon: Wine, value: s.totalWhiskies, label: t("m2.hostDash.statWhiskies", "Whiskies") },
        ].map(({ icon: Icon, value, label }) => (
          <div
            key={label}
            style={{ ...cardStyle, padding: "14px 8px", textAlign: "center" }}
            data-testid={`stat-${label.toLowerCase()}`}
          >
            <Icon style={{ width: 16, height: 16, color: th.gold, margin: "0 auto 6px", display: "block" }} />
            <div style={{ fontSize: 22, fontWeight: 700, color: th.gold, fontVariantNumeric: "tabular-nums" }}>{value}</div>
            <div style={{ fontSize: 11, color: th.faint, textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
          </div>
        ))}
      </div>

      {hasData && (
        <div style={{ ...cardStyle, marginBottom: SP.lg }}>
          <SectionTitle icon={BarChart3} title={t("m2.hostDash.avgScores", "Average Scores")} />
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} margin={{ left: 0, right: 0, top: 4, bottom: 4 }}>
              <XAxis dataKey="dim" tick={{ fill: th.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: th.faint, fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                contentStyle={{ background: th.bgCard, border: `1px solid ${th.border}`, borderRadius: 10, fontSize: 12, color: th.text }}
                labelStyle={{ color: th.text }}
                itemStyle={{ color: th.gold }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]} fill={th.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: SP.md, marginBottom: SP.lg }}>
        <div style={cardStyle}>
          <SectionTitle icon={Calendar} title={t("m2.hostDash.calendar", "Calendar")} />
          <LabsDashboardCalendar />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: SP.md }}>
          <div style={cardStyle}>
            <SectionTitle icon={Star} title={t("m2.hostDash.recentTastings", "Recent Tastings")} />
            {s.recentTastings.length === 0 ? (
              <p style={{ fontSize: 12, color: th.faint, fontStyle: "italic" }}>{t("hostDashboardUi.noTastingsYet")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {s.recentTastings.slice(0, 5).map(rt => (
                  <Link key={rt.id} href={`/labs/tastings/${rt.id}`}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        background: th.bgHover,
                        borderRadius: 12,
                        cursor: "pointer",
                      }}
                      data-testid={`recent-tasting-${rt.id}`}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{rt.title}</p>
                        <p style={{ fontSize: 11, color: th.faint, margin: "2px 0 0" }}>{rt.date} · {rt.participantCount} guests</p>
                      </div>
                      <StatusBadge status={rt.status} label={t(`session.status.${rt.status}`, rt.status)} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div style={cardStyle}>
            <SectionTitle icon={Trophy} title={t("m2.hostDash.topWhiskies", "Top Whiskies")} />
            {s.topWhiskies.length === 0 ? (
              <p style={{ fontSize: 12, color: th.faint, fontStyle: "italic" }}>{t("hostDashboardUi.noRatingsYet")}</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {s.topWhiskies.slice(0, 5).map((w, i) => {
                  const medalColor = i === 0 ? th.gold : i === 1 ? "#a8a8a8" : i === 2 ? th.amber : th.faint;
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "4px 0" }} data-testid={`top-whisky-${i}`}>
                      <span style={{ width: 20, textAlign: "right", color: medalColor, fontWeight: i < 3 ? 700 : 400, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{i + 1}.</span>
                      <WhiskyImage imageUrl={w.imageUrl} name={w.name || ""} size={24} />
                      <span style={{ flex: 1, color: th.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {[w.distillery, w.name].filter(Boolean).join(" — ")}
                      </span>
                      <span style={{ color: th.gold, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{Math.round(w.averageScore)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ ...cardStyle, marginBottom: SP.lg }}>
        <SectionTitle icon={Mail} title={t("m2.hostDash.invitations", "Invitations")} />
        <LabsInvitationsPanel tastings={s.recentTastings} />
      </div>

      <div style={{ ...cardStyle, marginBottom: SP.lg }}>
        <SectionTitle icon={Sparkles} title={t("m2.hostDash.quickTools", "Quick Tools")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: SP.sm }}>
          {[
            { href: "/labs/host", icon: Plus, label: t("m2.hostDash.newTasting", "New Tasting"), desc: "Create a new session" },
            { href: "/labs/host/calendar", icon: Calendar, label: t("m2.hostDash.fullCalendar", "Full Calendar"), desc: "View all events" },
            { href: "/labs/host/history", icon: Archive, label: t("m2.hostDash.archive", "Archive"), desc: "Past events & insights" },
          ].map(({ href, icon: Icon, label, desc }) => (
            <Link key={href} href={href}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                  background: th.bgHover,
                  borderRadius: 14,
                  cursor: "pointer",
                }}
                data-testid={`tool-link-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: 10, background: withAlpha(th.gold, 0.12),
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon style={{ width: 15, height: 15, color: th.gold }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0 }}>{label}</p>
                  <p style={{ fontSize: 11, color: th.faint, margin: 0 }}>{desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
