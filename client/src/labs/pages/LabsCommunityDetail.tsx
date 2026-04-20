import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { communityApi, friendsApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import {
  Users, ChevronLeft, UserPlus, Shield, Crown, Eye, Trash2, Mail, ChevronDown, Edit2, Save, X,
  Wine, Calendar, User, GlassWater, Plus, Loader2, BarChart3, Activity, Trophy,
} from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import HubHeader from "@/labs/components/HubHeader";
import { stripGuestSuffix } from "@/lib/utils";
import { useTranslation } from "react-i18next";

export default function LabsCommunityDetail() {
  const { t } = useTranslation();
  const [, params] = useRoute("/labs/community/:id");
  const communityId = params?.id;
  const goBack = useBackNavigation("/labs/community");
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const session = getSession();
  const pid = currentParticipant?.id || session.pid;
  const queryClient = useQueryClient();

  const [inviteTab, setInviteTab] = useState<"email" | "friends">("friends");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [roleMenuOpen, setRoleMenuOpen] = useState<string | null>(null);
  const [showAssignTasting, setShowAssignTasting] = useState(false);
  const [myTastings, setMyTastings] = useState<any[]>([]);
  const [myTastingsLoading, setMyTastingsLoading] = useState(false);
  const [assigningTastingId, setAssigningTastingId] = useState<string | null>(null);

  const { data: community, isLoading } = useQuery({
    queryKey: ["community-detail", communityId],
    queryFn: () => communityApi.getById(communityId!),
    enabled: !!communityId && !!pid,
    refetchInterval: 30000,
  });

  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", pid],
    queryFn: () => friendsApi.getAll(pid!),
    enabled: !!pid && showInvite,
  });

  const { data: tastingsData, isLoading: tastingsLoading, isError: tastingsError } = useQuery({
    queryKey: ["community-tastings", communityId],
    queryFn: () => communityApi.getTastings(communityId!),
    enabled: !!communityId && !!pid,
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string }) => communityApi.update(communityId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-detail", communityId] });
      setEditing(false);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: (participantId: string) => communityApi.removeMember(communityId!, participantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["community-detail", communityId] }),
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ participantId, role }: { participantId: string; role: string }) =>
      communityApi.updateMemberRole(communityId!, participantId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-detail", communityId] });
      setRoleMenuOpen(null);
    },
  });

  const isAdmin = community?.myRole === "admin";

  const fetchMyTastings = async () => {
    if (!pid) return;
    setMyTastingsLoading(true);
    try {
      const res = await fetch(`/api/tastings?participantId=${pid}`);
      if (!res.ok) throw new Error();
      const all = await res.json();
      const existingIds = new Set([
        ...(tastingsData?.upcoming || []).map((t: any) => t.id),
        ...(tastingsData?.past || []).map((t: any) => t.id),
      ]);
      const filtered = (Array.isArray(all) ? all : []).filter((t: any) => {
        if (t.hostId !== pid) return false;
        if (existingIds.has(t.id)) return false;
        if (!t.targetCommunityIds) return true;
        try {
          const assigned = JSON.parse(t.targetCommunityIds);
          if (!Array.isArray(assigned) || assigned.length === 0) return true;
          return false;
        } catch { return true; }
      });
      setMyTastings(filtered);
    } catch {
      setMyTastings([]);
    } finally {
      setMyTastingsLoading(false);
    }
  };

  const assignTastingToCommunity = async (tastingId: string) => {
    if (!pid || !communityId) return;
    setAssigningTastingId(tastingId);
    try {
      const tasting = myTastings.find((t: any) => t.id === tastingId);
      let existingIds: string[] = [];
      try {
        existingIds = tasting?.targetCommunityIds ? JSON.parse(tasting.targetCommunityIds) : [];
        if (!Array.isArray(existingIds)) existingIds = [];
      } catch { existingIds = []; }
      const newIds = Array.from(new Set([...existingIds, communityId]));
      const currentVisibility = tasting?.visibility;
      const res = await fetch(`/api/tastings/${tastingId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostId: pid,
          targetCommunityIds: JSON.stringify(newIds),
          visibility: currentVisibility === "public" ? "public" : "group",
        }),
      });
      if (!res.ok) throw new Error();
      queryClient.invalidateQueries({ queryKey: ["community-tastings", communityId] });
      setMyTastings(prev => prev.filter(t => t.id !== tastingId));
    } catch {} finally {
      setAssigningTastingId(null);
    }
  };

  const ONLINE_THRESHOLD = 2.5 * 60 * 1000;
  const isOnline = (lastSeenAt: string | null | undefined) => {
    if (!lastSeenAt) return false;
    return Date.now() - new Date(lastSeenAt).getTime() < ONLINE_THRESHOLD;
  };
  const members = [...(community?.members || [])].sort((a: any, b: any) => {
    const aOnline = isOnline(a.lastSeenAt) ? 1 : 0;
    const bOnline = isOnline(b.lastSeenAt) ? 1 : 0;
    return bOnline - aOnline;
  });

  const handleInviteByEmail = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      await communityApi.invite(communityId!, {
        email: inviteEmail.trim(),
        personalNote: inviteNote.trim() || undefined,
      });
      setInviteSuccess(t("m2.community.invitationSentTo", { email: inviteEmail }));
      setInviteEmail("");
      setInviteNote("");
    } catch (e: any) {
      setInviteError(e.message || t("m2.community.failedToSendInvite"));
    } finally {
      setInviting(false);
    }
  };

  const handleInviteFriend = async (friendParticipantId: string) => {
    setInviting(true);
    setInviteError("");
    setInviteSuccess("");
    try {
      await communityApi.invite(communityId!, {
        participantId: friendParticipantId,
        personalNote: inviteNote.trim() || undefined,
      });
      setInviteSuccess(t("m2.community.invitationSent"));
    } catch (e: any) {
      setInviteError(e.message || t("m2.community.failedToSendInvite"));
    } finally {
      setInviting(false);
    }
  };

  const startEditing = () => {
    setEditName(community?.name || "");
    setEditDesc(community?.description || "");
    setEditing(true);
  };

  const saveEdits = () => {
    updateMutation.mutate({ name: editName.trim(), description: editDesc.trim() });
  };

  if (!pid) {
    return (
      <AuthGateMessage
        icon={<Users className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.communityDetail.title")}
        bullets={[t("authGate.communityDetail.bullet1"), t("authGate.communityDetail.bullet2"), t("authGate.communityDetail.bullet3")]}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="labs-page">
        <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>{t("common.loading")}</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="labs-page labs-fade-in">
        <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }}>
          <ChevronLeft className="w-4 h-4" /> {t("communityUi.communities")}
        </button>
        <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>
          {t("communityUi.communityNotFound")}
        </p>
      </div>
    );
  }

  const roleIcon = (role: string) => {
    if (role === "admin") return <Crown className="w-3 h-3" />;
    if (role === "viewer") return <Eye className="w-3 h-3" />;
    return <Users className="w-3 h-3" />;
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return t("m2.community.adminRole");
    if (role === "viewer") return t("m2.community.viewerRole");
    return t("m2.community.memberLabel");
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "var(--labs-accent)";
    if (role === "viewer") return "var(--labs-text-muted)";
    return "var(--labs-text-secondary)";
  };

  const friends = (Array.isArray(friendsData) ? friendsData : []).filter((f: any) => f.status === "accepted");
  const memberIds = new Set(members.map((m: any) => m.participantId));
  const allFriendsWithStatus = friends.map((f: any) => ({
    ...f,
    isAlreadyMember: !!(f.matchedParticipantId && memberIds.has(f.matchedParticipantId)),
  }));

  const circleTiles: { key: string; label: string; sublabel: string; icon: typeof Wine; href: string; testId: string }[] = [
    { key: "friends", label: t("m2.circle.navFriends", "Friends"), sublabel: t("m2.circle.navFriendsSub", "Your network"), icon: Users, href: "/labs/circle?tab=friends", testId: "labs-circle-shell-tab-friends" },
    { key: "stats", label: t("m2.circle.navStats", "Stats"), sublabel: t("m2.circle.navStatsSub", "Insights"), icon: BarChart3, href: "/labs/circle?tab=stats", testId: "labs-circle-shell-tab-stats" },
    { key: "community", label: t("communityUi.communities", "Communities"), sublabel: t("m2.circle.navCommunitySub", "Groups"), icon: Shield, href: "/labs/circle?tab=community", testId: "labs-circle-shell-tab-community" },
    { key: "activity", label: t("m2.circle.navActivity", "Activity"), sublabel: t("m2.circle.navActivitySub", "Recent"), icon: Activity, href: "/labs/circle?tab=activity", testId: "labs-circle-shell-tab-activity" },
    { key: "leaderboard", label: t("m2.circle.navLeaderboard", "Leaderboard"), sublabel: t("m2.circle.navLeaderboardSub", "Rankings"), icon: Trophy, href: "/labs/circle?tab=leaderboard", testId: "labs-circle-shell-tab-leaderboard" },
    { key: "sessions", label: t("m2.circle.navSessions", "Sessions"), sublabel: t("m2.circle.navSessionsSub", "Tastings"), icon: Wine, href: "/labs/circle?tab=sessions", testId: "labs-circle-shell-tab-sessions" },
  ];
  const renderCircleShellHeader = () => (
    <>
      <HubHeader kind="circle" />
      <div className="labs-fade-in" style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }} data-testid="labs-circle-shell-tabs">
        {[circleTiles.slice(0, 3), circleTiles.slice(3, 6)].map((row, ri) => (
          <div className="labs-action-bar" key={ri}>
            {row.map((tile) => {
              const isActive = tile.key === "community";
              const Icon = tile.icon;
              return (
                <a
                  key={tile.key}
                  href={tile.href}
                  className={`labs-action-bar-item labs-action-bar-item--button${isActive ? " labs-action-bar-item--active" : ""}`}
                  data-testid={tile.testId}
                  onClick={(e) => { e.preventDefault(); navigate(tile.href); }}
                >
                  <div className={`labs-action-bar-icon labs-action-bar-icon--accent`}>
                    <Icon className="w-5 h-5 labs-icon-accent" />
                  </div>
                  <span className="labs-action-bar-label">{tile.label}</span>
                  <span className="labs-action-bar-sublabel">{tile.sublabel}</span>
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="labs-page labs-fade-in" data-testid="community-detail-page">
      {renderCircleShellHeader()}
      <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="btn-back-communities">
        <ChevronLeft className="w-4 h-4" /> {t("communityUi.communities")}
      </button>

      <div className="labs-card mb-5" style={{ padding: "var(--labs-space-md)" }} data-testid="community-info-card">
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              className="labs-input w-full"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              maxLength={100}
              data-testid="input-edit-name"
            />
            <textarea
              className="labs-input w-full"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              maxLength={500}
              rows={2}
              style={{ resize: "none" }}
              data-testid="input-edit-description"
            />
            <div className="flex gap-2">
              <button onClick={saveEdits} className="labs-btn-primary flex items-center gap-1" data-testid="btn-save-edit">
                <Save className="w-4 h-4" /> {t("ui.save")}
              </button>
              <button onClick={() => setEditing(false)} className="labs-btn-ghost" data-testid="btn-cancel-edit">{t("common.cancel")}</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-community-name">
                  {community.name}
                </h2>
                {community.description && (
                  <p className="text-sm mt-1" style={{ color: "var(--labs-text-muted)" }} data-testid="text-community-description">
                    {community.description}
                  </p>
                )}
              </div>
              {isAdmin && (
                <button onClick={startEditing} className="labs-btn-ghost p-2" style={{ cursor: "pointer" }} data-testid="btn-edit-community">
                  <Edit2 className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                <Users className="w-3 h-3 inline mr-1" /> {members.length} {t("ui.members")}
              </span>
              {members.filter((m: any) => isOnline(m.lastSeenAt)).length > 0 && (
                <span className="text-xs flex items-center gap-1" style={{ color: "#22c55e" }} data-testid="detail-online-count">
                  <span className="w-2 h-2 rounded-full inline-block" style={{ background: "#22c55e" }} />
                  {members.filter((m: any) => isOnline(m.lastSeenAt)).length} {t("ui.online")}
                </span>
              )}
              <span className="text-xs flex items-center gap-1" style={{ color: roleColor(community.myRole) }}>
                {roleIcon(community.myRole)} {roleLabel(community.myRole)}
              </span>
            </div>
          </>
        )}
      </div>

      {isAdmin && (
        <div className="mb-5">
          <button
            onClick={() => { setShowInvite(!showInvite); setInviteError(""); setInviteSuccess(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={{
              background: showInvite ? "var(--labs-surface)" : "var(--labs-accent)",
              color: showInvite ? "var(--labs-text)" : "var(--labs-bg)",
              border: showInvite ? "1px solid var(--labs-border)" : "1px solid transparent",
              cursor: "pointer",
            }}
            data-testid="btn-toggle-invite"
          >
            <UserPlus className="w-3.5 h-3.5" />
            {showInvite ? t("common.cancel") : t("m2.community.inviteMembers")}
          </button>

          {showInvite && (
            <div className="labs-card mt-3" style={{ padding: "var(--labs-space-md)" }} data-testid="invite-form">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInviteTab("email")}
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: inviteTab === "email" ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: inviteTab === "email" ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    border: `1px solid ${inviteTab === "email" ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    cursor: "pointer",
                  }}
                  data-testid="btn-invite-tab-email"
                >
                  <Mail className="w-3 h-3 inline mr-1" /> {t("communityUi.email")}
                </button>
                <button
                  onClick={() => setInviteTab("friends")}
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    background: inviteTab === "friends" ? "var(--labs-accent)" : "var(--labs-surface)",
                    color: inviteTab === "friends" ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    border: `1px solid ${inviteTab === "friends" ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    cursor: "pointer",
                  }}
                  data-testid="btn-invite-tab-friends"
                >
                  <Users className="w-3 h-3 inline mr-1" /> {t("communityUi.friends")}
                </button>
              </div>

              {inviteTab === "email" && (
                <div className="space-y-3">
                  <input
                    type="text"
                    inputMode="email"
                    autoComplete="email"
                    className="labs-input w-full"
                    placeholder={t("m2.community.emailPlaceholder")}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                  <input
                    type="text"
                    className="labs-input w-full"
                    placeholder={t("m2.community.notePlaceholder")}
                    value={inviteNote}
                    onChange={(e) => setInviteNote(e.target.value)}
                    maxLength={500}
                    data-testid="input-invite-note"
                  />
                  <button
                    onClick={handleInviteByEmail}
                    disabled={!inviteEmail.trim() || inviting}
                    className="labs-btn w-full"
                    style={{
                      background: "var(--labs-accent)",
                      color: "var(--labs-bg)",
                      opacity: !inviteEmail.trim() || inviting ? 0.5 : 1,
                    }}
                    data-testid="btn-send-invite"
                  >
                    {inviting ? t("m2.community.sendingInvite") : t("m2.community.sendInvitation")}
                  </button>
                </div>
              )}

              {inviteTab === "friends" && (
                <div>
                  {friendsLoading ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--labs-text-muted)" }} data-testid="text-friends-loading">
                      {t("communityUi.loadingFriends")}
                    </p>
                  ) : allFriendsWithStatus.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--labs-text-muted)" }} data-testid="text-no-friends">
                      {t("communityUi.noFriendsFound")}
                    </p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {allFriendsWithStatus.map((f: any, idx: number) => {
                        const fPid = f.matchedParticipantId;
                        const friendKey = fPid || f.email || `friend-${idx}`;
                        const isAlreadyMember = f.isAlreadyMember;
                        const handleInvite = async () => {
                          if (isAlreadyMember) return;
                          if (fPid) {
                            handleInviteFriend(fPid);
                          } else if (f.email) {
                            setInviting(true);
                            setInviteError("");
                            setInviteSuccess("");
                            try {
                              await communityApi.invite(communityId!, {
                                email: f.email,
                                personalNote: inviteNote.trim() || undefined,
                              });
                              setInviteSuccess(t("m2.community.invitationSent"));
                            } catch (e: any) {
                              setInviteError(e.message || t("m2.community.failedToSendInvite"));
                            } finally {
                              setInviting(false);
                            }
                          }
                        };
                        return (
                          <div key={friendKey} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-[var(--labs-surface)]" style={isAlreadyMember ? { opacity: 0.6 } : undefined}>
                            <div className="flex items-center gap-2">
                              <span className="text-sm" style={{ color: "var(--labs-text)" }}>
                                {stripGuestSuffix(f.name || f.firstName + " " + (f.lastName || ""))}
                              </span>
                              {isAlreadyMember && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "var(--labs-surface)", color: "var(--labs-text-muted)" }} data-testid={`badge-already-member-${friendKey}`}>
                                  {t("m2.community.alreadyMember")}
                                </span>
                              )}
                            </div>
                            <button
                              onClick={handleInvite}
                              disabled={inviting || isAlreadyMember}
                              className="text-xs px-2.5 py-1 rounded-full font-semibold"
                              style={{
                                background: isAlreadyMember ? "var(--labs-surface)" : "var(--labs-accent-muted)",
                                color: isAlreadyMember ? "var(--labs-text-muted)" : "var(--labs-accent)",
                                cursor: isAlreadyMember ? "not-allowed" : "pointer",
                              }}
                              data-testid={`btn-invite-friend-${friendKey}`}
                            >
                              {isAlreadyMember ? t("m2.community.memberLabel") : t("m2.community.inviteLabel")}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {inviteSuccess && (
                <p className="text-xs mt-3 font-medium" style={{ color: "var(--labs-success)" }} data-testid="text-invite-success">
                  {inviteSuccess}
                </p>
              )}
              {inviteError && (
                <p className="text-xs mt-3 font-medium" style={{ color: "var(--labs-danger)" }} data-testid="text-invite-error">
                  {inviteError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--labs-text-muted)" }}>
        {t("communityUi.membersLabel")} ({members.length})
      </h3>
      <div className="space-y-1" data-testid="members-list">
        {members.map((m: any) => (
          <div key={m.id} className="labs-card p-3 flex items-center justify-between" data-testid={`member-${m.participantId}`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                >
                  {(m.participantName || "?")[0].toUpperCase()}
                </div>
                {isOnline(m.lastSeenAt) && (
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                    style={{ background: "#22c55e", borderColor: "var(--labs-bg)" }}
                    data-testid={`online-badge-${m.participantId}`}
                  />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                  {stripGuestSuffix(m.participantName || t("communityUi.unknownMember"))}
                  {m.participantId === pid && <span className="text-[10px] ml-1" style={{ color: "var(--labs-accent)" }}>({t("common.you")})</span>}
                </p>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: roleColor(m.role) }}>
                    {roleIcon(m.role)} {roleLabel(m.role)}
                  </span>
                </div>
              </div>
            </div>

            {isAdmin && m.participantId !== pid && (
              <div className="flex items-center gap-1 flex-shrink-0 relative">
                <button
                  onClick={() => setRoleMenuOpen(roleMenuOpen === m.participantId ? null : m.participantId)}
                  className="text-[10px] px-2 py-1 rounded-full flex items-center gap-0.5"
                  style={{ background: "var(--labs-surface)", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)", cursor: "pointer" }}
                  data-testid={`btn-role-menu-${m.participantId}`}
                >
                  {roleLabel(m.role)} <ChevronDown className="w-3 h-3" />
                </button>
                {roleMenuOpen === m.participantId && (
                  <div
                    className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border z-10 py-1 min-w-[100px]"
                    style={{ background: "var(--labs-bg)", borderColor: "var(--labs-border)" }}
                  >
                    {["admin", "member", "viewer"].map((r) => (
                      <button
                        key={r}
                        onClick={() => changeRoleMutation.mutate({ participantId: m.participantId, role: r })}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--labs-surface)]"
                        style={{ color: r === m.role ? "var(--labs-accent)" : "var(--labs-text)", cursor: "pointer", fontWeight: r === m.role ? 700 : 400 }}
                        data-testid={`btn-set-role-${r}-${m.participantId}`}
                      >
                        {roleLabel(r)}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => {
                    if (confirm(`Remove ${m.participantName || "this member"} from the community?`)) {
                      removeMemberMutation.mutate(m.participantId);
                    }
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ color: "var(--labs-danger)", cursor: "pointer" }}
                  data-testid={`btn-remove-member-${m.participantId}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6" data-testid="community-tastings-section">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>
            <Wine className="w-3 h-3 inline mr-1" /> Tastings
          </h3>
          {isAdmin && (
            <button
              className="labs-btn-ghost text-xs flex items-center gap-1"
              onClick={() => { setShowAssignTasting(true); fetchMyTastings(); }}
              data-testid="btn-assign-tasting"
            >
              <Plus className="w-3 h-3" /> Tasting zuordnen
            </button>
          )}
        </div>

        {showAssignTasting && (
          <div className="labs-card p-4 mb-4 space-y-3" data-testid="assign-tasting-panel">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{t("m2.community.assignTasting")}</span>
              <button className="labs-btn-ghost p-1" onClick={() => setShowAssignTasting(false)} data-testid="btn-close-assign-tasting">
                <X className="w-4 h-4" />
              </button>
            </div>
            {myTastingsLoading ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--labs-text-muted)" }}>Loading...</p>
            ) : myTastings.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "var(--labs-text-muted)" }} data-testid="text-no-assignable-tastings">
                Keine weiteren eigenen Tastings verfügbar
              </p>
            ) : (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {myTastings.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded" style={{ background: "var(--labs-bg-secondary)" }} data-testid={`assignable-tasting-${t.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{t.title}</p>
                      <p className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>{t.date} · {t.status}</p>
                    </div>
                    <button
                      className="labs-btn-primary text-xs px-3 py-1 flex items-center gap-1 flex-shrink-0"
                      onClick={() => assignTastingToCommunity(t.id)}
                      disabled={assigningTastingId === t.id}
                      data-testid={`btn-assign-${t.id}`}
                    >
                      {assigningTastingId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Zuordnen
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tastingsLoading ? (
          <p className="text-sm text-center py-6" style={{ color: "var(--labs-text-muted)" }} data-testid="text-tastings-loading">{t("m2.community.loadingTastings")}</p>
        ) : tastingsError ? (
          <div className="labs-card p-6 text-center" data-testid="text-tastings-error">
            <Wine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-danger)", opacity: 0.5 }} />
            <p className="text-sm" style={{ color: "var(--labs-danger)" }}>{t("m2.community.failedLoadTastings")}</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ["community-tastings", communityId] })}
              className="text-xs mt-2 underline"
              style={{ color: "var(--labs-accent)", cursor: "pointer" }}
              data-testid="btn-retry-tastings"
            >
              Retry
            </button>
          </div>
        ) : !tastingsData || (tastingsData.upcoming.length === 0 && tastingsData.past.length === 0) ? (
          <div className="labs-card p-6 text-center" data-testid="text-no-tastings">
            <Wine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} />
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>{t("m2.community.noTastings")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tastingsData.upcoming.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: "var(--labs-accent)" }}>
                  <Calendar className="w-3 h-3" /> Upcoming
                </p>
                <div className="space-y-1">
                  {tastingsData.upcoming.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/labs/tastings/${t.id}`)}
                      className="labs-card p-3 w-full text-left hover:ring-1 transition-all"
                      style={{ cursor: "pointer", borderColor: "var(--labs-accent)", borderWidth: "1px", borderStyle: "solid" }}
                      data-testid={`tasting-card-upcoming-${t.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{t.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                              <Calendar className="w-3 h-3" /> {t.date}
                            </span>
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                              <Users className="w-3 h-3" /> {t.participantCount}
                            </span>
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                              <GlassWater className="w-3 h-3" /> {t.whiskyCount}
                            </span>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>
                          {t.status === "draft" ? "Draft" : "Open"}
                        </span>
                      </div>
                      <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--labs-text-secondary)" }}>
                        <Crown className="w-3 h-3" /> {t.hostName}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tastingsData.past.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  Past Tastings ({tastingsData.past.length})
                </p>
                <div className="space-y-1">
                  {tastingsData.past.map((t: any) => (
                    <button
                      key={t.id}
                      onClick={() => navigate(`/labs/tastings/${t.id}`)}
                      className="labs-card p-3 w-full text-left hover:ring-1 transition-all"
                      style={{ cursor: "pointer" }}
                      data-testid={`tasting-card-past-${t.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>{t.title}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                              <Calendar className="w-3 h-3" /> {t.date}
                            </span>
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                              <Users className="w-3 h-3" /> {t.participantCount}
                            </span>
                            <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                              <GlassWater className="w-3 h-3" /> {t.whiskyCount}
                            </span>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] mt-1.5 flex items-center gap-1" style={{ color: "var(--labs-text-secondary)" }}>
                        <Crown className="w-3 h-3" /> {t.hostName}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
