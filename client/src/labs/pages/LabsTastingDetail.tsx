import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { SkeletonList, SkeletonLine } from "@/labs/components/LabsSkeleton";
import {
  ChevronLeft,
  Calendar,
  MapPin,
  Users,
  Clock,
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
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, inviteApi, friendsApi } from "@/lib/api";
import { stripGuestSuffix } from "@/lib/utils";
import QRCode from "qrcode";

interface LabsTastingDetailProps {
  params: { id: string };
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "labs-badge-info" },
  open: { label: "Live", className: "labs-badge-success" },
  closed: { label: "Closed", className: "labs-badge-accent" },
  reveal: { label: "Reveal", className: "labs-badge-accent" },
  archived: { label: "Completed", className: "labs-badge-info" },
};

export default function LabsTastingDetail({ params }: LabsTastingDetailProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const [showQr, setShowQr] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmails, setInviteEmails] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [inviteResults, setInviteResults] = useState<any[] | null>(null);

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
    onSuccess: (data: any) => {
      const mapped = (data.invites || []).map((inv: any) => ({
        email: inv.email,
        status: inv.emailSent ? "sent" : "link-only",
        link: inv.link,
      }));
      setInviteResults(mapped);
      setInviteEmails("");
      setInviteNote("");
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

  const isHost = currentParticipant && tasting?.hostId === currentParticipant.id;
  const isLive = tasting?.status === "open";
  const isCompleted = tasting?.status === "archived";
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

      <div className="mb-6">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h1
            className="labs-serif text-xl font-semibold"
            style={{ color: "var(--labs-text)" }}
            data-testid="labs-detail-title"
          >
            {tasting.title}
          </h1>
          <span className={`labs-badge ${status.className} flex-shrink-0`} data-testid="labs-detail-status">
            {status.label}
          </span>
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
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6 labs-stagger-1">
        <div className="labs-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>Whiskies</span>
          </div>
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }} data-testid="labs-detail-whisky-count">
            {whiskies?.length ?? 0}
          </p>
        </div>
        <div className="labs-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>Participants</span>
          </div>
          <p className="text-lg font-bold" style={{ color: "var(--labs-text)" }} data-testid="labs-detail-participant-count">
            {participants?.length ?? 0}
          </p>
        </div>
      </div>

      <div className="labs-card p-4 mb-6 labs-stagger-2">
        <div className="labs-section-label">Details</div>
        <div className="space-y-3">
          {tasting.hostName && (
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Host</span>
              <span className="text-sm font-medium flex items-center gap-1.5" data-testid="labs-detail-host">
                <Crown className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                {stripGuestSuffix(tasting.hostName)}
              </span>
            </div>
          )}
          <div className="labs-divider" />
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
          {isHost && (
            <>
              <div className="labs-divider" />
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Your Role</span>
                <span className="text-sm font-medium flex items-center gap-1.5" style={{ color: "var(--labs-accent)" }}>
                  <Crown className="w-3.5 h-3.5" /> Host
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {participants && participants.length > 0 && (
        <div className="labs-card p-4 mb-6 labs-stagger-3">
          <div className="labs-section-label">Participants</div>
          <div className="space-y-2">
            {participants.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3" data-testid={`labs-detail-participant-${p.id}`}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                >
                  {stripGuestSuffix((p.name || "?") as string).charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{stripGuestSuffix((p.name || "Anonymous") as string)}</span>
                {p.id === tasting.hostId && (
                  <Crown className="w-3 h-3 ml-auto" style={{ color: "var(--labs-accent)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {tasting.code && (
        <div className="labs-card p-4 mb-6 labs-stagger-4" data-testid="labs-detail-code-section">
          <div className="labs-section-label">Join Code & QR</div>
          <div className="flex items-center justify-center gap-3 mb-3">
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
              style={{ padding: "4px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 4 }}
              data-testid="button-labs-copy-code"
            >
              {codeCopied ? <Check className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} /> : <Copy className="w-3.5 h-3.5" />}
              {codeCopied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setShowQr(!showQr)}
              className="labs-btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
              data-testid="button-labs-toggle-qr"
            >
              <QrCode className="w-4 h-4" />
              {showQr ? "Hide QR" : "Show QR Code"}
            </button>
            <button
              onClick={handleCopyLink}
              className="labs-btn-ghost"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
              data-testid="button-labs-copy-join-link"
            >
              {linkCopied ? <Check className="w-3.5 h-3.5" style={{ color: "var(--labs-success)" }} /> : <Copy className="w-3.5 h-3.5" />}
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
      )}

      {isHost && (
        <div className="labs-card p-4 mb-6 labs-stagger-4" data-testid="labs-detail-invite-section">
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
            <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{showInvite ? "\u25B2" : "\u25BC"}</span>
          </button>
          {showInvite && (
            <div className="mt-4 space-y-3">
              {!inviteResults ? (
                <>
                  <div>
                    <label className="labs-section-label" style={{ marginBottom: 6, display: "block" }}>Email addresses (one per line)</label>
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
                    <label className="labs-section-label" style={{ marginBottom: 6, display: "block" }}>Personal note (optional)</label>
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
                  {inviteResults.map((r: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5" style={{ borderBottom: i < inviteResults.length - 1 ? "1px solid var(--labs-border)" : "none" }}>
                      <span className="text-sm truncate" style={{ color: "var(--labs-text-secondary)" }}>{r.email}</span>
                      <span
                        className="labs-badge text-[10px]"
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
      )}

      <div className="space-y-3 labs-stagger-5">
        {(isLive || isDraft || isReveal) && (
          <button
            className="labs-btn-primary w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/labs/live/${tastingId}`)}
            data-testid="labs-detail-join-live"
          >
            <Play className="w-4 h-4" />
            {isLive ? "Enter Live Session" : isReveal ? "View Reveal" : "Enter Session"}
          </button>
        )}

        {isCompleted && (
          <>
            <button
              className="labs-btn-primary w-full flex items-center justify-center gap-2"
              onClick={() => navigate(`/labs/results/${tastingId}`)}
              data-testid="labs-detail-view-results"
            >
              <BarChart3 className="w-4 h-4" />
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
          </>
        )}

        {isHost && (
          <>
            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={() => navigate(`/labs/host/${tastingId}`)}
              data-testid="labs-detail-manage"
            >
              <Clock className="w-4 h-4" />
              Manage Session
            </button>
            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={async () => {
                setDuplicating(true);
                try {
                  const pid = currentParticipant?.id;
                  if (!pid) return;
                  const newTasting = await tastingApi.duplicate(tastingId, pid);
                  if (newTasting?.id) navigate(`/labs/tastings/${newTasting.id}`);
                } catch {}
                setDuplicating(false);
              }}
              disabled={duplicating}
              data-testid="labs-detail-duplicate"
            >
              <Copy className="w-4 h-4" />
              {duplicating ? "Kopiere..." : "Tasting kopieren"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
