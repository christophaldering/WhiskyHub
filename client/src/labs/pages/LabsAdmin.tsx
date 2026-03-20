import { useState, useEffect, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { adminApi, feedbackApi } from "@/lib/api";
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
} from "lucide-react";

type AdminTab = "participants" | "tastings" | "online" | "activity" | "sessions" | "ai" | "newsletter" | "changelog" | "cleanup" | "analytics" | "historical" | "communities" | "settings" | "feedback" | "making-of" | "aromas";

const TAB_CONFIG: { id: AdminTab; label: string; icon: React.ElementType }[] = [
  { id: "participants", label: "Participants", icon: Users },
  { id: "tastings", label: "Tastings", icon: Wine },
  { id: "online", label: "Online", icon: Wifi },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "sessions", label: "Sessions", icon: Clock },
  { id: "ai", label: "AI Controls", icon: Brain },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "changelog", label: "Changelog", icon: Rocket },
  { id: "cleanup", label: "Cleanup", icon: Trash2 },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "historical", label: "Historical", icon: FileArchive },
  { id: "communities", label: "Communities", icon: Globe },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "feedback", label: "Feedback", icon: MessageSquarePlus },
  { id: "making-of", label: "Making-Of", icon: BookOpen },
  { id: "aromas", label: "Aromas", icon: Flower2 },
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const session = useSession();
  const pid = session.pid || "";
  const [activeTab, setActiveTab] = useState<AdminTab>("participants");

  const { data, isLoading, isError, refetch } = useQuery<AdminOverview>({
    queryKey: ["/admin/overview", pid],
    queryFn: () => adminApi.getOverview(pid),
    enabled: !!pid,
  });

  if (!pid || session.role !== "admin") {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in text-center" data-testid="labs-admin-access-denied">
        <Shield className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--labs-accent)" }} />
        <p className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>
          {!pid ? "Admin Access Required" : "Access Denied"}
        </p>
        <p className="text-sm mt-2" style={{ color: "var(--labs-text-muted)" }}>
          {!pid ? "Please sign in to access admin features." : "You don't have admin privileges."}
        </p>
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
      <div className="px-5 py-6 max-w-2xl mx-auto text-center">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--labs-danger)" }} />
        <p className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Access Denied</p>
        <button onClick={() => refetch()} className="mt-4 px-4 py-2 rounded-lg text-sm" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-retry">Retry</button>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 labs-fade-in" data-testid="labs-admin-page">
      <button onClick={() => navigate("/labs/home")} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="labs-admin-back">
        <ChevronLeft className="w-4 h-4" /> Home
      </button>

      <h1 className="labs-h2 mb-3" style={{ color: "var(--labs-text)" }} data-testid="labs-admin-title">Admin Panel</h1>

      <div className="grid grid-cols-4 gap-2 mb-5">
        {[
          { label: "Users", value: data.stats.totalParticipants, Icon: Users },
          { label: "Hosts", value: data.stats.totalHosts, Icon: Crown },
          { label: "Tastings", value: data.stats.totalTastings, Icon: Wine },
          { label: "Admins", value: data.stats.totalAdmins, Icon: Shield },
        ].map(s => (
          <div key={s.label} className="labs-card text-center py-3 px-2" data-testid={`labs-admin-stat-${s.label.toLowerCase()}`}>
            <s.Icon className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
            <div className="labs-h3" style={{ color: "var(--labs-text)" }}>{s.value}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 overflow-x-auto mb-5 pb-1" data-testid="labs-admin-tabs">
        {TAB_CONFIG.map(tab => {
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all"
              style={{
                background: active ? "var(--labs-accent)" : "var(--labs-surface-elevated)",
                color: active ? "var(--labs-bg)" : "var(--labs-text-secondary)",
                border: "none", cursor: "pointer",
              }}
              data-testid={`labs-admin-tab-${tab.id}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "participants" && <ParticipantsTab data={data} pid={pid} />}
      {activeTab === "tastings" && <TastingsTab data={data} pid={pid} />}
      {activeTab === "online" && <OnlineTab />}
      {activeTab === "activity" && <ActivityTab />}
      {activeTab === "sessions" && <SessionsTab pid={pid} />}
      {activeTab === "ai" && <AITab pid={pid} />}
      {activeTab === "newsletter" && <NewsletterTab participants={data.participants} pid={pid} />}
      {activeTab === "changelog" && <ChangelogTab pid={pid} />}
      {activeTab === "cleanup" && <CleanupTab data={data} pid={pid} />}
      {activeTab === "analytics" && <AnalyticsTab pid={pid} />}
      {activeTab === "historical" && <HistoricalImportTab pid={pid} />}
      {activeTab === "communities" && <CommunitiesTab pid={pid} participants={data.participants} />}
      {activeTab === "settings" && <SettingsTab pid={pid} />}
      {activeTab === "feedback" && <FeedbackTab pid={pid} />}
      {activeTab === "making-of" && <MakingOfTab pid={pid} participants={data.participants} />}
      {activeTab === "aromas" && <AromasTab pid={pid} />}
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: "Role updated" }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (participantId: string) => adminApi.deleteParticipant(participantId, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: "Participant deleted" }); },
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search participants..." style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-input-search-participants" />
        </div>
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={labsSelect} data-testid="labs-admin-select-filter-role">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="host">Host</option>
          <option value="user">User</option>
        </select>
      </div>
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>No results</div>
        ) : filtered.map(p => (
          <div key={p.id} className="labs-card p-3.5" data-testid={`labs-admin-participant-${p.id}`}>
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {p.role === "admin" ? <Shield className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /> :
                   p.role === "host" ? <Crown className="w-3.5 h-3.5" style={{ color: "var(--labs-info)" }} /> :
                   <User className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />}
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{stripGuestSuffix(p.name)}</span>
                  {p.id === pid && <span className="text-[11px] px-1.5 rounded" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>You</span>}
                  {p.email?.endsWith("@casksense.local") && <span className="text-[11px] px-1.5 rounded font-semibold" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>{t("discover.testData", "TEST")}</span>}
                </div>
                <div className="text-[11px] mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: "var(--labs-text-muted)" }}>
                  <span>{p.email || "No email"}</span>
                  {p.email && !p.email.endsWith("@casksense.local") && (
                    p.emailVerified ? (
                      <CheckCircle className="w-3 h-3 inline" style={{ color: "var(--labs-success)" }} />
                    ) : (
                      <XCircle className="w-3 h-3 inline" style={{ color: "var(--labs-danger)" }} />
                    )
                  )}
                  <span>· {p.hostedTastings} tastings hosted</span>
                  {p.createdAt && <span>· {new Date(p.createdAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <select value={p.role} onChange={e => roleMutation.mutate({ participantId: p.id, role: e.target.value })} disabled={p.id === pid} style={{ ...labsSelect, padding: "4px 8px", fontSize: 11 }} data-testid={`labs-admin-select-role-${p.id}`}>
                  <option value="user">User</option>
                  <option value="host">Host</option>
                  <option value="admin">Admin</option>
                </select>
                {p.id !== pid && (
                  <button onClick={() => { if (confirm(`Delete ${p.name}?`)) deleteMutation.mutate(p.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-delete-participant-${p.id}`}>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: "Tasting deleted" }); },
  });
  const toggleTestMutation = useMutation({
    mutationFn: async ({ id, isTestData }: { id: string; isTestData: boolean }) => {
      const res = await apiRequest("POST", `/api/admin/tastings/${id}/test-flag`, { requesterId: pid, isTestData });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: "Test flag updated" }); },
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tastings..." style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-input-search-tastings" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={labsSelect} data-testid="labs-admin-select-filter-status">
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="reveal">Reveal</option>
          <option value="archived">Archived</option>
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
          <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>No results</div>
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
                <button onClick={() => { if (confirm(`Delete "${tasting.title}"?`)) deleteMutation.mutate(tasting.id); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-delete-tasting-${tasting.id}`}>
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
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["/api/admin/online-users"],
    queryFn: async () => { const res = await fetch("/api/admin/online-users?minutes=10"); if (!res.ok) throw new Error("Failed"); return res.json(); },
    refetchInterval: 15000,
  });

  const formatTime = (ts: string) => {
    const diffMin = Math.floor((Date.now() - new Date(ts).getTime()) / 60000);
    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div data-testid="labs-admin-online-tab">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4" style={{ color: "var(--labs-success)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Online Users</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>{onlineUsers.length}</span>
        </div>
        <span className="text-[11px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
          <Clock className="w-3 h-3" /> Auto-refresh 15s
        </span>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
      ) : onlineUsers.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>No users currently online.</div>
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
                  <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{u.name as string}</span>
                  {u.role === "admin" && <span className="text-[11px] px-1 rounded font-semibold" style={{ background: "var(--labs-danger-muted)", color: "var(--labs-danger)" }}>Admin</span>}
                </div>
                {u.email && <div className="text-[11px] truncate" style={{ color: "var(--labs-text-muted)" }}>{u.email as string}</div>}
              </div>
              <span className="text-[11px] flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>{formatTime(u.lastSeenAt as string)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ActivityTab() {
  const [hours, setHours] = useState(24);
  const [roleFilter, setRoleFilter] = useState("all");
  const [search, setSearch] = useState("");

  const timeOpts = [
    { hours: 1, label: "1h" }, { hours: 6, label: "6h" }, { hours: 12, label: "12h" },
    { hours: 24, label: "24h" }, { hours: 168, label: "7d" }, { hours: 720, label: "30d" },
    { hours: 0, label: "All" },
  ];

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ["/api/admin/user-activity", hours, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams({ hours: String(hours) });
      if (roleFilter !== "all") params.set("role", roleFilter);
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
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    return `${Math.floor(diffH / 24)}d`;
  };

  return (
    <div data-testid="labs-admin-activity-tab">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
        <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>User Activity</span>
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
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Name or email..." style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-input-search-activity" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={labsSelect} data-testid="labs-admin-select-activity-role">
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="host">Host</option>
          <option value="user">User</option>
        </select>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
      ) : isError ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-danger)" }}>Error loading activity data.</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>No users in selected period.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u: Record<string, unknown>) => (
            <div key={u.id as string} className="labs-card p-3.5" data-testid={`labs-admin-activity-user-${u.id}`}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{u.name as string}</span>
                    <span className="text-[11px] px-1.5 rounded uppercase font-semibold" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)" }}>{u.role as string}</span>
                  </div>
                  {u.email && <div className="text-[11px] mt-0.5 truncate" style={{ color: "var(--labs-text-muted)" }}>{u.email as string}</div>}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{formatRel(u.lastSeenAt as string)}</div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>last seen</div>
                </div>
              </div>
              <div className="flex gap-3 mt-2.5 pt-2" style={{ borderTop: "1px solid var(--labs-border)" }}>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-text-secondary)" }}><Wine className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />{u.tastingCount as number} tastings</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-text-secondary)" }}><BarChart3 className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />{u.ratingCount as number} ratings</span>
                <span className="flex items-center gap-1 text-xs" style={{ color: "var(--labs-text-secondary)" }}><BookOpen className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />{u.journalCount as number} journal</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionsTab({ pid }: { pid: string }) {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [userSearch, setUserSearch] = useState("");

  const getFromDate = () => {
    if (timeRange === "all") return undefined;
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    return new Date(Date.now() - days * 86400000).toISOString();
  };

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/admin/activity-summary", pid, timeRange],
    queryFn: () => adminApi.getActivitySummary(pid, { from: getFromDate() }),
  });

  const { data: userSessions = [], isLoading: userSessionsLoading } = useQuery({
    queryKey: ["/api/admin/activity-sessions", pid, selectedUser, timeRange],
    queryFn: () => adminApi.getActivitySessionsForUser(pid, selectedUser!, { from: getFromDate() }),
    enabled: !!selectedUser,
  });

  const rangeOpts: { value: typeof timeRange; label: string }[] = [
    { value: "7d", label: "7 Days" },
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "all", label: "All Time" },
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
    if (diffMin < 1) return "now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    return `${diffD}d ago`;
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

  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>{userData?.name || "User"}</span>
          {userData?.email && <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{userData.email}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="labs-card p-3 text-center">
            <div className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{userData?.sessions || 0}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Sessions</div>
          </div>
          <div className="labs-card p-3 text-center">
            <div className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{formatDuration(userData?.totalMinutes || 0)}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Total Time</div>
          </div>
          <div className="labs-card p-3 text-center">
            <div className="text-lg font-bold" style={{ color: "var(--labs-accent)" }}>{formatDuration(userData?.sessions ? Math.round((userData.totalMinutes || 0) / userData.sessions) : 0)}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Avg Duration</div>
          </div>
        </div>
        {userSessionsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
        ) : userSessions.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>No sessions recorded.</div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-secondary)" }}>Session Timeline</div>
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
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Session Tracking</span>
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

      {summaryLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
      ) : !summary ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>No data available.</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-total">{summary.totalSessions}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Total Sessions</div>
            </div>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-users">{summary.uniqueUsers}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Active Users</div>
            </div>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-avg">{formatDuration(summary.avgDurationMinutes)}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Avg Duration</div>
            </div>
            <div className="labs-card p-3 text-center">
              <div className="text-xl font-bold" style={{ color: "var(--labs-accent)" }} data-testid="sessions-stat-total-time">{formatDuration(summary.totalMinutes)}</div>
              <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Total Time</div>
            </div>
          </div>

          {(summary.byHour || []).length > 0 && (
            <div className="labs-card p-3 mb-4">
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-secondary)" }}>Activity by Hour</div>
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
                            title={`${dayLabels[dayIdx]} ${hourIdx}:00 - ${val} sessions`}
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
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-secondary)" }}>Daily Activity</div>
              <div className="flex items-end gap-0.5" style={{ height: 80 }}>
                {summary.byDay.map((d: { date: string; sessions: number; uniqueUsers: number }) => {
                  const maxSessions = Math.max(...summary.byDay.map((x: { sessions: number }) => x.sessions), 1);
                  const height = (d.sessions / maxSessions) * 100;
                  return (
                    <div
                      key={d.date}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{ height: `${Math.max(height, 4)}%`, background: "var(--labs-accent)", opacity: 0.7 + (height / 100) * 0.3, minWidth: 3 }}
                      title={`${d.date}: ${d.sessions} sessions, ${d.uniqueUsers} users`}
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
              <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search users..." style={{ ...labsInput, paddingLeft: 32 }} data-testid="sessions-search-users" />
            </div>
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>No users found.</div>
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
                      <div className="text-xs font-semibold" style={{ color: "var(--labs-accent)" }}>{u.sessions} sessions</div>
                      <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{formatDuration(u.totalMinutes)} total</div>
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
    onSuccess: () => { toast({ title: "AI settings saved" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-settings"] }); },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); if (data) { setMasterDisabled(data.settings.ai_master_disabled); setDisabledFeatures(data.settings.ai_features_disabled || []); } },
  });

  const quotaMutation = useMutation({
    mutationFn: async (quota: number) => {
      const res = await apiRequest("POST", "/api/admin/ai-quota", { participantId: pid, quota });
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: `Free quota set to ${result.quota === 0 ? "unlimited" : result.quota}` });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ai-usage"] });
    },
    onError: (err: Error) => { toast({ title: "Error", description: err.message, variant: "destructive" }); },
  });

  const save = (md: boolean | null, df: string[]) => saveMutation.mutate({ md, df });

  const toggleFeature = (featureId: string) => {
    const newDisabled = disabledFeatures.includes(featureId) ? disabledFeatures.filter(f => f !== featureId) : [...disabledFeatures, featureId];
    setDisabledFeatures(newDisabled);
    save(masterDisabled, newDisabled);
  };

  const handleQuotaSave = () => {
    const val = parseInt(quotaInput, 10);
    if (isNaN(val) || val < 0) { toast({ title: "Invalid quota value", variant: "destructive" }); return; }
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
          <span className="text-base font-bold" style={{ color: "var(--labs-text)" }}>AI Kill Switch</span>
        </div>
        <div className="p-3 rounded-lg mb-4 text-xs" style={{ background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}>
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3 h-3" style={{ color: "var(--labs-accent)" }} />
            <span className="font-semibold" style={{ color: "var(--labs-accent)" }}>Admin Bypass</span>
          </div>
          <span style={{ color: "var(--labs-text-muted)" }}>Als Admin behältst du immer Zugriff auf alle AI-Features über den Plattform-Key, auch wenn Features deaktiviert oder Limits erreicht sind.</span>
        </div>
        <div className="flex items-center justify-between p-3.5 rounded-xl mb-4" style={{ border: `2px solid ${masterDisabled ? "var(--labs-danger)" : "var(--labs-success)"}`, background: masterDisabled ? "var(--labs-danger-muted)" : "var(--labs-success-muted)" }} data-testid="labs-admin-ai-master-toggle">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Master Kill Switch</div>
            <div className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{masterDisabled ? "All AI features disabled (Admin bypass active)" : "AI features active"}</div>
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
        {saveMutation.isPending && <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "var(--labs-text-muted)" }}><Loader2 className="w-3 h-3 animate-spin" />Saving...</div>}
      </div>

      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--labs-text)" }}>Freikontingent (Plattform-Key)</span>
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
            {quotaMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Speichern"}
          </button>
          <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
            Aktuell: {usageData?.quota === 0 ? "Unbegrenzt" : `${usageData?.quota ?? 20} Anfragen`}
          </span>
        </div>
      </div>

      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-bold" style={{ color: "var(--labs-text)" }}>AI-Nutzung pro User</span>
          <span className="text-[11px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)" }}>{usageList.length}</span>
        </div>
        {usageLoading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>
        ) : usageList.length === 0 ? (
          <div className="text-center py-6 text-xs" style={{ color: "var(--labs-text-muted)" }}>Noch keine AI-Nutzung über den Plattform-Key.</div>
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
                      {u.hasOwnKey && <span className="text-[11px] px-1 rounded" style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)" }}>Own Key</span>}
                      {overLimit && !u.hasOwnKey && <span className="text-[11px] px-1 rounded" style={{ background: "var(--labs-danger-muted)", color: "var(--labs-danger)" }}>Limit</span>}
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
            <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Audit Log</span>
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
      toast({ title: "Newsletter generated" });
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setGenerating(false); }
  };

  const handleSend = async () => {
    if (!subject.trim() || !contentHtml.trim() || selectedIds.size === 0) return;
    setSending(true);
    try {
      const result = await adminApi.sendNewsletter(pid, subject, contentHtml, Array.from(selectedIds));
      toast({ title: `Newsletter sent to ${result.sent} recipients` });
      setSubject(""); setContentHtml(""); setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["/admin/newsletters"] });
    } catch (e: unknown) { toast({ title: "Error", description: (e as Error).message, variant: "destructive" }); }
    finally { setSending(false); }
  };

  return (
    <div data-testid="labs-admin-newsletter-tab">
      <div className="labs-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Send className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Compose Newsletter</span>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => handleGenerate("welcome")} disabled={generating || aiDisabled} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text)", cursor: generating ? "wait" : "pointer" }} data-testid="labs-admin-generate-welcome">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Welcome
          </button>
          <button onClick={() => handleGenerate("update")} disabled={generating || aiDisabled} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text)", cursor: generating ? "wait" : "pointer" }} data-testid="labs-admin-generate-update">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Update
          </button>
        </div>
        <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="Subject..." style={{ ...labsInput, marginBottom: 8 }} data-testid="labs-admin-newsletter-subject" />
        <textarea value={contentHtml} onChange={e => setContentHtml(e.target.value)} placeholder="Newsletter content (HTML)..." rows={6} style={{ ...labsInput, resize: "vertical" as const }} data-testid="labs-admin-newsletter-content" />
        <div className="mt-3 rounded-lg p-3" style={{ border: "1px solid var(--labs-border)" }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Recipients ({selectedIds.size} selected)</span>
            <div className="flex gap-2">
              <button onClick={() => setSelectedIds(new Set(subscribers.map(s => s.id)))} className="text-[11px]" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-select-all-subscribers">Select subscribers</button>
              <button onClick={() => setSelectedIds(new Set())} className="text-[11px]" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-clear-recipients">Clear</button>
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
          {sending ? "Sending..." : "Send Newsletter"}
        </button>
      </div>
      {(newsletters as Array<Record<string, unknown>>).length > 0 && (
        <div className="labs-card p-4">
          <div className="flex items-center gap-2 mb-3"><Archive className="w-4 h-4" style={{ color: "var(--labs-text-secondary)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Archive</span></div>
          {(newsletters as Array<Record<string, unknown>>).map((nl) => (
            <div key={nl.id as string} className="py-2" style={{ borderBottom: "1px solid var(--labs-border)" }} data-testid={`labs-admin-newsletter-${nl.id}`}>
              <div className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>{nl.subject as string}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>Sent: {nl.sentAt ? new Date(nl.sentAt as string).toLocaleDateString() : "-"} · Recipients: {(nl.recipientCount as number) || 0}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ChangelogTab({ pid }: { pid: string }) {
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
    { value: "feature", label: "Feature", emoji: "\u{1F680}" },
    { value: "improvement", label: "Improvement", emoji: "\u{1F527}" },
    { value: "bugfix", label: "Bugfix", emoji: "\u{1F41B}" },
    { value: "security", label: "Security", emoji: "\u{1F6E1}\u{FE0F}" },
    { value: "design", label: "Design/UX", emoji: "\u{1F3A8}" },
  ];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["/api/admin/changelog", pid],
    queryFn: async () => { const res = await fetch(`/api/admin/changelog?participantId=${pid}`); if (!res.ok) throw new Error("Failed"); return res.json(); },
  });

  const createMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("POST", "/api/admin/changelog", { participantId: pid, title, description, category, date, visible }); return res.json(); },
    onSuccess: () => { toast({ title: "Entry created" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); resetForm(); },
  });
  const updateMutation = useMutation({
    mutationFn: async () => { const res = await apiRequest("PATCH", `/api/admin/changelog/${editingId}`, { participantId: pid, title, description, category, date, visible }); return res.json(); },
    onSuccess: () => { toast({ title: "Entry updated" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); resetForm(); },
  });
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const res = await fetch(`/api/admin/changelog/${id}?participantId=${pid}`, { method: "DELETE" }); if (!res.ok) throw new Error("Delete failed"); return res.json(); },
    onSuccess: () => { toast({ title: "Entry deleted" }); queryClient.invalidateQueries({ queryKey: ["/api/admin/changelog"] }); },
  });

  const resetForm = () => { setShowForm(false); setEditingId(null); setTitle(""); setDescription(""); setCategory("feature"); setDate(new Date().toISOString().split("T")[0]); setVisible(true); };
  const startEdit = (entry: Record<string, unknown>) => { setEditingId(entry.id as string); setTitle(entry.title as string); setDescription(entry.description as string); setCategory(entry.category as string); setDate(entry.date as string); setVisible(entry.visible as boolean); setShowForm(true); };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  return (
    <div data-testid="labs-admin-changelog-tab">
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{entries.length} entries</span>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-changelog-add">
          <MessageSquarePlus className="w-3 h-3" /> New Entry
        </button>
      </div>
      {showForm && (
        <div className="labs-card p-4 mb-4">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title..." style={{ ...labsInput, marginBottom: 8 }} data-testid="labs-admin-changelog-title" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..." rows={3} style={{ ...labsInput, resize: "vertical" as const, marginBottom: 8 }} data-testid="labs-admin-changelog-description" />
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
            <button onClick={() => editingId ? updateMutation.mutate() : createMutation.mutate()} disabled={!title || !description} className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: "pointer" }} data-testid="labs-admin-changelog-save">{editingId ? "Update" : "Create"}</button>
            <button onClick={resetForm} className="px-3 py-1.5 rounded-lg text-xs" style={{ border: "1px solid var(--labs-border)", background: "transparent", color: "var(--labs-text)", cursor: "pointer" }} data-testid="labs-admin-changelog-cancel">Cancel</button>
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
                  <button onClick={() => { if (confirm(`Delete "${entry.title}"?`)) deleteMutation.mutate(entry.id as string); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }} data-testid={`labs-admin-changelog-delete-${entry.id}`}><Trash2 className="w-3 h-3" style={{ color: "var(--labs-danger)" }} /></button>
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: `${selectedIds.size} tastings deleted` }); setSelectedIds(new Set()); },
  });

  const toggleId = (id: string) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <div data-testid="labs-admin-cleanup-tab">
      <div className="labs-card p-4">
        <div className="flex items-center gap-2 mb-4"><Trash2 className="w-4 h-4" style={{ color: "var(--labs-danger)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Bulk Cleanup</span></div>
        <div className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>{testTastings.length} test tastings found · {selectedIds.size} selected</div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setSelectedIds(new Set(testTastings.map(t => t.id)))} className="text-[11px]" style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-cleanup-select-all">Select all test</button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[11px]" style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer" }} data-testid="labs-admin-cleanup-clear">Clear</button>
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
        <button onClick={() => { if (selectedIds.size > 0 && confirm(`Delete ${selectedIds.size} tastings?`)) deleteMutation.mutate(Array.from(selectedIds)); }} disabled={selectedIds.size === 0 || deleteMutation.isPending} className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5" style={{ background: selectedIds.size > 0 ? "var(--labs-danger)" : "var(--labs-text-muted)", color: "var(--labs-bg)", border: "none", cursor: selectedIds.size > 0 ? "pointer" : "not-allowed" }} data-testid="labs-admin-cleanup-delete">
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          Delete {selectedIds.size} Selected
        </button>
      </div>
    </div>
  );
}

function AnalyticsTab({ pid }: { pid: string }) {
  const { data, isLoading } = useQuery({ queryKey: ["/admin/analytics", pid], queryFn: () => adminApi.getAnalytics(pid), enabled: !!pid });

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;
  if (!data) return <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>No analytics data available.</div>;
  const analytics = data as Record<string, unknown>;

  return (
    <div data-testid="labs-admin-analytics-tab">
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "Total Ratings", value: (analytics.totalRatings as number) || 0 },
          { label: "Total Whiskies", value: (analytics.totalWhiskies as number) || 0 },
          { label: "Total Tastings", value: (analytics.totalTastings as number) || 0 },
          { label: "Total Participants", value: (analytics.totalParticipants as number) || 0 },
        ].map(s => (
          <div key={s.label} className="labs-card text-center py-3" data-testid={`labs-admin-analytics-${s.label.toLowerCase().replace(/\s/g, "-")}`}>
            <div className="labs-h2" style={{ color: "var(--labs-text)" }}>{s.value}</div>
            <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      {(analytics.topWhiskies as Array<Record<string, unknown>>)?.length > 0 && (
        <div className="labs-card p-4 mb-3">
          <span className="text-sm font-semibold block mb-2.5" style={{ color: "var(--labs-text)" }}>Top Whiskies</span>
          {(analytics.topWhiskies as Array<Record<string, unknown>>).slice(0, 10).map((w, i) => (
            <div key={(w.id as string) || i} className="flex items-center justify-between py-1.5" style={{ borderBottom: "1px solid var(--labs-border)" }}>
              <div><span className="text-xs font-semibold" style={{ color: "var(--labs-text)" }}>{i + 1}. {w.name as string}</span>{w.distillery && <span className="text-[11px] ml-1.5" style={{ color: "var(--labs-text-muted)" }}>{w.distillery as string}</span>}</div>
              <span className="labs-serif text-sm font-bold" style={{ color: "var(--labs-accent)" }}>{Number(w.avgScore).toFixed(1)}</span>
            </div>
          ))}
        </div>
      )}
      {(analytics.regionCounts as Array<[string, number]>)?.length > 0 && (
        <div className="labs-card p-4">
          <span className="text-sm font-semibold block mb-2.5" style={{ color: "var(--labs-text)" }}>Regions</span>
          {(analytics.regionCounts as Array<[string, number]>).map(([region, count]) => (
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
  const { toast } = useToast();
  const [dryRunResult, setDryRunResult] = useState<Record<string, unknown> | null>(null);

  const { data: importRuns, isLoading: runsLoading } = useQuery({
    queryKey: ["/admin/historical/import-runs", pid],
    queryFn: async () => { const res = await fetch("/api/admin/historical/import-runs", { headers: { "x-participant-id": pid } }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    enabled: !!pid,
  });

  const dryRunMutation = useMutation({
    mutationFn: async () => { const res = await fetch("/api/admin/historical/import?dryRun=true", { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" } }); if (!res.ok) throw new Error(await res.text()); return res.json(); },
    onSuccess: (data: Record<string, unknown>) => { setDryRunResult(data); toast({ title: "Dry-run complete" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const importMutation = useMutation({
    mutationFn: async () => { const res = await fetch("/api/admin/historical/import", { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" } }); if (!res.ok) throw new Error(await res.text()); return res.json(); },
    onSuccess: () => { toast({ title: "Import complete" }); setDryRunResult(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const latestRun = importRuns?.[0] || null;
  const statusColor = (s: string) => s === "completed" ? "var(--labs-success)" : s === "failed" ? "var(--labs-danger)" : s === "running" ? "var(--labs-accent)" : "var(--labs-text-muted)";

  return (
    <div data-testid="labs-admin-historical-tab">
      <div className="flex items-center gap-2 mb-4"><FileArchive className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Historical Import</span></div>
      <div className="labs-card p-4 mb-3">
        <div className="text-sm font-semibold mb-2.5" style={{ color: "var(--labs-text)" }}>Latest Import Run</div>
        {runsLoading ? <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--labs-accent)" }} /></div> : latestRun ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg uppercase" style={{ background: `${statusColor(latestRun.status)}20`, color: statusColor(latestRun.status) }}>{latestRun.status}</span>
              {latestRun.createdAt && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{new Date(latestRun.createdAt).toLocaleString()}</span>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[{ label: "Rows Read", value: latestRun.rowsRead ?? 0 }, { label: "Imported", value: latestRun.rowsImported ?? 0 }, { label: "Skipped", value: latestRun.rowsSkipped ?? 0 }].map(s => (
                <div key={s.label} className="text-center py-2 rounded-lg" style={{ background: "var(--labs-surface-elevated)" }}>
                  <div className="text-lg font-bold" style={{ color: "var(--labs-text)" }}>{s.value}</div>
                  <div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        ) : <div className="text-center py-4 text-xs" style={{ color: "var(--labs-text-muted)" }}>No import runs yet.</div>}
      </div>
      <div className="flex gap-2 mb-3">
        <button onClick={() => dryRunMutation.mutate()} disabled={dryRunMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text)", cursor: dryRunMutation.isPending ? "not-allowed" : "pointer" }} data-testid="labs-admin-dry-run">
          {dryRunMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Dry-Run
        </button>
        <button onClick={() => { if (confirm("Run full import?")) importMutation.mutate(); }} disabled={importMutation.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: importMutation.isPending ? "not-allowed" : "pointer" }} data-testid="labs-admin-full-import">
          {importMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />} Full Import
        </button>
      </div>
      {dryRunResult && (
        <div className="labs-card p-4 mb-3" style={{ borderColor: "var(--labs-accent)" }}>
          <div className="flex items-center gap-1.5 mb-2.5"><Play className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Dry-Run Results</span><span className="text-[11px] px-1.5 rounded font-semibold" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>DRY RUN</span></div>
          <div className="grid grid-cols-2 gap-2">
            {[{ l: "Rows Read", v: dryRunResult.rowsRead }, { l: "Would Import", v: dryRunResult.rowsImported }, { l: "Tastings", v: dryRunResult.tastingsCreated }, { l: "Entries", v: dryRunResult.entriesCreated }].map(s => (
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberSelectedId, setMemberSelectedId] = useState<string | null>(null);
  const [memberRole, setMemberRole] = useState("member");
  const [showDropdown, setShowDropdown] = useState(false);

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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); toast({ title: "Community updated" }); },
  });

  const addMemberMutation = useMutation({
    mutationFn: async ({ communityId, participantId, role }: { communityId: string; participantId: string; role: string }) => { const res = await fetch(`/api/admin/communities/${communityId}/members`, { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" }, body: JSON.stringify({ participantId, role }) }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); setMemberSearch(""); setMemberSelectedId(null); toast({ title: "Member added" }); },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ communityId, participantId: memberId }: { communityId: string; participantId: string }) => { const res = await fetch(`/api/admin/communities/${communityId}/members/${memberId}`, { method: "DELETE", headers: { "x-participant-id": pid } }); if (!res.ok) throw new Error("Failed"); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); toast({ title: "Member removed" }); },
  });

  const seedMutation = useMutation({
    mutationFn: async () => { const res = await fetch("/api/admin/communities/seed", { method: "POST", headers: { "x-participant-id": pid, "Content-Type": "application/json" } }); if (!res.ok) throw new Error(await res.text()); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/communities"] }); toast({ title: "Seed complete" }); },
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
          <div className="flex items-center gap-2 mb-3"><Globe className="w-5 h-5" style={{ color: "var(--labs-accent)" }} /><div><div className="text-base font-bold" style={{ color: "var(--labs-text)" }}>{detail.name as string}</div><div className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{detail.slug as string}</div></div></div>
          {detail.description && <div className="text-xs mb-3" style={{ color: "var(--labs-text-secondary)" }}>{detail.description as string}</div>}
        </div>
        <div className="labs-card p-4 mb-3">
          <div className="flex items-center gap-1.5 mb-3"><Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Members</span><span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>({members.length})</span></div>
          <div className="flex gap-1.5 mb-3">
            <div className="flex-1 relative">
              <input type="text" value={memberSearch} onChange={e => { setMemberSearch(e.target.value); setMemberSelectedId(null); setShowDropdown(true); }} onFocus={() => setShowDropdown(true)} placeholder="Search by name or email..." style={{ ...labsInput, fontSize: 12 }} data-testid="labs-admin-add-member-search" />
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
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={() => { if (memberSelectedId) addMemberMutation.mutate({ communityId: detail.id as string, participantId: memberSelectedId, role: memberRole }); }} disabled={!memberSelectedId} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none", cursor: !memberSelectedId ? "not-allowed" : "pointer", opacity: !memberSelectedId ? 0.5 : 1 }} data-testid="labs-admin-add-member-btn">
              <UserPlus className="w-3 h-3" /> Add
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
                <button onClick={() => { if (confirm("Remove this member?")) removeMemberMutation.mutate({ communityId: detail.id as string, participantId: m.participantId as string }); }} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} data-testid={`labs-admin-remove-member-${m.participantId}`}>
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
        <div className="flex items-center gap-2"><Globe className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>Communities</span><span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>({communities.length})</span></div>
        <button onClick={() => { if (confirm("Run community seed?")) seedMutation.mutate(); }} disabled={seedMutation.isPending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium" style={{ border: "1px solid var(--labs-border)", background: "var(--labs-surface-elevated)", color: "var(--labs-text-secondary)", cursor: seedMutation.isPending ? "not-allowed" : "pointer" }} data-testid="labs-admin-seed-communities">
          {seedMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />} Seed
        </button>
      </div>
      {communities.length === 0 ? (
        <div className="text-center py-12" style={{ color: "var(--labs-text-muted)" }}>
          <Globe className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <div className="text-sm font-medium mb-1">No communities yet</div>
          <div className="text-xs">Use the Seed button to create the initial community.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {communities.map((c) => (
            <button key={c.id as string} onClick={() => setSelectedId(c.id as string)} className="w-full labs-card p-3.5 flex items-center justify-between text-left" style={{ cursor: "pointer" }} data-testid={`labs-admin-community-${c.id}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1"><Globe className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /><span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>{c.name as string}</span></div>
                <div className="flex flex-wrap gap-2 text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                  <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{(c.memberCount as number) ?? 0} members</span>
                  <span className="flex items-center gap-1"><Archive className="w-2.5 h-2.5" />{(c.tastingCount as number) ?? 0} tastings</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({ pid }: { pid: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-app-settings", pid],
    queryFn: async () => { const res = await fetch(`/api/admin/app-settings?requesterId=${pid}`); if (!res.ok) throw new Error("Failed"); return res.json() as Promise<Record<string, string>>; },
  });

  const updateSetting = useMutation({
    mutationFn: async (updates: Record<string, string>) => { const res = await apiRequest("POST", "/api/admin/app-settings", { requesterId: pid, settings: updates }); return res.json(); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["admin-app-settings"] }); toast({ title: "Settings saved" }); },
  });

  const [bannerText, setBannerText] = useState("");
  useEffect(() => { if (settings) setBannerText(settings.whats_new_text || ""); }, [settings]);

  if (isLoading || !settings) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  const toggleSetting = (key: string) => updateSetting.mutate({ [key]: String(settings[key] !== "true") });

  const items = [
    { key: "whats_new_enabled", label: "What's New Banner", desc: "Show announcement banner" },
    { key: "guest_mode_enabled", label: "Guest Mode", desc: "Allow guest access" },
    { key: "registration_open", label: "Registration", desc: "Allow new registrations" },
    { key: "maintenance_mode", label: "Maintenance Mode", desc: "Show maintenance page" },
    { key: "friend_online_notifications", label: "Friend Online Notifications", desc: "Allow friend notifications" },
  ];

  return (
    <div data-testid="labs-admin-settings-tab">
      <div className="labs-card p-4">
        <div className="flex items-center gap-2 mb-4"><Settings className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>App Settings</span></div>
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
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--labs-text)" }}>Banner Text</label>
            <input type="text" value={bannerText} onChange={e => setBannerText(e.target.value)} onBlur={() => updateSetting.mutate({ whats_new_text: bannerText })} placeholder="What's new message..." style={labsInput} data-testid="labs-admin-whats-new-text" />
          </div>
        )}
      </div>
    </div>
  );
}

function MakingOfTab({ pid, participants }: { pid: string; participants: AdminParticipant[] }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const accessMutation = useMutation({
    mutationFn: ({ participantId, access }: { participantId: string; access: boolean }) => adminApi.updateMakingOfAccess(participantId, access, pid),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/admin/overview"] }); toast({ title: "Making-Of access updated" }); },
  });

  const filtered = participants.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !(p.email || "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const accessCount = participants.filter(p => p.makingOfAccess || p.role === "admin").length;

  return (
    <div data-testid="labs-admin-makingof-tab">
      <div className="flex items-center gap-2 mb-4"><BookOpen className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>The Making of CaskSense</span></div>

      <a href="/labs/making-of" className="labs-card flex items-center justify-between p-4 mb-5" style={{ textDecoration: "none" }} data-testid="labs-admin-link-makingof">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, var(--labs-accent), var(--labs-surface-elevated))" }}>
            <BookOpen className="w-5 h-5" style={{ color: "var(--labs-text)" }} />
          </div>
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>View Making-Of Timeline</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>20 days · 1,625 commits · 168 features</div>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
      </a>

      <div className="labs-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Access Control</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{accessCount} participants have access</div>
          </div>
        </div>
        <div className="relative mb-3">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search participants..." style={{ ...labsInput, paddingLeft: 32 }} data-testid="labs-admin-search-makingof-access" />
        </div>
        <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: "var(--labs-text-muted)" }}>No results</div>
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
                      {p.email || "No email"}{isAdmin && " · always has access"}
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
  const { data: feedback = [], isLoading } = useQuery({ queryKey: ["/feedback", pid], queryFn: () => feedbackApi.getAll(pid), enabled: !!pid });

  const icons: Record<string, string> = { bug: "\u{1F41B}", feature: "\u{1F4A1}", improvement: "\u{1F527}", other: "\u{1F4DD}" };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--labs-accent)" }} /></div>;

  return (
    <div data-testid="labs-admin-feedback-tab">
      <div className="flex items-center gap-2 mb-4"><MessageSquarePlus className="w-4 h-4" style={{ color: "var(--labs-accent)" }} /><span className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>User Feedback</span><span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>({(feedback as Array<Record<string, unknown>>).length})</span></div>
      {(feedback as Array<Record<string, unknown>>).length === 0 ? (
        <div className="text-center py-12 text-sm" style={{ color: "var(--labs-text-muted)" }}>No feedback yet.</div>
      ) : (
        <div className="space-y-2">
          {(feedback as Array<Record<string, unknown>>).map((fb) => (
            <div key={fb.id as string} className="labs-card p-3" data-testid={`labs-admin-feedback-${fb.id}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{icons[(fb.category as string)] || "\u{1F4DD}"}</span>
                <span className="text-[11px] font-semibold uppercase" style={{ color: "var(--labs-accent)" }}>{fb.category as string}</span>
                {fb.participantName && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>· {stripGuestSuffix(fb.participantName as string)}</span>}
                {fb.createdAt && <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>· {new Date(fb.createdAt as string).toLocaleDateString()}</span>}
              </div>
              <div className="text-xs" style={{ color: "var(--labs-text)", lineHeight: 1.5 }}>{fb.message as string}</div>
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
