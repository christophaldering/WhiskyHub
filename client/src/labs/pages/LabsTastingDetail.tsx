import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft,
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
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi } from "@/lib/api";

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
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may not exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={() => navigate("/labs/tastings")} data-testid="labs-detail-not-found-back">Back to Tastings</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading tasting…</p>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may not exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={() => navigate("/labs/tastings")} data-testid="labs-detail-notfound-back">Back to Tastings</button>
      </div>
    );
  }

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in">
      <button
        onClick={() => navigate("/labs/tastings")}
        className="flex items-center gap-1.5 mb-5 text-sm transition-colors"
        style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        data-testid="labs-detail-back"
      >
        <ArrowLeft className="w-4 h-4" />
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
                {tasting.hostName}
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
                  {(p.name || "?").charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium">{p.name}</span>
                {p.id === tasting.hostId && (
                  <Crown className="w-3 h-3 ml-auto" style={{ color: "var(--labs-accent)" }} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3 labs-stagger-4">
        {(isLive || isDraft || isReveal) && (
          <button
            className="labs-btn-primary w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/labs/live/${tastingId}`)}
            data-testid="labs-detail-join-live"
          >
            <Play className="w-4 h-4" />
            {isLive ? "Join Live Tasting" : isReveal ? "View Reveal" : "Enter Session"}
          </button>
        )}

        {isCompleted && (
          <button
            className="labs-btn-primary w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/labs/results/${tastingId}`)}
            data-testid="labs-detail-view-results"
          >
            <BarChart3 className="w-4 h-4" />
            View Results
          </button>
        )}

        {isHost && (
          <button
            className="labs-btn-secondary w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/labs/host/${tastingId}`)}
            data-testid="labs-detail-manage"
          >
            <Clock className="w-4 h-4" />
            Manage Session
          </button>
        )}
      </div>
    </div>
  );
}
