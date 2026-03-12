import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Wine, ChevronLeft, ChevronRight, Eye, EyeOff, Check, Clock, Users, Calendar, Trophy, AlertTriangle, Volume2, VolumeX } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { playSoundscape, stopSoundscape, setVolume, type Soundscape } from "@/lib/ambient";
import LabsVoiceMemoRecorder, { type LabsVoiceMemoData } from "@/labs/components/LabsVoiceMemoRecorder";
import FlavorTagStrip from "@/labs/components/FlavorTagStrip";
import { getEffectiveProfile } from "@/labs/data/flavor-data";

interface LabsLiveProps {
  params: { id: string };
}

const SOUNDSCAPE_OPTIONS: { id: Soundscape; label: string; icon: string }[] = [
  { id: "fireplace", label: "Fireplace", icon: "\uD83D\uDD25" },
  { id: "rain", label: "Rain", icon: "\uD83C\uDF27" },
  { id: "night", label: "Night", icon: "\uD83C\uDF19" },
  { id: "bagpipe", label: "Bagpipe", icon: "\uD83C\uDFF4\uDB40\uDC67\uDB40\uDC62\uDB40\uDC73\uDB40\uDC63\uDB40\uDC74\uDB40\uDC7F" },
];

function LabsAmbientPanel() {
  const {
    ambientPlaying,
    ambientSoundscape,
    ambientVolume,
    setAmbientPlaying,
    setAmbientSoundscape,
    setAmbientVolume,
  } = useAppStore();
  const [expanded, setExpanded] = useState(false);

  const start = (soundscape: Soundscape, vol: number) => {
    playSoundscape(soundscape);
    setVolume(vol);
    setAmbientPlaying(true);
    setAmbientSoundscape(soundscape);
  };

  const stop = () => {
    stopSoundscape();
    setAmbientPlaying(false);
  };

  const toggle = () => {
    if (ambientPlaying) stop();
    else start(ambientSoundscape, ambientVolume);
  };

  const selectSs = (s: Soundscape) => {
    setAmbientSoundscape(s);
    if (ambientPlaying) {
      playSoundscape(s);
      setVolume(ambientVolume);
    }
  };

  const changeVol = (val: number) => {
    setAmbientVolume(val);
    setVolume(val);
  };

  return (
    <div className="labs-card p-3 mb-4" data-testid="labs-ambient-panel">
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, width: "100%", fontFamily: "inherit" }}
        className="flex items-center justify-between"
        data-testid="button-labs-ambient-toggle"
      >
        <div className="flex items-center gap-2">
          {ambientPlaying ? (
            <Volume2 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          ) : (
            <VolumeX className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
          )}
          <span className="text-xs font-medium" style={{ color: ambientPlaying ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
            Ambient Sounds {ambientPlaying ? "On" : "Off"}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{expanded ? "\u25B2" : "\u25BC"}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="flex gap-2">
            {SOUNDSCAPE_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => selectSs(s.id)}
                className="flex-1 py-2 rounded-lg text-center text-xs transition-all"
                style={{
                  background: ambientSoundscape === s.id ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                  border: ambientSoundscape === s.id ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                  color: ambientSoundscape === s.id ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
                data-testid={`button-labs-soundscape-${s.id}`}
              >
                <span style={{ fontSize: 16 }}>{s.icon}</span>
                <div style={{ fontSize: 10, marginTop: 2 }}>{s.label}</div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={ambientVolume}
              onChange={(e) => changeVol(Number(e.target.value))}
              className="flex-1"
              style={{ accentColor: "var(--labs-accent)" }}
              data-testid="slider-labs-ambient-volume"
            />
          </div>
          <button
            onClick={toggle}
            className={ambientPlaying ? "labs-btn-ghost" : "labs-btn-secondary"}
            style={{ width: "100%", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            data-testid="button-labs-ambient-play"
          >
            {ambientPlaying ? <><VolumeX className="w-3.5 h-3.5" /> Stop</> : <><Volume2 className="w-3.5 h-3.5" /> Play</>}
          </button>
        </div>
      )}
    </div>
  );
}

const DIMENSIONS = ["nose", "taste", "finish", "balance"] as const;
type Dimension = (typeof DIMENSIONS)[number];

function GuidedLobby({ tasting, participantCount }: { tasting: any; participantCount: number }) {
  return (
    <div className="labs-fade-in" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div
        className="labs-card-elevated"
        style={{ padding: "40px 32px", maxWidth: 420, width: "100%", borderRadius: "var(--labs-radius-lg)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "var(--labs-accent-muted)" }}
        >
          <Clock className="w-7 h-7" style={{ color: "var(--labs-accent)" }} />
        </div>

        <h2
          className="labs-serif text-xl font-semibold mb-2"
          style={{ color: "var(--labs-text)" }}
          data-testid="guided-lobby-title"
        >
          {tasting.title}
        </h2>

        {tasting.date && (
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <Calendar className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              {new Date(tasting.date).toLocaleDateString()}
            </span>
          </div>
        )}

        <p
          className="text-base mb-6"
          style={{ color: "var(--labs-text-secondary)" }}
          data-testid="guided-lobby-waiting"
        >
          Waiting for host to start the tasting...
        </p>

        <div
          className="flex items-center justify-center gap-2 py-3 px-5 rounded-full mx-auto"
          style={{ background: "var(--labs-accent-muted)", width: "fit-content" }}
        >
          <Users className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-medium" style={{ color: "var(--labs-accent)" }} data-testid="guided-lobby-count">
            {participantCount} {participantCount === 1 ? "participant" : "participants"} joined
          </span>
        </div>

        <div className="mt-6">
          <div
            className="w-2 h-2 rounded-full mx-auto animate-pulse"
            style={{ background: "var(--labs-accent)" }}
          />
        </div>
      </div>
    </div>
  );
}

function GuidedComplete({ tastingId }: { tastingId: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="labs-fade-in" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      <div
        className="labs-card-elevated"
        style={{ padding: "40px 32px", maxWidth: 420, width: "100%", borderRadius: "var(--labs-radius-lg)" }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
          style={{ background: "var(--labs-success-muted)" }}
        >
          <Trophy className="w-7 h-7" style={{ color: "var(--labs-success)" }} />
        </div>

        <h2
          className="labs-serif text-xl font-semibold mb-3"
          style={{ color: "var(--labs-text)" }}
          data-testid="guided-complete-title"
        >
          Tasting Complete
        </h2>

        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          Thank you for participating! Check out the results below.
        </p>

        <button
          className="labs-btn-primary"
          onClick={() => navigate(`/labs/results/${tastingId}`)}
          data-testid="guided-complete-results"
        >
          <Eye className="w-4 h-4 inline mr-1.5" />
          View Results
        </button>
      </div>
    </div>
  );
}

function GuidedProgressDots({ total, currentIndex }: { total: number; currentIndex: number }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4 labs-fade-in" data-testid="guided-progress-dots">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className="rounded-full transition-all"
          style={{
            width: i === currentIndex ? 20 : 8,
            height: 8,
            background: i < currentIndex
              ? "var(--labs-success)"
              : i === currentIndex
                ? "var(--labs-accent)"
                : "var(--labs-border)",
            borderRadius: 4,
          }}
          data-testid={`guided-dot-${i}`}
        />
      ))}
    </div>
  );
}

function GuidedStepView({
  tasting,
  whisky,
  whiskyIndex,
  totalWhiskies,
  currentParticipant,
  tastingId,
}: {
  tasting: any;
  whisky: any;
  whiskyIndex: number;
  totalWhiskies: number;
  currentParticipant: any;
  tastingId: string;
}) {
  const [activeDim, setActiveDim] = useState<Dimension>("nose");
  const [scores, setScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50, overall: 50 });
  const [notes, setNotes] = useState("");
  const [guidedMemo, setGuidedMemo] = useState<LabsVoiceMemoData | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealStep = tasting.guidedRevealStep ?? 0;
  const isBlindStep = revealStep === 0 && tasting.blindMode;
  const maxScore = tasting.ratingScale || 100;

  const { data: myRating } = useQuery({
    queryKey: ["myRating", currentParticipant?.id, whisky?.id],
    queryFn: () => ratingApi.getMyRating(currentParticipant!.id, whisky!.id),
    enabled: !!currentParticipant && !!whisky,
  });

  useEffect(() => {
    if (myRating) {
      setScores({
        nose: myRating.nose ?? 50,
        taste: myRating.taste ?? 50,
        finish: myRating.finish ?? 50,
        balance: myRating.balance ?? 50,
        overall: myRating.overall ?? 50,
      });
      setNotes(myRating.notes || "");
    } else {
      setScores({ nose: 50, taste: 50, finish: 50, balance: 50, overall: 50 });
      setNotes("");
    }
  }, [myRating, whisky?.id]);

  useEffect(() => {
    setGuidedMemo(null);
  }, [whisky?.id]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const rateMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, whisky?.id] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Save failed";
      setSaveError(msg.includes("locked") || msg.includes("403") ? "Ratings are locked" : msg);
    },
  });

  const tastingStatusRef = useRef(tasting?.status);
  useEffect(() => { tastingStatusRef.current = tasting?.status; }, [tasting?.status]);

  useEffect(() => {
    setSaveError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [whisky?.id]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const debouncedSave = useCallback(
    (newScores: typeof scores, newNotes: string) => {
      if (!currentParticipant || !whisky || !tasting) return;
      if (tasting.status !== "open" && tasting.status !== "draft") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const s = tastingStatusRef.current;
        if (s !== "open" && s !== "draft") return;
        rateMutation.mutate({
          tastingId,
          whiskyId: whisky.id,
          participantId: currentParticipant.id,
          ...newScores,
          notes: newNotes,
        });
      }, 800);
    },
    [currentParticipant, whisky, tasting, tastingId]
  );

  const updateScore = (dimension: keyof typeof scores, value: number) => {
    const newScores = { ...scores, [dimension]: value };
    const avg = Math.round((newScores.nose + newScores.taste + newScores.finish + newScores.balance) / 4);
    newScores.overall = avg;
    setScores(newScores);
    debouncedSave(newScores, notes);
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    debouncedSave(scores, value);
  };

  let displayName: string;
  let displaySub: string;
  let stepBadgeLabel: string;
  let stepBadgeClass: string;

  if (revealStep === 0) {
    stepBadgeLabel = "Rating Open";
    stepBadgeClass = "labs-badge-success";
    displayName = isBlindStep ? `Dram ${String.fromCharCode(65 + whiskyIndex)}` : (whisky?.name || "Unknown");
    displaySub = isBlindStep ? "Blind tasting" : "";
  } else if (revealStep === 1) {
    stepBadgeLabel = "Name Revealed";
    stepBadgeClass = "labs-badge-info";
    displayName = whisky?.name || "Unknown";
    displaySub = "";
  } else if (revealStep === 2) {
    stepBadgeLabel = "Details Revealed";
    stepBadgeClass = "labs-badge-accent";
    displayName = whisky?.name || "Unknown";
    displaySub = [
      whisky?.distillery,
      whisky?.age ? `${whisky.age}y` : null,
      whisky?.region,
    ].filter(Boolean).join(" · ");
  } else {
    stepBadgeLabel = "Fully Revealed";
    stepBadgeClass = "labs-badge-accent";
    displayName = whisky?.name || "Unknown";
    displaySub = [
      whisky?.distillery,
      whisky?.age ? `${whisky.age}y` : null,
      whisky?.region,
      whisky?.abv ? `${whisky.abv}%` : null,
    ].filter(Boolean).join(" · ");
  }

  const canRate = currentParticipant && tasting?.status === "open";

  return (
    <div className="labs-fade-in">
      <div className="labs-card-elevated p-5 mb-5 labs-fade-in labs-stagger-1">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[11px] font-bold tracking-widest uppercase"
            style={{ color: "var(--labs-text-muted)" }}
            data-testid="guided-step-counter"
          >
            Dram {whiskyIndex + 1} of {totalWhiskies}
          </span>
          <span className={`labs-badge ${stepBadgeClass}`} data-testid="guided-step-badge">
            {stepBadgeLabel}
          </span>
        </div>

        <div className="text-center py-3">
          <h2
            className="labs-serif text-lg font-semibold"
            style={{ color: "var(--labs-text)" }}
            data-testid="guided-whisky-name"
          >
            {displayName}
          </h2>
          {displaySub && (
            <p className="text-xs mt-1" style={{ color: "var(--labs-text-muted)" }}>
              {displaySub}
            </p>
          )}
        </div>

        {whisky?.imageUrl && revealStep >= 3 && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ maxHeight: 200 }}>
            <img
              src={whisky.imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              style={{ maxHeight: 200 }}
              data-testid="guided-whisky-image"
            />
          </div>
        )}

        {revealStep >= 3 && (
          <div
            className="flex items-center gap-2 mt-4 py-2 px-3 rounded-lg"
            style={{ background: "var(--labs-accent-muted)" }}
            data-testid="guided-closing-indicator"
          >
            <Clock className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--labs-accent)" }}>
              Rating period closing — finish your scores
            </span>
          </div>
        )}
      </div>

      {canRate ? (
        <>
          <div className="flex gap-2 mb-4 labs-fade-in labs-stagger-2">
            {DIMENSIONS.map((dim) => {
              const isActive = activeDim === dim;
              return (
                <button
                  key={dim}
                  className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
                  style={{
                    background: isActive ? "var(--labs-accent-muted)" : "transparent",
                    color: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)",
                    border: isActive ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                  onClick={() => setActiveDim(dim)}
                  data-testid={`guided-dim-${dim}`}
                >
                  {dim.charAt(0).toUpperCase() + dim.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="labs-card p-5 mb-4 labs-fade-in labs-stagger-3">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium capitalize" style={{ color: "var(--labs-text-secondary)" }}>
                {activeDim}
              </span>
              <span
                className="text-xl font-bold tabular-nums"
                style={{ color: "var(--labs-accent)" }}
                data-testid={`guided-score-${activeDim}`}
              >
                {scores[activeDim]}
              </span>
            </div>

            <div className="relative mb-5">
              <div className="labs-slider-track">
                <div
                  className="labs-slider-fill"
                  style={{ width: `${(scores[activeDim] / maxScore) * 100}%` }}
                />
                <div
                  className="labs-slider-thumb"
                  style={{ left: `${(scores[activeDim] / maxScore) * 100}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={maxScore}
                value={scores[activeDim]}
                onChange={(e) => updateScore(activeDim, Number(e.target.value))}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                style={{ height: 22, top: -8 }}
                data-testid={`guided-slider-${activeDim}`}
              />
            </div>

            <div className="flex justify-between text-[10px] px-0.5" style={{ color: "var(--labs-text-muted)" }}>
              <span>0</span>
              <span>{Math.round(maxScore / 2)}</span>
              <span>{maxScore}</span>
            </div>
          </div>

          <div className="mb-4 labs-fade-in labs-stagger-3">
            <FlavorTagStrip
              notes={notes}
              onNotesChange={updateNotes}
              profileId={getEffectiveProfile(whisky || {}, isBlindStep).profileId}
            />
          </div>

          <div className="labs-card p-5 mb-4 labs-fade-in labs-stagger-3">
            <label
              className="text-xs font-medium mb-2 block"
              style={{ color: "var(--labs-text-muted)", letterSpacing: "0.03em" }}
            >
              Tasting notes
            </label>
            <textarea
              className="labs-input"
              rows={3}
              placeholder={`Your ${activeDim} impressions…`}
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              style={{ resize: "vertical" }}
              data-testid="guided-notes"
            />
            <div className="mt-3">
              <LabsVoiceMemoRecorder
                participantId={currentParticipant?.id || ""}
                memo={guidedMemo}
                onMemoChange={(memoData) => {
                  setGuidedMemo(memoData);
                  if (memoData?.transcript) {
                    const updated = notes ? `${notes}\n${memoData.transcript}` : memoData.transcript;
                    updateNotes(updated);
                  }
                }}
              />
            </div>
          </div>

          <div className="labs-card-elevated p-5 labs-fade-in labs-stagger-4">
            <div className="labs-section-label" style={{ marginBottom: 16 }}>Score Summary</div>
            <div className="space-y-3 mb-4">
              {DIMENSIONS.map((dim) => (
                <div key={dim} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-14 capitalize" style={{ color: "var(--labs-text-muted)" }}>
                    {dim}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--labs-border)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(scores[dim] / maxScore) * 100}%`,
                        background: "var(--labs-accent)",
                      }}
                    />
                  </div>
                  <span
                    className="text-xs font-semibold tabular-nums w-8 text-right"
                    style={{ color: "var(--labs-text-secondary)" }}
                    data-testid={`guided-summary-${dim}`}
                  >
                    {scores[dim]}
                  </span>
                </div>
              ))}
            </div>

            <div className="labs-divider" style={{ margin: "16px 0" }} />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                Overall
              </span>
              <span
                className="text-2xl font-bold tabular-nums"
                style={{ color: "var(--labs-accent)" }}
                data-testid="guided-overall"
              >
                {scores.overall}
              </span>
            </div>

            {saveError && (
              <div
                className="flex items-center gap-1.5 mt-3 text-xs"
                style={{ color: "var(--labs-danger, #ef4444)" }}
                data-testid="guided-save-error"
              >
                <AlertTriangle className="w-3 h-3" />
                {saveError}
              </div>
            )}
            {!saveError && rateMutation.isSuccess && (
              <div
                className="flex items-center gap-1.5 mt-3 text-xs"
                style={{ color: "var(--labs-success)" }}
                data-testid="guided-saved"
              >
                <Check className="w-3 h-3" />
                Saved
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
          {!currentParticipant ? (
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              Sign in to rate whiskies
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              Ratings are currently closed
            </p>
          )}
        </div>
      )}

      <GuidedProgressDots total={totalWhiskies} currentIndex={whiskyIndex} />
    </div>
  );
}

export default function LabsLive({ params }: LabsLiveProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDim, setActiveDim] = useState<Dimension>("nose");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    enabled: !!tastingId && !!tasting?.guidedMode,
    refetchInterval: 5000,
  });

  const currentWhisky = whiskies?.[currentIndex];

  const { data: myRating } = useQuery({
    queryKey: ["myRating", currentParticipant?.id, currentWhisky?.id],
    queryFn: () => ratingApi.getMyRating(currentParticipant!.id, currentWhisky!.id),
    enabled: !!currentParticipant && !!currentWhisky && !tasting?.guidedMode,
  });

  const [scores, setScores] = useState({ nose: 50, taste: 50, finish: 50, balance: 50, overall: 50 });
  const [notes, setNotes] = useState("");
  const [freeformMemo, setFreeformMemo] = useState<LabsVoiceMemoData | null>(null);

  useEffect(() => {
    if (myRating) {
      setScores({
        nose: myRating.nose ?? 50,
        taste: myRating.taste ?? 50,
        finish: myRating.finish ?? 50,
        balance: myRating.balance ?? 50,
        overall: myRating.overall ?? 50,
      });
      setNotes(myRating.notes || "");
    } else {
      setScores({ nose: 50, taste: 50, finish: 50, balance: 50, overall: 50 });
      setNotes("");
    }
  }, [myRating, currentWhisky?.id]);

  useEffect(() => {
    setFreeformMemo(null);
  }, [currentWhisky?.id]);

  const [saveError, setSaveError] = useState<string | null>(null);
  const tastingStatusRef2 = useRef(tasting?.status);
  useEffect(() => { tastingStatusRef2.current = tasting?.status; }, [tasting?.status]);

  useEffect(() => {
    setSaveError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [currentWhisky?.id]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const rateMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, currentWhisky?.id] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Save failed";
      setSaveError(msg.includes("locked") || msg.includes("403") ? "Ratings are locked" : msg);
    },
  });

  const debouncedSave = useCallback(
    (newScores: typeof scores, newNotes: string) => {
      if (!currentParticipant || !currentWhisky || !tasting) return;
      if (tasting.status !== "open" && tasting.status !== "draft") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const s = tastingStatusRef2.current;
        if (s !== "open" && s !== "draft") return;
        rateMutation.mutate({
          tastingId,
          whiskyId: currentWhisky.id,
          participantId: currentParticipant.id,
          ...newScores,
          notes: newNotes,
        });
      }, 800);
    },
    [currentParticipant, currentWhisky, tasting, tastingId]
  );

  const updateScore = (dimension: keyof typeof scores, value: number) => {
    const newScores = { ...scores, [dimension]: value };
    const avg = Math.round((newScores.nose + newScores.taste + newScores.finish + newScores.balance) / 4);
    newScores.overall = avg;
    setScores(newScores);
    debouncedSave(newScores, notes);
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    debouncedSave(scores, value);
  };

  const isBlind = tasting?.blindMode && tasting?.status === "open";
  const maxScore = tasting?.ratingScale || 100;

  const displayName = isBlind
    ? `Dram ${String.fromCharCode(65 + currentIndex)}`
    : currentWhisky?.name || "Unknown";

  const displaySub = isBlind
    ? "Blind tasting"
    : [
        currentWhisky?.distillery,
        currentWhisky?.age ? `${currentWhisky.age}y` : null,
        currentWhisky?.abv ? `${currentWhisky.abv}%` : null,
      ]
        .filter(Boolean)
        .join(" · ");

  const totalWhiskies = whiskies?.length || 0;
  const canRate = currentParticipant && tasting?.status === "open";

  if (tastingError) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may not exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={() => navigate("/labs/tastings")} data-testid="labs-live-not-found-back">Back to Tastings</button>
      </div>
    );
  }

  if (tastingLoading) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin mb-4"
          style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
          Loading session…
        </p>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may not exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={() => navigate("/labs/tastings")} data-testid="labs-live-notfound-back">Back to Tastings</button>
      </div>
    );
  }

  if (tasting.guidedMode) {
    const guidedWhiskyIndex = tasting.guidedWhiskyIndex ?? -1;
    const isSessionComplete = tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal";
    const isLobby = guidedWhiskyIndex === -1 || tasting.status === "draft";
    const guidedWhisky = whiskies?.[guidedWhiskyIndex] ?? null;
    const participantCount = Array.isArray(participants) ? participants.length : 0;

    return (
      <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in">
        <button
          onClick={() => navigate(`/labs/tastings/${tastingId}`)}
          className="flex items-center gap-1.5 mb-5 text-sm transition-colors"
          style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
          data-testid="labs-live-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tasting
        </button>

        <LabsAmbientPanel />

        {isSessionComplete ? (
          <GuidedComplete tastingId={tastingId} />
        ) : isLobby ? (
          <GuidedLobby tasting={tasting} participantCount={participantCount} />
        ) : guidedWhisky && tasting.status === "open" ? (
          <GuidedStepView
            tasting={tasting}
            whisky={guidedWhisky}
            whiskyIndex={guidedWhiskyIndex}
            totalWhiskies={totalWhiskies}
            currentParticipant={currentParticipant}
            tastingId={tastingId}
          />
        ) : (
          <GuidedLobby tasting={tasting} participantCount={participantCount} />
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in">
      <button
        onClick={() => navigate(`/labs/tastings/${tastingId}`)}
        className="flex items-center gap-1.5 mb-5 text-sm transition-colors"
        style={{ color: "var(--labs-text-muted)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
        data-testid="labs-live-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to tasting
      </button>

      <LabsAmbientPanel />

      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <h1
            className="labs-serif text-lg font-semibold"
            style={{ color: "var(--labs-text)" }}
            data-testid="labs-live-title"
          >
            {tasting.title}
          </h1>
          {isBlind && (
            <span className="labs-badge labs-badge-accent" data-testid="labs-live-blind-badge">
              <EyeOff className="w-3 h-3" />
              Blind
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="labs-badge"
            style={{
              background: tasting.status === "open" ? "var(--labs-success-muted)" : "var(--labs-accent-muted)",
              color: tasting.status === "open" ? "var(--labs-success)" : "var(--labs-accent)",
            }}
            data-testid="labs-live-status"
          >
            {tasting.status === "open" ? "● Live" : tasting.status === "draft" ? "Draft" : tasting.status}
          </span>
          {totalWhiskies > 0 && (
            <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
              {totalWhiskies} {totalWhiskies === 1 ? "dram" : "drams"}
            </span>
          )}
        </div>
      </div>

      {!whiskies || totalWhiskies === 0 ? (
        <div className="labs-empty">
          <Wine className="w-12 h-12 mb-3" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
            No whiskies in this session yet
          </p>
        </div>
      ) : (
        <>
          <div className="labs-card-elevated p-5 mb-5 labs-fade-in labs-stagger-1">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
                disabled={currentIndex === 0}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "var(--labs-surface)",
                  color: currentIndex === 0 ? "var(--labs-border)" : "var(--labs-text)",
                  opacity: currentIndex === 0 ? 0.3 : 1,
                  border: "none",
                  cursor: currentIndex === 0 ? "default" : "pointer",
                }}
                data-testid="labs-live-prev"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="text-center flex-1 px-3">
                <p className="text-[11px] mb-1 font-medium" style={{ color: "var(--labs-text-muted)", letterSpacing: "0.05em" }}>
                  {currentIndex + 1} / {totalWhiskies}
                </p>
                <h2
                  className="labs-serif text-base font-semibold"
                  data-testid="labs-live-whisky-name"
                >
                  {displayName}
                </h2>
                {displaySub && (
                  <p className="text-xs mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
                    {displaySub}
                  </p>
                )}
              </div>

              <button
                onClick={() => setCurrentIndex(Math.min(totalWhiskies - 1, currentIndex + 1))}
                disabled={currentIndex >= totalWhiskies - 1}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "var(--labs-surface)",
                  color: currentIndex >= totalWhiskies - 1 ? "var(--labs-border)" : "var(--labs-text)",
                  opacity: currentIndex >= totalWhiskies - 1 ? 0.3 : 1,
                  border: "none",
                  cursor: currentIndex >= totalWhiskies - 1 ? "default" : "pointer",
                }}
                data-testid="labs-live-next"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5">
              {whiskies.map((_: any, i: number) => (
                <button
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === currentIndex ? 18 : 7,
                    height: 7,
                    background: i === currentIndex ? "var(--labs-accent)" : "var(--labs-border)",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 4,
                  }}
                  onClick={() => setCurrentIndex(i)}
                  data-testid={`labs-live-dot-${i}`}
                />
              ))}
            </div>
          </div>

          {canRate ? (
            <>
              <div className="flex gap-2 mb-4 labs-fade-in labs-stagger-2">
                {DIMENSIONS.map((dim) => {
                  const isActive = activeDim === dim;
                  return (
                    <button
                      key={dim}
                      className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-all"
                      style={{
                        background: isActive ? "var(--labs-accent-muted)" : "transparent",
                        color: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)",
                        border: isActive ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                      onClick={() => setActiveDim(dim)}
                      data-testid={`labs-live-dim-${dim}`}
                    >
                      {dim.charAt(0).toUpperCase() + dim.slice(1)}
                    </button>
                  );
                })}
              </div>

              <div className="labs-card p-5 mb-4 labs-fade-in labs-stagger-3">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium capitalize" style={{ color: "var(--labs-text-secondary)" }}>
                    {activeDim}
                  </span>
                  <span
                    className="text-xl font-bold tabular-nums"
                    style={{ color: "var(--labs-accent)" }}
                    data-testid={`labs-live-score-${activeDim}`}
                  >
                    {scores[activeDim]}
                  </span>
                </div>

                <div className="relative mb-5">
                  <div className="labs-slider-track">
                    <div
                      className="labs-slider-fill"
                      style={{ width: `${(scores[activeDim] / maxScore) * 100}%` }}
                    />
                    <div
                      className="labs-slider-thumb"
                      style={{ left: `${(scores[activeDim] / maxScore) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={maxScore}
                    value={scores[activeDim]}
                    onChange={(e) => updateScore(activeDim, Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: 22, top: -8 }}
                    data-testid={`labs-live-slider-${activeDim}`}
                  />
                </div>

                <div className="flex justify-between text-[10px] px-0.5" style={{ color: "var(--labs-text-muted)" }}>
                  <span>0</span>
                  <span>{Math.round(maxScore / 2)}</span>
                  <span>{maxScore}</span>
                </div>
              </div>

              <div className="mb-4 labs-fade-in labs-stagger-3">
                <FlavorTagStrip
                  notes={notes}
                  onNotesChange={updateNotes}
                  profileId={getEffectiveProfile(currentWhisky || {}, !!isBlind).profileId}
                />
              </div>

              <div className="labs-card p-5 mb-4 labs-fade-in labs-stagger-3">
                <label
                  className="text-xs font-medium mb-2 block"
                  style={{ color: "var(--labs-text-muted)", letterSpacing: "0.03em" }}
                >
                  Tasting notes
                </label>
                <textarea
                  className="labs-input"
                  rows={3}
                  placeholder={`Your ${activeDim} impressions…`}
                  value={notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  style={{ resize: "vertical" }}
                  data-testid="labs-live-notes"
                />
                <div className="mt-3">
                  <LabsVoiceMemoRecorder
                    participantId={currentParticipant?.id || ""}
                    memo={freeformMemo}
                    onMemoChange={(memoData) => {
                      setFreeformMemo(memoData);
                      if (memoData?.transcript) {
                        const updated = notes ? `${notes}\n${memoData.transcript}` : memoData.transcript;
                        updateNotes(updated);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="labs-card-elevated p-5 labs-fade-in labs-stagger-4">
                <div className="labs-section-label" style={{ marginBottom: 16 }}>Score Summary</div>
                <div className="space-y-3 mb-4">
                  {DIMENSIONS.map((dim) => (
                    <div key={dim} className="flex items-center gap-3">
                      <span
                        className="text-xs font-medium w-14 capitalize"
                        style={{ color: "var(--labs-text-muted)" }}
                      >
                        {dim}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: "var(--labs-border)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(scores[dim] / maxScore) * 100}%`,
                            background: "var(--labs-accent)",
                          }}
                        />
                      </div>
                      <span
                        className="text-xs font-semibold tabular-nums w-8 text-right"
                        style={{ color: "var(--labs-text-secondary)" }}
                        data-testid={`labs-live-summary-${dim}`}
                      >
                        {scores[dim]}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="labs-divider" style={{ margin: "16px 0" }} />

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                    Overall
                  </span>
                  <span
                    className="text-2xl font-bold tabular-nums"
                    style={{ color: "var(--labs-accent)" }}
                    data-testid="labs-live-overall"
                  >
                    {scores.overall}
                  </span>
                </div>

                {saveError && (
                  <div
                    className="flex items-center gap-1.5 mt-3 text-xs"
                    style={{ color: "var(--labs-danger, #ef4444)" }}
                    data-testid="labs-live-save-error"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    {saveError}
                  </div>
                )}
                {!saveError && rateMutation.isSuccess && (
                  <div
                    className="flex items-center gap-1.5 mt-3 text-xs"
                    style={{ color: "var(--labs-success)" }}
                    data-testid="labs-live-saved"
                  >
                    <Check className="w-3 h-3" />
                    Saved
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
              {!currentParticipant ? (
                <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  Sign in to rate whiskies
                </p>
              ) : tasting.status === "draft" ? (
                <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  This session has not started yet
                </p>
              ) : tasting.status === "archived" ? (
                <div>
                  <p className="text-sm mb-3" style={{ color: "var(--labs-text-muted)" }}>
                    This session has been completed
                  </p>
                  <button
                    className="labs-btn-secondary"
                    onClick={() => navigate(`/labs/results/${tastingId}`)}
                    data-testid="labs-live-view-results"
                  >
                    <Eye className="w-4 h-4 inline mr-1.5" />
                    View Results
                  </button>
                </div>
              ) : (
                <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  Ratings are currently closed
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}