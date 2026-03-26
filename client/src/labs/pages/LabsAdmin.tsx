import { useState, useEffect, useRef, Fragment, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { adminApi, feedbackApi } from "@/lib/api";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { apiRequest } from "@/lib/queryClient";
import { stripGuestSuffix } from "@/lib/utils";
import { useAIStatus } from "@/hooks/use-ai-status";
import { useToast } from "@/hooks/use-toast";
import { getSession, useSession } from "@/lib/session";
import {
  ShieldAlert, Users, Wine, Crown, Trash2, Search, Shield, User,
  Calendar, Eye, Hash, BarChart3, ChevronRight, Database,
  Mail, Sparkles, Send, Archive, CheckSquare, Square, Loader2,
  Brain, Clock, Settings, FlaskConical, Wifi, XCircle, CheckCircle,
  MessageSquarePlus, Rocket, AlertTriangle,
  FileArchive, Play, FileWarning, Globe, Lock, UserPlus, ToggleLeft, ToggleRight,
  BookOpen, ExternalLink, Activity, ChevronLeft, Flower2, Plus, GripVertical, Pencil, X,
  FileText, RotateCcw, TrendingUp, ArrowUpRight, ArrowDownRight, Timer, MailCheck,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

type AdminTab = "participants" | "tastings" | "online" | "activity" | "sessions" | "ai" | "newsletter" | "changelog" | "cleanup" | "analytics" | "historical" | "communities" | "settings" | "feedback" | "making-of" | "aromas" | "trash";

const ADMIN_GROUPS = [
  {
    id: "nutzer",
    labelKey: "admin.groupUsers",
    icon: Users,
    tabs: [
      { id: "participants", labelKey: "admin.tabParticipants" },
      { id: "online",       labelKey: "admin.tabOnline" },
      { id: "sessions",     labelKey: "admin.tabSessions" },
      { id: "activity",     labelKey: "admin.tabActivity" },
    ],
  },
  {
    id: "tastings",
    labelKey: "admin.groupTastings",
    icon: Wine,
    tabs: [
      { id: "tastings",     labelKey: "admin.tabTastings" },
      { id: "historical",   labelKey: "admin.tabArchiveImport" },
    ],
  },
  {
    id: "communities-group",
    labelKey: "admin.groupCommunities",
    icon: Globe,
    tabs: [
      { id: "communities",  labelKey: "admin.tabCommunities" },
    ],
  },
  {
    id: "inhalt",
    labelKey: "admin.groupContent",
    icon: FileText,
    tabs: [
      { id: "aromas",       labelKey: "admin.tabAromas" },
      { id: "changelog",    labelKey: "admin.tabChangelog" },
      { id: "making-of",    labelKey: "admin.tabMakingOf" },
    ],
  },
  {
    id: "tools",
    labelKey: "admin.groupAiTools",
    icon: Sparkles,
    tabs: [
      { id: "ai",           labelKey: "admin.tabAiStatus" },
      { id: "newsletter",   labelKey: "admin.tabNewsletter" },
      { id: "feedback",     labelKey: "admin.tabFeedback" },
    ],
  },
  {
    id: "system",
    labelKey: "admin.groupSystem",
    icon: Settings,
    tabs: [
      { id: "settings",     labelKey: "admin.tabSettings" },
      { id: "cleanup",      labelKey: "admin.tabCleanup" },
      { id: "analytics",    labelKey: "admin.tabAnalytics" },
      { id: "trash",        labelKey: "admin.tabTrash" },
    ],
  },
] as const;

type AdminGroup = typeof ADMIN_GROUPS[number]["id"];

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
  makingOfAccess: boolean;
  emailVerified: boolean;
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

const labsInput: React.CSSProperties = {
  width: "100%", padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--labs-border)", background: "var(--labs-surface)",
  color: "var(--labs-text)", fontSize: 13,
};

const labsSelect: React.CSSProperties = {
  padding: "8px 12px", borderRadius: 8,
  border: "1px solid var(--labs-border)", background: "var(--labs-surface)",
  color: "var(--labs-text)", fontSize: 13,
};

export default function LabsAdmin() {
  const [, navigate] = useLocation();
  const goBackToHome = useBackNavigation("/labs/home");
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const pid = session.pid || "";
  const [activeGroup, setActiveGroup] = useState<AdminGroup>("nutzer");
  const [activeTab, setActiveTab] = useState<AdminTab>("participants");

  const activateGroup = (groupId: AdminGroup) => {
    const group = ADMIN_GROUPS.find(g => g.id === groupId);
    if (group) {
      setActiveGroup(groupId);
      setActiveTab(group.tabs[0].id as AdminTab);
    }
  };

  const { data, isLoading, isError, refetch } = useQuery<AdminOverview>({
    queryKey: ["/admin/overview", pid],
    queryFn: () => adminApi.getOverview(pid),
    enabled: !!pid,
  });

  if (!pid || session.role !== "admin") {
    return !pid ? (
      <AuthGateMessage
        icon={<Shield className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        message={t("admin.pleaseSignIn")}
      />
    ) : (
      <div className="labs-page labs-fade-in text-center" data-testid="labs-admin-access-denied">
        <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--labs-accent)" }} />
        <p className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("admin.accessDenied")}</p>
        <p className="text-sm mt-2" style={{ color: "var(--labs-text-muted)" }}>{t("admin.noAdminPrivileges")}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--labs-accent)" }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="labs-page text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--labs-danger)" }} />
        <p className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("admin.accessDenied")}</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-retry">{t("admin.retry")}</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 80px" }}
         data-testid="labs-admin-page">

      <div style={{ marginBottom: 20 }}>
        <button onClick={goBackToHome}
          style={{ display: "flex", alignItems: "center", gap: 4,
                   background: "none", border: "none", cursor: "pointer",
                   color: "var(--labs-text-muted)", fontSize: 14,
                   minHeight: 44, padding: "0 0 8px" }}
          data-testid="labs-admin-back">
          <ChevronLeft className="w-4 h-4" /> {t("admin.home")}
        </button>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26,
                       fontWeight: 700, color: "var(--labs-text)", margin: 0 }}
              data-testid="labs-admin-title">
            {t("admin.adminPanel")}
          </h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8, marginBottom: 0 }}>
          {[
            { label: t("admin.statUsers", "Users"),     value: data.stats.totalParticipants, Icon: Users },
            { label: t("admin.statHosts", "Hosts"),     value: data.stats.totalHosts,        Icon: Crown },
            { label: t("admin.statTastings", "Tastings"), value: data.stats.totalTastings,   Icon: Wine  },
            { label: t("admin.statAdmins", "Admins"),   value: data.stats.totalAdmins,       Icon: Shield },
          ].map(s => (
            <div key={s.label}
              style={{ background: "var(--labs-surface)",
                       border: "1px solid var(--labs-border)",
                       borderRadius: 10, padding: "10px 12px",
                       display: "flex", alignItems: "center", gap: 8 }}
              data-testid={`labs-admin-stat-${s.label.toLowerCase()}`}>
              <s.Icon style={{ width: 14, height: 14, color: "var(--labs-accent)",
                               flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700,
                              color: "var(--labs-text)", lineHeight: 1 }}>
                  {s.value}
                </div>
                <div style={{ fontSize: 10, color: "var(--labs-text-muted)",
                              marginTop: 2 }}>
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}
           className="admin-layout">
        <style>{`
          @media (max-width: 767px) {
            .admin-sidebar { display: none !important; }
            .admin-mobile-nav { display: block !important; }
            .admin-layout { display: block !important; }
          }
          @media (min-width: 768px) {
            .admin-mobile-nav { display: none !important; }
          }
        `}</style>

        <div className="admin-sidebar"
          style={{ width: 220, flexShrink: 0, position: "sticky", top: 16 }}>
          {ADMIN_GROUPS.map(group => {
            const isGroupActive = activeGroup === group.id;
            const GroupIcon = group.icon;
            return (
              <div key={group.id} style={{ marginBottom: 4 }}>
                <button
                  onClick={() => activateGroup(group.id)}
                  data-testid={`admin-group-${group.id}`}
                  style={{
                    width: "100%", textAlign: "left",
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 12px", borderRadius: 10,
                    border: "none", cursor: "pointer",
                    fontSize: 14,
                    fontWeight: isGroupActive ? 600 : 400,
                    background: isGroupActive
                      ? "var(--labs-surface-elevated)" : "none",
                    color: isGroupActive
                      ? "var(--labs-accent)" : "var(--labs-text-muted)",
                    minHeight: 44,
                    transition: "background 150ms, color 150ms",
                  }}>
                  <GroupIcon style={{ width: 16, height: 16, flexShrink: 0,
                    color: isGroupActive
                      ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                  {t(group.labelKey)}
                </button>

                {isGroupActive && (
                  <div style={{ marginTop: 2 }}>
                    {group.tabs.map(tab => {
                      const isTabActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as AdminTab)}
                          data-testid={`labs-admin-tab-${tab.id}`}
                          style={{
                            width: "100%", textAlign: "left",
                            padding: "7px 12px 7px 36px",
                            borderRadius: 8, border: "none",
                            cursor: "pointer", fontSize: 13,
                            fontWeight: isTabActive ? 600 : 400,
                            background: isTabActive
                              ? "var(--labs-accent-muted)" : "none",
                            color: isTabActive
                              ? "var(--labs-accent)"
                              : "var(--labs-text-secondary)",
                            minHeight: 36,
                            display: "block",
                            transition: "background 150ms, color 150ms",
                          }}>
                          {t(tab.labelKey)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="admin-mobile-nav" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 6, overflowX: "auto",
                        scrollbarWidth: "none", paddingBottom: 8,
                        marginBottom: 8 }}>
            {ADMIN_GROUPS.map(group => {
              const isGroupActive = activeGroup === group.id;
              return (
                <button key={group.id}
                  onClick={() => activateGroup(group.id)}
                  data-testid={`admin-group-mobile-${group.id}`}
                  style={{
                    padding: "6px 14px", borderRadius: 999,
                    minHeight: 36, fontSize: 13, flexShrink: 0,
                    fontWeight: isGroupActive ? 600 : 400,
                    background: isGroupActive
                      ? "var(--labs-accent)"
                      : "var(--labs-surface-elevated)",
                    color: isGroupActive
                      ? "var(--labs-bg)"
                      : "var(--labs-text-secondary)",
                    border: "none", cursor: "pointer",
                    transition: "background 150ms, color 150ms",
                  }}>
                  {t(group.labelKey)}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 6, overflowX: "auto",
                        scrollbarWidth: "none", paddingBottom: 4 }}>
            {ADMIN_GROUPS.find(g => g.id === activeGroup)?.tabs.map(tab => {
              const isTabActive = activeTab === tab.id;
              return (
                <button key={tab.id}
                  onClick={() => setActiveTab(tab.id as AdminTab)}
                  data-testid={`labs-admin-tab-${tab.id}`}
                  style={{
                    padding: "5px 12px", borderRadius: 999,
                    minHeight: 32, fontSize: 12, flexShrink: 0,
                    fontWeight: isTabActive ? 600 : 400,
                    background: isTabActive
                      ? "var(--labs-surface-elevated)"
                      : "none",
                    color: isTabActive
                      ? "var(--labs-accent)"
                      : "var(--labs-text-muted)",
                    border: isTabActive
                      ? "1px solid var(--labs-accent)"
                      : "1px solid var(--labs-border)",
                    cursor: "pointer",
                    transition: "all 150ms",
                  }}>
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {activeTab === "participants" && <ParticipantsTab data={data} pid={pid} />}
          {activeTab === "tastings"     && <TastingsTab data={data} pid={pid} />}
          {activeTab === "online"       && <OnlineTab />}
          {activeTab === "activity"     && <ActivityTab pid={pid} />}
          {activeTab === "sessions"     && <SessionsTab pid={pid} />}
          {activeTab === "ai"           && <AITab pid={pid} />}
          {activeTab === "newsletter"   && <NewsletterTab participants={data.participants} pid={pid} />}
          {activeTab === "changelog"    && <ChangelogTab pid={pid} />}
          {activeTab === "cleanup"      && <CleanupTab data={data} pid={pid} />}
          {activeTab === "analytics"    && <AnalyticsTab pid={pid} />}
          {activeTab === "historical"   && <HistoricalImportTab pid={pid} />}
          {activeTab === "communities"  && <CommunitiesTab pid={pid} participants={data.participants} />}
          {activeTab === "settings"     && <SettingsTab pid={pid} />}
          {activeTab === "feedback"     && <FeedbackTab pid={pid} />}
          {activeTab === "making-of"    && <MakingOfTab pid={pid} participants={data.participants} />}
          {activeTab === "aromas"       && <AromasTab pid={pid} />}
          {activeTab === "trash"        && <AdminTrashTab pid={pid} />}
        </div>
      </div>
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
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) => adminApi.updateRole(participantId, role, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: t("admin.roleUpdated") }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (participantId: string) => adminApi.deleteParticipant(participantId, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: t("admin.participantDeleted") }); },
  });

  const filtered = data.participants.filter(p => {
    if (filterRole !== "all" && p.role !== filterRole) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div data-testid="labs-admin-participants-tab">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.searchParticipants")} style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-input-search-participants" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={labsSelect} data-testid="labs-admin-select-filter-role">
          <option value="all">{t("admin.allRoles")}</option>
          <option value="admin">{t("admin.roleAdmin")}</option>
          <option value="host">{t("admin.roleHost")}</option>
          <option value="user">{t("admin.roleUser")}</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noResults") }</div>
        ) : filtered.map(p => (
          <div key={p.id} className="labs-card p-3.5" data-testid={`labs-admin-participant-${p.id}`}>
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {p.role === "admin" ? <Shield className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /> :
                   p.role === "host" ? <Crown className="w-3.5 h-3.5" style={{ color: "var(--labs-info)" }} /> :
                   <User className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />}
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{stripGuestSuffix(p.name)}</span>
                  {p.id === pid && <span className="text-[11px] px-1.5 rounded" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("m2.circle.you")}</span>}
                  {p.email?.endsWith("@casksense.local") && <span className="text-[11px] px-1.5 rounded font-semibold" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("discover.testData", "TEST")}</span>}
                </div>
                <div className="text-[11px] mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: "var(--labs-text-muted)" }}>
                  <span>{p.email || t("admin.noEmail")}</span>
                  {p.email && !p.email.endsWith("@casksense.local") && (
                    p.emailVerified ? (
                      <CheckCircle className="w-3 h-3 inline" style={{ color: "var(--labs-success)" }} />
                    ) : (
                      <XCircle className="w-3 h-3 inline" style={{ color: "var(--labs-danger)" }} />
                    )
                  )}
                  <span>· {p.hostedTastings} {t("admin.hostedTastings")}</span>
                  {p.createdAt && <span>· {new Date(p.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select value={p.role} onChange={e => roleMutation.mutate({ participantId: p.id, role: e.target.value })} disabled={p.id === pid} style={{ ...labsSelect, padding: "4px 8px", fontSize: 11 }} data-testid={`labs-admin-select-role-${p.id}`}>
                  <option value="user">{t("admin.roleUser")}</option>
                  <option value="host">{t("admin.roleHost")}</option>
                  <option value="admin">{t("admin.roleAdmin")}</option>
                </select>
                {p.id !== pid && (
                  <button onClick={() => { if (confirm(t("admin.confirmDeleteParticipant", { name: p.name }))) deleteMutation.mutate(p.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-delete-participant-${p.id}`}>
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
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
  const [showTestData, setShowTestData] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: (tastingId: string) => adminApi.deleteTasting(tastingId, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: t("admin.tastingDeleted") }); },
  });
  const toggleTestMutation = useMutation({
    mutationFn: async ({ id, isTestData }: { id: string; isTestData: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/tastings/${id}/test-flag`, { requesterId: pid, isTestData });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: t("admin.testFlagUpdated") }); },
  });

  const filtered = data.tastings.filter(ta => {
    if (ta.code === "DEMO") return false;
    if (!showTestData && ta.isTestData) return false;
    if (filterStatus !== "all" && ta.status !== filterStatus) return false;
    if (search && !ta.title.toLowerCase().includes(search.toLowerCase()) && !ta.hostName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusColor = (s: string) => {
    if (s === "open") return "var(--labs-success)";
    if (s === "closed") return "var(--labs-accent)";
    if (s === "reveal") return "var(--labs-info)";
    return "var(--labs-text-muted)";
  };

  return (
    <div data-testid="labs-admin-tastings-tab">
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.searchTastings")} style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-input-search-tastings" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={labsSelect} data-testid="labs-admin-select-filter-status">
          <option value="all">{t("admin.allStatuses")}</option>
          <option value="draft">{t("admin.statusDraft")}</option>
          <option value="open">{t("admin.statusOpen")}</option>
          <option value="closed">{t("admin.statusClosed")}</option>
          <option value="reveal">{t("admin.statusReveal")}</option>
          <option value="archived">{t("admin.statusArchived")}</option>
        </select>
        <button
          onClick={() => setShowTestData(!showTestData)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${showTestData ? "var(--labs-accent)" : "var(--labs-border)"}`,
            background: showTestData ? "var(--labs-accent-muted)" : "transparent",
            color: showTestData ? "var(--labs-accent)" : "var(--labs-text-muted)",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          data-testid="labs-admin-toggle-show-test"
        >
          <FlaskConical className="w-3 h-3" />
          {t("discover.testBadge", "Test")}
        </button>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noResults") }</div>
        ) : filtered.map(tasting => (
          <div key={tasting.id} className="labs-card p-3.5" data-testid={`labs-admin-tasting-${tasting.id}`}>
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{tasting.title}</span>
                  <span className="text-[11px] px-2 rounded-full font-semibold" style={{ background: `${statusColor(tasting.status)}20`, color: statusColor(tasting.status) }}>{tasting.status}</span>
                  {tasting.isTestData && <span className="text-[11px] px-1.5 rounded font-semibold" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("discover.testData", "TEST")}</span>}
                </div>
                <div className="flex flex-wrap gap-2 mt-1 text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                  <span className="flex items-center gap-1"><Crown className="w-2.5 h-2.5" />{stripGuestSuffix(tasting.hostName)}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{tasting.date}</span>
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{tasting.participantCount}</span>
                  <span className="flex items-center gap-1"><Wine className="w-2.5 h-2.5" />{tasting.whiskyCount}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => toggleTestMutation.mutate({ id: tasting.id, isTestData: !tasting.isTestData })} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-toggle-test-${tasting.id}`}>
                  <FlaskConical className="w-3.5 h-3.5" style={{ color: tasting.isTestData ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                </button>
                <button onClick={() => { if (confirm(t("admin.confirmDeleteTasting", { title: tasting.title }))) deleteMutation.mutate(tasting.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-delete-tasting-${tasting.id}`}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
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
    queryFn: async () => { const res = await fetch("/api/admin/online-users?minutes=10"); if (!res.ok) throw new Error("Failed"); return res.json(); },
    refetchInterval: 15000,
  });

  const formatTime = (ts: string) => {
    const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diffMin < 1) return t("admin.justNow");
    if (diffMin < 60) return t("admin.minutesAgo", { count: diffMin });
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div data-testid="labs-admin-online-tab">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.onlineUsers") }</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>{onlineUsers.length}</span>
        </div>
        <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
          <Clock className="w-3 h-3" /> {t("admin.autoRefresh")}
        </span>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
      ) : onlineUsers.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noUsersOnline") }</div>
      ) : (
        <div className="space-y-2">
          {onlineUsers.map((u: Record<string, unknown>) => (
            <div key={u.id as string} className="labs-card p-3 flex items-center gap-2.5" data-testid={`labs-admin-online-${u.id}`}>
              <div className="relative">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--labs-surface-elevated)" }}>
                  <User className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ border: "2px solid var(--labs-surface)", background: Date.now() - new Date(u.lastSeenAt as string).getTime() < 120000 ? "var(--labs-success)" : "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{String(u.name ?? "")}</span>
                  {u.role === "admin" && <span className="text-[11px] px-1 rounded font-semibold" style={{ background: "var(--labs-danger-muted)", color: "var(--labs-danger)" }}>{t("admin.adminBadge")}</span>}
                </div>
                {u.email && <div className="text-[11px] truncate" style={{ color: "var(--labs-text-muted)" }}>{String(u.email)}</div>}
              </div>
              <span className="text-[11px] flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>{formatTime(u.lastSeenAt as string)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FilterOption { id: string; name: string; email?: string; role?: string; title?: string; date?: string }
interface ActivityFilters { userIds: string[]; hostIds: string[]; tastingId: string; communityId: string }
const emptyFilters: ActivityFilters = { userIds: [], hostIds: [], tastingId: "", communityId: "" };

function useFilterOptions(pid: string) {
  return useQuery({
    queryKey: ["/api/admin/filter-options", pid],
    queryFn: () => adminApi.getFilterOptions(pid),
    enabled: !!pid,
    staleTime: 60000,
  });
}

function FilterDropdown({ label, icon, options, selected, onToggle, searchPlaceholder, multi = true, renderLabel }: {
  label: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selected: string[];
  onToggle: (id: string) => void;
  searchPlaceholder: string;
  multi?: boolean;
  renderLabel?: (opt: FilterOption) => string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = options.filter(o => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (o.name || "").toLowerCase().includes(s) || (o.email || "").toLowerCase().includes(s) || (o.title || "").toLowerCase().includes(s);
  });

  const getLabel = renderLabel || ((o: FilterOption) => o.name || o.title || o.id);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={containerRef} data-testid={`filter-dropdown-${label.toLowerCase()}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg transition-all whitespace-nowrap"
        style={{
          border: `1px solid ${selected.length > 0 ? "var(--labs-accent)" : "var(--labs-border)"}`,
          background: selected.length > 0 ? "var(--labs-accent-muted)" : "var(--labs-surface)",
          color: selected.length > 0 ? "var(--labs-accent)" : "var(--labs-text-secondary)",
          cursor: "pointer",
          fontWeight: selected.length > 0 ? 600 : 400,
        }}
        data-testid={`filter-btn-${label.toLowerCase()}`}
      >
        {icon}
        {label}
        {selected.length > 0 && (
          <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--labs-accent)", color: "#fff" }}>{selected.length}</span>
        )}
      </button>
      {open && (
        <div
          className="absolute top-full left-0 mt-1 rounded-lg shadow-lg z-50 min-w-[220px] max-h-[280px] flex flex-col"
          style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)" }}
        >
          <div className="p-2 border-b" style={{ borderColor: "var(--labs-border)" }}>
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full text-xs px-2 py-1.5 rounded"
              style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface)", color: "var(--labs-text)", outline: "none" }}
              autoFocus
              data-testid={`filter-search-${label.toLowerCase()}`}
            />
          </div>
          <div className="overflow-y-auto flex-1" style={{ maxHeight: 220 }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-xs text-center" style={{ color: "var(--labs-text-muted)" }}>{t("admin.noMatches")}</div>
            ) : filtered.map(opt => {
              const isSelected = selected.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    onToggle(opt.id);
                    if (!multi) setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 transition-colors"
                  style={{
                    background: isSelected ? "var(--labs-accent-muted)" : "transparent",
                    color: isSelected ? "var(--labs-accent)" : "var(--labs-text)",
                    cursor: "pointer",
                    border: "none",
                    borderBottom: "1px solid var(--labs-border)",
                  }}
                  data-testid={`filter-option-${label.toLowerCase()}-${opt.id}`}
                >
                  {multi && (
                    <span className="w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: isSelected ? "var(--labs-accent)" : "var(--labs-border)", background: isSelected ? "var(--labs-accent)" : "transparent" }}>
                      {isSelected && <span style={{ color: "#fff", fontSize: 10, lineHeight: 1 }}>✓</span>}
                    </span>
                  )}
                  <span className="truncate">{getLabel(opt)}</span>
                  {opt.email && <span className="text-[10px] ml-auto truncate flex-shrink-0" style={{ color: "var(--labs-text-muted)", maxWidth: 100 }}>{opt.email}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminActivityFilterBar({ filters, onChange, pid, hideTasting }: { filters: ActivityFilters; onChange: (f: ActivityFilters) => void; pid: string; hideTasting?: boolean }) {
  const { t } = useTranslation();
  const { data: options } = useFilterOptions(pid);

  const hasFilters = filters.userIds.length > 0 || filters.hostIds.length > 0 || !!filters.tastingId || !!filters.communityId;

  const toggleUser = (id: string) => {
    const next = filters.userIds.includes(id) ? filters.userIds.filter(x => x !== id) : [...filters.userIds, id];
    onChange({ ...filters, userIds: next });
  };
  const toggleHost = (id: string) => {
    const next = filters.hostIds.includes(id) ? filters.hostIds.filter(x => x !== id) : [...filters.hostIds, id];
    onChange({ ...filters, hostIds: next });
  };
  const toggleTasting = (id: string) => {
    onChange({ ...filters, tastingId: filters.tastingId === id ? "" : id });
  };
  const toggleCommunity = (id: string) => {
    onChange({ ...filters, communityId: filters.communityId === id ? "" : id });
  };

  if (!options) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap mb-3" data-testid="admin-activity-filter-bar">
      <FilterDropdown
        label={t("admin.tabUser")}
        icon={<User className="w-3 h-3" />}
        options={options.users || []}
        selected={filters.userIds}
        onToggle={toggleUser}
        searchPlaceholder={t("admin.searchParticipants")}
      />
      <FilterDropdown
        label={t("admin.tabHost")}
        icon={<Crown className="w-3 h-3" />}
        options={options.hosts || []}
        selected={filters.hostIds}
        onToggle={toggleHost}
        searchPlaceholder={t("admin.searchParticipants")}
      />
      {!hideTasting && (
        <FilterDropdown
          label={t("admin.tabTasting")}
          icon={<Wine className="w-3 h-3" />}
          options={(options.tastings || []).map((item: FilterOption) => ({ ...item, name: item.title || item.name }))}
          selected={filters.tastingId ? [filters.tastingId] : []}
          onToggle={toggleTasting}
          searchPlaceholder={t("admin.searchTastings")}
          multi={false}
          renderLabel={(o: FilterOption) => `${o.title || o.name}${o.date ? ` (${o.date})` : ""}`}
        />
      )}
      <FilterDropdown
        label={t("admin.tabCommunity")}
        icon={<Users className="w-3 h-3" />}
        options={options.communities || []}
        selected={filters.communityId ? [filters.communityId] : []}
        onToggle={toggleCommunity}
        searchPlaceholder={t("admin.searchParticipants")}
        multi={false}
      />
      {hasFilters && (
        <button
          onClick={() => onChange(emptyFilters)}
          className="flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-all"
          style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface)", color: "var(--labs-danger)", cursor: "pointer" }}
          data-testid="filter-reset-all"
        >
          <X className="w-3 h-3" />
          Reset
        </button>
      )}
    </div>
  );
}

function ActivityTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const [hours, setHours] = useState(24);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [advFilters, setAdvFilters] = useState<ActivityFilters>(emptyFilters);

  const timeOpts = [
    { hours: 1, label: t("admin.time1h") }, { hours: 6, label: t("admin.time6h") }, { hours: 12, label: t("admin.time12h") },
    { hours: 24, label: t("admin.time24h") }, { hours: 168, label: t("admin.time7d") }, { hours: 720, label: t("admin.time30d") },
    { hours: 0, label: t("admin.timeAll") },
  ];

  const allUserIds = [...new Set([...advFilters.userIds, ...advFilters.hostIds])];

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["/api/admin/user-activity", hours, roleFilter, allUserIds, advFilters.tastingId, advFilters.communityId],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: String(hours) });
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (allUserIds.length > 0) params.set("userIds", allUserIds.join(","));
      if (advFilters.tastingId) params.set("tastingId", advFilters.tastingId);
      if (advFilters.communityId) params.set("communityId", advFilters.communityId);
      const session = getSession();
      const res = await fetch(`/api/admin/user-activity?${params}`, { headers: session.pid ? { "x-participant-id": session.pid } : {} });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const filtered = users.filter((u: Record<string, unknown>) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (u.name as string)?.toLowerCase().includes(q) || ((u.email as string) || "").toLowerCase().includes(q);
  });

  const formatRel = (ts: string) => {
    if (!ts) return "–";
    const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diffMin < 1) return t("admin.justNow");
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  return (
    <div data-testid="labs-admin-activity-tab">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
        <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("admin.userActivity")}</span>
        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>{filtered.length}</span>
      </div>
      <div className="flex gap-1 flex-wrap mb-3">
        {timeOpts.map(opt => (
          <button key={opt.hours} onClick={() => setHours(opt.hours)} className="px-2.5 py-1 text-xs rounded-lg transition-all" style={{ border: `1px solid ${hours === opt.hours ? "var(--labs-accent)" : "var(--labs-border)"}`, background: hours === opt.hours ? "var(--labs-accent-muted)" : "var(--labs-surface)", color: hours === opt.hours ? "var(--labs-accent)" : "var(--labs-text-secondary)", cursor: "pointer", fontWeight: hours === opt.hours ? 700 : 500 }} data-testid={`labs-admin-activity-time-${opt.hours}`}>{opt.label}</button>
        ))}
      </div>
      <div className="flex gap-2 mb-3">
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.nameOrEmail")} style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-input-search-activity" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={labsSelect} data-testid="labs-admin-select-activity-role">
          <option value="all">{t("admin.allRoles")}</option>
          <option value="admin">{t("admin.roleAdmin")}</option>
          <option value="host">{t("admin.roleHost")}</option>
          <option value="user">{t("admin.roleUser")}</option>
        </select>
      </div>
      <AdminActivityFilterBar filters={advFilters} onChange={setAdvFilters} pid={pid} />
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
      ) : isError ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-danger)" }}>{t("admin.errorLoadingActivity")}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("admin.noUsersInPeriod")}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: Record<string, unknown>) => (
            <div key={u.id as string} className="labs-card p-3.5" data-testid={`labs-admin-activity-user-${u.id}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{String(u.name ?? "")}</span>
                    <span className="text-[11px] px-1.5 rounded uppercase font-semibold" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)" }}>{String(u.role ?? "")}</span>
                  </div>
                  {u.email && <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--labs-text-muted)" }}>{String(u.email)}</div>}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{formatRel(u.lastSeenAt as string)}</div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.lastSeen")}</div>
                </div>
              </div>
              <div className="flex gap-3 mt-2.5 pt-2" style={{ borderTop: "1px solid var(--labs-border)" }}>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-text-secondary)" }}><Wine className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />{u.tastingCount as number} {t("admin.tastingsLabel")}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-text-secondary)" }}><BarChart3 className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />{u.ratingCount as number} {t("admin.ratingsLabel")}</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-text-secondary)" }}><BookOpen className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />{u.journalCount as number} {t("admin.dramsLabel")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionsTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [userSearch, setUserSearch] = useState("");
  const [advFilters, setAdvFilters] = useState<ActivityFilters>(emptyFilters);

  const getFromDate = () => {
    if (timeRange === "all") return undefined;
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    return new Date(Date.now() - days * 86400000).toISOString();
  };

  const allUserIds = [...new Set([...advFilters.userIds, ...advFilters.hostIds])];

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/admin/activity-summary", pid, timeRange, allUserIds, advFilters.communityId],
    queryFn: () => adminApi.getActivitySummary(pid, {
      from: getFromDate(),
      userIds: allUserIds.length > 0 ? allUserIds : undefined,
      communityId: advFilters.communityId || undefined,
    }),
  });

  const { data: userSessions = [], isLoading: userSessionsLoading } = useQuery({
    queryKey: ["/api/admin/activity-sessions", pid, selectedUser, timeRange],
    queryFn: () => adminApi.getActivitySessionsForUser(pid, selectedUser!, { from: getFromDate() }),
    enabled: !!selectedUser,
  });

  const rangeOpts: { value: typeof timeRange; label: string }[] = [
    { value: "7d", label: t("admin.timeRange7d") },
    { value: "30d", label: t("admin.timeRange30d") },
    { value: "90d", label: t("admin.timeRange90d") },
    { value: "all", label: t("admin.timeRangeAll") },
  ];

  const formatDuration = (min: number) => {
    if (min < 1) return "<1m";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const formatDate = (ts: string | Date | null) => {
    if (!ts) return "–";
    const d = new Date(ts);
    return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" });
  };

  const formatTime = (ts: string | Date | null) => {
    if (!ts) return "–";
    const d = new Date(ts);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  };

  const formatRelative = (ts: string | Date | null) => {
    if (!ts) return "–";
    const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diffMin < 1) return t("admin.justNow");
    if (diffMin < 60) return t("admin.minutesAgo", { count: diffMin });
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return t("admin.hoursAgo", { count: diffH });
    const diffD = Math.floor(diffH / 24);
    return t("admin.daysAgo", { count: diffD });
  };

  const filteredUsers = (summary?.topUsers || []).filter((u: { name: string; email: string }) => {
    if (!userSearch) return true;
    const q = userSearch.toLowerCase();
    return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const heatmapData = () => {
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const sessions = summary?.byHour || [];
    for (const s of sessions) {
      for (let day = 0; day < 7; day++) {
        grid[day][s.hour] = (grid[day][s.hour] || 0) + Math.round(s.sessions / 7);
      }
    }
    if (summary?.byDay) {
      for (const d of summary.byDay) {
        const date = new Date(d.date);
        const dow = date.getDay();
        grid[dow] = grid[dow] || Array(24).fill(0);
      }
    }
    return grid;
  };

  const heatmapMax = () => {
    const grid = heatmapData();
    let max = 1;
    for (const row of grid) for (const v of row) if (v > max) max = v;
    return max;
  };

  const dayLabels = [t("admin.daySun"), t("admin.dayMon"), t("admin.dayTue"), t("admin.dayWed"), t("admin.dayThu"), t("admin.dayFri"), t("admin.daySat")];

  if (selectedUser) {
    const userData = (summary?.topUsers || []).find((u: { id: string }) => u.id === selectedUser);
    return (
      <div data-testid="labs-admin-sessions-user-detail">
        <button
          onClick={() => setSelectedUser(null)}
          className="flex items-center gap-1.5 mb-4 text-sm transition-colors"
          style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          data-testid="sessions-back-btn"
        >
          <ChevronLeft className="w-4 h-4" /> Back to overview
        </button>
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{userData?.name || t("admin.roleUser")}</span>
          {userData?.email && <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{userData.email}</span>}
        </div>
        <div className="labs-auto-grid mb-4" style={{ "--grid-min": "120px", gap: "0.5rem" } as React.CSSProperties}>
          <div className="labs-card p-3 text-center">
            <div className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{userData?.sessions || 0}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.sessions")}</div>
          </div>
          <div className="labs-card p-3 text-center">
            <div className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{formatDuration(userData?.totalMinutes || 0)}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.totalTime") }</div>
          </div>
          <div className="labs-card p-3 text-center">
            <div className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{formatDuration(userData?.sessions ? Math.round((userData.totalMinutes || 0) / userData.sessions) : 0)}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.avgDuration") }</div>
          </div>
        </div>
        {userSessionsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
        ) : userSessions.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noSessions") }</div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-secondary)" }}>{ t("admin.sessionTimeline") }</div>
            {userSessions.map((s: { id: string; startedAt: string; endedAt: string; durationMinutes: number; pageContext: string | null }) => (
              <div key={s.id} className="labs-card p-3 flex items-center gap-3" data-testid={`session-entry-${s.id}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.durationMinutes > 0 ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{formatDate(s.startedAt)}</span>
                    <span className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
                      {formatTime(s.startedAt)} – {formatTime(s.endedAt)}
                    </span>
                  </div>
                  {s.pageContext && <div className="text-[11px] truncate mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{s.pageContext}</div>}
                </div>
                <div className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--labs-accent)" }}>{formatDuration(s.durationMinutes)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-testid="labs-admin-sessions-tab">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("admin.sessionTracking")}</span>
        </div>
        <div className="flex gap-1">
          {rangeOpts.map(opt => (
            <button
              key={opt.value}
              onClick={() => setTimeRange(opt.value)}
              className="px-2.5 py-1 text-xs rounded-lg transition-all"
              style={{
                border: `1px solid ${timeRange === opt.value ? "var(--labs-accent)" : "var(--labs-border)"}`,
                background: timeRange === opt.value ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                color: timeRange === opt.value ? "var(--labs-accent)" : "var(--labs-text-secondary)",
                cursor: "pointer",
                fontWeight: timeRange === opt.value ? 700 : 500,
              }}
              data-testid={`sessions-range-${opt.value}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <AdminActivityFilterBar filters={advFilters} onChange={setAdvFilters} pid={pid} hideTasting />

      {summaryLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
      ) : !summary ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("admin.noDataAvailable")}</div>
      ) : (
        <>
          <div className="labs-auto-grid mb-4" style={{ "--grid-min": "140px", gap: "0.5rem" } as React.CSSProperties}>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-total">{summary.totalSessions}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.totalSessions")}</div>
            </div>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-users">{summary.uniqueUsers}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.activeUsers")}</div>
            </div>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-avg">{formatDuration(summary.avgDurationMinutes)}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.avgDuration") }</div>
            </div>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-total-time">{formatDuration(summary.totalMinutes)}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.totalTime") }</div>
            </div>
          </div>

          {(summary.byHour || []).length > 0 && (
            <div className="labs-card p-3 mb-4">
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-secondary)" }}>{t("admin.activityByHour")}</div>
              <div className="overflow-x-auto">
                <div style={{ display: "grid", gridTemplateColumns: "40px repeat(24, 1fr)", gap: 2 }}>
                  <div />
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="text-center text-[9px]" style={{ color: "var(--labs-text-muted)" }}>{i}</div>
                  ))}
                  {heatmapData().map((row, dayIdx) => (
                    <Fragment key={dayIdx}>
                      <div className="text-[10px] flex items-center" style={{ color: "var(--labs-text-muted)" }}>{dayLabels[dayIdx]}</div>
                      {row.map((val, hourIdx) => {
                        const intensity = val / heatmapMax();
                        return (
                          <div
                            key={`${dayIdx}-${hourIdx}`}
                            className="rounded-sm"
                            style={{
                              aspectRatio: "1",
                              background: val === 0 ? "var(--labs-surface)" : `color-mix(in srgb, var(--labs-accent) ${Math.round(15 + intensity * 85)}%, transparent)`,
                              minWidth: 8,
                            }}
                            title={`${dayLabels[dayIdx]} ${hourIdx}:00 - ${val} ${t("admin.sessionsLabel")}`}
                            data-testid={`heatmap-cell-${dayIdx}-${hourIdx}`}
                          />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(summary.byDay || []).length > 0 && (
            <div className="labs-card p-3 mb-4">
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-secondary)" }}>{t("admin.dailyActivity")}</div>
              <div className="flex items-end gap-0.5" style={{ height: 80 }}>
                {summary.byDay.map((d: { date: string; sessions: number; uniqueUsers: number }) => {
                  const maxSessions = Math.max(...summary.byDay.map((x: { sessions: number }) => x.sessions), 1);
                  const height = (d.sessions / maxSessions) * 100;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(height, 4)}%`, background: "var(--labs-accent)", opacity: 0.7 + (height / 100) * 0.3, minWidth: 3 }}
                      title={`${d.date}: ${d.sessions} ${t("admin.sessionsLabel")}, ${d.uniqueUsers} ${t("admin.usersLabel")}`}
                      data-testid={`daily-bar-${d.date}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-[9px]" style={{ color: "var(--labs-text-muted)" }}>{summary.byDay[0]?.date}</span>
                <span className="text-[9px]" style={{ color: "var(--labs-text-muted)" }}>{summary.byDay[summary.byDay.length - 1]?.date}</span>
              </div>
            </div>
          )}

          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--labs-text-secondary)" }}>Users ({filteredUsers.length})</span>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder={t("admin.searchUsers")} style={{ ...labsInput, paddingLeft: 32 }} data-testid="sessions-search-users" />
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noUsersFound") }</div>
            ) : (
              <div className="space-y-1.5">
                {filteredUsers.map((u: { id: string; name: string; email: string; sessions: number; totalMinutes: number; lastActive: string | null }) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUser(u.id)}
                    className="labs-card p-3 w-full text-left flex items-center gap-3 transition-colors"
                    style={{ cursor: "pointer", border: "none" }}
                    data-testid={`sessions-user-${u.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{u.name}</div>
                      {u.email && <div className="text-[11px] truncate" style={{ color: "var(--labs-text-muted)" }}>{u.email}</div>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-semibold" style={{ color: "var(--labs-accent)" }}>{u.sessions} {t("admin.sessionsLabel")}</div>
                      <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{formatDuration(u.totalMinutes)} {t("admin.totalLabel")}</div>
                      <div className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{formatRelative(u.lastActive)}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
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
    queryFn: async () => { const res = await fetch(`/api/admin/ai-settings?participantId=${pid}`); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ["/api/admin/ai-usage", pid],
    queryFn: async () => { const res = await fetch(`/api/admin/ai-usage?participantId=${pid}`); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const [masterDisabled, setMasterDisabled] = useState<boolean | null>(null);
  const [disabledFeatures, setDisabledFeatures] = useState<string[]>([]);
  const [quotaInput, setQuotaInput] = useState("");
  const [quotaInitialized, setQuotaInitialized] = useState(false);

  useEffect(() => {
    if (data && masterDisabled === null) {
      setMasterDisabled(data.settings.ai_master_disabled);
      setDisabledFeatures(data.settings.ai_features_disabled || []);
    }
  }, [data, masterDisabled]);

  useEffect(() => {
    if (usageData && !quotaInitialized) {
      setQuotaInput(String(usageData.quota ?? 20));
      setQuotaInitialized(true);
    }
  }, [usageData, quotaInitialized]);

  const saveMutation = useMutation({
    mutationFn: async ({ md, df }: { md: boolean | null; df: string[] }) => {
      const res = await apiRequest("POST", "/api/admin/ai-settings", { participantId: pid, ai_master_disabled: md, ai_features_disabled: df });
      return res.json();
    },
    onSuccess: () => { toast({ title: t("admin.aiSettingsSaved") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] }); },
    onError: (err: Error) => { toast({ title: t("admin.errorGeneric"), description: err.message, variant: "destructive" }); if (data) { setMasterDisabled(data.settings.ai_master_disabled); setDisabledFeatures(data.settings.ai_features_disabled || []); } },
  });

  const quotaMutation = useMutation({
    mutationFn: async (quota: number) => {
      const res = await apiRequest("POST", "/api/admin/ai-quota", { participantId: pid, quota });
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: t("admin.quotaSet", { value: result.quota === 0 ? t("admin.unlimited") : String(result.quota) }) });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-usage"] });
    },
    onError: (err: Error) => { toast({ title: t("admin.errorGeneric"), description: err.message, variant: "destructive" }); },
  });

  const save = (md: boolean | null, df: string[]) => saveMutation.mutate({ md, df });

  const toggleFeature = (featureId: string) => {
    const newDisabled = disabledFeatures.includes(featureId) ? disabledFeatures.filter(f => f !== featureId) : [...disabledFeatures, featureId];
    setDisabledFeatures(newDisabled);
    save(masterDisabled, newDisabled);
  };

  const handleQuotaSave = () => {
    const val = parseInt(quotaInput, 10);
    if (isNaN(val) || val < 0) { toast({ title: t("admin.invalidQuota"), variant: "destructive" }); return; }
    quotaMutation.mutate(val);
  };

  if (isLoading || masterDisabled === null) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  const features = data?.features || [];
  const auditLog = data?.auditLog || [];
  const usageList: Array<{ participantId: string; name: string; email: string | null; requestCount: number; hasOwnKey: boolean }> = usageData?.usage || [];

  return (
    <div data-testid="labs-admin-ai-tab">
      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-bold" style={{ color: "var(--labs-text)" }}>{ t("admin.aiKillSwitch") }</span>
        </div>
        <div className="p-3 rounded-lg mb-4 text-xs" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
            <span className="font-semibold" style={{ color: "var(--labs-accent)" }}>{ t("admin.adminBypass") }</span>
          </div>
          <span style={{ color: "var(--labs-text-muted)" }}>{ t("admin.adminBypassDesc") }</span>
        </div>
        <div className="flex items-center justify-between p-3.5 rounded-xl mb-4" style={{ border: `2px solid ${masterDisabled ? "var(--labs-danger)" : "var(--labs-success)"}`, background: masterDisabled ? "var(--labs-danger-muted)" : "var(--labs-success-muted)" }} data-testid="labs-admin-ai-master-toggle">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.masterKillSwitch") }</div>
            <div className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{masterDisabled ? t("admin.aiAllDisabled") : t("admin.aiFeaturesActive")}</div>
          </div>
          <ToggleSwitch on={!masterDisabled} onToggle={() => { const v = !masterDisabled; setMasterDisabled(v); save(v, disabledFeatures); }} testId="labs-admin-switch-ai-master" />
        </div>
        <div className="space-y-1.5">
          {features.map((f: { id: string; label: string; route: string }) => {
            const disabled = disabledFeatures.includes(f.id);
            const effective = masterDisabled || disabled;
            return (
              <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ border: `1px solid ${effective ? "var(--labs-danger)" : "var(--labs-success)"}40`, background: effective ? "var(--labs-danger-muted)" : "var(--labs-success-muted)" }} data-testid={`labs-admin-ai-feature-${f.id}`}>
                <div className="flex items-center gap-2">
                  {effective ? <XCircle className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} /> : <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />}
                  <div>
                    <div className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{f.label}</div>
                    <div className="text-[11px] font-mono" style={{ color: "var(--labs-text-muted)" }}>{f.route}</div>
                  </div>
                </div>
                <ToggleSwitch on={!disabled} onToggle={() => toggleFeature(f.id)} disabled={!!masterDisabled} testId={`labs-admin-switch-${f.id}`} small />
              </div>
            );
          })}
        </div>
        {saveMutation.isPending && <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "var(--labs-text-muted)" }}><Loader2 className="w-3 h-3 animate-spin" />{ t("admin.saving") }</div>}
      </div>

      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--labs-text)" }}>{ t("admin.freeQuota") }</span>
        </div>
        <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
          Anzahl kostenloser AI-Anfragen pro User über den Plattform-Key. 0 = unbegrenzt. User mit eigenem API Key sind nicht betroffen.
        </p>
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min="0"
            value={quotaInput}
            onChange={e => setQuotaInput(e.target.value)}
            style={{ ...labsInput, width: 100 }}
            data-testid="labs-admin-input-ai-quota"
          />
          <button
            onClick={handleQuotaSave}
            disabled={quotaMutation.isPending}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }}
            data-testid="labs-admin-save-ai-quota"
          >
            {quotaMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : t("admin.save")}
          </button>
          <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
            { t("admin.currentQuota") }: {usageData?.quota === 0 ? t("admin.unlimited") : `${usageData?.quota ?? 20} ${t("admin.requests")}`}
          </span>
        </div>
      </div>

      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--labs-text)" }}>{ t("admin.aiUsagePerUser") }</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>{usageList.length}</span>
        </div>
        {usageLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
        ) : usageList.length === 0 ? (
          <div className="text-center py-6 text-xs" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noAiUsage") }</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-1.5">
            {usageList.map(u => {
              const quota = usageData?.quota ?? 20;
              const pct = quota > 0 ? Math.min(100, Math.round((u.requestCount / quota) * 100)) : 0;
              const overLimit = quota > 0 && u.requestCount >= quota;
              return (
                <div key={u.participantId} className="flex items-center gap-2 p-2.5 rounded-lg" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface)" }} data-testid={`labs-admin-ai-usage-${u.participantId}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{u.name}</span>
                      {u.hasOwnKey && <span className="text-[11px] px-1 rounded" style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }}>{ t("admin.ownKey") }</span>}
                      {overLimit && !u.hasOwnKey && <span className="text-[11px] px-1 rounded" style={{ background: "var(--labs-danger-muted)", color: "var(--labs-danger)" }}>{ t("admin.limitReached") }</span>}
                    </div>
                    {u.email && <div className="text-[11px] truncate" style={{ color: "var(--labs-text-muted)" }}>{u.email}</div>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {quota > 0 && (
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--labs-surface-elevated)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: overLimit ? "var(--labs-danger)" : "var(--labs-accent)" }} />
                      </div>
                    )}
                    <span className="text-xs font-mono font-semibold" style={{ color: overLimit ? "var(--labs-danger)" : "var(--labs-text)", minWidth: 40, textAlign: "right" }}>
                      {u.requestCount}{quota > 0 ? `/${quota}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {auditLog.length > 0 && (
        <div className="labs-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Database className="w-4 h-4" style={{ color: "var(--labs-text-secondary)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.auditLog") }</span>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {auditLog.map((entry: Record<string, unknown>, i: number) => (
              <div key={i} className="flex items-center gap-2 py-1.5 text-xs" style={{ borderBottom: "1px solid var(--labs-border)" }}>
                <span className="text-[11px] whitespace-nowrap" style={{ color: "var(--labs-text-muted)" }}>{new Date(entry.createdAt as string).toLocaleString()}</span>
                <span className="font-medium" style={{ color: "var(--labs-text)" }}>{entry.actorName as string}</span>
                <span style={{ color: "var(--labs-text-muted)" }}>{entry.action as string}</span>
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

  const { data: newsletters = [] } = useQuery({ queryKey: ["/admin/newsletters", pid], queryFn: () => adminApi.getNewsletters(pid), enabled: !!pid });

  const toggleRecipient = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleGenerate = async (type: "welcome" | "update") => {
    setGenerating(true);
    try {
      const result = await adminApi.generateNewsletter(pid, type);
      setSubject(result.subject || ""); setContentHtml(result.body || "");
      toast({ title: t("admin.newsletterGenerated") });
    } catch (e: unknown) { toast({ title: t("admin.errorGeneric"), description: (e as Error).message, variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const handleSend = async () => {
    if (!subject.trim() || !contentHtml.trim() || selectedIds.size === 0) return;
    setSending(true);
    try {
      const result = await adminApi.sendNewsletter(pid, subject, contentHtml, Array.from(selectedIds));
      toast({ title: t("admin.newsletterSentTo", { count: result.sent }) });
      setSubject(""); setContentHtml(""); setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/admin/newsletters"] });
    } catch (e: unknown) { toast({ title: t("admin.errorGeneric"), description: (e as Error).message, variant: "destructive" }); }
    finally { setSending(false); }
  };

  return (
    <div data-testid="labs-admin-newsletter-tab">
      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.composeNewsletter") }</span>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => handleGenerate("welcome")} disabled={generating || aiDisabled} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text)", cursor: generating ? "wait" : "pointer" }} data-testid="labs-admin-generate-welcome">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Welcome
          </button>
          <button onClick={() => handleGenerate("update")} disabled={generating || aiDisabled} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text)", cursor: generating ? "wait" : "pointer" }} data-testid="labs-admin-generate-update">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Update
          </button>
        </div>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder={t("admin.subject")} style={{ ...labsInput, marginBottom: 8 }} data-testid="labs-admin-newsletter-subject" />
        <textarea value={contentHtml} onChange={e => setContentHtml(e.target.value)} placeholder={t("admin.newsletterContent")} rows={6} style={{ ...labsInput, resize: "vertical" as const }} data-testid="labs-admin-newsletter-content" />
        <div className="mt-3 rounded-lg p-3" style={{ border: "1px solid var(--labs-border)" }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>{t("admin.recipientsSelected", { count: selectedIds.size })}</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedIds(new Set(subscribers.map(s => s.id)))} className="text-[11px]" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-select-all-subscribers">{ t("admin.selectSubscribers") }</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[11px]" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-clear-recipients">{ t("admin.clear") }</button>
            </div>
          </div>
          <div className="max-h-[180px] overflow-y-auto">
            {allWithEmail.map(p => (
              <div key={p.id} onClick={() => toggleRecipient(p.id)} className="flex items-center gap-2 px-1.5 py-1 rounded cursor-pointer" style={{ background: selectedIds.has(p.id) ? "var(--labs-accent-muted)" : "transparent" }} data-testid={`labs-admin-recipient-${p.id}`}>
                {selectedIds.has(p.id) ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /> : <Square className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />}
                <span className="text-xs" style={{ color: "var(--labs-text)" }}>{stripGuestSuffix(p.name)}</span>
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{p.email}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={handleSend} disabled={!subject.trim() || !contentHtml.trim() || selectedIds.size === 0 || sending} className="w-full mt-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: subject.trim() && contentHtml.trim() && selectedIds.size > 0 ? "var(--labs-accent)" : "var(--labs-text-muted)", color: "var(--labs-bg)", border: "none", cursor: sending ? "wait" : "pointer" }} data-testid="labs-admin-send-newsletter">
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          {sending ? t("admin.sending") : t("admin.sendNewsletter")}
        </button>
      </div>
      {(newsletters as Array<Record<string, unknown>>).length > 0 && (
        <div className="labs-card p-4">
          <div className="flex items-center gap-2 mb-3"><Archive className="w-4 h-4" style={{ color: "var(--labs-text-secondary)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.archive") }</span></div>
          {(newsletters as Array<Record<string, unknown>>).map((nl) => (
            <div key={nl.id as string} className="py-2" style={{ borderBottom: "1px solid var(--labs-border)" }} data-testid={`labs-admin-newsletter-${nl.id}`}>
              <div className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{nl.subject as string}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.sent") }: {nl.sentAt ? new Date(nl.sentAt as string).toLocaleDateString() : "-"} · { t("admin.recipientsCount") }: {(nl.recipientCount as number) || 0}</div>
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
    { value: "feature", label: t("admin.catFeature"), emoji: "\u{1F680}" },
    { value: "improvement", label: t("admin.catImprovement"), emoji: "\u{1F527}" },
    { value: "bugfix", label: t("admin.catBugfix"), emoji: "\u{1F41B}" },
    { value: "security", label: t("admin.catSecurity"), emoji: "\u{1F6E1}\u{FE0F}" },
    { value: "design", label: t("admin.catDesign"), emoji: "\u{1F3A8}" },
  ];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/admin/changelog", pid],
    queryFn: async () => { const res = await fetch(`/api/admin/changelog?participantId=${pid}`); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/admin/changelog", { participantId: pid, title, description, category, date, visible }); return res.json(); },
    onSuccess: () => { toast({ title: t("admin.entryCreated") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("PATCH", `/api/admin/changelog/${editingId}`, { participantId: pid, title, description, category, date, visible }); return res.json(); },
    onSuccess: () => { toast({ title: t("admin.entryUpdated") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/admin/changelog/${id}?participantId=${pid}`, { method: "DELETE" }); if (!res.ok) throw new Error("Delete failed"); return res.json(); },
    onSuccess: () => { toast({ title: t("admin.entryDeleted") }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); },
  });

  const resetForm = () => { setShowForm(false); setEditingId(null); setTitle(""); setDescription(""); setCategory("feature"); setDate(new Date().toISOString().split("T")[0]); setVisible(true); };
  const startEdit = (entry: Record<string, unknown>) => { setEditingId(entry.id as string); setTitle(entry.title as string); setDescription(entry.description as string); setCategory(entry.category as string); setDate(entry.date as string); setVisible(entry.visible as boolean); setShowForm(true); };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  return (
    <div data-testid="labs-admin-changelog-tab">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{entries.length} {t("admin.entries")}</span>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-changelog-add">
          <MessageSquarePlus className="w-3 h-3" /> New Entry
        </button>
      </div>
      {showForm && (
        <div className="labs-card p-4 mb-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={t("admin.titlePlaceholder")} style={{ ...labsInput, marginBottom: 8 }} data-testid="labs-admin-changelog-title" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t("admin.descriptionPlaceholder")} rows={3} style={{ ...labsInput, resize: "vertical" as const, marginBottom: 8 }} data-testid="labs-admin-changelog-description" />
          <div className="flex gap-2 flex-wrap mb-3">
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...labsSelect, fontSize: 12 }} data-testid="labs-admin-changelog-category">
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...labsSelect, fontSize: 12 }} data-testid="labs-admin-changelog-date" />
            <label className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: "var(--labs-text)" }}>
              <input type="checkbox" checked={visible} onChange={e => setVisible(e.target.checked)} data-testid="labs-admin-changelog-visible" /> Visible
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()} disabled={!title || !description} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-changelog-save">{editingId ? t("admin.update") : t("admin.create")}</button>
            <button onClick={resetForm} className="px-3 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--labs-border)", background: "transparent", color: "var(--labs-text)", cursor: "pointer" }} data-testid="labs-admin-changelog-cancel">{ t("admin.cancel") }</button>
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        {entries.map((entry: Record<string, unknown>) => {
          const cat = CATEGORIES.find(c => c.value === entry.category);
          return (
            <div key={entry.id as string} className="labs-card p-3" style={{ opacity: (entry.visible as boolean) ? 1 : 0.5 }} data-testid={`labs-admin-changelog-entry-${entry.id}`}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs">{cat?.emoji || "\u{1F4DD}"}</span>
                    <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{new Date(entry.date as string).toLocaleDateString()}</span>
                  </div>
                  <div className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{entry.title as string}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{entry.description as string}</div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(entry)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid={`labs-admin-changelog-edit-${entry.id}`}><Eye className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} /></button>
                  <button onClick={() => { if (confirm(t("admin.confirmDeleteEntry", { title: entry.title as string }))) deleteMutation.mutate(entry.id as string); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid={`labs-admin-changelog-delete-${entry.id}`}><Trash2 className="w-3 h-3" style={{ color: "var(--labs-danger)" }} /></button>
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
    mutationFn: async (ids: string[]) => { for (const id of ids) await adminApi.deleteTasting(id, pid); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: t("admin.tastingsDeleted", { count: selectedIds.size }) }); setSelectedIds(new Set()); },
  });

  const toggleId = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div data-testid="labs-admin-cleanup-tab">
      <div className="labs-card p-4">
        <div className="flex items-center gap-2 mb-4"><Trash2 className="w-4 h-4" style={{ color: "var(--labs-danger)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("admin.bulkCleanup")}</span></div>
        <div className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>{t("admin.testTastingsFound", { count: testTastings.length })} · {t("admin.selectedCount", { count: selectedIds.size })}</div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setSelectedIds(new Set(testTastings.map(t => t.id)))} className="text-[11px]" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-cleanup-select-all">{t("admin.selectAllTest")}</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[11px]" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-cleanup-clear">{ t("admin.clear") }</button>
        </div>
        <div className="max-h-[300px] overflow-y-auto space-y-1 mb-3">
          {data.tastings.map(ta => (
            <div key={ta.id} onClick={() => toggleId(ta.id)} className="flex items-center gap-2 p-2 rounded-lg cursor-pointer" style={{ background: selectedIds.has(ta.id) ? "var(--labs-danger-muted)" : "transparent" }} data-testid={`labs-admin-cleanup-item-${ta.id}`}>
              {selectedIds.has(ta.id) ? <CheckSquare className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} /> : <Square className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium flex items-center gap-1" style={{ color: "var(--labs-text)" }}>
                  {ta.title}
                  {ta.isTestData && <span className="text-[11px] px-1 rounded" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("discover.testData", "TEST")}</span>}
                </div>
                <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{stripGuestSuffix(ta.hostName)} · {ta.date} · {ta.status}</div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => { if (selectedIds.size > 0 && confirm(t("admin.confirmDeleteMultiple", { count: selectedIds.size }))) deleteMutation.mutate(Array.from(selectedIds)); }} disabled={selectedIds.size === 0 || deleteMutation.isPending} className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: selectedIds.size > 0 ? "var(--labs-danger)" : "var(--labs-text-muted)", color: "var(--labs-bg)", border: "none", cursor: selectedIds.size > 0 ? "pointer" : "not-allowed" }} data-testid="labs-admin-cleanup-delete">
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          {t("admin.deleteSelected", { count: selectedIds.size })}
        </button>
      </div>
    </div>
  );
}

const CHART_COLORS = ["#d4a574", "#8b6914", "#c4956a", "#a67c52", "#e8c49a", "#7a5c3a"];

function KpiCard({ id, label, value, icon: Icon, sub }: { id: string; label: string; value: string | number; icon: React.ElementType; sub?: string }) {
  return (
    <div className="labs-card p-3 flex flex-col gap-1" data-testid={`kpi-${id}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
        <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--labs-text-muted)" }}>{label}</span>
      </div>
      <div className="labs-h2" style={{ color: "var(--labs-text)" }}>{value}</div>
      {sub && <span className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{sub}</span>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="labs-card p-4">
      <span className="text-sm font-semibold block mb-3" style={{ color: "var(--labs-text)" }}>{title}</span>
      {children}
    </div>
  );
}

function AnalyticsTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const [days, setDays] = useState<number>(0);
  const [sortCol, setSortCol] = useState<string>("totalDuration");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: legacyData } = useQuery({ queryKey: ["/admin/analytics", pid], queryFn: () => adminApi.getAnalytics(pid), enabled: !!pid });
  const { data, isLoading } = useQuery({ queryKey: ["/admin/analytics/dashboard", pid, days], queryFn: () => adminApi.getAnalyticsDashboard(pid, days || undefined), enabled: !!pid });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;
  if (!data) return <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("admin.noAnalyticsData")}</div>;

  const d = data as any;
  const legacy = legacyData as any;
  const kpis = d.kpis || {};
  const engagement = d.engagementTable || [];

  const sorted = [...engagement].sort((a: any, b: any) => {
    const aVal = a[sortCol] ?? 0;
    const bVal = b[sortCol] ?? 0;
    if (aVal === bVal) return 0;
    return sortDir === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
  });

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir(prev => prev === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("desc"); }
  };

  const timeFilters = [
    { label: "7d", value: 7 },
    { label: "30d", value: 30 },
    { label: "90d", value: 90 },
    { label: t("admin.allTime") || "All", value: 0 },
  ];

  const tooltipStyle = { backgroundColor: "var(--labs-surface)", border: "1px solid var(--labs-border)", borderRadius: "8px" };
  const tooltipLabelStyle = { color: "var(--labs-text)" };
  const tooltipItemStyle = { color: "var(--labs-accent)" };

  return (
    <div data-testid="labs-admin-analytics-tab" className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("admin.dashboard") || "Dashboard"}</span>
        </div>
        <div className="flex gap-1" data-testid="analytics-time-filter">
          {timeFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setDays(f.value)}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors"
              style={{
                background: days === f.value ? "var(--labs-accent)" : "var(--labs-surface-alt)",
                color: days === f.value ? "var(--labs-bg)" : "var(--labs-text-muted)",
              }}
              data-testid={`filter-${f.label.toLowerCase()}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="labs-auto-grid" style={{ "--grid-min": "140px", gap: "0.5rem" } as React.CSSProperties}>
        <KpiCard id="active-today" label={t("admin.activeToday") || "Active Today"} value={kpis.activeToday ?? 0} icon={Users} />
        <KpiCard id="active-7d" label={t("admin.active7d") || "Active 7d"} value={kpis.active7d ?? 0} icon={Activity} />
        <KpiCard id="active-30d" label={t("admin.active30d") || "Active 30d"} value={kpis.active30d ?? 0} icon={TrendingUp} />
        <KpiCard id="new-users-week" label={t("admin.newUsersWeek") || "New This Week"} value={kpis.newUsersWeek ?? 0} icon={UserPlus} />
        <KpiCard id="avg-duration" label={t("admin.avgDuration") || "Avg Duration"} value={`${kpis.avgDuration ?? 0} min`} icon={Timer} />
        <KpiCard id="total-sessions" label={t("admin.totalSessions") || "Sessions"} value={kpis.totalSessions ?? 0} icon={Eye} />
        <KpiCard
          id="conversion-rate"
          label={t("admin.conversionRate") || "Conversion"}
          value={`${kpis.conversionRate ?? 0}%`}
          icon={MailCheck}
          sub={`${kpis.acceptedInvites ?? 0} / ${kpis.totalInvites ?? 0} ${t("admin.invites") || "invites"}`}
        />
        {legacy && (
          <KpiCard id="total-ratings" label={t("admin.totalRatings")} value={legacy.totalRatings ?? 0} icon={Hash} />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ChartCard title={t("admin.dauChart") || "Daily Active Users"}>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={d.dauSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--labs-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Line type="monotone" dataKey="count" stroke="var(--labs-accent)" strokeWidth={2} dot={false} name="DAU" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("admin.wauChart") || "Weekly Active Users"}>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={d.wauSeries || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--labs-border)" />
                <XAxis dataKey="week" tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Line type="monotone" dataKey="count" stroke="#8b6914" strokeWidth={2} dot={false} name="WAU" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("admin.topPages") || "Top Pages"}>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <BarChart data={(d.topPages || []).slice(0, 8)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--labs-border)" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} allowDecimals={false} />
                <YAxis type="category" dataKey="page" tick={{ fontSize: 9, fill: "var(--labs-text-muted)" }} width={120} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Bar dataKey="count" fill="var(--labs-accent)" radius={[0, 4, 4, 0]} name="Visits" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={t("admin.sessionDuration") || "Session Duration Distribution"}>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={d.durationDistribution || []} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {(d.durationDistribution || []).map((_: any, i: number) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {d.registrationSeries?.length > 0 && (
        <ChartCard title={t("admin.registrations") || "New Registrations Over Time"}>
          <div style={{ width: "100%", height: 180 }}>
            <ResponsiveContainer>
              <BarChart data={d.registrationSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--labs-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} tickFormatter={(v: string) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: "var(--labs-text-muted)" }} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                <Bar dataKey="count" fill="#c4956a" radius={[4, 4, 0, 0]} name="New Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      )}

      {d.inviteConversion && (
        <div className="labs-card p-4">
          <span className="text-sm font-semibold block mb-2" style={{ color: "var(--labs-text)" }}>
            {t("admin.inviteConversion") || "Invitation Conversion"}
          </span>
          <div className="flex items-center gap-6">
            <div>
              <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.sent") || "Sent"}</span>
              <div className="labs-h3" style={{ color: "var(--labs-text)" }}>{d.inviteConversion.total}</div>
            </div>
            <div style={{ color: "var(--labs-text-muted)" }}>→</div>
            <div>
              <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.accepted") || "Accepted"}</span>
              <div className="labs-h3" style={{ color: "var(--labs-success, var(--labs-accent))" }}>{d.inviteConversion.accepted}</div>
            </div>
            <div className="ml-auto labs-card px-3 py-1.5" style={{ background: "var(--labs-surface-alt)" }}>
              <span className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{d.inviteConversion.rate}%</span>
            </div>
          </div>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="labs-card p-4">
          <span className="text-sm font-semibold block mb-3" style={{ color: "var(--labs-text)" }}>
            {t("admin.engagementTable") || "User Engagement"}
          </span>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]" style={{ color: "var(--labs-text)" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--labs-border)" }}>
                  {[
                    { key: "name", label: t("admin.name") || "Name" },
                    { key: "sessionCount", label: t("admin.sessions") || "Sessions" },
                    { key: "totalDuration", label: t("admin.totalTime") || "Total (min)" },
                    { key: "avgDuration", label: t("admin.avgTime") || "Avg (min)" },
                    { key: "ratingCount", label: t("admin.ratings") || "Ratings" },
                    { key: "lastActivity", label: t("admin.lastActive") || "Last Active" },
                  ].map(col => (
                    <th
                      key={col.key}
                      className="text-left py-1.5 px-1 cursor-pointer select-none"
                      style={{ color: sortCol === col.key ? "var(--labs-accent)" : "var(--labs-text-muted)" }}
                      onClick={() => toggleSort(col.key)}
                      data-testid={`sort-${col.key}`}
                    >
                      {col.label} {sortCol === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row: any) => (
                  <tr key={row.id} style={{ borderBottom: "1px solid var(--labs-border)" }}>
                    <td className="py-1.5 px-1 font-medium">{row.name}</td>
                    <td className="py-1.5 px-1">{row.sessionCount}</td>
                    <td className="py-1.5 px-1">{row.totalDuration}</td>
                    <td className="py-1.5 px-1">{row.avgDuration}</td>
                    <td className="py-1.5 px-1">{row.ratingCount}</td>
                    <td className="py-1.5 px-1" style={{ color: "var(--labs-text-muted)" }}>
                      {row.lastActivity ? new Date(row.lastActivity).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {legacy?.topWhiskies?.length > 0 && (
        <div className="labs-card p-4">
          <span className="text-sm font-semibold block mb-2.5" style={{ color: "var(--labs-text)" }}>{t("admin.topWhiskies")}</span>
          {legacy.topWhiskies.slice(0, 10).map((w: any, i: number) => (
            <div key={w.id || i} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--labs-border)" }}>
              <div><span className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{i + 1}. {w.name}</span>{w.distillery && <span className="text-[11px] ml-1.5" style={{ color: "var(--labs-text-muted)" }}>{w.distillery}</span>}</div>
              <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-accent)" }}>{Number(w.avgScore).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}

      {legacy?.regionCounts?.length > 0 && (
        <div className="labs-card p-4">
          <span className="text-sm font-semibold block mb-2.5" style={{ color: "var(--labs-text)" }}>{t("admin.regions")}</span>
          {legacy.regionCounts.map(([region, count]: [string, number]) => (
            <div key={region} className="flex items-center justify-between py-1">
              <span className="text-xs" style={{ color: "var(--labs-text)" }}>{region}</span>
              <span className="text-xs font-semibold" style={{ color: "var(--labs-accent)" }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function HistoricalImportTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dryRunResult, setDryRunResult] = useState<Record<string, unknown> | null>(null);

  const { data: importRuns, isLoading: runsLoading } = useQuery({
    queryKey: ["/admin/historical/import-runs", pid],
    queryFn: async () => { const res = await fetch("/api/admin/historical/import-runs", { headers: { "x-participant-id": pid } }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!pid,
  });

  const dryRunMutation = useMutation({
    mutationFn: async () => { const res = await fetch("/api/admin/historical/import?dryRun=true", { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" } }); if (!res.ok) throw new Error(await res.text()); return res.json(); },
    onSuccess: (data: Record<string, unknown>) => { setDryRunResult(data); toast({ title: t("admin.dryRunComplete") }); },
    onError: (e: Error) => toast({ title: t("admin.errorGeneric"), description: e.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async () => { const res = await fetch("/api/admin/historical/import", { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" } }); if (!res.ok) throw new Error(await res.text()); return res.json(); },
    onSuccess: () => { toast({ title: t("admin.importComplete") }); setDryRunResult(null); },
    onError: (e: Error) => toast({ title: t("admin.errorGeneric"), description: e.message, variant: "destructive" }),
  });

  const latestRun = importRuns?.[0] || null;
  const statusColor = (s: string) => s === "completed" ? "var(--labs-success)" : s === "failed" ? "var(--labs-danger)" : s === "running" ? "var(--labs-accent)" : "var(--labs-text-muted)";

  return (
    <div data-testid="labs-admin-historical-tab">
      <div className="flex items-center gap-2 mb-4"><FileArchive className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.historicalImport") }</span></div>
      <div className="labs-card p-4 mb-3">
        <div className="text-sm font-semibold mb-2.5" style={{ color: "var(--labs-text)" }}>{ t("admin.latestImportRun") }</div>
        {runsLoading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--labs-accent)" }} /></div> : latestRun ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase" style={{ background: `${statusColor(latestRun.status)}20`, color: statusColor(latestRun.status) }}>{latestRun.status}</span>
              {latestRun.createdAt && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{new Date(latestRun.createdAt).toLocaleString()}</span>}
            </div>
            <div className="labs-auto-grid" style={{ "--grid-min": "100px", gap: "0.5rem" } as React.CSSProperties}>
              {[{ label: t("admin.rowsRead"), value: latestRun.rowsRead ?? 0 }, { label: t("admin.imported"), value: latestRun.rowsImported ?? 0 }, { label: t("admin.skipped"), value: latestRun.rowsSkipped ?? 0 }].map(s => (
                <div key={s.label} className="text-center py-2 rounded-lg" style={{ background: "var(--labs-surface-elevated)" }}>
                  <div className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>{s.value}</div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="text-center py-4 text-xs" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noImportRuns") }</div>}
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => dryRunMutation.mutate()} disabled={dryRunMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text)", cursor: dryRunMutation.isPending ? "not-allowed" : "pointer" }} data-testid="labs-admin-dry-run">
          {dryRunMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} {t("admin.dryRun")}
        </button>
        <button onClick={() => { if (confirm(t("admin.confirmFullImport"))) importMutation.mutate(); }} disabled={importMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: importMutation.isPending ? "not-allowed" : "pointer" }} data-testid="labs-admin-full-import">
          {importMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} {t("admin.fullImport")}
        </button>
      </div>
      {dryRunResult && (
        <div className="labs-card p-4 mb-3" style={{ borderColor: "var(--labs-accent)" }}>
          <div className="flex items-center gap-1.5 mb-2.5"><Play className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.dryRunResults") }</span><span className="text-[11px] px-1.5 rounded font-semibold" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>DRY RUN</span></div>
          <div className="labs-auto-grid" style={{ "--grid-min": "120px", gap: "0.5rem" } as React.CSSProperties}>
            {[{ l: t("admin.rowsRead"), v: dryRunResult.rowsRead }, { l: t("admin.wouldImport"), v: dryRunResult.rowsImported }, { l: t("admin.tastingsLabel"), v: dryRunResult.tastingsCreated }, { l: t("admin.entriesLabel"), v: dryRunResult.entriesCreated }].map(s => (
              <div key={s.l} className="text-center py-2 rounded-lg" style={{ background: "var(--labs-surface-elevated)" }}>
                <div className="text-base font-bold" style={{ color: "var(--labs-text)" }}>{s.v as number}</div>
                <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommunitiesTab({ pid, participants }: { pid: string; participants: AdminParticipant[] }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSelectedId, setMemberSelectedId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState("member");
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editDescriptionValue, setEditDescriptionValue] = useState("");

  const { data: communities = [], isLoading } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["/admin/communities", pid],
    queryFn: async () => { const res = await fetch("/api/admin/communities", { headers: { "x-participant-id": pid } }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!pid,
  });

  const { data: detail } = useQuery<Record<string, unknown>>({
    queryKey: ["/admin/communities", selectedId, pid],
    queryFn: async () => { const res = await fetch(`/api/admin/communities/${selectedId}`, { headers: { "x-participant-id": pid } }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!pid && !!selectedId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, unknown> }) => { const res = await fetch(`/api/admin/communities/${id}`, { method: "PUT", headers: { "x-participant-id": pid, "Content-Type": "application/json" }, body: JSON.stringify(updates) }); if (!res.ok) throw new Error(await res.text()); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); setEditingName(false); setEditingDescription(false); toast({ title: t("admin.communityUpdated") }); },
    onError: (err: Error) => { toast({ title: t("admin.errorGeneric"), description: err.message, variant: "destructive" }); },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, description }: { name: string; description: string }) => { const res = await fetch("/api/admin/communities", { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" }, body: JSON.stringify({ name, description: description || undefined }) }); if (!res.ok) { const err = await res.json().catch(() => ({ message: "Failed" })); throw new Error(err.message); } return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); setShowCreateForm(false); setCreateName(""); setCreateDescription(""); toast({ title: t("admin.communityCreated") }); },
    onError: (err: Error) => { toast({ title: t("admin.errorGeneric"), description: err.message, variant: "destructive" }); },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ communityId, participantId, role }: { communityId: string; participantId: string; role: string }) => { const res = await fetch(`/api/admin/communities/${communityId}/members`, { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" }, body: JSON.stringify({ participantId, role }) }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); setMemberSearch(""); setMemberSelectedId(null); toast({ title: t("admin.memberAdded") }); },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ communityId, participantId: memberId }: { communityId: string; participantId: string }) => { const res = await fetch(`/api/admin/communities/${communityId}/members/${memberId}`, { method: "DELETE", headers: { "x-participant-id": pid } }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); toast({ title: t("admin.memberRemoved") }); },
  });


  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  if (selectedId && detail) {
    const members = (detail.members as Array<Record<string, unknown>>) || [];
    return (
      <div data-testid="labs-admin-community-detail">
        <button onClick={() => setSelectedId(null)} className="flex items-center gap-1.5 text-xs font-medium mb-4" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-back-communities">
          <ChevronRight className="w-3.5 h-3.5" style={{ transform: "rotate(180deg)" }} /> Back to Communities
        </button>
        <div className="labs-card p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-1.5">
                  <input type="text" value={editNameValue} onChange={e => setEditNameValue(e.target.value)} autoFocus style={{ ...labsInput, fontSize: 14, fontWeight: 700, padding: "2px 6px" }} data-testid="labs-admin-edit-community-name-input" onKeyDown={e => { if (e.key === "Enter" && editNameValue.trim()) updateMutation.mutate({ id: detail.id as string, updates: { name: editNameValue.trim() } }); if (e.key === "Escape") setEditingName(false); }} />
                  <button onClick={() => { if (editNameValue.trim()) updateMutation.mutate({ id: detail.id as string, updates: { name: editNameValue.trim() } }); }} disabled={!editNameValue.trim() || updateMutation.isPending} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-save-community-name"><CheckCircle className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /></button>
                  <button onClick={() => setEditingName(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-cancel-community-name"><X className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <div className="text-base font-bold" style={{ color: "var(--labs-text)" }}>{String(detail.name ?? "")}</div>
                  <button onClick={() => { setEditNameValue(String(detail.name ?? "")); setEditingName(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-edit-community-name"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} /></button>
                </div>
              )}
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{String(detail.slug ?? "")}</div>
            </div>
          </div>
          {editingDescription ? (
            <div className="flex items-start gap-1.5">
              <textarea value={editDescriptionValue} onChange={e => setEditDescriptionValue(e.target.value)} autoFocus rows={3} style={{ ...labsInput, fontSize: 12, padding: "4px 8px", resize: "vertical", flex: 1 }} data-testid="labs-admin-edit-community-description-input" onKeyDown={e => { if (e.key === "Escape") setEditingDescription(false); }} />
              <div className="flex flex-col gap-1">
                <button onClick={() => updateMutation.mutate({ id: detail.id as string, updates: { description: editDescriptionValue.trim() } })} disabled={updateMutation.isPending} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-save-community-description"><CheckCircle className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /></button>
                <button onClick={() => setEditingDescription(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-cancel-community-description"><X className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /></button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <div className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>{detail.description ? String(detail.description) : <span style={{ fontStyle: "italic", color: "var(--labs-text-muted)" }}>{ t("admin.noDescription") }</span>}</div>
              <button onClick={() => { setEditDescriptionValue(String(detail.description ?? "")); setEditingDescription(true); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-edit-community-description"><Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} /></button>
            </div>
          )}
        </div>
        <div className="labs-card p-4 mb-3">
          <div className="flex items-center gap-1.5 mb-3"><Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.members") }</span><span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>({members.length})</span></div>
          <div className="flex gap-1.5 mb-3">
            <div className="flex-1 relative">
              <input type="text" value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setMemberSelectedId(null); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder={t("admin.searchByNameOrEmail")} style={{ ...labsInput, fontSize: 12 }} data-testid="labs-admin-add-member-search" />
              {showDropdown && memberSearch.trim().length > 0 && !memberSelectedId && (() => {
                const existingIds = new Set(members.map(m => m.participantId as string));
                const filtered = participants.filter(p => !existingIds.has(p.id) && (p.name.toLowerCase().includes(memberSearch.toLowerCase()) || (p.email && p.email.toLowerCase().includes(memberSearch.toLowerCase())))).slice(0, 8);
                if (filtered.length === 0) return null;
                return (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-lg max-h-[200px] overflow-y-auto" style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                    {filtered.map(p => (
                      <button key={p.id} onClick={() => { setMemberSelectedId(p.id); setMemberSearch(stripGuestSuffix(p.name) + (p.email ? ` (${p.email})` : "")); setShowDropdown(false); }} className="flex flex-col gap-0.5 w-full px-2.5 py-2 text-left" style={{ background: "none", border: "none", borderBottom: "1px solid var(--labs-border)", cursor: "pointer" }} data-testid={`labs-admin-member-option-${p.id}`}>
                        <span className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{stripGuestSuffix(p.name)}</span>
                        {p.email && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{p.email}</span>}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
            <select value={memberRole} onChange={e => setMemberRole(e.target.value)} style={{ ...labsSelect, fontSize: 11 }} data-testid="labs-admin-add-member-role">
              <option value="member">{t("admin.roleMember")}</option>
              <option value="viewer">{t("admin.roleViewer")}</option>
              <option value="admin">{t("admin.roleAdmin")}</option>
            </select>
            <button onClick={() => { if (memberSelectedId) addMemberMutation.mutate({ communityId: detail.id as string, participantId: memberSelectedId, role: memberRole }); }} disabled={!memberSelectedId} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: !memberSelectedId ? "not-allowed" : "pointer", opacity: !memberSelectedId ? 0.5 : 1 }} data-testid="labs-admin-add-member-btn">
              <UserPlus className="w-3 h-3" /> {t("m2.circle.addToggle")}
            </button>
          </div>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id as string} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }} data-testid={`labs-admin-community-member-${m.participantId}`}>
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                  <div>
                    <div className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{stripGuestSuffix((m.participantName as string) || (m.participantEmail as string) || (m.participantId as string))}</div>
                    <span className="text-[11px] font-semibold uppercase px-1.5 rounded" style={{ color: "var(--labs-text-muted)" }}>{m.role as string} · {m.status as string}</span>
                  </div>
                </div>
                <button onClick={() => { if (confirm(t("admin.confirmRemoveMember"))) removeMemberMutation.mutate({ communityId: detail.id as string, participantId: m.participantId as string }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-remove-member-${m.participantId}`}>
                  <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="labs-admin-communities-tab">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2"><Globe className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.communitiesTitle") }</span><span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>({communities.length})</span></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateForm(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-create-community-btn">
            <Plus className="w-3 h-3" /> Neue Community
          </button>
        </div>
      </div>
      {showCreateForm && (
        <div className="labs-card p-4 mb-4" data-testid="labs-admin-create-community-form">
          <div className="text-sm font-semibold mb-3" style={{ color: "var(--labs-text)" }}>{ t("admin.createCommunity") }</div>
          <div className="space-y-2 mb-3">
            <input type="text" value={createName} onChange={e => setCreateName(e.target.value)} placeholder={t("admin.communityName")} style={{ ...labsInput, fontSize: 12 }} data-testid="labs-admin-create-community-name" />
            {createName.trim() && <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{t("admin.slugLabel")}: {createName.trim().toLowerCase().replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}</div>}
            <textarea value={createDescription} onChange={e => setCreateDescription(e.target.value)} placeholder={t("admin.descriptionOptional")} rows={2} style={{ ...labsInput, fontSize: 12, resize: "vertical" }} data-testid="labs-admin-create-community-description" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (createName.trim()) createMutation.mutate({ name: createName.trim(), description: createDescription.trim() }); }} disabled={!createName.trim() || createMutation.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: !createName.trim() ? "not-allowed" : "pointer", opacity: !createName.trim() ? 0.5 : 1 }} data-testid="labs-admin-create-community-submit">
              {createMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} {t("admin.create")}
            </button>
            <button onClick={() => { setShowCreateForm(false); setCreateName(""); setCreateDescription(""); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)", cursor: "pointer" }} data-testid="labs-admin-create-community-cancel">
              {t("admin.cancel")}
            </button>
          </div>
        </div>
      )}
      {communities.length === 0 && !showCreateForm ? (
        <div className="text-center py-12" style={{ color: "var(--labs-text-muted)" }}>
          <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <div className="text-sm font-medium mb-1">{ t("admin.noCommunities") }</div>
          <div className="text-xs">{t("admin.noCommunitiesDesc")}</div>
        </div>
      ) : communities.length > 0 ? (
        <div className="space-y-2">
          {communities.map((c) => (
            <button key={c.id as string} onClick={() => setSelectedId(c.id as string)} className="w-full labs-card p-3.5 flex items-center justify-between text-left" style={{ cursor: "pointer" }} data-testid={`labs-admin-community-${c.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1"><Globe className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{c.name as string}</span></div>
                <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{(c.memberCount as number) ?? 0} {t("admin.members")}</span>
                  <span className="flex items-center gap-1"><Archive className="w-2.5 h-2.5" />{(c.tastingCount as number) ?? 0} {t("admin.tastingsLabel")}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SettingsTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-app-settings", pid],
    queryFn: async () => { const res = await fetch(`/api/admin/app-settings?requesterId=${pid}`); if (!res.ok) throw new Error("Failed"); return res.json() as Promise<Record<string, string>>; },
  });

  const updateSetting = useMutation({
    mutationFn: async (updates: Record<string, string>) => { const res = await apiRequest("POST", "/api/admin/app-settings", { requesterId: pid, settings: updates }); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] }); toast({ title: t("admin.settingsSaved") }); },
  });

  const [bannerText, setBannerText] = useState("");
  useEffect(() => { if (settings) setBannerText(settings.whats_new_text || ""); }, [settings]);

  if (isLoading || !settings) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  const toggleSetting = (key: string) => updateSetting.mutate({ [key]: String(settings[key] !== "true") });

  const items = [
    { key: "whats_new_enabled", label: t("admin.settWhatsNew"), desc: t("admin.settWhatsNewDesc") },
    { key: "guest_mode_enabled", label: t("admin.settGuestMode"), desc: t("admin.settGuestModeDesc") },
    { key: "registration_open", label: t("admin.settRegistration"), desc: t("admin.settRegistrationDesc") },
    { key: "maintenance_mode", label: t("admin.settMaintenance"), desc: t("admin.settMaintenanceDesc") },
    { key: "friend_online_notifications", label: t("admin.settFriendNotif"), desc: t("admin.settFriendNotifDesc") },
  ];

  return (
    <div data-testid="labs-admin-settings-tab">
      <div className="labs-card p-4">
        <div className="flex items-center gap-2 mb-4"><Settings className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.appSettings") }</span></div>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg" style={{ border: "1px solid var(--labs-border)" }} data-testid={`labs-admin-setting-${item.key}`}>
              <div>
                <div className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{item.label}</div>
                <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{item.desc}</div>
              </div>
              <ToggleSwitch on={settings[item.key] === "true"} onToggle={() => toggleSetting(item.key)} testId={`labs-admin-switch-${item.key}`} />
            </div>
          ))}
        </div>
        {settings.whats_new_enabled === "true" && (
          <div className="mt-3">
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--labs-text)" }}>{ t("admin.bannerText") }</label>
            <input type="text" value={bannerText} onChange={e => setBannerText(e.target.value)} onBlur={() => updateSetting.mutate({ whats_new_text: bannerText })} placeholder={t("admin.whatsNewPlaceholder")} style={labsInput} data-testid="labs-admin-whats-new-text" />
          </div>
        )}
      </div>
    </div>
  );
}

function MakingOfTab({ pid, participants }: { pid: string; participants: AdminParticipant[] }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const accessMutation = useMutation({
    mutationFn: ({ participantId, access }: { participantId: string; access: boolean }) => adminApi.updateMakingOfAccess(participantId, access, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: t("admin.makingOfAccessUpdated") }); },
  });

  const filtered = participants.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const accessCount = participants.filter(p => p.makingOfAccess || p.role === "admin").length;

  return (
    <div data-testid="labs-admin-makingof-tab">
      <div className="flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.makingOfTitle") }</span></div>

      <a href="/labs/making-of" className="labs-card flex items-center justify-between p-4 mb-5" style={{ textDecoration: "none" }} data-testid="labs-admin-link-makingof">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--labs-accent), var(--labs-surface-elevated))" }}>
            <BookOpen className="w-5 h-5" style={{ color: "var(--labs-text)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.viewMakingOfTimeline") }</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.makingOfStats") }</div>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
      </a>

      <div className="labs-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.accessControl") }</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{t("admin.participantsHaveAccess", { count: accessCount })}</div>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={t("admin.searchParticipants")} style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-search-makingof-access" />
        </div>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noResults") }</div>
          ) : filtered.map(p => {
            const hasAccess = p.makingOfAccess || p.role === "admin";
            const isAdmin = p.role === "admin";
            return (
              <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl transition-all" style={{ background: hasAccess ? "var(--labs-accent-muted)" : "transparent", border: `1px solid ${hasAccess ? "var(--labs-accent)" : "var(--labs-border)"}` }} data-testid={`labs-admin-makingof-access-${p.id}`}>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {p.role === "admin" ? <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-accent)" }} /> :
                   p.role === "host" ? <Crown className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-info)" }} /> :
                   <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />}
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>{stripGuestSuffix(p.name)}</div>
                    <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                      {p.email || t("admin.noEmail")}{isAdmin && ` · ${t("admin.alwaysHasAccess")}`}
                    </div>
                  </div>
                </div>
                <ToggleSwitch on={hasAccess} onToggle={() => { if (!isAdmin) accessMutation.mutate({ participantId: p.id, access: !p.makingOfAccess }); }} disabled={isAdmin} testId={`labs-admin-toggle-makingof-${p.id}`} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeedbackTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { data: feedback = [], isLoading } = useQuery({ queryKey: ["/feedback", pid], queryFn: () => feedbackApi.getAll(pid), enabled: !!pid });

  const icons: Record<string, string> = { bug: "\u{1F41B}", feature: "\u{1F4A1}", improvement: "\u{1F527}", other: "\u{1F4DD}" };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  return (
    <div data-testid="labs-admin-feedback-tab">
      <div className="flex items-center gap-2 mb-4"><MessageSquarePlus className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{ t("admin.userFeedback") }</span><span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>({(feedback as Array<Record<string, unknown>>).length})</span></div>
      {(feedback as Array<Record<string, unknown>>).length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>{ t("admin.noFeedback") }</div>
      ) : (
        <div className="space-y-2">
          {(feedback as Array<Record<string, unknown>>).map((fb) => (
            <div key={fb.id as string} className="labs-card p-3" data-testid={`labs-admin-feedback-${fb.id}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{icons[String(fb.category ?? "")] || "\u{1F4DD}"}</span>
                <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--labs-accent)" }}>{String(fb.category ?? "")}</span>
                {fb.participantName && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>· {stripGuestSuffix(fb.participantName)}</span>}
                {fb.createdAt && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>· {new Date(String(fb.createdAt)).toLocaleDateString()}</span>}
              </div>
              <div className="text-xs" style={{ color: "var(--labs-text)", lineHeight: 1.5 }}>{String(fb.message ?? "")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FlavourCatAPI {
  id: string;
  en: string;
  de: string;
  color: string;
  sortOrder: number;
  descriptors: { id: string; categoryId: string; en: string; de: string; keywords: string[]; sortOrder: number }[];
}

function AromasTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editCat, setEditCat] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState<string | null>(null);
  const [addingCat, setAddingCat] = useState(false);
  const [addingDescTo, setAddingDescTo] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: categories = [], isLoading } = useQuery<FlavourCatAPI[]>({
    queryKey: ["/api/flavour-categories"],
    queryFn: async () => { const res = await fetch("/api/flavour-categories"); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/flavour-seed", { participantId: pid });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); toast({ title: t("m2.admin.aromasSeeded", "Seeded from defaults") }); },
    onError: (e: Error) => toast({ title: t("m2.admin.aromasSeedFailed", "Seed failed"), description: e.message, variant: "destructive" }),
  });

  const createCatMutation = useMutation({
    mutationFn: async (data: Record<string, string>) => {
      const res = await apiRequest("POST", "/api/admin/flavour-categories", { participantId: pid, ...data, sortOrder: categories.length });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); setAddingCat(false); setForm({}); toast({ title: t("m2.admin.aromasCatCreated", "Category created") }); },
  });

  const updateCatMutation = useMutation({
    mutationFn: async ({ id, ...data }: Record<string, string>) => {
      const res = await apiRequest("PATCH", `/api/admin/flavour-categories/${id}`, { participantId: pid, ...data });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); setEditCat(null); setForm({}); toast({ title: t("m2.admin.aromasCatUpdated", "Category updated") }); },
  });

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/flavour-categories/${id}?participantId=${pid}`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); toast({ title: t("m2.admin.aromasCatDeleted", "Category deleted") }); },
  });

  const createDescMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const res = await apiRequest("POST", "/api/admin/flavour-descriptors", { participantId: pid, ...data });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); setAddingDescTo(null); setForm({}); toast({ title: t("m2.admin.aromasDescCreated", "Descriptor created") }); },
  });

  const updateDescMutation = useMutation({
    mutationFn: async ({ id, ...data }: Record<string, any>) => {
      const res = await apiRequest("PATCH", `/api/admin/flavour-descriptors/${id}`, { participantId: pid, ...data });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); setEditDesc(null); setForm({}); toast({ title: t("m2.admin.aromasDescUpdated", "Descriptor updated") }); },
  });

  const deleteDescMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/flavour-descriptors/${id}?participantId=${pid}`);
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/flavour-categories"] }); toast({ title: t("m2.admin.aromasDescDeleted", "Descriptor deleted") }); },
  });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  return (
    <div data-testid="labs-admin-aromas-tab">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flower2 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{t("m2.admin.aromaCategories", "Aroma Categories")}</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>{categories.length}</span>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={() => seedMutation.mutate()}
              disabled={seedMutation.isPending}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text)", border: "1px solid var(--labs-border)", cursor: "pointer" }}
              data-testid="labs-admin-aromas-seed"
            >
              {seedMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
              {t("m2.admin.aromasSeedDefaults", "Seed from defaults")}
            </button>
          )}
          <button
            onClick={() => { setAddingCat(true); setForm({ id: "", en: "", de: "", color: "#888888" }); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }}
            data-testid="labs-admin-aromas-add-category"
          >
            <Plus className="w-3 h-3" /> {t("m2.admin.aromasAddCategory", "Add Category")}
          </button>
        </div>
      </div>

      {addingCat && (
        <div className="labs-card p-3 mb-3" data-testid="labs-admin-aromas-new-category-form">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input placeholder={t("m2.admin.aromasIdSlug", "ID (slug)")} value={form.id || ""} onChange={e => setForm(f => ({ ...f, id: e.target.value }))} style={labsInput} data-testid="labs-admin-input-cat-id" />
            <input type="color" value={form.color || "#888888"} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ ...labsInput, padding: 2, height: 38 }} data-testid="labs-admin-input-cat-color" />
            <input placeholder={t("m2.admin.aromasEnName", "English name")} value={form.en || ""} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} style={labsInput} data-testid="labs-admin-input-cat-en" />
            <input placeholder={t("m2.admin.aromasDeName", "German name")} value={form.de || ""} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} style={labsInput} data-testid="labs-admin-input-cat-de" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => createCatMutation.mutate(form)} disabled={!form.id || !form.en || !form.de} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer", opacity: !form.id || !form.en || !form.de ? 0.5 : 1 }} data-testid="labs-admin-btn-save-cat">{t("m2.admin.aromasSave", "Save")}</button>
            <button onClick={() => { setAddingCat(false); setForm({}); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "transparent", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)", cursor: "pointer" }} data-testid="labs-admin-btn-cancel-cat">{t("m2.admin.aromasCancel", "Cancel")}</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {categories.map(cat => (
          <div key={cat.id} className="labs-card p-3" data-testid={`labs-admin-aromas-cat-${cat.id}`}>
            {editCat === cat.id ? (
              <div>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <input value={form.en || ""} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} style={labsInput} data-testid="labs-admin-input-edit-cat-en" />
                  <input value={form.de || ""} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} style={labsInput} data-testid="labs-admin-input-edit-cat-de" />
                  <input type="color" value={form.color || "#888888"} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} style={{ ...labsInput, padding: 2, height: 38 }} data-testid="labs-admin-input-edit-cat-color" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => updateCatMutation.mutate({ id: cat.id, en: form.en || cat.en, de: form.de || cat.de, color: form.color || cat.color })} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-btn-update-cat">{t("m2.admin.aromasSave", "Save")}</button>
                  <button onClick={() => { setEditCat(null); setForm({}); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "transparent", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)", cursor: "pointer" }} data-testid="labs-admin-btn-cancel-edit-cat">{t("m2.admin.aromasCancel", "Cancel")}</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span style={{ width: 12, height: 12, borderRadius: 6, background: cat.color, display: "inline-block", flexShrink: 0 }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{cat.en}</span>
                  <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>/ {cat.de}</span>
                  <span className="text-[11px] px-1.5 rounded" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)" }}>{cat.descriptors.length} {t("m2.admin.aromasDescriptors", "descriptors")}</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditCat(cat.id); setForm({ en: cat.en, de: cat.de, color: cat.color }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-edit-cat-${cat.id}`}>
                    <Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                  </button>
                  <button onClick={() => { if (confirm(t("m2.admin.aromasConfirmDeleteCat", { name: cat.en, defaultValue: `Delete "${cat.en}" and all its descriptors?` }))) deleteCatMutation.mutate(cat.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-delete-cat-${cat.id}`}>
                    <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
                  </button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 mb-2">
              {cat.descriptors.map(desc => (
                <div key={desc.id} className="flex items-center gap-1" data-testid={`labs-admin-aromas-desc-${desc.id}`}>
                  {editDesc === desc.id ? (
                    <div className="flex gap-1 items-center flex-wrap" style={{ background: "var(--labs-surface-elevated)", borderRadius: 8, padding: "4px 8px" }}>
                      <input value={form.en || ""} onChange={e => setForm(f => ({ ...f, en: e.target.value }))} placeholder="EN" style={{ ...labsInput, width: 80, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-edit-desc-en" />
                      <input value={form.de || ""} onChange={e => setForm(f => ({ ...f, de: e.target.value }))} placeholder="DE" style={{ ...labsInput, width: 80, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-edit-desc-de" />
                      <input value={form.keywords || ""} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} placeholder={t("m2.admin.aromasKeywords", "Keywords (comma-separated)")} style={{ ...labsInput, width: 140, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-edit-desc-keywords" />
                      <button onClick={() => updateDescMutation.mutate({ id: desc.id, en: form.en, de: form.de, keywords: (form.keywords || "").split(",").map((k: string) => k.trim()).filter(Boolean) })} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-btn-update-desc">
                        <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />
                      </button>
                      <button onClick={() => { setEditDesc(null); setForm({}); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-btn-cancel-edit-desc">
                        <X className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
                      style={{ border: "1px solid var(--labs-border)", color: "var(--labs-text-secondary)", background: "transparent" }}
                    >
                      {desc.en}
                      <button onClick={() => { setEditDesc(desc.id); setForm({ en: desc.en, de: desc.de, keywords: (desc.keywords || []).join(", ") }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }} data-testid={`labs-admin-edit-desc-${desc.id}`}>
                        <Pencil className="w-2.5 h-2.5" style={{ color: "var(--labs-text-muted)" }} />
                      </button>
                      <button onClick={() => { if (confirm(t("m2.admin.aromasConfirmDeleteDesc", { name: desc.en, defaultValue: `Delete "${desc.en}"?` }))) deleteDescMutation.mutate(desc.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }} data-testid={`labs-admin-delete-desc-${desc.id}`}>
                        <X className="w-2.5 h-2.5" style={{ color: "var(--labs-danger)" }} />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>

            {addingDescTo === cat.id ? (
              <div className="flex gap-1 items-center flex-wrap" style={{ background: "var(--labs-surface-elevated)", borderRadius: 8, padding: "4px 8px" }}>
                <input placeholder={t("m2.admin.aromasIdSlug", "ID (slug)")} value={form.descId || ""} onChange={e => setForm(f => ({ ...f, descId: e.target.value }))} style={{ ...labsInput, width: 70, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-new-desc-id" />
                <input placeholder="EN" value={form.descEn || ""} onChange={e => setForm(f => ({ ...f, descEn: e.target.value }))} style={{ ...labsInput, width: 70, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-new-desc-en" />
                <input placeholder="DE" value={form.descDe || ""} onChange={e => setForm(f => ({ ...f, descDe: e.target.value }))} style={{ ...labsInput, width: 70, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-new-desc-de" />
                <input placeholder={t("m2.admin.aromasKeywords", "Keywords (comma-separated)")} value={form.descKw || ""} onChange={e => setForm(f => ({ ...f, descKw: e.target.value }))} style={{ ...labsInput, width: 120, padding: "4px 8px", fontSize: 11 }} data-testid="labs-admin-input-new-desc-keywords" />
                <button
                  onClick={() => createDescMutation.mutate({ id: `${cat.id}-${form.descId}`, categoryId: cat.id, en: form.descEn, de: form.descDe, keywords: (form.descKw || "").split(",").map((k: string) => k.trim()).filter(Boolean), sortOrder: cat.descriptors.length })}
                  disabled={!form.descId || !form.descEn || !form.descDe}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: !form.descId || !form.descEn || !form.descDe ? 0.4 : 1 }}
                  data-testid="labs-admin-btn-save-desc"
                >
                  <CheckCircle className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} />
                </button>
                <button onClick={() => { setAddingDescTo(null); setForm({}); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid="labs-admin-btn-cancel-desc">
                  <X className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAddingDescTo(cat.id); setForm({}); }}
                className="flex items-center gap-1 text-[11px]"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-text-muted)", padding: 0 }}
                data-testid={`labs-admin-add-desc-${cat.id}`}
              >
                <Plus className="w-3 h-3" /> {t("m2.admin.aromasAddDescriptor", "Add descriptor")}
              </button>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && !addingCat && (
        <div className="text-center py-12" data-testid="labs-admin-aromas-empty">
          <Flower2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm font-medium mb-1" style={{ color: "var(--labs-text)" }}>{t("m2.admin.aromasNoCategories", "No aroma categories yet")}</p>
          <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>{t("m2.admin.aromasNoDesc", "Seed from the built-in defaults or create your own.")}</p>
        </div>
      )}
    </div>
  );
}

function ToggleSwitch({ on, onToggle, testId, disabled, small }: { on: boolean; onToggle: () => void; testId: string; disabled?: boolean; small?: boolean }) {
  const w = small ? 36 : 40;
  const h = small ? 20 : 22;
  const dot = small ? 14 : 16;
  const pad = 3;
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      style={{
        width: w, height: h, borderRadius: h / 2, border: "none",
        cursor: disabled ? "default" : "pointer",
        background: on ? "var(--labs-success)" : "var(--labs-text-muted)",
        position: "relative", transition: "background 0.2s",
        opacity: disabled ? 0.6 : 1, flexShrink: 0,
      }}
      data-testid={testId}
    >
      <div style={{
        width: dot, height: dot, borderRadius: "50%", background: "var(--labs-text)",
        position: "absolute", top: pad,
        left: on ? w - dot - pad : pad, transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

type AdminTrashEntry = {
  id: string;
  participantId: string;
  participantName: string;
  title: string;
  whiskyName: string | null;
  distillery: string | null;
  deletedAt: string | null;
};

function AdminTrashTab({ pid }: { pid: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trashEntries = [], isLoading } = useQuery<AdminTrashEntry[]>({
    queryKey: ["admin-trash"],
    queryFn: () => adminApi.getTrash(),
    enabled: !!pid,
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => adminApi.restoreTrashEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-trash"] });
      toast({ title: t("admin.entryRestored") });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} />
      </div>
    );
  }

  return (
    <div data-testid="labs-admin-trash-tab">
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", marginBottom: 4 }}>{ t("admin.trash") }</h2>
        <p style={{ fontSize: 13, color: "var(--labs-text-muted)" }}>
          {t("admin.trashDescription")}
        </p>
      </div>

      {trashEntries.length === 0 ? (
        <div style={{ padding: "48px 20px", textAlign: "center" }}>
          <Trash2 className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: "var(--labs-text)" }}>{ t("admin.noDeletedEntries") }</p>
          <p style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 4 }}>{ t("admin.trashEmpty") }</p>
        </div>
      ) : (
        <div className="space-y-2">
          {trashEntries.map((entry: AdminTrashEntry) => {
            const deletedAt = entry.deletedAt ? new Date(entry.deletedAt) : new Date();
            const daysAgo = Math.floor((Date.now() - deletedAt.getTime()) / 86400000);
            return (
              <div key={entry.id} className="labs-card p-3.5" data-testid={`admin-trash-item-${entry.id}`}>
                <div className="flex items-center justify-between gap-3">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                      {entry.whiskyName || entry.title || "—"}
                    </div>
                    <div className="text-[11px] mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: "var(--labs-text-muted)" }}>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" /> {entry.participantName || entry.participantId}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {t("admin.deletedLabel")} {daysAgo === 0 ? t("admin.today") : t("admin.daysAgo", { count: daysAgo })}
                      </span>
                      {entry.distillery && <span>{entry.distillery}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => restoreMutation.mutate(entry.id)}
                    disabled={restoreMutation.isPending}
                    className="flex items-center gap-1.5"
                    style={{
                      padding: "6px 14px", fontSize: 12, fontWeight: 500, borderRadius: 8, cursor: "pointer",
                      background: "var(--labs-accent-muted, rgba(212,168,71,0.12))",
                      color: "var(--labs-accent)",
                      border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)",
                      flexShrink: 0,
                    }}
                    data-testid={`admin-restore-${entry.id}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Restore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
