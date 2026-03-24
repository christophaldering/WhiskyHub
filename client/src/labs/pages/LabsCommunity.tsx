import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { communityApi, friendsApi } from "@/lib/api";
import { getSession } from "@/lib/session";
import { useAppStore } from "@/lib/store";
import { Users, ChevronLeft, Plus, ChevronRight, Mail, Check, X } from "lucide-react";
import AuthGateMessage from "@/labs/components/AuthGateMessage";

export default function LabsCommunity() {
  const goBackToCircle = useBackNavigation("/labs/circle");
  const { currentParticipant } = useAppStore();
  const session = getSession();
  const pid = currentParticipant?.id || session.pid;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: commData, isLoading } = useQuery({
    queryKey: ["my-communities", pid],
    queryFn: () => communityApi.getMine(),
    enabled: !!pid,
    refetchInterval: 30000,
  });

  const { data: pendingInvites } = useQuery<any[]>({
    queryKey: ["community-invites-pending", pid],
    queryFn: () => communityApi.getPendingInvites(),
    enabled: !!pid,
    refetchInterval: 30000,
  });

  const acceptMutation = useMutation({
    mutationFn: (inviteId: string) => communityApi.acceptInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      queryClient.invalidateQueries({ queryKey: ["community-invites-pending"] });
    },
  });

  const declineMutation = useMutation({
    mutationFn: (inviteId: string) => communityApi.declineInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-invites-pending"] });
    },
  });

  const communities = commData?.communities || [];
  const invites = Array.isArray(pendingInvites) ? pendingInvites : [];

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const community = await communityApi.create({ name: name.trim(), description: description.trim() || undefined });
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      setShowCreate(false);
      setName("");
      setDescription("");
      navigate(`/labs/community/${community.id}`);
    } catch (e: any) {
      alert(e.message || "Failed to create community");
    } finally {
      setCreating(false);
    }
  };

  if (!pid) {
    return (
      <AuthGateMessage
        icon={<Users className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        message="Sign in to see your communities."
      />
    );
  }

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-community-page">
      <button
        onClick={goBackToCircle}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-community-back"
      >
        <ChevronLeft className="w-4 h-4" /> Circle
      </button>

      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <Users className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
          <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="labs-community-title">
            Communities
          </h1>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
          style={{
            background: showCreate ? "var(--labs-surface)" : "var(--labs-accent)",
            color: showCreate ? "var(--labs-text)" : "var(--labs-bg)",
            border: showCreate ? "1px solid var(--labs-border)" : "1px solid transparent",
            cursor: "pointer",
          }}
          data-testid="btn-create-community"
        >
          <Plus className="w-3.5 h-3.5" />
          {showCreate ? "Cancel" : "Create"}
        </button>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
        Your tasting circles & groups
      </p>

      {showCreate && (
        <div className="labs-card mb-6" style={{ padding: "var(--labs-space-md)" }} data-testid="create-community-form">
          <div className="space-y-3">
            <div>
              <label className="labs-label">Name</label>
              <input
                type="text"
                className="labs-input w-full"
                placeholder="e.g. Weekend Tasters"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                data-testid="input-community-name"
              />
            </div>
            <div>
              <label className="labs-label">Description (optional)</label>
              <textarea
                className="labs-input w-full"
                placeholder="What is this community about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={2}
                style={{ resize: "none" }}
                data-testid="input-community-description"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!name.trim() || creating}
              className="labs-btn w-full"
              style={{
                background: "var(--labs-accent)",
                color: "var(--labs-bg)",
                opacity: !name.trim() || creating ? 0.5 : 1,
              }}
              data-testid="btn-submit-community"
            >
              {creating ? "Creating..." : "Create Community"}
            </button>
          </div>
        </div>
      )}

      {invites.length > 0 && (
        <div className="mb-6" data-testid="community-invites-section">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--labs-text-muted)" }}>
            <Mail className="w-3.5 h-3.5 inline mr-1" />
            Pending Invitations ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map((invite: any) => (
              <div key={invite.id} className="labs-card p-4 flex items-center justify-between" data-testid={`invite-${invite.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                    {invite.communityName || "Community"}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    Invited by {invite.inviterName || "someone"}
                  </p>
                  {invite.personalNote && (
                    <p className="text-[11px] italic mt-1" style={{ color: "var(--labs-text-secondary)" }}>
                      "{invite.personalNote}"
                    </p>
                  )}
                </div>
                <div className="flex gap-2 ml-3 flex-shrink-0">
                  <button
                    onClick={() => acceptMutation.mutate(invite.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--labs-success-muted)", color: "var(--labs-success)", cursor: "pointer" }}
                    data-testid={`btn-accept-invite-${invite.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => declineMutation.mutate(invite.id)}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "var(--labs-danger-muted, rgba(220,38,38,0.1))", color: "var(--labs-danger)", cursor: "pointer" }}
                    data-testid={`btn-decline-invite-${invite.id}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10">
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading...</p>
        </div>
      ) : communities.length === 0 ? (
        <div className="text-center py-10" data-testid="empty-communities">
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
            No communities yet. Create one or accept an invitation to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="communities-list">
          {communities.map((c: any) => (
            <button
              key={c.id}
              onClick={() => navigate(`/labs/community/${c.id}`)}
              className="labs-card p-4 w-full text-left flex items-center justify-between transition-all"
              style={{ cursor: "pointer" }}
              data-testid={`community-card-${c.id}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                  {c.name}
                </p>
                {c.description && (
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                    {c.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    <Users className="w-3 h-3 inline mr-1" />
                    {c.memberCount || 0} members
                  </span>
                  <span className="text-[11px] flex items-center gap-1" style={{ color: (c.onlineCount ?? 0) > 0 ? "#22c55e" : "var(--labs-text-muted)" }} data-testid={`online-count-${c.id}`}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: (c.onlineCount ?? 0) > 0 ? "#22c55e" : "var(--labs-text-muted)", opacity: (c.onlineCount ?? 0) > 0 ? 1 : 0.5 }} />
                    {c.onlineCount ?? 0} online
                  </span>
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
