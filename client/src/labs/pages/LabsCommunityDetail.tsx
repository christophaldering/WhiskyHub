import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { communityApi, friendsApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import {
  Users, ChevronLeft, UserPlus, Shield, Crown, Eye, Trash2, Mail, ChevronDown, Edit2, Save, X,
} from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { stripGuestSuffix } from "@/lib/utils";

export default function LabsCommunityDetail() {
  const [, params] = useRoute("/labs/community/:id");
  const communityId = params?.id;
  const goBack = useBackNavigation("/labs/community");
  const { currentParticipant } = useAppStore();
  const session = getSession();
  const pid = currentParticipant?.id || session.pid;
  const queryClient = useQueryClient();

  const [inviteTab, setInviteTab] = useState<"email" | "friends">("email");
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

  const { data: community, isLoading } = useQuery({
    queryKey: ["community-detail", communityId],
    queryFn: () => communityApi.getById(communityId!),
    enabled: !!communityId && !!pid,
  });

  const { data: friendsData, isLoading: friendsLoading } = useQuery({
    queryKey: ["friends", pid],
    queryFn: () => friendsApi.getAll(pid!),
    enabled: !!pid && showInvite && inviteTab === "friends",
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
  const members = community?.members || [];

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
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteNote("");
    } catch (e: any) {
      setInviteError(e.message || "Failed to send invite");
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
      setInviteSuccess("Invitation sent!");
    } catch (e: any) {
      setInviteError(e.message || "Failed to send invite");
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
        message="Sign in to view community details."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto">
        <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
        <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }}>
          <ChevronLeft className="w-4 h-4" /> Communities
        </button>
        <p className="text-sm text-center py-10" style={{ color: "var(--labs-text-muted)" }}>
          Community not found or you don't have access.
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
    if (role === "admin") return "Admin";
    if (role === "viewer") return "Viewer";
    return "Member";
  };

  const roleColor = (role: string) => {
    if (role === "admin") return "var(--labs-accent)";
    if (role === "viewer") return "var(--labs-text-muted)";
    return "var(--labs-text-secondary)";
  };

  const friends = Array.isArray(friendsData) ? friendsData : [];
  const memberIds = new Set(members.map((m: any) => m.participantId));
  const allFriendsWithStatus = friends.map((f: any) => ({
    ...f,
    isAlreadyMember: !!(f.matchedParticipantId && memberIds.has(f.matchedParticipantId)),
  }));

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="community-detail-page">
      <button onClick={goBack} className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4" style={{ color: "var(--labs-text-muted)" }} data-testid="btn-back-communities">
        <ChevronLeft className="w-4 h-4" /> Communities
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
                <Save className="w-4 h-4" /> Save
              </button>
              <button onClick={() => setEditing(false)} className="labs-btn-ghost" data-testid="btn-cancel-edit">Cancel</button>
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
                <Users className="w-3 h-3 inline mr-1" /> {members.length} members
              </span>
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
            {showInvite ? "Cancel" : "Invite Members"}
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
                  <Mail className="w-3 h-3 inline mr-1" /> Email
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
                  <Users className="w-3 h-3 inline mr-1" /> Friends
                </button>
              </div>

              {inviteTab === "email" && (
                <div className="space-y-3">
                  <input
                    type="email"
                    className="labs-input w-full"
                    placeholder="Email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                  <input
                    type="text"
                    className="labs-input w-full"
                    placeholder="Personal note (optional)"
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
                    {inviting ? "Sending..." : "Send Invitation"}
                  </button>
                </div>
              )}

              {inviteTab === "friends" && (
                <div>
                  {friendsLoading ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--labs-text-muted)" }} data-testid="text-friends-loading">
                      Loading friends…
                    </p>
                  ) : allFriendsWithStatus.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: "var(--labs-text-muted)" }} data-testid="text-no-friends">
                      No friends found.
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
                              setInviteSuccess("Invitation sent!");
                            } catch (e: any) {
                              setInviteError(e.message || "Failed to send invite");
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
                                  already member
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
                              {isAlreadyMember ? "Member" : "Invite"}
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
        Members ({members.length})
      </h3>
      <div className="space-y-1" data-testid="members-list">
        {members.map((m: any) => (
          <div key={m.id} className="labs-card p-3 flex items-center justify-between" data-testid={`member-${m.participantId}`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
              >
                {(m.participantName || "?")[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                  {stripGuestSuffix(m.participantName || "Unknown")}
                  {m.participantId === pid && <span className="text-[10px] ml-1" style={{ color: "var(--labs-accent)" }}>(you)</span>}
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
    </div>
  );
}
