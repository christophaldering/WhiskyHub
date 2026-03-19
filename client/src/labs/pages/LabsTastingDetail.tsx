import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { SkeletonList, SkeletonLine } from "@/labs/components/LabsSkeleton";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  Play,
  BarChart3,
  Eye,
  EyeOff,
  Crown,
  Wine,
  QrCode,
  Copy,
  Check,
  Download,
  Mail,
  Trophy,
  Trash2,
  ChevronDown,
  Pencil,
  X,
  Plus,
  Settings,
  Compass,
  Globe,
  Sliders,
  Gauge,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, inviteApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import FriendsQuickSelect from "@/labs/components/FriendsQuickSelect";
import { LabsParticipantDownloads } from "@/components/ParticipantDownloads";
import type { Tasting } from "@shared/schema";
import QRCode from "qrcode";

interface LabsTastingDetailProps {
  params: { id: string };
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Setting up", className: "labs-badge-info" },
  open: { label: "Live", className: "labs-badge-success" },
  closed: { label: "Closed", className: "labs-badge-accent" },
  reveal: { label: "Reveal", className: "labs-badge-accent" },
  archived: { label: "Completed", className: "labs-badge-info" },
};

function InlineWhiskyEdit({ whisky, onSave, onCancel }: {
  whisky: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState((whisky.name as string) || "");
  const [distillery, setDistillery] = useState((whisky.distillery as string) || "");
  const [age, setAge] = useState((whisky.age as string) || "");
  const [abv, setAbv] = useState(whisky.abv != null ? String(whisky.abv) : "");

  return (
    <div className="labs-card p-3 space-y-2" data-testid={`labs-detail-whisky-edit-${whisky.id}`}>
      <input
        className="labs-input w-full text-sm"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        data-testid={`input-whisky-name-${whisky.id}`}
      />
      <div className="grid grid-cols-3 gap-2">
        <input
          className="labs-input text-sm"
          value={distillery}
          onChange={(e) => setDistillery(e.target.value)}
          placeholder="Distillery"
          data-testid={`input-whisky-distillery-${whisky.id}`}
        />
        <input
          className="labs-input text-sm"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder="Age"
          data-testid={`input-whisky-age-${whisky.id}`}
        />
        <input
          className="labs-input text-sm"
          value={abv}
          onChange={(e) => setAbv(e.target.value)}
          placeholder="ABV %"
          data-testid={`input-whisky-abv-${whisky.id}`}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="labs-btn-ghost text-xs" onClick={onCancel} data-testid={`button-whisky-cancel-${whisky.id}`}>Cancel</button>
        <button
          className="labs-btn-primary text-xs px-3"
          onClick={() => onSave({
            name: name.trim() || undefined,
            distillery: distillery.trim() || null,
            age: age.trim() || null,
            abv: abv.trim() ? parseFloat(abv) : null,
          })}
          data-testid={`button-whisky-save-${whisky.id}`}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function LabsTastingDetail({ params }: LabsTastingDetailProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const queryClient = useQueryClient();
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [inviteResults, setInviteResults] = useState<Array<{ email: string; status: string; link?: string }> | null>(null);
  const [showWhiskies, setShowWhiskies] = useState(true);
  const [editingWhiskyId, setEditingWhiskyId] = useState<string | null>(null);
  const [deletingWhiskyId, setDeletingWhiskyId] = useState<string | null>(null);
  const [showAddWhisky, setShowAddWhisky] = useState(false);
  const [newWhiskyName, setNewWhiskyName] = useState("");
  const [showSessionSettings, setShowSessionSettings] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDate, setMetaDate] = useState("");
  const [metaLocation, setMetaLocation] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [settingsSaveStatus, setSettingsSaveStatus] = useState<string | null>(null);

  const { data: tasting, isLoading, isError } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
    refetchInterval: 8000,
  });

  const { data: whiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
  });

  const { data: participants } = useQuery({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
  });

  const sendInviteMutation = useMutation({
    mutationFn: ({ emailList, note }: { emailList: string[]; note?: string }) =>
      inviteApi.sendInvites(tastingId, emailList, note),
    onSuccess: (data: { invites?: Array<{ email: string; emailSent: boolean; link?: string }> }) => {
      const mapped = (data.invites || []).map((inv) => ({
        email: inv.email,
        status: inv.emailSent ? "sent" : "link-only",
        link: inv.link,
      }));
      setInviteResults(mapped);
      setInviteEmails("");
      setInviteNote("");
      queryClient.invalidateQueries({ queryKey: ["invites", tastingId] });
    },
  });

  const deleteWhiskyMutation = useMutation({
    mutationFn: (id: string) => whiskyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setDeletingWhiskyId(null);
    },
  });

  const updateWhiskyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => whiskyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setEditingWhiskyId(null);
    },
  });

  const addWhiskyMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setNewWhiskyName("");
      setShowAddWhisky(false);
    },
  });

  useEffect(() => {
    if (tasting?.code) {
      const joinUrl = `${window.location.origin}/labs/join?code=${tasting.code}`;
      QRCode.toDataURL(joinUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#1a1714", light: "#f5f0e8" },
        errorCorrectionLevel: "M",
      }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
  }, [tasting?.code]);

  const handleCopyCode = () => {
    if (!tasting?.code) return;
    navigator.clipboard.writeText(tasting.code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/labs/join?code=${tasting?.code || ""}`;
    navigator.clipboard.writeText(link).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  };

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `casksense-tasting-${tastingId}-qr.png`;
    a.click();
  };

  const handleSendInvites = () => {
    const emailList = inviteEmails.split("\n").map((e) => e.trim()).filter((e) => e.length > 0);
    if (emailList.length === 0) return;
    sendInviteMutation.mutate({ emailList, note: inviteNote.trim() || undefined });
  };


  const patchTastingDetails = async (body: Record<string, unknown>) => {
    if (!currentParticipant) return;
    const res = await fetch(`/api/tastings/${tastingId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: currentParticipant.id, ...body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSettingsSaveStatus(err.message || "Save failed");
      setTimeout(() => setSettingsSaveStatus(null), 3000);
      throw new Error(err.message || "Save failed");
    }
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    setSettingsSaveStatus("Saved");
    setTimeout(() => setSettingsSaveStatus(null), 2000);
  };

  const startEditingMeta = () => {
    if (!tasting) return;
    setMetaTitle(tasting.title || "");
    setMetaDate(tasting.date || "");
    setMetaLocation(tasting.location || "");
    setMetaDescription(tasting.description || "");
    setEditingMeta(true);
  };

  const saveMetaEdit = async () => {
    try {
      await patchTastingDetails({
        title: metaTitle.trim() || tasting?.title,
        date: metaDate || tasting?.date,
        location: metaLocation.trim(),
        description: metaDescription.trim(),
      });
      setEditingMeta(false);
    } catch {}
  };

  const isHost = currentParticipant && tasting?.hostId === currentParticipant.id;
  const isLive = tasting?.status === "open";
  const isCompleted = tasting?.status === "archived" || tasting?.status === "closed";
  const isReveal = tasting?.status === "reveal";
  const isDraft = tasting?.status === "draft";
  const status = STATUS_CONFIG[tasting?.status] || STATUS_CONFIG.draft;

  if (isError) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may have been removed or the link is incorrect.</p>
        <button className="labs-btn-secondary" onClick={goBack} data-testid="labs-detail-not-found-back">Tastings</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-page labs-fade-in" style={{ minHeight: "60vh" }}>
        <div className="space-y-4">
          <SkeletonLine width="50%" height={22} />
          <SkeletonLine width="70%" height={13} />
          <div style={{ height: 12 }} />
          <SkeletonList count={3} />
        </div>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may have been removed or the link is incorrect.</p>
        <button className="labs-btn-secondary" onClick={goBack} data-testid="labs-detail-notfound-back">Tastings</button>
      </div>
    );
  }

  const whiskyCount = whiskies?.length ?? 0;
  const participantCount = participants?.length ?? 0;

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-detail-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="mb-5">
        {editingMeta && isHost ? (
          <div className="space-y-3" data-testid="labs-detail-meta-edit">
            <div className="flex items-center justify-between gap-2">
              <input
                className="labs-input flex-1 text-lg font-bold"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Tasting title"
                data-testid="input-meta-title"
              />
              <span className={`labs-badge ${status.className} flex-shrink-0`} data-testid="labs-detail-status">
                {status.label}
              </span>
            </div>
            <textarea
              className="labs-input w-full text-sm"
              rows={2}
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              placeholder="Description (optional)"
              data-testid="input-meta-description"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="labs-input text-sm"
                type="date"
                value={metaDate}
                onChange={(e) => setMetaDate(e.target.value)}
                data-testid="input-meta-date"
              />
              <input
                className="labs-input text-sm"
                value={metaLocation}
                onChange={(e) => setMetaLocation(e.target.value)}
                placeholder="Location"
                data-testid="input-meta-location"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button className="labs-btn-ghost text-xs" onClick={() => setEditingMeta(false)} data-testid="button-meta-cancel">Cancel</button>
              <button className="labs-btn-primary text-xs px-4" onClick={saveMetaEdit} data-testid="button-meta-save">Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 mb-2">
              <h1
                className="labs-h2"
                style={{ color: "var(--labs-text)", flex: 1, minWidth: 0 }}
                data-testid="labs-detail-title"
              >
                {tasting.title}
              </h1>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isHost && (
                  <button
                    className="labs-btn-ghost p-1.5"
                    onClick={startEditingMeta}
                    data-testid="button-edit-meta"
                  >
                    <Pencil className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
                  </button>
                )}
                <span className={`labs-badge ${status.className}`} data-testid="labs-detail-status">
                  {status.label}
                </span>
              </div>
            </div>

            {tasting.description && (
              <p
                className="text-sm mb-3 leading-relaxed"
                style={{ color: "var(--labs-text-secondary)" }}
                data-testid="labs-detail-description"
              >
                {tasting.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "var(--labs-text-muted)" }}>
              {tasting.date && (
                <span className="flex items-center gap-1.5" data-testid="labs-detail-date">
                  <Calendar className="w-3.5 h-3.5" />
                  {tasting.date}
                </span>
              )}
              {tasting.location && (
                <span className="flex items-center gap-1.5" data-testid="labs-detail-location">
                  <MapPin className="w-3.5 h-3.5" />
                  {tasting.location}
                </span>
              )}
              {tasting.hostName && (
                <span className="flex items-center gap-1.5" data-testid="labs-detail-host">
                  <Crown className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                  {stripGuestSuffix(tasting.hostName)}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mb-6 labs-stagger-1 space-y-2">
        {isHost && isDraft && (
          <>
            <button
              className="labs-btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
              onClick={() => navigate(`/labs/live/${tastingId}`)}
              data-testid="labs-detail-start-tasting"
            >
              <Play className="w-5 h-5" />
              Tasting starten
            </button>
            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => navigate(`/labs/host/${tastingId}`)}
              data-testid="labs-detail-manage"
            >
              Presenter View
            </button>
          </>
        )}

        {(isLive || isReveal) && (
          <>
            <button
              className="labs-btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
              onClick={() => navigate(`/labs/live/${tastingId}`)}
              data-testid="labs-detail-join-live"
            >
              <Play className="w-5 h-5" />
              {isLive ? "Enter Live Session" : "View Reveal"}
            </button>
            {isHost && (
              <button
                className="labs-btn-secondary w-full flex items-center justify-center gap-2"
                onClick={() => navigate(`/labs/host/${tastingId}`)}
                data-testid="labs-detail-manage"
              >
                Manage Session
              </button>
            )}
          </>
        )}

        {isDraft && !isHost && (
          <button
            className="labs-btn-secondary w-full flex items-center justify-center gap-2 py-3"
            onClick={() => navigate(`/labs/live/${tastingId}`)}
            data-testid="labs-detail-join-live"
          >
            <Play className="w-4 h-4" />
            Enter Session
          </button>
        )}

        {isCompleted && (
          <>
            <button
              className="labs-btn-primary w-full flex items-center justify-center gap-2 py-3 text-base font-semibold"
              onClick={() => navigate(`/labs/results/${tastingId}`)}
              data-testid="labs-detail-view-results"
            >
              <BarChart3 className="w-5 h-5" />
              View Results
            </button>
            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => navigate(`/labs/tastings/${tastingId}/recap`)}
              data-testid="labs-detail-view-recap"
            >
              <Trophy className="w-4 h-4" />
              Tasting Recap
            </button>
            {isHost && (
              <button
                className="labs-btn-ghost w-full flex items-center justify-center gap-2 text-xs"
                onClick={() => navigate(`/labs/host/${tastingId}`)}
                style={{ color: "var(--labs-text-muted)" }}
                data-testid="labs-detail-manage"
              >
                Manage Session
              </button>
            )}
          </>
        )}
      </div>

      {isHost && isDraft && (
        <div className="mb-6 labs-stagger-2" data-testid="labs-detail-session-settings">
          <button
            onClick={() => setShowSessionSettings(!showSessionSettings)}
            className="w-full flex items-center justify-between labs-card p-4 cursor-pointer"
            style={{ background: "none", border: "1.5px solid var(--labs-border)", fontFamily: "inherit" }}
            data-testid="button-toggle-session-settings"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--labs-accent-muted)" }}
              >
                <Settings className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Session Settings</p>
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Configure before starting</p>
              </div>
            </div>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{
                color: "var(--labs-text-muted)",
                transform: showSessionSettings ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {showSessionSettings && (
            <div className="mt-3 space-y-3" data-testid="labs-detail-session-settings-content">
              {settingsSaveStatus && (
                <div className="flex items-center gap-2" style={{ fontSize: 12, color: settingsSaveStatus === "Saved" ? "var(--labs-success)" : "var(--labs-danger, #e74c3c)" }}>
                  <Check className="w-3 h-3" />
                  {settingsSaveStatus}
                </div>
              )}

              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  <Gauge className="w-3 h-3" />
                  Rating Scale
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {[
                    { value: 5, label: "5", desc: "Simple" },
                    { value: 10, label: "10", desc: "Classic" },
                    { value: 20, label: "20", desc: "Detailed" },
                    { value: 100, label: "100", desc: "Pro" },
                  ].map((opt) => {
                    const active = (tasting.ratingScale ?? 100) === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => patchTastingDetails({ ratingScale: opt.value })}
                        className="rounded-lg transition-all text-center"
                        style={{
                          padding: "10px 4px",
                          background: active ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                          border: `1.5px solid ${active ? "var(--labs-accent)" : "var(--labs-border)"}`,
                          cursor: "pointer",
                        }}
                        data-testid={`labs-detail-scale-${opt.value}`}
                      >
                        <div className="font-bold" style={{ fontSize: 16, color: active ? "var(--labs-accent)" : "var(--labs-text)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.2, marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="labs-card overflow-hidden">
                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer"
                  onClick={() => patchTastingDetails({ blindMode: !tasting.blindMode })}
                  style={{ borderBottom: "1px solid var(--labs-border)" }}
                  data-testid="labs-detail-toggle-blind"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: tasting.blindMode ? "var(--labs-accent-muted)" : "var(--labs-surface)" }}
                    >
                      <EyeOff className="w-4 h-4" style={{ color: tasting.blindMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--labs-text)", margin: 0 }}>Blind Tasting</p>
                      <p className="text-[11px]" style={{ color: "var(--labs-text-muted)", margin: 0 }}>Hide whisky names until reveal</p>
                    </div>
                  </div>
                  <div
                    className="w-11 h-6 rounded-full transition-all flex items-center px-0.5 flex-shrink-0"
                    style={{
                      background: tasting.blindMode ? "var(--labs-accent)" : "var(--labs-border)",
                      justifyContent: tasting.blindMode ? "flex-end" : "flex-start",
                    }}
                  >
                    <div className="w-5 h-5 rounded-full transition-all" style={{ background: "var(--labs-bg)" }} />
                  </div>
                </div>

                <div
                  className="px-4 py-3 flex items-center justify-between cursor-pointer"
                  onClick={() => {
                    const newGuided = !tasting.guidedMode;
                    const patch: Record<string, unknown> = { guidedMode: newGuided };
                    if (newGuided && ((tasting.sessionUiMode as string) || "flow") === "flow") {
                      patch.sessionUiMode = "focus";
                    }
                    patchTastingDetails(patch);
                  }}
                  data-testid="labs-detail-toggle-guided"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: tasting.guidedMode ? "var(--labs-accent-muted)" : "var(--labs-surface)" }}
                    >
                      <Compass className="w-4 h-4" style={{ color: tasting.guidedMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--labs-text)", margin: 0 }}>Host Controls the Pace</p>
                      <p className="text-[11px]" style={{ color: "var(--labs-text-muted)", margin: 0 }}>Guide all guests through each dram</p>
                    </div>
                  </div>
                  <div
                    className="w-11 h-6 rounded-full transition-all flex items-center px-0.5 flex-shrink-0"
                    style={{
                      background: tasting.guidedMode ? "var(--labs-accent)" : "var(--labs-border)",
                      justifyContent: tasting.guidedMode ? "flex-end" : "flex-start",
                    }}
                  >
                    <div className="w-5 h-5 rounded-full transition-all" style={{ background: "var(--labs-bg)" }} />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  <Sliders className="w-3 h-3" />
                  Tasting Experience
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                  {[
                    { value: "flow", label: "Free", desc: tasting.guidedMode ? "Not with Host Controls" : "Explore freely", disabled: !!tasting.guidedMode },
                    { value: "focus", label: "One at a Time", desc: "Focus mode" },
                    { value: "journal", label: "Journal", desc: "Guided notes" },
                  ].map((opt) => {
                    const active = ((tasting.sessionUiMode as string) || "flow") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => !opt.disabled && patchTastingDetails({ sessionUiMode: opt.value || null })}
                        className="rounded-lg transition-all text-center"
                        style={{
                          padding: "10px 4px",
                          background: opt.disabled ? "var(--labs-surface)" : active ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                          border: `1.5px solid ${opt.disabled ? "var(--labs-border)" : active ? "var(--labs-accent)" : "var(--labs-border)"}`,
                          cursor: opt.disabled ? "not-allowed" : "pointer",
                          opacity: opt.disabled ? 0.4 : 1,
                        }}
                        disabled={!!opt.disabled}
                        data-testid={`labs-detail-experience-${opt.value}`}
                      >
                        <div className="font-bold" style={{ fontSize: 14, color: opt.disabled ? "var(--labs-text-muted)" : active ? "var(--labs-accent)" : "var(--labs-text)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.2, marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold flex items-center gap-1 mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  <Globe className="w-3 h-3" />
                  How Guests Join
                </label>
                <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                  {[
                    { value: "standard", label: "Account", desc: "Saved ratings" },
                    { value: "ultra", label: "Instant", desc: "No sign-in" },
                  ].map((opt) => {
                    const active = ((tasting.guestMode as string) || "standard") === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => patchTastingDetails({ guestMode: opt.value })}
                        className="rounded-lg transition-all text-center"
                        style={{
                          padding: "10px 4px",
                          background: active ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                          border: `1.5px solid ${active ? "var(--labs-accent)" : "var(--labs-border)"}`,
                          cursor: "pointer",
                        }}
                        data-testid={`labs-detail-guest-${opt.value}`}
                      >
                        <div className="font-bold" style={{ fontSize: 14, color: active ? "var(--labs-accent)" : "var(--labs-text)" }}>{opt.label}</div>
                        <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.2, marginTop: 2 }}>{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6 labs-stagger-1">
        <div className="labs-card p-3 text-center">
          <Wine className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }} data-testid="labs-detail-whisky-count">
            {whiskyCount}
          </p>
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Whiskies</p>
        </div>
        <div className="labs-card p-3 text-center">
          <Users className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }} data-testid="labs-detail-participant-count">
            {participantCount}
          </p>
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Participants</p>
        </div>
        <div className="labs-card p-3 text-center">
          <BarChart3 className="w-4 h-4 mx-auto mb-1" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }} data-testid="labs-detail-rating-count">
            {participants?.reduce((sum: number, p: { ratingCount?: number }) => sum + (p.ratingCount || 0), 0) ?? 0}
          </p>
          <p className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>Ratings</p>
        </div>
      </div>

      {tasting.code && (
        <div className="mb-6 labs-stagger-2">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--labs-text-muted)", letterSpacing: "0.08em" }}>
            Invite & Share
          </p>
          <div className="labs-card overflow-hidden" data-testid="labs-detail-invite-share-section">
            <div className="p-4">
              <div className="flex flex-wrap items-center justify-center gap-3 mb-3">
                <span
                  className="text-2xl font-bold tracking-widest"
                  style={{ fontFamily: "monospace", color: "var(--labs-accent)" }}
                  data-testid="labs-detail-join-code"
                >
                  {tasting.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="labs-btn-ghost"
                  style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}
                  data-testid="button-labs-copy-code"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-success)" }} /> : <Copy className="w-3.5 h-3.5 flex-shrink-0" />}
                  {codeCopied ? "Copied" : "Copy"}
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 mb-1">
                <button
                  onClick={() => setShowQr(!showQr)}
                  className="labs-btn-ghost"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}
                  data-testid="button-labs-toggle-qr"
                >
                  <QrCode className="w-4 h-4 flex-shrink-0" />
                  {showQr ? "Hide QR" : "Show QR Code"}
                </button>
                <button
                  onClick={handleCopyLink}
                  className="labs-btn-ghost"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, whiteSpace: "nowrap" }}
                  data-testid="button-labs-copy-join-link"
                >
                  {linkCopied ? <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-success)" }} /> : <Copy className="w-3.5 h-3.5 flex-shrink-0" />}
                  {linkCopied ? "Copied" : "Copy Link"}
                </button>
              </div>
              {showQr && qrDataUrl && (
                <div className="flex flex-col items-center gap-3 mt-4">
                  <div style={{ background: "var(--labs-surface)", padding: 12, borderRadius: 12 }}>
                    <img src={qrDataUrl} alt="QR Code" style={{ width: 180, height: 180 }} data-testid="img-labs-qr-code" />
                  </div>
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Scan to join this tasting</p>
                  <button
                    onClick={downloadQr}
                    className="labs-btn-ghost"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
                    data-testid="button-labs-download-qr"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download QR
                  </button>
                </div>
              )}
            </div>

            {isHost && (
              <>
                <div style={{ height: 1, background: "var(--labs-border)" }} />
                <div className="p-4">
                  <button
                    onClick={() => { setShowInvite(!showInvite); setInviteResults(null); }}
                    className="w-full flex items-center justify-between"
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
                    data-testid="button-labs-toggle-invite"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Email Invitations</span>
                    </div>
                    <ChevronDown
                      className="w-4 h-4 transition-transform"
                      style={{
                        color: "var(--labs-text-muted)",
                        transform: showInvite ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    />
                  </button>
                  {showInvite && (
                    <div className="mt-4 space-y-3">
                      {!inviteResults ? (
                        <>
                          {currentParticipant?.id && (
                            <FriendsQuickSelect
                              participantId={currentParticipant.id}
                              tastingId={tastingId}
                              selectedEmails={inviteEmails.split("\n").map(e => e.trim()).filter(Boolean)}
                              onToggle={(email, selected) => {
                                const current = inviteEmails.split("\n").map(e => e.trim()).filter(Boolean);
                                if (selected) {
                                  if (!current.some(e => e.toLowerCase() === email.toLowerCase())) {
                                    setInviteEmails([...current, email].join("\n"));
                                  }
                                } else {
                                  setInviteEmails(current.filter(e => e.toLowerCase() !== email.toLowerCase()).join("\n"));
                                }
                              }}
                            />
                          )}
                          <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--labs-text-muted)" }}>Email addresses (one per line)</label>
                            <textarea
                              className="labs-input"
                              rows={3}
                              value={inviteEmails}
                              onChange={(e) => setInviteEmails(e.target.value)}
                              placeholder={"friend@example.com\nanother@example.com"}
                              data-testid="textarea-labs-invite-emails"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--labs-text-muted)" }}>Personal note (optional)</label>
                            <textarea
                              className="labs-input"
                              rows={2}
                              value={inviteNote}
                              onChange={(e) => setInviteNote(e.target.value)}
                              placeholder="Join me for a whisky tasting!"
                              data-testid="textarea-labs-invite-note"
                            />
                          </div>
                          <button
                            onClick={handleSendInvites}
                            disabled={sendInviteMutation.isPending || inviteEmails.trim().length === 0}
                            className="labs-btn-primary w-full flex items-center justify-center gap-2"
                            style={{ opacity: inviteEmails.trim().length === 0 ? 0.5 : 1 }}
                            data-testid="button-labs-send-invites"
                          >
                            <Mail className="w-4 h-4" />
                            {sendInviteMutation.isPending ? "Sending..." : "Send Invitations"}
                          </button>
                        </>
                      ) : (
                        <div data-testid="labs-invite-results">
                          <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-accent)" }}>Invitations sent</p>
                          {inviteResults.map((r, i) => (
                            <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < inviteResults.length - 1 ? "1px solid var(--labs-border)" : "none" }}>
                              <span className="text-sm truncate" style={{ color: "var(--labs-text-secondary)" }}>{r.email}</span>
                              <span
                                className="labs-badge text-[11px]"
                                style={{
                                  background: r.status === "sent" ? "var(--labs-success-muted)" : "var(--labs-accent-muted)",
                                  color: r.status === "sent" ? "var(--labs-success)" : "var(--labs-accent)",
                                }}
                              >
                                {r.status}
                              </span>
                            </div>
                          ))}
                          <button
                            onClick={() => setInviteResults(null)}
                            className="labs-btn-ghost mt-3"
                            style={{ fontSize: 12 }}
                            data-testid="button-labs-invite-new"
                          >
                            Send more
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {!isHost && (
        <div className="mb-6 labs-stagger-3">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--labs-text-muted)", letterSpacing: "0.08em" }}>
            Details
          </p>
          <div className="labs-card p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Blind Mode</span>
                <span className="text-sm font-medium flex items-center gap-1.5" data-testid="labs-detail-blind">
                  {tasting.blindMode ? (
                    <><EyeOff className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} /> Active</>
                  ) : (
                    <><Eye className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} /> Off</>
                  )}
                </span>
              </div>
              {tasting.ratingScale && (
                <>
                  <div className="labs-divider" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Rating Scale</span>
                    <span className="text-sm font-medium" data-testid="labs-detail-scale">0 – {tasting.ratingScale}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 labs-stagger-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)", letterSpacing: "0.08em", margin: 0 }}>
            Whiskies ({whiskyCount})
          </p>
          <div className="flex items-center gap-2">
            {isHost && isDraft && (
              <button
                onClick={() => setShowAddWhisky(!showAddWhisky)}
                className="labs-btn-ghost flex items-center gap-1 text-xs"
                data-testid="labs-detail-add-whisky-toggle"
              >
                {showAddWhisky ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showAddWhisky ? "Close" : "Add"}
              </button>
            )}
            <button
              onClick={() => setShowWhiskies(!showWhiskies)}
              className="labs-btn-ghost"
              style={{ padding: 4 }}
              data-testid="labs-detail-toggle-whiskies"
            >
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{
                  color: "var(--labs-text-muted)",
                  transform: showWhiskies ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </button>
          </div>
        </div>

        {isHost && isDraft && showAddWhisky && (
          <div className="labs-card p-3 mb-3 flex gap-2" data-testid="labs-detail-add-whisky-form">
            <input
              className="labs-input flex-1 text-sm"
              value={newWhiskyName}
              onChange={(e) => setNewWhiskyName(e.target.value)}
              placeholder="Whisky name"
              onKeyDown={(e) => {
                if (e.key === "Enter" && newWhiskyName.trim()) {
                  addWhiskyMutation.mutate({ tastingId, name: newWhiskyName.trim(), sortOrder: whiskyCount });
                }
              }}
              data-testid="input-add-whisky-name"
            />
            <button
              className="labs-btn-primary text-xs px-3"
              disabled={!newWhiskyName.trim() || addWhiskyMutation.isPending}
              onClick={() => {
                if (newWhiskyName.trim()) {
                  addWhiskyMutation.mutate({ tastingId, name: newWhiskyName.trim(), sortOrder: whiskyCount });
                }
              }}
              data-testid="button-add-whisky"
            >
              {addWhiskyMutation.isPending ? "..." : "Add"}
            </button>
          </div>
        )}

        {showWhiskies && (
          <>
            {whiskyCount === 0 ? (
              <div className="labs-card p-6 text-center" data-testid="labs-detail-whiskies-empty">
                <Wine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} />
                <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>No whiskies added yet</p>
              </div>
            ) : (
              <div className="labs-card overflow-hidden" data-testid="labs-detail-whiskies-list">
                {(whiskies || []).map((w: Record<string, unknown>, idx: number) => {
                  if (editingWhiskyId === w.id) {
                    return (
                      <div key={w.id as string} style={{ borderBottom: idx < whiskyCount - 1 ? "1px solid var(--labs-border)" : "none" }}>
                        <InlineWhiskyEdit
                          whisky={w}
                          onSave={(data) => updateWhiskyMutation.mutate({ id: w.id as string, data })}
                          onCancel={() => setEditingWhiskyId(null)}
                        />
                      </div>
                    );
                  }

                  return (
                    <div
                      key={w.id as string}
                      className="px-4 py-2.5 flex items-center gap-3"
                      style={{ borderBottom: idx < whiskyCount - 1 ? "1px solid var(--labs-border)" : "none" }}
                      data-testid={`labs-detail-whisky-${w.id}`}
                    >
                      <span
                        className="text-[11px] font-semibold flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                      >
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)", margin: 0 }}>
                          {tasting.blindMode && !isHost ? `Dram #${idx + 1}` : ((w.name as string) || `Dram #${idx + 1}`)}
                        </p>
                        {(w.distillery || w.age || w.abv || w.region) && (
                          <p className="text-[11px] truncate" style={{ color: "var(--labs-text-muted)", margin: 0 }}>
                            {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null, w.region].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      {(w.imageUrl as string) && (
                        <img
                          src={w.imageUrl as string}
                          alt=""
                          className="w-7 h-7 rounded-md object-cover flex-shrink-0"
                          data-testid={`img-whisky-${w.id}`}
                        />
                      )}
                      {isHost && isDraft && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            className="labs-btn-ghost p-1"
                            onClick={() => setEditingWhiskyId(w.id as string)}
                            data-testid={`button-edit-whisky-${w.id}`}
                          >
                            <Pencil className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
                          </button>
                          {deletingWhiskyId === w.id ? (
                            <div className="flex items-center gap-0.5">
                              <button
                                className="labs-btn-ghost p-1"
                                onClick={() => deleteWhiskyMutation.mutate(w.id as string)}
                                data-testid={`button-confirm-delete-whisky-${w.id}`}
                              >
                                <Check className="w-3 h-3" style={{ color: "var(--labs-danger, #e74c3c)" }} />
                              </button>
                              <button
                                className="labs-btn-ghost p-1"
                                onClick={() => setDeletingWhiskyId(null)}
                                data-testid={`button-cancel-delete-whisky-${w.id}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              className="labs-btn-ghost p-1"
                              onClick={() => setDeletingWhiskyId(w.id as string)}
                              data-testid={`button-delete-whisky-${w.id}`}
                            >
                              <Trash2 className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {participants && participants.length > 0 && (
        <div className="mb-6 labs-stagger-5">
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--labs-text-muted)", letterSpacing: "0.08em" }}>
            Participants ({participants.length})
          </p>
          <div className="labs-card overflow-hidden">
            {participants.map((p: { id: string; name?: string }, idx: number) => (
              <div
                key={p.id}
                className="flex items-center gap-3 px-4 py-2.5"
                style={{ borderBottom: idx < participants.length - 1 ? "1px solid var(--labs-border)" : "none" }}
                data-testid={`labs-detail-participant-${p.id}`}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold flex-shrink-0"
                  style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                >
                  {stripGuestSuffix((p.name || "?")).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium flex-1 truncate">{stripGuestSuffix(p.name || "Anonymous")}</span>
                {p.id === tasting.hostId && (
                  <Crown className="w-3 h-3 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isHost && <LabsParticipantDownloads tasting={tasting as Tasting} />}

    </div>
  );
}
