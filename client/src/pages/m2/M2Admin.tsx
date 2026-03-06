import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { adminApi, feedbackApi, platformAnalyticsApi } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { useAIStatus } from "@/hooks/use-ai-status";
import { useToast } from "@/hooks/use-toast";
import { getSession } from "@/lib/session";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import {
  ShieldAlert, Users, Wine, Crown, Trash2, Search, UserCog, Shield, User,
  Calendar, Eye, Hash, BarChart3, ChevronDown, ChevronRight, Database,
  Mail, Sparkles, Send, Archive, RefreshCw, CheckSquare, Square, Loader2,
  Brain, Clock, Settings, FlaskConical, Wifi, XCircle, CheckCircle,
  MessageSquarePlus, Megaphone, Rocket, Filter, AlertTriangle,
  FileArchive, Play, FileWarning
} from "lucide-react";

type AdminTab = "participants" | "tastings" | "online" | "ai" | "newsletter" | "changelog" | "cleanup" | "analytics" | "historical" | "settings" | "feedback";

const TAB_CONFIG: { id: AdminTab; labelKey: string; fallback: string; icon: any }[] = [
  { id: "participants", labelKey: "m2.admin.participants", fallback: "Participants", icon: Users },
  { id: "tastings", labelKey: "m2.admin.tastings", fallback: "Tastings", icon: Wine },
  { id: "online", labelKey: "m2.admin.online", fallback: "Online", icon: Wifi },
  { id: "ai", labelKey: "m2.admin.ai", fallback: "AI Controls", icon: Brain },
  { id: "newsletter", labelKey: "m2.admin.newsletter", fallback: "Newsletter", icon: Mail },
  { id: "changelog", labelKey: "m2.admin.changelog", fallback: "Changelog", icon: Rocket },
  { id: "cleanup", labelKey: "m2.admin.cleanup", fallback: "Cleanup", icon: Trash2 },
  { id: "analytics", labelKey: "m2.admin.analytics", fallback: "Analytics", icon: BarChart3 },
  { id: "historical", labelKey: "m2.admin.historical", fallback: "Historical Import", icon: FileArchive },
  { id: "settings", labelKey: "m2.admin.settings", fallback: "Settings", icon: Settings },
  { id: "feedback", labelKey: "m2.admin.feedback", fallback: "Feedback", icon: MessageSquarePlus },
];

interface AdminParticipant {
  id: string;
  name: string;
  email: string | null;
  role: string;
  language: string | null;
  createdAt: string | null;
  hostedTastings: number;
  isHost: boolean;
  canAccessWhiskyDb: boolean;
  newsletterOptIn: boolean;
  communityContributor: boolean;
}

interface AdminTasting {
  id: string;
  title: string;
  date: string;
  location: string;
  status: string;
  code: string;
  hostName: string;
  hostId: string;
  participantCount: number;
  whiskyCount: number;
  blindMode: boolean | null;
  isTestData: boolean | null;
}

interface AdminOverview {
  participants: AdminParticipant[];
  tastings: AdminTasting[];
  stats: {
    totalParticipants: number;
    totalHosts: number;
    totalTastings: number;
    totalAdmins: number;
  };
}

export default function M2Admin() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = getSession();
  const pid = session.pid || "";
  const [activeTab, setActiveTab] = useState<AdminTab>("participants");

  const { data, isLoading, isError, refetch } = useQuery<AdminOverview>({
    queryKey: ["/admin/overview", pid],
    queryFn: () => adminApi.getOverview(pid),
    enabled: !!pid,
  });

  if (!pid || session.role !== "admin") {
    return (
      <div style={{ padding: 24, textAlign: "center", color: v.muted }} data-testid="m2-admin-access-denied">
        <Shield style={{ width: 48, height: 48, margin: "0 auto 16px", color: v.accent }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: v.text }}>
          {!pid ? t("m2.admin.accessRequired", "Admin Access Required") : t("m2.admin.accessDenied", "Access Denied")}
        </p>
        <p style={{ fontSize: 14, marginTop: 8, color: v.textSecondary }}>
          {!pid
            ? t("m2.admin.pleaseSignIn", "Please sign in to access admin features.")
            : t("m2.admin.noAdminPrivileges", "You don't have admin privileges.")}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return <M2Loading />;
  }

  if (isError) {
    return <M2Error onRetry={refetch} />;
  }

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: "center", color: v.muted }}>
        <AlertTriangle style={{ width: 48, height: 48, margin: "0 auto 16px", color: v.danger }} />
        <p style={{ fontSize: 16, fontWeight: 600, color: v.text }}>{t("m2.admin.accessDenied", "Access Denied")}</p>
        <p style={{ fontSize: 14, marginTop: 8 }}>{t("m2.admin.noAdminPrivileges", "You don't have admin privileges.")}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 16px 32px" }} data-testid="m2-admin">
      <div style={{ marginBottom: 16 }}>
        <M2BackButton />
      </div>

      <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 24, fontWeight: 700, color: v.text, marginBottom: 8 }} data-testid="text-admin-title">
        {t("m2.admin.adminPanel", "Admin Panel")}
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { label: t("m2.admin.statUsers", "Users"), value: data.stats.totalParticipants, icon: Users },
          { label: t("m2.admin.statHosts", "Hosts"), value: data.stats.totalHosts, icon: Crown },
          { label: t("m2.admin.statTastings", "Tastings"), value: data.stats.totalTastings, icon: Wine },
          { label: t("m2.admin.statAdmins", "Admins"), value: data.stats.totalAdmins, icon: Shield },
        ].map(s => (
          <div key={s.label} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: "12px 8px", textAlign: "center" }} data-testid={`stat-${s.label.toLowerCase()}`}>
            <s.icon style={{ width: 16, height: 16, color: v.accent, margin: "0 auto 4px" }} />
            <div style={{ fontSize: 20, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", marginBottom: 20, paddingBottom: 4 }}>
        {TAB_CONFIG.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "6px 12px", borderRadius: 20, border: "none",
                background: active ? v.accent : v.elevated,
                color: active ? v.bg : v.textSecondary,
                fontSize: 12, fontWeight: active ? 600 : 400,
                cursor: "pointer", whiteSpace: "nowrap",
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
              data-testid={`tab-${tab.id}`}
            >
              <Icon style={{ width: 14, height: 14 }} />
              {t(tab.labelKey, tab.fallback)}
            </button>
          );
        })}
      </div>

      {activeTab === "participants" && <ParticipantsTab data={data} pid={pid} />}
      {activeTab === "tastings" && <TastingsTab data={data} pid={pid} />}
      {activeTab === "online" && <OnlineTab />}
      {activeTab === "ai" && <AITab pid={pid} />}
      {activeTab === "newsletter" && <NewsletterTab participants={data.participants} pid={pid} />}
      {activeTab === "changelog" && <ChangelogTab pid={pid} />}
      {activeTab === "cleanup" && <CleanupTab data={data} pid={pid} />}
      {activeTab === "analytics" && <AnalyticsTab pid={pid} />}
      {activeTab === "historical" && <HistoricalImportTab pid={pid} />}
      {activeTab === "settings" && <SettingsTab pid={pid} />}
      {activeTab === "feedback" && <FeedbackTab pid={pid} />}
    </div>
  );
}

function ParticipantsTab({ data, pid }: { data: AdminOverview; pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const roleMutation = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      adminApi.updateRole(participantId, role, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/overview"] });
      toast({ title: t("m2.admin.roleUpdated", "Role updated") });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (participantId: string) => adminApi.deleteParticipant(participantId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/overview"] });
      toast({ title: t("m2.admin.participantDeleted", "Participant deleted") });
    },
  });

  const dbAccessMutation = useMutation({
    mutationFn: ({ participantId, canAccess }: { participantId: string; canAccess: boolean }) =>
      adminApi.updateWhiskyDbAccess(participantId, canAccess, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/overview"] });
      toast({ title: t("m2.admin.dbAccessUpdated", "DB access updated") });
    },
  });

  const filtered = data.participants.filter(p => {
    if (filterRole !== "all" && p.role !== filterRole) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div data-testid="admin-participants-tab">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: v.muted }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("m2.admin.searchParticipants", "Search participants...")}
            style={{ width: "100%", padding: "8px 8px 8px 30px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, fontFamily: "system-ui, sans-serif" }}
            data-testid="input-search-participants"
          />
        </div>
        <select
          value={filterRole}
          onChange={e => setFilterRole(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, fontFamily: "system-ui, sans-serif" }}
          data-testid="select-filter-role"
        >
          <option value="all">{t("m2.admin.allRoles", "All Roles")}</option>
          <option value="admin">{t("m2.admin.roleAdmin", "Admin")}</option>
          <option value="host">{t("m2.admin.roleHost", "Host")}</option>
          <option value="user">{t("m2.admin.roleUser", "User")}</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: v.muted }}>{t("m2.admin.noResults", "No results")}</div>
        ) : filtered.map(p => (
          <div key={p.id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 14 }} data-testid={`participant-row-${p.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {p.role === "admin" ? <Shield style={{ width: 14, height: 14, color: v.accent }} /> :
                   p.role === "host" ? <Crown style={{ width: 14, height: 14, color: "#60a5fa" }} /> :
                   <User style={{ width: 14, height: 14, color: v.muted }} />}
                  <span style={{ fontWeight: 600, fontSize: 14, color: v.text }}>{p.name}</span>
                  {p.id === pid && <span style={{ fontSize: 10, background: `${v.accent}20`, color: v.accent, padding: "1px 6px", borderRadius: 8 }}>{t("m2.admin.you", "You")}</span>}
                </div>
                <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>
                  {p.email || t("m2.admin.noEmail", "No email")} · {p.hostedTastings} {t("m2.admin.tastingsHosted", "tastings hosted")}
                  {p.createdAt && ` · ${new Date(p.createdAt).toLocaleDateString()}`}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <select
                  value={p.role}
                  onChange={e => roleMutation.mutate({ participantId: p.id, role: e.target.value })}
                  disabled={p.id === pid}
                  style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 11, fontFamily: "system-ui, sans-serif" }}
                  data-testid={`select-role-${p.id}`}
                >
                  <option value="user">{t("m2.admin.roleUser", "User")}</option>
                  <option value="host">{t("m2.admin.roleHost", "Host")}</option>
                  <option value="admin">{t("m2.admin.roleAdmin", "Admin")}</option>
                </select>
                {p.id !== pid && (
                  <button
                    onClick={() => { if (confirm(t("m2.admin.confirmDeleteParticipant", "Delete {{name}}?", { name: p.name }))) deleteMutation.mutate(p.id); }}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                    data-testid={`btn-delete-participant-${p.id}`}
                  >
                    <Trash2 style={{ width: 14, height: 14, color: v.danger }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TastingsTab({ data, pid }: { data: AdminOverview; pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const deleteMutation = useMutation({
    mutationFn: (tastingId: string) => adminApi.deleteTasting(tastingId, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/overview"] });
      toast({ title: t("m2.admin.tastingDeleted", "Tasting deleted") });
    },
  });

  const toggleTestMutation = useMutation({
    mutationFn: async ({ id, isTestData }: { id: string; isTestData: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/tastings/${id}/test-flag`, { requesterId: pid, isTestData });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/overview"] });
      toast({ title: t("m2.admin.testFlagUpdated", "Test flag updated") });
    },
  });

  const filtered = data.tastings.filter(ta => {
    if (filterStatus !== "all" && ta.status !== filterStatus) return false;
    if (search && !ta.title.toLowerCase().includes(search.toLowerCase()) && !ta.hostName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColors: Record<string, string> = {
    draft: v.muted, open: v.success, closed: v.accent, reveal: "#a855f7", archived: v.muted,
  };

  return (
    <div data-testid="admin-tastings-tab">
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: "relative" }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: v.muted }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("m2.admin.searchTastings", "Search tastings...")}
            style={{ width: "100%", padding: "8px 8px 8px 30px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, fontFamily: "system-ui, sans-serif" }}
            data-testid="input-search-tastings"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, fontFamily: "system-ui, sans-serif" }}
          data-testid="select-filter-status"
        >
          <option value="all">{t("m2.admin.allStatuses", "All Statuses")}</option>
          <option value="draft">{t("m2.admin.statusDraft", "Draft")}</option>
          <option value="open">{t("m2.admin.statusOpen", "Open")}</option>
          <option value="closed">{t("m2.admin.statusClosed", "Closed")}</option>
          <option value="reveal">{t("m2.admin.statusReveal", "Reveal")}</option>
          <option value="archived">{t("m2.admin.statusArchived", "Archived")}</option>
        </select>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: v.muted }}>{t("m2.admin.noResults", "No results")}</div>
        ) : filtered.map(tasting => (
          <div key={tasting.id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 14 }} data-testid={`tasting-row-${tasting.id}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: v.text }}>{tasting.title}</span>
                  <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 10, background: `${statusColors[tasting.status] || v.muted}20`, color: statusColors[tasting.status] || v.muted, fontWeight: 600 }}>
                    {tasting.status}
                  </span>
                  {tasting.blindMode && <Eye style={{ width: 12, height: 12, color: v.muted }} />}
                  {tasting.isTestData && (
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 6, background: `${v.accent}15`, color: v.accent, fontWeight: 600 }}>TEST</span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: v.muted, marginTop: 4, display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Crown style={{ width: 10, height: 10 }} /> {tasting.hostName}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Calendar style={{ width: 10, height: 10 }} /> {tasting.date}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Users style={{ width: 10, height: 10 }} /> {tasting.participantCount}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Wine style={{ width: 10, height: 10 }} /> {tasting.whiskyCount}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2 }}><Hash style={{ width: 10, height: 10 }} /> {tasting.code}</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => toggleTestMutation.mutate({ id: tasting.id, isTestData: !tasting.isTestData })}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  data-testid={`btn-toggle-test-${tasting.id}`}
                >
                  <FlaskConical style={{ width: 14, height: 14, color: tasting.isTestData ? v.accent : v.muted }} />
                </button>
                <button
                  onClick={() => { if (confirm(t("m2.admin.confirmDeleteTasting", 'Delete "{{title}}"?', { title: tasting.title }))) deleteMutation.mutate(tasting.id); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                  data-testid={`btn-delete-tasting-${tasting.id}`}
                >
                  <Trash2 style={{ width: 14, height: 14, color: v.danger }} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnlineTab() {
  const { t } = useTranslation();
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["/api/admin/online-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/online-users?minutes=10");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 15000,
  });

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMin < 1) return t("m2.admin.justNow", "just now");
    if (diffMin < 60) return t("m2.admin.minutesAgo", "{{min}}m ago", { min: diffMin });
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div data-testid="admin-online-tab">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Wifi style={{ width: 18, height: 18, color: v.success }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: v.text }}>{t("m2.admin.onlineUsers", "Online Users")}</span>
          <span style={{ fontSize: 12, background: v.elevated, padding: "2px 8px", borderRadius: 10, color: v.textSecondary }}>{onlineUsers.length}</span>
        </div>
        <span style={{ fontSize: 11, color: v.muted, display: "flex", alignItems: "center", gap: 4 }}>
          <Clock style={{ width: 12, height: 12 }} /> {t("m2.admin.autoRefresh", "Auto-refresh 15s")}
        </span>
      </div>

      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 48 }}>
          <Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} />
        </div>
      ) : onlineUsers.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: v.muted }}>{t("m2.admin.noUsersOnline", "No users currently online.")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {onlineUsers.map((u: any) => {
            const isRecent = Date.now() - new Date(u.lastSeenAt).getTime() < 2 * 60 * 1000;
            return (
              <div key={u.id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 10 }} data-testid={`online-user-${u.id}`}>
                <div style={{ position: "relative" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: v.elevated, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <User style={{ width: 16, height: 16, color: v.muted }} />
                  </div>
                  <div style={{ position: "absolute", bottom: -1, right: -1, width: 10, height: 10, borderRadius: "50%", border: `2px solid ${v.card}`, background: isRecent ? v.success : v.accent }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 13, color: v.text }}>{u.name}</span>
                    {u.role === "admin" && <span style={{ fontSize: 9, padding: "1px 4px", borderRadius: 4, background: `${v.danger}20`, color: v.danger, fontWeight: 600 }}>Admin</span>}
                  </div>
                  {u.email && <div style={{ fontSize: 11, color: v.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>}
                </div>
                <div style={{ fontSize: 11, color: v.muted, flexShrink: 0 }}>{formatTime(u.lastSeenAt)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AITab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/admin/ai-settings", pid],
    queryFn: async () => {
      const res = await fetch(`/api/admin/ai-settings?participantId=${pid}`);
      if (!res.ok) throw new Error("Failed to load AI settings");
      return res.json();
    },
  });

  const [masterDisabled, setMasterDisabled] = useState<boolean | null>(null);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (data && masterDisabled === null) {
      setMasterDisabled(data.settings.ai_master_disabled);
      setDisabledFeatures(data.settings.ai_features_disabled || []);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/ai-settings", {
        participantId: pid,
        ai_master_disabled: masterDisabled,
        ai_features_disabled: disabledFeatures,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("m2.admin.aiSettingsSaved", "AI settings saved") });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleFeature = (featureId: string) => {
    setDisabledFeatures(prev =>
      prev.includes(featureId) ? prev.filter(f => f !== featureId) : [...prev, featureId]
    );
  };

  if (isLoading || masterDisabled === null) {
    return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} /></div>;
  }

  const features = data?.features || [];
  const auditLog = data?.auditLog || [];
  const hasChanges = masterDisabled !== data?.settings.ai_master_disabled ||
    JSON.stringify([...disabledFeatures].sort()) !== JSON.stringify([...(data?.settings.ai_features_disabled || [])].sort());

  return (
    <div data-testid="admin-ai-tab">
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <ShieldAlert style={{ width: 20, height: 20, color: v.accent }} />
          <span style={{ fontWeight: 700, fontSize: 16, color: v.text }}>{t("m2.admin.aiKillSwitch", "AI Kill Switch")}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 10, border: `2px solid ${masterDisabled ? v.danger : v.success}`, background: `${masterDisabled ? v.danger : v.success}10`, marginBottom: 16 }} data-testid="ai-master-toggle">
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: v.text }}>{t("m2.admin.masterKillSwitch", "Master Kill Switch")}</div>
            <div style={{ fontSize: 12, color: v.muted }}>{masterDisabled ? t("m2.admin.allAiDisabled", "All AI features disabled") : t("m2.admin.aiFeaturesActive", "AI features active")}</div>
          </div>
          <button
            onClick={() => setMasterDisabled(!masterDisabled)}
            style={{
              width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
              background: masterDisabled ? v.muted : v.success,
              position: "relative", transition: "background 0.2s",
            }}
            data-testid="switch-ai-master"
          >
            <div style={{
              width: 18, height: 18, borderRadius: "50%", background: "#fff",
              position: "absolute", top: 3,
              left: masterDisabled ? 3 : 23, transition: "left 0.2s",
            }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {features.map((feature: { id: string; label: string; route: string }) => {
            const isFeatureDisabled = disabledFeatures.includes(feature.id);
            const isEffective = masterDisabled || isFeatureDisabled;
            return (
              <div key={feature.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 10, borderRadius: 8, border: `1px solid ${isEffective ? v.danger : v.success}40`, background: `${isEffective ? v.danger : v.success}08` }} data-testid={`ai-feature-${feature.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isEffective ? <XCircle style={{ width: 14, height: 14, color: v.danger }} /> : <CheckCircle style={{ width: 14, height: 14, color: v.success }} />}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{feature.label}</div>
                    <div style={{ fontSize: 10, color: v.muted, fontFamily: "monospace" }}>{feature.route}</div>
                  </div>
                </div>
                <button
                  onClick={() => toggleFeature(feature.id)}
                  disabled={!!masterDisabled}
                  style={{
                    width: 36, height: 20, borderRadius: 10, border: "none", cursor: masterDisabled ? "not-allowed" : "pointer",
                    background: isFeatureDisabled ? v.muted : v.success,
                    position: "relative", transition: "background 0.2s", opacity: masterDisabled ? 0.4 : 1,
                  }}
                >
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%", background: "#fff",
                    position: "absolute", top: 3,
                    left: isFeatureDisabled ? 3 : 19, transition: "left 0.2s",
                  }} />
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={!hasChanges || saveMutation.isPending}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none", cursor: hasChanges ? "pointer" : "not-allowed",
              background: hasChanges ? v.accent : v.muted, color: v.bg, fontSize: 13, fontWeight: 600,
              fontFamily: "system-ui, sans-serif", opacity: hasChanges ? 1 : 0.5, display: "flex", alignItems: "center", gap: 6,
            }}
            data-testid="ai-settings-save"
          >
            {saveMutation.isPending && <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />}
            {t("m2.admin.saveChanges", "Save Changes")}
          </button>
        </div>
      </div>

      {auditLog.length > 0 && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Database style={{ width: 16, height: 16, color: v.textSecondary }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: v.text }}>{t("m2.admin.auditLog", "Audit Log")}</span>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto" }}>
            {auditLog.map((entry: any, i: number) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: `1px solid ${v.border}`, fontSize: 12 }}>
                <span style={{ color: v.muted, whiteSpace: "nowrap", fontSize: 10 }}>{new Date(entry.createdAt).toLocaleString("de-DE")}</span>
                <span style={{ fontWeight: 500, color: v.text }}>{entry.actorName}</span>
                <span style={{ color: v.muted }}>{entry.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NewsletterTab({ participants, pid }: { participants: AdminParticipant[]; pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { masterDisabled: aiDisabled } = useAIStatus();
  const allWithEmail = participants.filter(p => p.email);
  const subscribers = participants.filter(p => p.newsletterOptIn && p.email);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: newsletters = [] } = useQuery({
    queryKey: ["/admin/newsletters", pid],
    queryFn: () => adminApi.getNewsletters(pid),
    enabled: !!pid,
  });

  const toggleRecipient = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async (type: "welcome" | "update") => {
    setGenerating(true);
    try {
      const result = await adminApi.generateNewsletter(pid, type);
      setSubject(result.subject || "");
      setContentHtml(result.body || "");
      toast({ title: t("m2.admin.newsletterGenerated", "Newsletter generated") });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !contentHtml.trim() || selectedIds.size === 0) return;
    setSending(true);
    try {
      const result = await adminApi.sendNewsletter(pid, subject, contentHtml, Array.from(selectedIds));
      toast({ title: t("m2.admin.newsletterSent", "Newsletter sent to {{count}} recipients", { count: result.sent }) });
      setSubject(""); setContentHtml(""); setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/admin/newsletters"] });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div data-testid="admin-newsletter-tab">
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Send style={{ width: 16, height: 16, color: v.accent }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: v.text }}>{t("m2.admin.composeNewsletter", "Compose Newsletter")}</span>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => handleGenerate("welcome")} disabled={generating || aiDisabled} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 12, cursor: generating ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "system-ui, sans-serif" }} data-testid="button-generate-welcome">
            {generating ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
            {t("m2.admin.welcome", "Welcome")}
          </button>
          <button onClick={() => handleGenerate("update")} disabled={generating || aiDisabled} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${v.border}`, background: v.elevated, color: v.text, fontSize: 12, cursor: generating ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "system-ui, sans-serif" }} data-testid="button-generate-update">
            {generating ? <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} /> : <Sparkles style={{ width: 12, height: 12 }} />}
            {t("m2.admin.update", "Update")}
          </button>
        </div>

        <input
          type="text"
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder={t("m2.admin.subject", "Subject...")}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, marginBottom: 8, fontFamily: "system-ui, sans-serif" }}
          data-testid="input-newsletter-subject"
        />

        <textarea
          value={contentHtml}
          onChange={e => setContentHtml(e.target.value)}
          placeholder={t("m2.admin.newsletterContent", "Newsletter content (HTML)...")}
          rows={6}
          style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, resize: "vertical", fontFamily: "system-ui, sans-serif" }}
          data-testid="input-newsletter-content"
        />

        <div style={{ marginTop: 12, border: `1px solid ${v.border}`, borderRadius: 8, padding: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: v.muted, textTransform: "uppercase", letterSpacing: 1 }}>{t("m2.admin.recipientsSelected", "Recipients ({{count}} selected)", { count: selectedIds.size })}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setSelectedIds(new Set(subscribers.map(s => s.id)))} style={{ fontSize: 11, color: v.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-select-all">{t("m2.admin.selectSubscribers", "Select subscribers")}</button>
              <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 11, color: v.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="button-deselect-all">{t("m2.admin.clear", "Clear")}</button>
            </div>
          </div>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {allWithEmail.map(p => (
              <div key={p.id} onClick={() => toggleRecipient(p.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px", borderRadius: 6, cursor: "pointer", background: selectedIds.has(p.id) ? `${v.accent}15` : "transparent" }} data-testid={`recipient-${p.id}`}>
                {selectedIds.has(p.id) ? <CheckSquare style={{ width: 14, height: 14, color: v.accent }} /> : <Square style={{ width: 14, height: 14, color: v.muted }} />}
                <span style={{ fontSize: 12, color: v.text }}>{p.name}</span>
                <span style={{ fontSize: 10, color: v.muted }}>{p.email}</span>
                {p.newsletterOptIn && <span style={{ fontSize: 9, padding: "0 4px", borderRadius: 4, background: `${v.success}15`, color: v.success }}>{t("m2.admin.optIn", "Opt-in")}</span>}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!subject.trim() || !contentHtml.trim() || selectedIds.size === 0 || sending}
          style={{
            width: "100%", marginTop: 12, padding: "10px 0", borderRadius: 8, border: "none",
            background: subject.trim() && contentHtml.trim() && selectedIds.size > 0 ? v.accent : v.muted,
            color: v.bg, fontSize: 14, fontWeight: 600, cursor: sending ? "wait" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="button-send-newsletter"
        >
          {sending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Send style={{ width: 14, height: 14 }} />}
          {sending ? t("m2.admin.sending", "Sending...") : t("m2.admin.sendNewsletter", "Send Newsletter")}
        </button>
      </div>

      {(newsletters as any[]).length > 0 && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Archive style={{ width: 16, height: 16, color: v.textSecondary }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: v.text }}>{t("m2.admin.archive", "Archive")}</span>
          </div>
          {(newsletters as any[]).map((nl: any) => (
            <div key={nl.id} style={{ padding: "8px 0", borderBottom: `1px solid ${v.border}` }} data-testid={`card-newsletter-${nl.id}`}>
              <div style={{ fontWeight: 500, fontSize: 13, color: v.text }}>{nl.subject}</div>
              <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>
                {t("m2.admin.sent", "Sent")}: {nl.sentAt ? new Date(nl.sentAt).toLocaleDateString() : "-"} · {t("m2.admin.recipientsLabel", "Recipients")}: {nl.recipientCount || 0}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangelogTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("feature");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [visible, setVisible] = useState(true);

  const CATEGORIES = [
    { value: "feature", label: t("m2.admin.catFeature", "Feature"), emoji: "🚀" },
    { value: "improvement", label: t("m2.admin.catImprovement", "Improvement"), emoji: "🔧" },
    { value: "bugfix", label: t("m2.admin.catBugfix", "Bugfix"), emoji: "🐛" },
    { value: "security", label: t("m2.admin.catSecurity", "Security"), emoji: "🛡️" },
    { value: "design", label: t("m2.admin.catDesign", "Design/UX"), emoji: "🎨" },
  ];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/admin/changelog", pid],
    queryFn: async () => {
      const res = await fetch(`/api/admin/changelog?participantId=${pid}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/changelog", { participantId: pid, title, description, category, date, visible });
      return res.json();
    },
    onSuccess: () => { toast({ title: t("m2.admin.entryCreated", "Entry created") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); resetForm(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/admin/changelog/${editingId}`, { participantId: pid, title, description, category, date, visible });
      return res.json();
    },
    onSuccess: () => { toast({ title: t("m2.admin.entryUpdated", "Entry updated") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); resetForm(); },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/changelog/${id}?participantId=${pid}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => { toast({ title: t("m2.admin.entryDeleted", "Entry deleted") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); },
  });

  const resetForm = () => { setShowForm(false); setEditingId(null); setTitle(""); setDescription(""); setCategory("feature"); setDate(new Date().toISOString().split("T")[0]); setVisible(true); };

  const startEdit = (entry: any) => { setEditingId(entry.id); setTitle(entry.title); setDescription(entry.description); setCategory(entry.category); setDate(entry.date); setVisible(entry.visible); setShowForm(true); };

  if (isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} /></div>;

  return (
    <div data-testid="admin-changelog-tab">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: v.muted }}>{entries.length} {t("m2.admin.entries", "entries")}</span>
        <button onClick={() => { resetForm(); setShowForm(true); }} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: v.accent, color: v.bg, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontFamily: "system-ui, sans-serif" }} data-testid="changelog-add">
          <MessageSquarePlus style={{ width: 12, height: 12 }} /> {t("m2.admin.newEntry", "New Entry")}
        </button>
      </div>

      {showForm && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16, marginBottom: 16 }}>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("m2.admin.titlePlaceholder", "Title...")} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, marginBottom: 8, fontFamily: "system-ui, sans-serif" }} data-testid="changelog-input-title" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("m2.admin.descriptionPlaceholder", "Description...")} rows={3} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, resize: "vertical", marginBottom: 8, fontFamily: "system-ui, sans-serif" }} data-testid="changelog-input-description" />
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 12, fontFamily: "system-ui, sans-serif" }} data-testid="changelog-input-category">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 12, fontFamily: "system-ui, sans-serif" }} data-testid="changelog-input-date" />
            <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: v.text, cursor: "pointer" }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} />
              {t("m2.admin.visible", "Visible")}
            </label>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()} disabled={!title || !description} style={{ padding: "6px 14px", borderRadius: 8, border: "none", background: v.accent, color: v.bg, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="changelog-save">
              {editingId ? t("m2.admin.update", "Update") : t("m2.admin.create", "Create")}
            </button>
            <button onClick={resetForm} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${v.border}`, background: "transparent", color: v.text, fontSize: 12, cursor: "pointer", fontFamily: "system-ui, sans-serif" }}>{t("m2.admin.cancel", "Cancel")}</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map((entry: any) => {
          const cat = CATEGORIES.find(c => c.value === entry.category);
          return (
            <div key={entry.id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: 12, opacity: entry.visible ? 1 : 0.5 }} data-testid={`changelog-entry-${entry.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12 }}>{cat?.emoji || "📝"}</span>
                    <span style={{ fontSize: 11, color: v.muted }}>{new Date(entry.date).toLocaleDateString("de-DE")}</span>
                    {!entry.visible && <span style={{ fontSize: 9, color: v.muted, padding: "0 4px", borderRadius: 4, border: `1px solid ${v.border}` }}>{t("m2.admin.hidden", "Hidden")}</span>}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{entry.title}</div>
                  <div style={{ fontSize: 11, color: v.muted, marginTop: 2 }}>{entry.description}</div>
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button onClick={() => startEdit(entry)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid={`changelog-edit-${entry.id}`}>
                    <Eye style={{ width: 12, height: 12, color: v.muted }} />
                  </button>
                  <button onClick={() => { if (confirm(t("m2.admin.confirmDeleteEntry", 'Delete "{{title}}"?', { title: entry.title }))) deleteMutation.mutate(entry.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid={`changelog-delete-${entry.id}`}>
                    <Trash2 style={{ width: 12, height: 12, color: v.danger }} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CleanupTab({ data, pid }: { data: AdminOverview; pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const testTastings = data.tastings.filter(ta => ta.isTestData);

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await adminApi.deleteTasting(id, pid);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/overview"] });
      toast({ title: t("m2.admin.tastingsDeleted", "{{count}} tastings deleted", { count: selectedIds.size }) });
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div data-testid="admin-cleanup-tab">
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Trash2 style={{ width: 18, height: 18, color: v.danger }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: v.text }}>{t("m2.admin.bulkCleanup", "Bulk Cleanup")}</span>
        </div>

        <div style={{ marginBottom: 12, fontSize: 13, color: v.muted }}>
          {t("m2.admin.testTastingsFound", "{{count}} test tastings found", { count: testTastings.length })} · {t("m2.admin.selectedCount", "{{count}} selected", { count: selectedIds.size })}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button onClick={() => setSelectedIds(new Set(testTastings.map(tt => tt.id)))} style={{ fontSize: 11, color: v.accent, background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="cleanup-select-all">{t("m2.admin.selectAllTest", "Select all test")}</button>
          <button onClick={() => setSelectedIds(new Set())} style={{ fontSize: 11, color: v.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "system-ui, sans-serif" }} data-testid="cleanup-deselect-all">{t("m2.admin.clear", "Clear")}</button>
        </div>

        <div style={{ maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
          {data.tastings.map(ta => (
            <div key={ta.id} onClick={() => toggleId(ta.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: 8, borderRadius: 8, cursor: "pointer", background: selectedIds.has(ta.id) ? `${v.danger}15` : "transparent" }} data-testid={`cleanup-item-${ta.id}`}>
              {selectedIds.has(ta.id) ? <CheckSquare style={{ width: 14, height: 14, color: v.danger }} /> : <Square style={{ width: 14, height: 14, color: v.muted }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: v.text, display: "flex", alignItems: "center", gap: 4 }}>
                  {ta.title}
                  {ta.isTestData && <span style={{ fontSize: 9, padding: "0 4px", borderRadius: 4, background: `${v.accent}15`, color: v.accent }}>TEST</span>}
                </div>
                <div style={{ fontSize: 10, color: v.muted }}>{ta.hostName} · {ta.date} · {ta.status}</div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => { if (selectedIds.size > 0 && confirm(t("m2.admin.confirmDeleteTastings", "Delete {{count}} tastings?", { count: selectedIds.size }))) deleteMutation.mutate(Array.from(selectedIds)); }}
          disabled={selectedIds.size === 0 || deleteMutation.isPending}
          style={{
            width: "100%", padding: "10px 0", borderRadius: 8, border: "none",
            background: selectedIds.size > 0 ? v.danger : v.muted,
            color: "#fff", fontSize: 13, fontWeight: 600, cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="cleanup-delete-btn"
        >
          {deleteMutation.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Trash2 style={{ width: 14, height: 14 }} />}
          {t("m2.admin.deleteSelected", "Delete {{count}} Selected", { count: selectedIds.size })}
        </button>
      </div>
    </div>
  );
}

function HistoricalImportTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showReconciliation, setShowReconciliation] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<any>(null);

  const { data: importRuns, isLoading: runsLoading } = useQuery({
    queryKey: ["/admin/historical/import-runs", pid],
    queryFn: async () => {
      const res = await fetch("/api/admin/historical/import-runs", {
        headers: { "x-participant-id": pid },
      });
      if (!res.ok) throw new Error("Failed to load import runs");
      return res.json();
    },
    enabled: !!pid,
  });

  const { data: reconciliation, isLoading: reconLoading, refetch: refetchRecon } = useQuery({
    queryKey: ["/admin/historical/reconciliation", pid],
    queryFn: async () => {
      const res = await fetch("/api/admin/historical/reconciliation", {
        headers: { "x-participant-id": pid },
      });
      if (!res.ok) throw new Error("Failed to load reconciliation");
      return res.json();
    },
    enabled: !!pid && showReconciliation,
  });

  const dryRunMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/historical/import?dryRun=true", {
        method: "POST",
        headers: { "x-participant-id": pid, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      setDryRunResult(data);
      toast({ title: t("m2.admin.dryRunComplete", "Dry-run complete") });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/admin/historical/import", {
        method: "POST",
        headers: { "x-participant-id": pid, "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t("m2.admin.importComplete", "Import complete") });
      setDryRunResult(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const latestRun = importRuns?.[0] || null;

  const statusColor = (status: string) => {
    if (status === "completed") return v.success;
    if (status === "failed") return v.danger;
    if (status === "running") return v.accent;
    return v.muted;
  };

  return (
    <div data-testid="admin-historical-tab">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <FileArchive style={{ width: 18, height: 18, color: v.accent }} />
        <span style={{ fontWeight: 600, fontSize: 16, color: v.text }}>
          {t("m2.admin.historicalImport", "Historical Import")}
        </span>
      </div>

      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: v.text, marginBottom: 10 }}>
          {t("m2.admin.latestImportRun", "Latest Import Run")}
        </div>
        {runsLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 24 }}>
            <Loader2 style={{ width: 20, height: 20, color: v.accent, animation: "spin 1s linear infinite" }} />
          </div>
        ) : latestRun ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 8,
                background: `${statusColor(latestRun.status)}20`, color: statusColor(latestRun.status),
                textTransform: "uppercase",
              }} data-testid="text-import-status">
                {latestRun.status}
              </span>
              {latestRun.createdAt && (
                <span style={{ fontSize: 11, color: v.muted }} data-testid="text-import-date">
                  {new Date(latestRun.createdAt).toLocaleString()}
                </span>
              )}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {[
                { label: t("m2.admin.rowsRead", "Rows Read"), value: latestRun.rowsRead ?? 0 },
                { label: t("m2.admin.rowsImported", "Imported"), value: latestRun.rowsImported ?? 0 },
                { label: t("m2.admin.rowsSkipped", "Skipped"), value: latestRun.rowsSkipped ?? 0 },
              ].map(s => (
                <div key={s.label} style={{ background: v.elevated, borderRadius: 8, padding: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: v.text }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: v.muted }}>{s.label}</div>
                </div>
              ))}
            </div>
            {latestRun.warningsCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: v.accent }}>
                <AlertTriangle style={{ width: 12, height: 12 }} />
                {latestRun.warningsCount} {t("m2.admin.warnings", "warnings")}
              </div>
            )}
            {latestRun.errorsCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4, fontSize: 11, color: v.danger }}>
                <XCircle style={{ width: 12, height: 12 }} />
                {latestRun.errorsCount} {t("m2.admin.errors", "errors")}
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 16, color: v.muted, fontSize: 13 }}>
            {t("m2.admin.noImportRuns", "No import runs yet.")}
          </div>
        )}
      </div>

      {importRuns && importRuns.length > 1 && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: v.text, marginBottom: 10 }}>
            {t("m2.admin.importHistory", "Import History")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {importRuns.slice(0, 10).map((run: any) => (
              <div key={run.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${v.border}` }} data-testid={`import-run-${run.id}`}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "1px 6px", borderRadius: 6,
                    background: `${statusColor(run.status)}20`, color: statusColor(run.status),
                  }}>
                    {run.status}
                  </span>
                  <span style={{ fontSize: 11, color: v.muted }}>
                    {run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: v.textSecondary }}>
                  {run.rowsImported ?? 0} / {run.rowsRead ?? 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => dryRunMutation.mutate()}
          disabled={dryRunMutation.isPending}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 16px", borderRadius: 10, border: `1px solid ${v.border}`,
            background: v.elevated, color: v.text, fontSize: 13, fontWeight: 500,
            cursor: dryRunMutation.isPending ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif", opacity: dryRunMutation.isPending ? 0.6 : 1,
          }}
          data-testid="btn-dry-run-import"
        >
          {dryRunMutation.isPending ? (
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <Play style={{ width: 14, height: 14 }} />
          )}
          {t("m2.admin.dryRunImport", "Dry-Run Import")}
        </button>
        <button
          onClick={() => {
            if (confirm(t("m2.admin.confirmImport", "Run full import? This will update the database."))) {
              importMutation.mutate();
            }
          }}
          disabled={importMutation.isPending}
          style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "10px 16px", borderRadius: 10, border: "none",
            background: v.accent, color: v.bg, fontSize: 13, fontWeight: 600,
            cursor: importMutation.isPending ? "not-allowed" : "pointer",
            fontFamily: "system-ui, sans-serif", opacity: importMutation.isPending ? 0.6 : 1,
          }}
          data-testid="btn-full-import"
        >
          {importMutation.isPending ? (
            <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
          ) : (
            <Database style={{ width: 14, height: 14 }} />
          )}
          {t("m2.admin.fullImport", "Full Import")}
        </button>
      </div>

      {dryRunResult && (
        <div style={{ background: v.card, border: `1px solid ${v.accent}40`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <Play style={{ width: 14, height: 14, color: v.accent }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: v.text }}>
              {t("m2.admin.dryRunResults", "Dry-Run Results")}
            </span>
            <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 6, background: `${v.accent}20`, color: v.accent, fontWeight: 600 }}>
              DRY RUN
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 8 }}>
            {[
              { label: t("m2.admin.rowsRead", "Rows Read"), value: dryRunResult.rowsRead },
              { label: t("m2.admin.wouldImport", "Would Import"), value: dryRunResult.rowsImported },
              { label: t("m2.admin.tastingsFound", "Tastings Found"), value: dryRunResult.tastingsCreated },
              { label: t("m2.admin.entriesFound", "Entries Found"), value: dryRunResult.entriesCreated },
            ].map(s => (
              <div key={s.label} style={{ background: v.elevated, borderRadius: 8, padding: 8, textAlign: "center" }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: v.text }}>{s.value}</div>
                <div style={{ fontSize: 10, color: v.muted }}>{s.label}</div>
              </div>
            ))}
          </div>
          {dryRunResult.warnings?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 4 }}>
                <AlertTriangle style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {dryRunResult.warnings.length} {t("m2.admin.warnings", "warnings")}
              </div>
              <div style={{ maxHeight: 160, overflowY: "auto", fontSize: 11, color: v.muted }}>
                {dryRunResult.warnings.slice(0, 20).map((w: any, i: number) => (
                  <div key={i} style={{ padding: "2px 0", borderBottom: `1px solid ${v.border}` }}>
                    Row {w.row}: {w.field} — {w.message} {w.value && `(${w.value})`}
                  </div>
                ))}
                {dryRunResult.warnings.length > 20 && (
                  <div style={{ padding: "4px 0", fontStyle: "italic" }}>
                    +{dryRunResult.warnings.length - 20} more...
                  </div>
                )}
              </div>
            </div>
          )}
          {dryRunResult.errors?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: v.danger, marginBottom: 4 }}>
                <XCircle style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                {dryRunResult.errors.length} {t("m2.admin.errors", "errors")}
              </div>
              <div style={{ fontSize: 11, color: v.danger }}>
                {dryRunResult.errors.map((e: string, i: number) => (
                  <div key={i} style={{ padding: "2px 0" }}>{e}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}>
        <button
          onClick={() => { setShowReconciliation(true); if (showReconciliation) refetchRecon(); }}
          style={{
            display: "flex", alignItems: "center", gap: 6, width: "100%",
            padding: 0, border: "none", background: "none", cursor: "pointer",
            fontFamily: "system-ui, sans-serif",
          }}
          data-testid="btn-show-reconciliation"
        >
          <FileWarning style={{ width: 16, height: 16, color: v.accent }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: v.text, flex: 1, textAlign: "left" }}>
            {t("m2.admin.reconciliationReport", "Reconciliation Report")}
          </span>
          {reconLoading && <Loader2 style={{ width: 14, height: 14, color: v.accent, animation: "spin 1s linear infinite" }} />}
          <ChevronRight style={{ width: 14, height: 14, color: v.muted, transform: showReconciliation ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
        </button>

        {showReconciliation && reconciliation && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {[
                { label: t("m2.admin.totalTastings", "Tastings"), value: reconciliation.summary?.totalTastings ?? 0 },
                { label: t("m2.admin.totalEntries", "Entries"), value: reconciliation.summary?.totalEntries ?? 0 },
                { label: t("m2.admin.importRuns", "Import Runs"), value: reconciliation.summary?.totalImportRuns ?? 0 },
              ].map(s => (
                <div key={s.label} style={{ background: v.elevated, borderRadius: 8, padding: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: v.text }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: v.muted }}>{s.label}</div>
                </div>
              ))}
            </div>

            {reconciliation.parseSuccessRates && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: v.text, marginBottom: 6 }}>
                  {t("m2.admin.parseRates", "Parse Success Rates")}
                </div>
                {Object.entries(reconciliation.parseSuccessRates).map(([field, stats]: [string, any]) => (
                  <div key={field} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${v.border}` }}>
                    <span style={{ fontSize: 12, color: v.text, textTransform: "capitalize" }}>{field}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, color: v.muted }}>{stats.parsed}/{stats.total}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600,
                        color: stats.rate >= 90 ? v.success : stats.rate >= 70 ? v.accent : v.danger,
                      }}>
                        {stats.rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {reconciliation.duplicates && (reconciliation.duplicates.duplicateSourceKeys > 0 || reconciliation.duplicates.duplicateWhiskyKeys > 0) && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 4 }}>
                  {t("m2.admin.duplicates", "Duplicates")}
                </div>
                <div style={{ fontSize: 11, color: v.muted }}>
                  {reconciliation.duplicates.duplicateSourceKeys > 0 && (
                    <div>{reconciliation.duplicates.duplicateSourceKeys} duplicate tasting keys</div>
                  )}
                  {reconciliation.duplicates.duplicateWhiskyKeys > 0 && (
                    <div>{reconciliation.duplicates.duplicateWhiskyKeys} duplicate whisky keys</div>
                  )}
                </div>
              </div>
            )}

            {reconciliation.outliers && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: v.text, marginBottom: 4 }}>
                  {t("m2.admin.outliers", "Outliers")}
                </div>
                <div style={{ fontSize: 11, color: v.muted }}>
                  {[
                    { label: "Scores out of range", count: reconciliation.outliers.scoresOutOfRange?.length ?? 0 },
                    { label: "Extreme ABV", count: reconciliation.outliers.extremeAbv?.length ?? 0 },
                    { label: "Extreme Age", count: reconciliation.outliers.extremeAge?.length ?? 0 },
                    { label: "Extreme Price", count: reconciliation.outliers.extremePrice?.length ?? 0 },
                  ].map(o => (
                    <div key={o.label} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span>{o.label}</span>
                      <span style={{ fontWeight: 600, color: o.count > 0 ? v.accent : v.success }}>
                        {o.count === 0 ? <CheckCircle style={{ width: 12, height: 12, display: "inline", verticalAlign: "middle" }} /> : o.count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reconciliation.malformedRows?.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: v.danger, marginBottom: 4 }}>
                  {reconciliation.malformedRows.length} {t("m2.admin.malformedRows", "Malformed Rows")}
                </div>
                <div style={{ maxHeight: 120, overflowY: "auto", fontSize: 11, color: v.muted }}>
                  {reconciliation.malformedRows.slice(0, 10).map((row: any, i: number) => (
                    <div key={i} style={{ padding: "2px 0", borderBottom: `1px solid ${v.border}` }}>
                      {row.distillery || "?"} — {row.whiskyName || "?"}: {row.issues.join(", ")}
                    </div>
                  ))}
                  {reconciliation.malformedRows.length > 10 && (
                    <div style={{ fontStyle: "italic", padding: "4px 0" }}>+{reconciliation.malformedRows.length - 10} more</div>
                  )}
                </div>
              </div>
            )}

            {reconciliation.warnings?.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: v.accent, marginBottom: 4 }}>
                  {reconciliation.warnings.length} {t("m2.admin.warnings", "warnings")}
                </div>
                <div style={{ fontSize: 11, color: v.muted }}>
                  {reconciliation.warnings.map((w: string, i: number) => (
                    <div key={i} style={{ padding: "2px 0" }}>{w}</div>
                  ))}
                </div>
              </div>
            )}

            {reconciliation.nullFieldRates && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 12, fontWeight: 600, color: v.textSecondary, cursor: "pointer" }}>
                  {t("m2.admin.nullFieldRates", "Null Field Rates")}
                </summary>
                <div style={{ marginTop: 4, fontSize: 11, color: v.muted }}>
                  {Object.entries(reconciliation.nullFieldRates).map(([field, stats]: [string, any]) => (
                    <div key={field} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", borderBottom: `1px solid ${v.border}` }}>
                      <span>{field}</span>
                      <span>{stats.rate}% null ({stats.nullCount}/{stats.totalCount})</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <div style={{ fontSize: 10, color: v.muted, marginTop: 8, textAlign: "right" }} data-testid="text-reconciliation-date">
              {t("m2.admin.generatedAt", "Generated")}: {reconciliation.generatedAt ? new Date(reconciliation.generatedAt).toLocaleString() : "—"}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalyticsTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["/admin/analytics", pid],
    queryFn: () => adminApi.getAnalytics(pid),
    enabled: !!pid,
  });

  if (isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} /></div>;

  if (!data) return <div style={{ textAlign: "center", padding: 32, color: v.muted }}>{t("m2.admin.noAnalyticsData", "No analytics data available.")}</div>;

  const analytics = data as any;

  return (
    <div data-testid="admin-analytics-tab">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: t("m2.admin.totalRatings", "Total Ratings"), value: analytics.totalRatings || 0 },
          { label: t("m2.admin.totalWhiskies", "Total Whiskies"), value: analytics.totalWhiskies || 0 },
          { label: t("m2.admin.totalTastings", "Total Tastings"), value: analytics.totalTastings || 0 },
          { label: t("m2.admin.totalParticipants", "Total Participants"), value: analytics.totalParticipants || 0 },
        ].map(s => (
          <div key={s.label} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: 12, textAlign: "center" }} data-testid={`analytics-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <div style={{ fontSize: 22, fontWeight: 700, color: v.text, fontFamily: "'Playfair Display', serif" }}>{s.value}</div>
            <div style={{ fontSize: 11, color: v.muted }}>{s.label}</div>
          </div>
        ))}
      </div>

      {analytics.topWhiskies?.length > 0 && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: v.text, display: "block", marginBottom: 10 }}>{t("m2.admin.topWhiskies", "Top Whiskies")}</span>
          {analytics.topWhiskies.slice(0, 10).map((w: any, i: number) => (
            <div key={w.id || i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${v.border}` }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: v.text }}>{i + 1}. {w.name}</span>
                {w.distillery && <span style={{ fontSize: 10, color: v.muted, marginLeft: 6 }}>{w.distillery}</span>}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: v.accent }}>{Number(w.avgScore).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {analytics.regionCounts?.length > 0 && (
        <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: v.text, display: "block", marginBottom: 10 }}>{t("m2.admin.regions", "Regions")}</span>
          {analytics.regionCounts.map(([region, count]: [string, number]) => (
            <div key={region} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ fontSize: 12, color: v.text }}>{region}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: v.accent }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-app-settings", pid],
    queryFn: async () => {
      const res = await fetch(`/api/admin/app-settings?requesterId=${pid}`);
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json() as Promise<Record<string, string>>;
    },
  });

  const updateSetting = useMutation({
    mutationFn: async (updates: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/admin/app-settings", { requesterId: pid, settings: updates });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] }); toast({ title: t("m2.admin.settingsSaved", "Settings saved") }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const [bannerText, setBannerText] = useState("");

  useEffect(() => {
    if (settings) setBannerText(settings.whats_new_text || "");
  }, [settings]);

  if (isLoading || !settings) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} /></div>;

  const toggleSetting = (key: string) => {
    const current = settings[key] === "true";
    updateSetting.mutate({ [key]: String(!current) });
  };

  const settingItems = [
    { key: "whats_new_enabled", label: t("m2.admin.whatsNewBanner", "What's New Banner"), desc: t("m2.admin.whatsNewBannerDesc", "Show announcement banner to users") },
    { key: "guest_mode_enabled", label: t("m2.admin.guestMode", "Guest Mode"), desc: t("m2.admin.guestModeDesc", "Allow guest access without registration") },
    { key: "registration_open", label: t("m2.admin.registration", "Registration"), desc: t("m2.admin.registrationDesc", "Allow new user registrations") },
    { key: "maintenance_mode", label: t("m2.admin.maintenanceMode", "Maintenance Mode"), desc: t("m2.admin.maintenanceModeDesc", "Show maintenance page to non-admins") },
    { key: "friend_online_notifications", label: t("m2.admin.friendOnlineNotifications", "Friend Online Notifications"), desc: t("m2.admin.friendOnlineNotificationsDesc", "Allow users to receive friend online/offline notifications") },
  ];

  return (
    <div data-testid="admin-settings-tab">
      <div style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <Settings style={{ width: 18, height: 18, color: v.accent }} />
          <span style={{ fontWeight: 600, fontSize: 16, color: v.text }}>{t("m2.admin.appSettings", "App Settings")}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {settingItems.map(item => (
            <div key={item.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 8, border: `1px solid ${v.border}` }} data-testid={`setting-${item.key}`}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: v.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: v.muted }}>{item.desc}</div>
              </div>
              <button
                onClick={() => toggleSetting(item.key)}
                style={{
                  width: 40, height: 22, borderRadius: 11, border: "none", cursor: "pointer",
                  background: settings[item.key] === "true" ? v.success : v.muted,
                  position: "relative", transition: "background 0.2s",
                }}
                data-testid={`switch-${item.key}`}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", background: "#fff",
                  position: "absolute", top: 3,
                  left: settings[item.key] === "true" ? 21 : 3, transition: "left 0.2s",
                }} />
              </button>
            </div>
          ))}
        </div>

        {settings.whats_new_enabled === "true" && (
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 500, color: v.text, display: "block", marginBottom: 4 }}>{t("m2.admin.bannerText", "Banner Text")}</label>
            <input
              type="text"
              value={bannerText}
              onChange={e => setBannerText(e.target.value)}
              onBlur={() => updateSetting.mutate({ whats_new_text: bannerText })}
              placeholder={t("m2.admin.whatsNewPlaceholder", "What's new message...")}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${v.inputBorder}`, background: v.inputBg, color: v.inputText, fontSize: 13, fontFamily: "system-ui, sans-serif" }}
              data-testid="input-whats-new-text"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["/feedback", pid],
    queryFn: () => feedbackApi.getAll(pid),
    enabled: !!pid,
  });

  const categoryIcons: Record<string, string> = {
    bug: "🐛", feature: "💡", improvement: "🔧", other: "📝",
  };

  if (isLoading) return <div style={{ display: "flex", justifyContent: "center", padding: 48 }}><Loader2 style={{ width: 24, height: 24, color: v.accent, animation: "spin 1s linear infinite" }} /></div>;

  return (
    <div data-testid="admin-feedback-tab">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <MessageSquarePlus style={{ width: 18, height: 18, color: v.accent }} />
        <span style={{ fontWeight: 600, fontSize: 16, color: v.text }}>{t("m2.admin.userFeedback", "User Feedback")}</span>
        <span style={{ fontSize: 12, color: v.muted }}>({(feedback as any[]).length})</span>
      </div>

      {(feedback as any[]).length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: v.muted }}>{t("m2.admin.noFeedbackYet", "No feedback yet.")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(feedback as any[]).map((fb: any) => (
            <div key={fb.id} style={{ background: v.card, border: `1px solid ${v.border}`, borderRadius: 10, padding: 12 }} data-testid={`feedback-item-${fb.id}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>{categoryIcons[fb.category] || "📝"}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: v.accent, textTransform: "uppercase" }}>{fb.category}</span>
                {fb.participantName && <span style={{ fontSize: 11, color: v.muted }}>· {fb.participantName}</span>}
                {fb.createdAt && <span style={{ fontSize: 10, color: v.muted }}>· {new Date(fb.createdAt).toLocaleDateString()}</span>}
              </div>
              <div style={{ fontSize: 13, color: v.text, lineHeight: 1.5 }}>{fb.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
