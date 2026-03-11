import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus, X, Trash2, Copy, Check, EyeOff, Eye, Play, Square,
  Users, Calendar, MapPin, ArrowLeft, Loader2,
  Wine, BarChart3,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, blindModeApi, ratingApi } from "@/lib/api";

interface LabsHostProps {
  params?: { id?: string };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "var(--labs-text-muted)", bg: "var(--labs-surface)" },
  open: { label: "Live", color: "var(--labs-success)", bg: "var(--labs-success-muted)" },
  closed: { label: "Closed", color: "var(--labs-accent)", bg: "var(--labs-accent-muted)" },
  reveal: { label: "Reveal", color: "var(--labs-info)", bg: "var(--labs-info-muted)" },
  archived: { label: "Completed", color: "var(--labs-text-muted)", bg: "var(--labs-surface)" },
};

function CreateTastingForm() {
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !currentParticipant) return;
    setSubmitting(true);
    try {
      const result = await tastingApi.create({
        title: title.trim(),
        date,
        location: location.trim() || undefined,
        hostId: currentParticipant.id,
        blindMode,
        status: "draft",
      });
      if (result?.id) {
        navigate(`/labs/host/${result.id}`);
      }
    } catch (err) {
      console.error("Failed to create tasting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentParticipant) {
    return (
      <div className="labs-empty labs-fade-in">
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
          Sign in to host a tasting
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
      <h1
        className="labs-serif text-xl font-semibold mb-2"
        style={{ color: "var(--labs-text)" }}
        data-testid="labs-host-title"
      >
        Host a Tasting
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--labs-text-muted)" }}>
        Create a new tasting session for your group
      </p>

      <div className="space-y-5">
        <div>
          <label className="labs-section-label" htmlFor="tasting-title">Title</label>
          <input
            id="tasting-title"
            className="labs-input"
            placeholder="e.g. Highland Evening, Spring Tasting..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            data-testid="labs-host-input-title"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="labs-section-label" htmlFor="tasting-date">Date</label>
            <input
              id="tasting-date"
              type="date"
              className="labs-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              data-testid="labs-host-input-date"
            />
          </div>
          <div>
            <label className="labs-section-label" htmlFor="tasting-location">Location</label>
            <input
              id="tasting-location"
              className="labs-input"
              placeholder="Optional"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              data-testid="labs-host-input-location"
            />
          </div>
        </div>

        <div
          className="labs-card p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setBlindMode(!blindMode)}
          data-testid="labs-host-toggle-blind"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: blindMode ? "var(--labs-accent-muted)" : "var(--labs-surface)" }}
            >
              <EyeOff className="w-5 h-5" style={{ color: blindMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>Blind Tasting</p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                Hide whisky details until reveal
              </p>
            </div>
          </div>
          <div
            className="w-12 h-7 rounded-full transition-all flex items-center px-0.5"
            style={{
              background: blindMode ? "var(--labs-accent)" : "var(--labs-border)",
              justifyContent: blindMode ? "flex-end" : "flex-start",
            }}
          >
            <div
              className="w-6 h-6 rounded-full transition-all"
              style={{ background: "var(--labs-bg)" }}
            />
          </div>
        </div>

        <button
          className="labs-btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleCreate}
          disabled={!title.trim() || submitting}
          data-testid="labs-host-create-btn"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {submitting ? "Creating..." : "Create Tasting"}
        </button>
      </div>
    </div>
  );
}

function ManageTasting({ tastingId }: { tastingId: string }) {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [codeCopied, setCodeCopied] = useState(false);

  const { data: tasting, isLoading: tastingLoading, isError: tastingError } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: whiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: participants } = useQuery({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const { data: ratings } = useQuery({
    queryKey: ["tasting-ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: 5000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ status, currentAct }: { status: string; currentAct?: string }) =>
      tastingApi.updateStatus(tastingId, status, currentAct, currentParticipant?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    },
  });

  const revealMutation = useMutation({
    mutationFn: () =>
      blindModeApi.revealNext(tastingId, currentParticipant!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    },
  });

  const [newWhiskyName, setNewWhiskyName] = useState("");
  const [showAddWhisky, setShowAddWhisky] = useState(false);

  const addWhiskyMutation = useMutation({
    mutationFn: (data: any) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setNewWhiskyName("");
      setShowAddWhisky(false);
    },
  });

  const deleteWhiskyMutation = useMutation({
    mutationFn: (id: string) => whiskyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
  });

  const copyCode = () => {
    if (tasting?.code) {
      navigator.clipboard.writeText(tasting.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleAddWhisky = () => {
    if (!newWhiskyName.trim()) return;
    addWhiskyMutation.mutate({
      tastingId,
      name: newWhiskyName.trim(),
      sortOrder: (whiskies?.length || 0) + 1,
    });
  };

  if (tastingError) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting doesn't exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={() => navigate("/labs/tastings")} data-testid="labs-host-error-back">
          Back to Tastings
        </button>
      </div>
    );
  }

  if (tastingLoading) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Loading...</p>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Tasting not found</p>
        <button className="labs-btn-ghost mt-4" onClick={() => navigate("/labs/tastings")} data-testid="labs-host-back-to-tastings">
          Back to Tastings
        </button>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[tasting.status] || STATUS_CONFIG.draft;
  const whiskyCount = whiskies?.length || 0;
  const participantCount = participants?.length || 0;
  const ratingCount = ratings?.length || 0;
  const totalExpected = whiskyCount * participantCount;
  const ratingProgress = totalExpected > 0 ? Math.round((ratingCount / totalExpected) * 100) : 0;

  return (
    <div className="px-5 py-6 max-w-3xl mx-auto labs-fade-in">
      <button
        onClick={() => navigate("/labs/tastings")}
        className="flex items-center gap-1.5 mb-4 text-sm labs-btn-ghost px-0"
        data-testid="labs-host-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="labs-serif text-xl font-semibold mb-1"
            data-testid="labs-host-tasting-title"
          >
            {tasting.title}
          </h1>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--labs-text-muted)" }}>
            {tasting.date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {tasting.date}
              </span>
            )}
            {tasting.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {tasting.location}
              </span>
            )}
          </div>
        </div>
        <span
          className="labs-badge"
          style={{ background: statusCfg.bg, color: statusCfg.color }}
          data-testid="labs-host-status"
        >
          {statusCfg.label}
        </span>
      </div>

      {tasting.code && (
        <div className="labs-card p-4 mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--labs-text-muted)" }}>Join Code</p>
            <p
              className="text-2xl font-bold tracking-widest"
              style={{ color: "var(--labs-accent)", fontFamily: "monospace" }}
              data-testid="labs-host-code"
            >
              {tasting.code}
            </p>
          </div>
          <button
            className="labs-btn-ghost flex items-center gap-1.5"
            onClick={copyCode}
            data-testid="labs-host-copy-code"
          >
            {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {codeCopied ? "Copied" : "Copy"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="labs-card p-4 text-center">
          <Wine className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" data-testid="labs-host-whisky-count">{whiskyCount}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Whiskies</p>
        </div>
        <div className="labs-card p-4 text-center">
          <Users className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" data-testid="labs-host-participant-count">{participantCount}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Participants</p>
        </div>
        <div className="labs-card p-4 text-center">
          <BarChart3 className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
          <p className="text-lg font-bold" data-testid="labs-host-rating-progress">{ratingProgress}%</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>Rated</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="labs-section-label mb-0">Session Control</h2>
        </div>
        <div className="labs-card p-4">
          <div className="flex flex-wrap gap-2">
            {tasting.status === "draft" && (
              <button
                className="labs-btn-primary flex items-center gap-2"
                onClick={() => statusMutation.mutate({ status: "open" })}
                disabled={statusMutation.isPending}
                data-testid="labs-host-start"
              >
                <Play className="w-4 h-4" />
                Start Session
              </button>
            )}
            {tasting.status === "open" && (
              <>
                <button
                  className="labs-btn-secondary flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "closed" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-close"
                >
                  <Square className="w-4 h-4" />
                  Close Ratings
                </button>
                {tasting.blindMode && (
                  <button
                    className="labs-btn-secondary flex items-center gap-2"
                    onClick={() => statusMutation.mutate({ status: "reveal" })}
                    disabled={statusMutation.isPending}
                    data-testid="labs-host-reveal-mode"
                  >
                    <Eye className="w-4 h-4" />
                    Enter Reveal
                  </button>
                )}
              </>
            )}
            {tasting.status === "closed" && (
              <>
                <button
                  className="labs-btn-primary flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "open" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-reopen"
                >
                  <Play className="w-4 h-4" />
                  Reopen
                </button>
                {tasting.blindMode && (
                  <button
                    className="labs-btn-secondary flex items-center gap-2"
                    onClick={() => statusMutation.mutate({ status: "reveal" })}
                    disabled={statusMutation.isPending}
                    data-testid="labs-host-enter-reveal"
                  >
                    <Eye className="w-4 h-4" />
                    Enter Reveal
                  </button>
                )}
                <button
                  className="labs-btn-ghost flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "archived" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-archive"
                >
                  Archive
                </button>
              </>
            )}
            {tasting.status === "reveal" && (
              <>
                <button
                  className="labs-btn-primary flex items-center gap-2"
                  onClick={() => revealMutation.mutate()}
                  disabled={revealMutation.isPending}
                  data-testid="labs-host-reveal-next"
                >
                  <Eye className="w-4 h-4" />
                  Reveal Next
                </button>
                <button
                  className="labs-btn-ghost flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "archived" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-archive-reveal"
                >
                  Complete & Archive
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="labs-section-label mb-0">Whiskies ({whiskyCount})</h2>
          {tasting.status === "draft" && (
            <button
              className="labs-btn-ghost flex items-center gap-1 text-xs"
              onClick={() => setShowAddWhisky(!showAddWhisky)}
              data-testid="labs-host-add-whisky-toggle"
            >
              {showAddWhisky ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {showAddWhisky ? "Cancel" : "Add"}
            </button>
          )}
        </div>

        {showAddWhisky && tasting.status === "draft" && (
          <div className="labs-card p-4 mb-3 flex gap-2">
            <input
              className="labs-input flex-1"
              placeholder="Whisky name..."
              value={newWhiskyName}
              onChange={(e) => setNewWhiskyName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddWhisky()}
              data-testid="labs-host-whisky-name-input"
            />
            <button
              className="labs-btn-primary px-4"
              onClick={handleAddWhisky}
              disabled={!newWhiskyName.trim() || addWhiskyMutation.isPending}
              data-testid="labs-host-whisky-add-btn"
            >
              {addWhiskyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
            </button>
          </div>
        )}

        {whiskyCount === 0 ? (
          <div className="labs-card p-6 text-center">
            <Wine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              No whiskies added yet
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {whiskies?.map((w: any, i: number) => {
              const whiskyRatings = ratings?.filter((r: any) => r.whiskyId === w.id) || [];
              const avgScore = whiskyRatings.length > 0
                ? Math.round(whiskyRatings.reduce((sum: number, r: any) => sum + (r.overall || 0), 0) / whiskyRatings.length)
                : null;

              return (
                <div
                  key={w.id}
                  className="labs-card p-4 flex items-center gap-3"
                  data-testid={`labs-host-whisky-${w.id}`}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{w.name || `Whisky ${i + 1}`}</p>
                    <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null]
                        .filter(Boolean)
                        .join(" · ") || "No details"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {whiskyRatings.length}/{participantCount} rated
                    </span>
                    {avgScore !== null && (
                      <span
                        className="text-sm font-bold"
                        style={{ color: "var(--labs-accent)" }}
                      >
                        {avgScore}
                      </span>
                    )}
                    {tasting.status === "draft" && (
                      <button
                        className="labs-btn-ghost p-1"
                        onClick={() => deleteWhiskyMutation.mutate(w.id)}
                        data-testid={`labs-host-delete-whisky-${w.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {participantCount > 0 && (
        <div className="mb-6">
          <h2 className="labs-section-label">Participants ({participantCount})</h2>
          <div className="labs-card divide-y" style={{ borderColor: "var(--labs-border-subtle)" }}>
            {participants?.map((p: any) => {
              const pRatings = ratings?.filter((r: any) => r.participantId === p.id) || [];
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-4"
                  data-testid={`labs-host-participant-${p.id}`}
                >
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                    style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                  >
                    {(p.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name || "Anonymous"}</p>
                  </div>
                  <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    {pRatings.length}/{whiskyCount} rated
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          className="labs-btn-secondary flex items-center gap-2 flex-1"
          onClick={() => navigate(`/labs/results/${tastingId}`)}
          data-testid="labs-host-view-results"
        >
          <BarChart3 className="w-4 h-4" />
          View Results
        </button>
        <button
          className="labs-btn-secondary flex items-center gap-2 flex-1"
          onClick={() => navigate(`/labs/live/${tastingId}`)}
          data-testid="labs-host-join-live"
        >
          <Play className="w-4 h-4" />
          Join as Participant
        </button>
      </div>
    </div>
  );
}

export default function LabsHost({ params }: LabsHostProps) {
  const tastingId = params?.id;

  if (tastingId) {
    return <ManageTasting tastingId={tastingId} />;
  }

  return <CreateTastingForm />;
}
