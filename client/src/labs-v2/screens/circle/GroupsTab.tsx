import { useState, useEffect, useCallback } from "react";
import type { ThemeTokens } from "../../tokens";
import type { Translations } from "../../i18n";
import { SP, FONT, RADIUS, TOUCH_MIN } from "../../tokens";
import { Users, Add, Trash, Edit, Back } from "../../icons";
import { groupsApi, friendsApi } from "@/lib/api";

interface Group {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  temporary: boolean;
  createdAt: string;
}

interface GroupMember {
  id: string;
  groupId: string;
  friendId: string;
  addedAt: string;
}

interface Friend {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  status?: string;
}

interface Props {
  th: ThemeTokens;
  t: Translations;
  participantId: string | null;
}

export default function GroupsTab({ th, t, participantId }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [creating, setCreating] = useState(false);

  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTemp, setFormTemp] = useState(false);

  const loadGroups = useCallback(() => {
    if (!participantId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      groupsApi.getAll(participantId).catch(() => []),
      friendsApi.getAll(participantId).catch(() => []),
    ]).then(([g, f]) => {
      setGroups(Array.isArray(g) ? g : []);
      setFriends(Array.isArray(f) ? f.filter((fr: Friend) => fr.status === "accepted") : []);
      setLoading(false);
    });
  }, [participantId]);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const loadMembers = useCallback((groupId: string) => {
    if (!participantId) return;
    groupsApi.getMembers(participantId, groupId).then(m => setMembers(Array.isArray(m) ? m : [])).catch(() => setMembers([]));
  }, [participantId]);

  const handleCreate = async () => {
    if (!participantId || !formName.trim()) return;
    setCreating(true);
    try {
      await groupsApi.create(participantId, { name: formName.trim(), description: formDesc.trim() || undefined, temporary: formTemp });
      setFormName(""); setFormDesc(""); setFormTemp(false); setShowCreate(false);
      loadGroups();
    } catch { }
    setCreating(false);
  };

  const handleUpdate = async () => {
    if (!participantId || !editGroup || !formName.trim()) return;
    setCreating(true);
    try {
      await groupsApi.update(participantId, editGroup.id, { name: formName.trim(), description: formDesc.trim() || null, temporary: formTemp });
      setEditGroup(null); setFormName(""); setFormDesc(""); setFormTemp(false);
      loadGroups();
      if (selectedGroup?.id === editGroup.id) {
        setSelectedGroup({ ...selectedGroup, name: formName.trim(), description: formDesc.trim() || null, temporary: formTemp });
      }
    } catch { }
    setCreating(false);
  };

  const handleDelete = async (group: Group) => {
    if (!participantId) return;
    if (!confirm(t.circleGroupDeleteConfirm)) return;
    try {
      await groupsApi.delete(participantId, group.id);
      if (selectedGroup?.id === group.id) setSelectedGroup(null);
      loadGroups();
    } catch { }
  };

  const handleAddMember = async (friendId: string) => {
    if (!selectedGroup || !participantId) return;
    try {
      await groupsApi.addMember(participantId, selectedGroup.id, friendId);
      loadMembers(selectedGroup.id);
    } catch { }
  };

  const handleRemoveMember = async (friendId: string) => {
    if (!selectedGroup || !participantId) return;
    try {
      await groupsApi.removeMember(participantId, selectedGroup.id, friendId);
      loadMembers(selectedGroup.id);
    } catch { }
  };

  const openEdit = (group: Group) => {
    setFormName(group.name);
    setFormDesc(group.description || "");
    setFormTemp(group.temporary ?? false);
    setEditGroup(group);
    setShowCreate(false);
  };

  const openCreate = () => {
    setFormName(""); setFormDesc(""); setFormTemp(false);
    setShowCreate(true);
    setEditGroup(null);
  };

  const memberFriendIds = new Set(members.map(m => m.friendId));

  if (selectedGroup) {
    return (
      <div className="v2-fade-up" data-testid="v2-group-detail">
        <button
          onClick={() => { setSelectedGroup(null); setMembers([]); }}
          data-testid="v2-group-back"
          style={{ display: "flex", alignItems: "center", gap: SP.xs, background: "none", border: "none", color: th.muted, cursor: "pointer", fontSize: 14, fontFamily: FONT.body, padding: 0, marginBottom: SP.md }}
        >
          <Back color={th.muted} size={16} />
          {t.circleGroups}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: SP.sm, marginBottom: SP.md }}>
          <div style={{ width: 40, height: 40, borderRadius: RADIUS.full, background: `rgba(212,168,71,0.15)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Users color={th.gold} size={20} />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: th.text, margin: 0 }} data-testid="v2-group-detail-name">{selectedGroup.name}</p>
            {selectedGroup.description && <p style={{ fontSize: 12, color: th.muted, margin: 0 }}>{selectedGroup.description}</p>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.full, background: selectedGroup.temporary ? `${th.amber}20` : `${th.green}20`, color: selectedGroup.temporary ? th.amber : th.green }}>
            {selectedGroup.temporary ? t.circleGroupTemporary : t.circleGroupPermanent}
          </span>
        </div>

        <p style={{ fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: SP.sm }}>
          {t.circleGroupMembers} ({members.length})
        </p>

        {members.length === 0 && (
          <p style={{ fontSize: 13, color: th.faint, textAlign: "center", padding: `${SP.md}px 0` }}>{t.circleGroupNoMembers}</p>
        )}

        {members.map(member => {
          const friend = friends.find(f => f.id === member.friendId);
          const name = friend ? [friend.firstName, friend.lastName].filter(Boolean).join(" ") : member.friendId;
          return (
            <div key={member.id} style={{ display: "flex", alignItems: "center", gap: SP.sm, padding: `${SP.sm}px ${SP.md}px`, borderRadius: RADIUS.md, background: th.bgCard, border: `1px solid ${th.border}`, marginBottom: SP.xs }} data-testid={`v2-group-member-${member.friendId}`}>
              <div style={{ width: 32, height: 32, borderRadius: RADIUS.full, background: `rgba(212,168,71,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 14, fontWeight: 700, color: th.gold }}>{name.charAt(0).toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0 }}>{name}</p>
                {friend?.email && <p style={{ fontSize: 11, color: th.muted, margin: 0 }}>{friend.email}</p>}
              </div>
              <button onClick={() => handleRemoveMember(member.friendId)} data-testid={`v2-group-remove-${member.friendId}`} style={{ minHeight: TOUCH_MIN, padding: `${SP.xs}px ${SP.sm}px`, borderRadius: RADIUS.sm, border: `1px solid ${th.border}`, background: "transparent", color: th.muted, fontSize: 11, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>
                {t.circleGroupRemoveMember}
              </button>
            </div>
          );
        })}

        {friends.filter(f => !memberFriendIds.has(f.id)).length > 0 && (
          <>
            <p style={{ fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", marginTop: SP.lg, marginBottom: SP.sm }}>
              {t.circleGroupAddMember}
            </p>
            {friends.filter(f => !memberFriendIds.has(f.id)).map(friend => {
              const name = [friend.firstName, friend.lastName].filter(Boolean).join(" ") || "—";
              return (
                <div key={friend.id} style={{ display: "flex", alignItems: "center", gap: SP.sm, padding: `${SP.sm}px ${SP.md}px`, borderRadius: RADIUS.md, background: th.bgCard, border: `1px solid ${th.border}`, marginBottom: SP.xs }} data-testid={`v2-group-add-${friend.id}`}>
                  <div style={{ width: 32, height: 32, borderRadius: RADIUS.full, background: `rgba(212,168,71,0.08)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT.display, fontSize: 14, fontWeight: 700, color: th.faint }}>{name.charAt(0).toUpperCase()}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: th.text, margin: 0 }}>{name}</p>
                    {friend.email && <p style={{ fontSize: 11, color: th.muted, margin: 0 }}>{friend.email}</p>}
                  </div>
                  <button onClick={() => handleAddMember(friend.id)} data-testid={`v2-group-add-btn-${friend.id}`} style={{ minHeight: TOUCH_MIN, padding: `${SP.xs}px ${SP.sm}px`, borderRadius: RADIUS.sm, border: "none", background: th.gold, color: "#0e0b05", fontSize: 11, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>
                    <Add color="#0e0b05" size={14} />
                  </button>
                </div>
              );
            })}
          </>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: `${SP.lg}px 0` }}>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} style={{ height: 60, background: th.bgCard, borderRadius: RADIUS.md, marginBottom: SP.sm, opacity: 0.6 }} className="v2-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="v2-fade-up" data-testid="v2-circle-groups">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: SP.lg }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: th.muted, textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>
          {t.circleGroups} ({groups.length})
        </p>
        <button onClick={openCreate} data-testid="v2-group-create-btn" style={{ display: "flex", alignItems: "center", gap: SP.xs, padding: `${SP.xs}px ${SP.sm}px`, minHeight: TOUCH_MIN, borderRadius: RADIUS.md, border: "none", background: th.gold, color: "#0e0b05", fontFamily: FONT.body, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          <Add color="#0e0b05" size={14} />
          {t.circleGroupCreate}
        </button>
      </div>

      {(showCreate || editGroup) && (
        <div style={{ background: th.bgCard, border: `1px solid ${th.gold}44`, borderRadius: RADIUS.lg, padding: SP.md, marginBottom: SP.lg }} data-testid="v2-group-form">
          <input
            value={formName}
            onChange={e => setFormName(e.target.value)}
            placeholder={t.circleGroupNamePH}
            data-testid="v2-group-form-name"
            style={{ width: "100%", minHeight: TOUCH_MIN, padding: `${SP.sm}px ${SP.md}px`, borderRadius: RADIUS.md, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 14, fontFamily: FONT.body, outline: "none", boxSizing: "border-box", marginBottom: SP.sm }}
          />
          <input
            value={formDesc}
            onChange={e => setFormDesc(e.target.value)}
            placeholder={t.circleGroupDescPH}
            data-testid="v2-group-form-desc"
            style={{ width: "100%", minHeight: TOUCH_MIN, padding: `${SP.sm}px ${SP.md}px`, borderRadius: RADIUS.md, border: `1px solid ${th.border}`, background: th.inputBg, color: th.text, fontSize: 13, fontFamily: FONT.body, outline: "none", boxSizing: "border-box", marginBottom: SP.sm }}
          />
          <div style={{ display: "flex", gap: SP.sm, marginBottom: SP.md }}>
            {([false, true] as const).map(isTemp => (
              <button key={String(isTemp)} onClick={() => setFormTemp(isTemp)} data-testid={`v2-group-form-${isTemp ? "temp" : "perm"}`} style={{ flex: 1, minHeight: TOUCH_MIN, borderRadius: RADIUS.md, border: `1px solid ${formTemp === isTemp ? th.gold : th.border}`, background: formTemp === isTemp ? `${th.gold}12` : "transparent", color: formTemp === isTemp ? th.gold : th.muted, fontSize: 13, fontWeight: 600, fontFamily: FONT.body, cursor: "pointer" }}>
                {isTemp ? t.circleGroupTemporary : t.circleGroupPermanent}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: SP.sm }}>
            <button onClick={() => { setShowCreate(false); setEditGroup(null); }} style={{ flex: 1, minHeight: TOUCH_MIN, borderRadius: RADIUS.md, border: `1px solid ${th.border}`, background: "transparent", color: th.muted, fontSize: 13, fontFamily: FONT.body, cursor: "pointer" }}>
              {t.circleDecline}
            </button>
            <button onClick={editGroup ? handleUpdate : handleCreate} disabled={!formName.trim() || creating} data-testid="v2-group-form-save" style={{ flex: 1, minHeight: TOUCH_MIN, borderRadius: RADIUS.md, border: "none", background: formName.trim() ? th.gold : th.bgCard, color: formName.trim() ? "#0e0b05" : th.muted, fontSize: 13, fontWeight: 600, fontFamily: FONT.body, cursor: formName.trim() ? "pointer" : "not-allowed", opacity: creating ? 0.6 : 1 }}>
              {t.circleGroupSave}
            </button>
          </div>
        </div>
      )}

      {groups.length === 0 && !showCreate && (
        <div style={{ textAlign: "center", padding: `${SP.xxl}px 0` }}>
          <Users color={th.faint} size={40} style={{ marginBottom: SP.md }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: th.text, marginBottom: SP.xs }}>{t.circleGroups}</p>
          <p style={{ fontSize: 12, color: th.muted }}>{t.circleGroupEmpty}</p>
        </div>
      )}

      {groups.map(group => (
        <div
          key={group.id}
          style={{ display: "flex", alignItems: "center", gap: SP.sm, padding: `${SP.sm + 2}px ${SP.md}px`, borderRadius: RADIUS.md, background: th.bgCard, border: `1px solid ${th.border}`, marginBottom: SP.xs, cursor: "pointer" }}
          onClick={() => { setSelectedGroup(group); loadMembers(group.id); }}
          data-testid={`v2-group-${group.id}`}
        >
          <div style={{ width: 40, height: 40, borderRadius: RADIUS.full, background: `rgba(212,168,71,0.12)`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users color={th.gold} size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: th.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</p>
            {group.description && <p style={{ fontSize: 11, color: th.muted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.description}</p>}
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: RADIUS.full, background: group.temporary ? `${th.amber}20` : `${th.green}20`, color: group.temporary ? th.amber : th.green, flexShrink: 0 }}>
            {group.temporary ? t.circleGroupTemporary : t.circleGroupPermanent}
          </span>
          <button onClick={e => { e.stopPropagation(); openEdit(group); }} data-testid={`v2-group-edit-${group.id}`} style={{ minWidth: 36, minHeight: 36, borderRadius: RADIUS.sm, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Edit color={th.muted} size={14} />
          </button>
          <button onClick={e => { e.stopPropagation(); handleDelete(group); }} data-testid={`v2-group-delete-${group.id}`} style={{ minWidth: 36, minHeight: 36, borderRadius: RADIUS.sm, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Trash color={th.faint} size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
