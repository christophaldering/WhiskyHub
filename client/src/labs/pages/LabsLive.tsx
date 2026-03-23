import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useLabsBack } from "@/labs/LabsLayout";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { Wine, ChevronLeft, ChevronRight, Eye, EyeOff, Check, Clock, Trophy, AlertTriangle, BarChart3, ChevronDown, Monitor, Sparkles, Settings } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import LabsVoiceMemoRecorder, { type LabsVoiceMemoData } from "@/labs/components/LabsVoiceMemoRecorder";
import { InlineFlavorTags, parseTagsFromNotes, replaceTagsInNotes } from "@/labs/components/FlavorTagStrip";
import { getEffectiveProfile } from "@/labs/data/flavor-data";
import FlavourStudioSheet from "@/labs/components/FlavourStudioSheet";
import { type DimKey } from "@/labs/components/LabsRatingPanel";
import { useRatingScale } from "@/labs/hooks/useRatingScale";
import { CompactDownloadButton } from "@/components/ParticipantDownloads";
import LabsRevealMoment from "@/labs/pages/LabsRevealMoment";
import { useTastingEvents } from "@/labs/hooks/useTastingEvents";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import type { RatingData } from "@/labs/components/rating/types";
import DramCarousel from "@/labs/components/DramCarousel";
import { ResumeOrSkipBanner } from "@/labs/components/ResumeRatingBanner";
import ScaleBadge from "@/labs/components/ScaleBadge";
import type { Tasting } from "@shared/schema";

const VOICE_MEMOS_ENABLED = false;

interface LabsLiveProps {
  params: { id: string };
}

const DIMENSIONS = ["nose", "taste", "finish"] as const;
type Dimension = (typeof DIMENSIONS)[number];

function GuidedLobby({ tasting, participantCount }: { tasting: any; participantCount: number }) {
  return (
    <div className="labs-lobby labs-fade-in" data-testid="guided-lobby">
      <p className="labs-lobby-eyebrow" data-testid="guided-lobby-title">{tasting.title}</p>
      <div className="labs-pulse-dot" />
      <h1 className="labs-lobby-title">
        {tasting.isBlind ? 'Blind Tasting' : 'Tasting'}<br />
        <em>beginnt gleich</em>
      </h1>
      <div className="labs-lobby-divider" />
      <p className="labs-lobby-meta" data-testid="guided-lobby-waiting">
        {tasting.whiskies?.length ?? '?'} Drams · {participantCount} {participantCount === 1 ? 'Taster' : 'Taster'}
        {tasting.location ? ` · ${tasting.location}` : ''}
      </p>
      <p className="labs-lobby-hint" data-testid="guided-lobby-count">Warte ruhig. Der Host beginnt.</p>
    </div>
  );
}

function PresentationLiveBanner({ tastingId }: { tastingId: string }) {
  const [, navigate] = useLocation();
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 12,
        background: "rgba(212, 162, 86, 0.12)", border: "1px solid rgba(212, 162, 86, 0.25)",
        marginBottom: 16, cursor: "pointer",
      }}
      onClick={() => navigate(`/labs/results/${tastingId}`)}
      data-testid="live-presentation-banner"
    >
      <div style={{ width: 10, height: 10, borderRadius: 5, background: "var(--labs-accent)", animation: "pulse 2s infinite" }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>Presentation is live</span>
        <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>Tap to watch the results presentation</p>
      </div>
      <Monitor style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
    </div>
  );
}

function GuidedComplete({ tastingId, presentationActive }: { tastingId: string; presentationActive?: boolean }) {
  const [, navigate] = useLocation();
  return (
    <div className="labs-fade-in" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", textAlign: "center" }}>
      {presentationActive && <PresentationLiveBanner tastingId={tastingId} />}
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
          className="labs-h2 mb-3"
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


function GuidedStepView({
  tasting,
  whisky,
  whiskyIndex,
  totalWhiskies,
  currentParticipant,
  tastingId,
  allWhiskies,
}: {
  tasting: any;
  whisky: any;
  whiskyIndex: number;
  totalWhiskies: number;
  currentParticipant: any;
  tastingId: string;
  allWhiskies: any[];
}) {
  const { t } = useTranslation();
  const [localIndex, setLocalIndex] = useState(whiskyIndex);
  const pendingIndexRef = useRef<number | null>(null);
  const revealMomentActiveRef = useRef(false);
  const [interruptBanner, setInterruptBanner] = useState<{ fromIndex: number; toIndex: number } | null>(null);
  const [flowSaved, setFlowSaved] = useState(false);
  const [dramTransitionKey, setDramTransitionKey] = useState(0);
  const prevWhiskyIndexRef = useRef(whiskyIndex);

  useEffect(() => {
    if (whiskyIndex !== prevWhiskyIndexRef.current) {
      const prevIdx = prevWhiskyIndexRef.current;
      prevWhiskyIndexRef.current = whiskyIndex;

      if (revealMomentActiveRef.current) {
        pendingIndexRef.current = whiskyIndex;
        return;
      }

      const myRatingForCurrent = guidedMyRatings.find(
        (r: any) => r.whiskyId === allWhiskies[prevIdx]?.id
      );

      if (!myRatingForCurrent && !flowSaved && localIndex === prevIdx) {
        setInterruptBanner({ fromIndex: prevIdx, toIndex: whiskyIndex });
      } else {
        setLocalIndex(whiskyIndex);
        setFlowSaved(false);
        setDramTransitionKey(k => k + 1);
      }
    }
  }, [whiskyIndex]);

  const hostMaxIndex = whiskyIndex;
  const activeWhisky = allWhiskies[localIndex] ?? whisky;
  const viewingHostDram = localIndex === whiskyIndex;

  const revealStep = viewingHostDram
    ? (tasting.guidedRevealStep ?? 0)
    : (localIndex < whiskyIndex ? 999 : 0);
  const liveScale = useRatingScale(tasting.ratingScale);
  const maxScore = liveScale.max;

  const REVEAL_DEFAULT_ORDER: string[][] = [
    ["name"],
    ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
    ["image"],
  ];
  let stepGroups = REVEAL_DEFAULT_ORDER;
  try {
    if (tasting.revealOrder) {
      const parsed = JSON.parse(tasting.revealOrder);
      if (Array.isArray(parsed) && parsed.length > 0) stepGroups = parsed;
    }
  } catch {}

  const revealedFields = new Set<string>();
  for (let s = 0; s < revealStep && s < stepGroups.length; s++) {
    for (const f of stepGroups[s]) revealedFields.add(f);
  }
  const isFullyRevealed = revealStep >= stepGroups.length;
  const isNameRevealed = revealedFields.has("name") || isFullyRevealed;
  const isBlindStep = tasting.blindMode && !isNameRevealed;

  const [revealMoment, setRevealMoment] = useState<{
    whiskyName: string; distillery?: string; age?: string; region?: string; imageUrl?: string; stepLabel?: string;
    caskInfluence?: string; abv?: string; category?: string; bottler?: string; vintage?: string; peatLevel?: string; country?: string; ppm?: string; price?: string;
  } | null>(null);
  const prevRevealRef = useRef<string>("");

  useEffect(() => {
    const key = `${tasting.guidedWhiskyIndex ?? 0}-${tasting.guidedRevealStep ?? 0}`;
    if (prevRevealRef.current && prevRevealRef.current !== key && tasting.blindMode) {
      const step = tasting.guidedRevealStep ?? 0;
      if (step > 0 && activeWhisky) {
        const dramLabel = isNameRevealed
          ? (activeWhisky.name || `Dram ${(tasting.guidedWhiskyIndex ?? 0) + 1}`)
          : `Dram ${String.fromCharCode(65 + (tasting.guidedWhiskyIndex ?? 0))}`;
        revealMomentActiveRef.current = true;
        setRevealMoment({
          whiskyName: dramLabel,
          distillery: isNameRevealed ? activeWhisky.distillery : undefined,
          age: revealedFields.has("age") && activeWhisky.age ? `${activeWhisky.age} years` : undefined,
          region: revealedFields.has("region") ? activeWhisky.region : undefined,
          imageUrl: (revealedFields.has("image") || isFullyRevealed) ? activeWhisky.imageUrl : undefined,
          stepLabel: isFullyRevealed ? "Fully Revealed" : `Step ${step}`,
          caskInfluence: revealedFields.has("caskInfluence") ? activeWhisky.caskInfluence : undefined,
          abv: revealedFields.has("abv") && activeWhisky.abv ? `${activeWhisky.abv}%` : undefined,
          category: revealedFields.has("category") ? activeWhisky.category : undefined,
          bottler: revealedFields.has("bottler") ? activeWhisky.bottler : undefined,
          vintage: revealedFields.has("vintage") && activeWhisky.vintage ? `${activeWhisky.vintage}` : undefined,
          peatLevel: revealedFields.has("peatLevel") ? activeWhisky.peatLevel : undefined,
          country: revealedFields.has("country") ? activeWhisky.country : undefined,
          ppm: revealedFields.has("ppm") && activeWhisky.ppm ? `${activeWhisky.ppm} ppm` : undefined,
          price: revealedFields.has("price") && activeWhisky.price ? Number(activeWhisky.price).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €" : undefined,
        });
      }
    }
    prevRevealRef.current = key;
  }, [tasting.guidedWhiskyIndex, tasting.guidedRevealStep, tasting.blindMode, isNameRevealed, isFullyRevealed, activeWhisky, revealedFields]);

  const { data: guidedAllRatings } = useQuery({
    queryKey: ["tasting-ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId && !!currentParticipant,
    refetchInterval: 10000,
  });

  const guidedMyRatings = (guidedAllRatings || []).filter(
    (r: any) => r.participantId === currentParticipant?.id
  );

  const { data: myRating } = useQuery({
    queryKey: ["myRating", currentParticipant?.id, activeWhisky?.id],
    queryFn: () => ratingApi.getMyRating(currentParticipant!.id, activeWhisky!.id),
    enabled: !!currentParticipant && !!activeWhisky,
  });

  useEffect(() => {
    if (myRating) {
      setFlowSaved(true);
    } else {
      setFlowSaved(false);
    }
  }, [myRating, activeWhisky?.id]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const rateMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, activeWhisky?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] });
    },
    onError: (err: any) => {
      const msg = err?.message || "Save failed";
      setSaveError(msg.includes("locked") || msg.includes("403") ? "Ratings are locked" : msg);
    },
  });

  useEffect(() => {
    setSaveError(null);
  }, [activeWhisky?.id]);

  const getDramName = useCallback((idx: number) => {
    const w = allWhiskies[idx];
    if (!w) return `Dram ${idx + 1}`;
    if (tasting.blindMode) {
      const guidedIdx = tasting.guidedWhiskyIndex ?? -1;
      const guidedStep = tasting.guidedRevealStep ?? 0;
      if (idx > guidedIdx) return t("m2.taste.rating.sampleX", { n: idx + 1, defaultValue: `Sample ${idx + 1}` });
      const revealed = new Set<string>();
      const stepsForIdx = idx < guidedIdx ? stepGroups.length : guidedStep;
      for (let s = 0; s < stepsForIdx && s < stepGroups.length; s++) {
        for (const f of stepGroups[s]) revealed.add(f);
      }
      if (!revealed.has("name")) return t("m2.taste.rating.sampleX", { n: idx + 1, defaultValue: `Sample ${idx + 1}` });
    }
    return w.name || `Dram ${idx + 1}`;
  }, [allWhiskies, tasting.blindMode, tasting.guidedWhiskyIndex, tasting.guidedRevealStep, stepGroups, t]);

  const dramChips: import("@/labs/components/DramCarousel").DramChip[] = allWhiskies.map((w: any, idx: number) => {
    const rating = guidedMyRatings.find((r: any) => r.whiskyId === w.id);
    const isDone = rating != null;
    const isLocked = idx > hostMaxIndex;
    let status: "done" | "active" | "idle" | "locked";
    if (isLocked) status = "locked";
    else if (idx === localIndex) status = "active";
    else if (isDone) status = "done";
    else status = "idle";
    return {
      index: idx,
      name: getDramName(idx),
      score: isDone ? rating.overall : null,
      status,
    };
  });

  const displayName = isBlindStep
    ? t("m2.taste.rating.sampleX", { n: localIndex + 1, defaultValue: `Sample ${localIndex + 1}` })
    : (activeWhisky?.name || "Unknown");

  const canRate = currentParticipant && tasting?.status === "open";
  const nextDramIdx = whiskyIndex + 1;

  return (
    <div className="labs-fade-in">
      {revealMoment && (
        <LabsRevealMoment
          {...revealMoment}
          onDismiss={() => {
            revealMomentActiveRef.current = false;
            setRevealMoment(null);
            if (pendingIndexRef.current !== null) {
              setLocalIndex(pendingIndexRef.current);
              pendingIndexRef.current = null;
              setFlowSaved(false);
            }
          }}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          marginBottom: 8,
        }}
        data-testid="guided-context-bar"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: "var(--labs-text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
            data-testid="guided-step-counter"
          >
            {t("m2.taste.rating.dramXofN", { x: localIndex + 1, n: totalWhiskies, defaultValue: `Dram ${localIndex + 1} of ${totalWhiskies}` })}
          </span>
          <ScaleBadge max={maxScore} size="sm" />
          {tasting.blindMode && (
            <span
              className="labs-badge labs-badge-accent"
              style={{ fontSize: 10, padding: "2px 8px" }}
              data-testid="guided-blind-badge"
            >
              <EyeOff style={{ width: 10, height: 10, marginRight: 3, display: "inline" }} />
              {t("m2.taste.rating.blind", "Blind")}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 11,
            color: "var(--labs-text-muted)",
            maxWidth: 140,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {tasting.title}
        </span>
      </div>

      <DramCarousel
        chips={dramChips}
        activeIndex={localIndex}
        onChipTap={(idx) => {
          if (idx <= hostMaxIndex) {
            const rating = guidedMyRatings.find((r: any) => r.whiskyId === allWhiskies[idx]?.id);
            setLocalIndex(idx);
            setFlowSaved(false);
            setDramTransitionKey(k => k + 1);
          }
        }}
        scaleMax={maxScore}
        isBlind={isBlindStep}
      />

      {interruptBanner && (
        <ResumeOrSkipBanner
          title={t("m2.taste.rating.interruptTitle", "Incomplete rating")}
          hint={t("m2.taste.rating.interruptAdvanced", "Host moved to the next dram")}
          saveLabel={t("m2.taste.rating.interruptContinue", "Continue")}
          skipLabel={t("m2.taste.rating.interruptSkip", "Skip")}
          onSave={() => {
            setInterruptBanner(null);
            setLocalIndex(interruptBanner.toIndex);
            setFlowSaved(false);
            setDramTransitionKey(k => k + 1);
          }}
          onSkip={() => {
            setInterruptBanner(null);
            setLocalIndex(interruptBanner.toIndex);
            setFlowSaved(false);
            setDramTransitionKey(k => k + 1);
          }}
        />
      )}

      {canRate && !revealMoment ? (
        <div key={`flow-${localIndex}-${dramTransitionKey}`} style={{ animation: "labsPopIn 300ms ease both" }}>
          <RatingFlowV2
            whisky={{
              name: displayName,
              region: activeWhisky?.region || undefined,
              cask: activeWhisky?.caskInfluence || undefined,
              blind: isBlindStep,
            }}
            initialData={myRating ? (() => {
              const rawNotes = myRating.notes || "";
              const flavourMatch = rawNotes.match(/\[FLAVOURS\]\s*([\s\S]*?)\s*\[\/FLAVOURS\]/);
              const chips = flavourMatch ? flavourMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean) : [];
              const cleanNotes = flavourMatch ? rawNotes.replace(/\n?\[FLAVOURS\][\s\S]*?\[\/FLAVOURS\]/, "").trim() : rawNotes;
              return {
                scores: {
                  nose: myRating.nose ?? 75,
                  palate: myRating.taste ?? 75,
                  finish: myRating.finish ?? 75,
                  overall: myRating.overall ?? 75,
                },
                tags: { nose: chips, palate: [], finish: [], overall: [] },
                notes: { nose: cleanNotes, palate: "", finish: "", overall: "" },
              };
            })() : undefined}
            onDone={async (data: RatingData) => {
              if (!currentParticipant || !activeWhisky) return;
              const computeOv = (s: { nose: number; palate: number; finish: number }) =>
                Math.round((s.nose + s.palate + s.finish) / 3);
              const eff = data.scores.overall > 0
                ? data.scores.overall
                : Math.max(1, computeOv(data.scores));

              const allNotes = (["nose", "palate", "finish", "overall"] as const)
                .map((p) => data.notes[p]?.trim())
                .filter(Boolean)
                .join(" | ");
              const chipStr = [...data.tags.nose, ...data.tags.palate, ...data.tags.finish, ...data.tags.overall]
                .filter(Boolean);
              let combined = allNotes;
              if (chipStr.length > 0) {
                combined = combined
                  ? `${combined}\n[FLAVOURS] ${chipStr.join(", ")} [/FLAVOURS]`
                  : `[FLAVOURS] ${chipStr.join(", ")} [/FLAVOURS]`;
              }

              try {
                await rateMutation.mutateAsync({
                  tastingId,
                  whiskyId: activeWhisky.id,
                  participantId: currentParticipant.id,
                  nose: data.scores.nose,
                  taste: data.scores.palate,
                  finish: data.scores.finish,
                  overall: eff,
                  notes: combined,
                });
                setFlowSaved(true);
              } catch (err: any) {
                setSaveError(err?.message || "Save failed");
              }
            }}
            onBack={() => {
              setFlowSaved(false);
              setDramTransitionKey(k => k + 1);
            }}
          />

          {flowSaved && viewingHostDram && (
            <div
              className="labs-card p-4 text-center mt-4"
              style={{ background: "var(--labs-success-muted)", border: "1px solid var(--labs-success)", borderRadius: "var(--labs-radius-sm)" }}
              data-testid="guided-waiting-host"
            >
              <p className="text-sm font-medium" style={{ color: "var(--labs-success)" }}>
                <Check className="w-4 h-4 inline mr-1.5" />
                {t("m2.taste.rating.waitingHost", { n: nextDramIdx + 1, defaultValue: `Saved -- waiting for host for Dram ${nextDramIdx + 1}` })}
              </p>
            </div>
          )}

          {saveError && (
            <div
              className="flex items-center gap-1.5 mb-3 text-xs"
              style={{ color: "var(--labs-danger, #ef4444)" }}
              data-testid="guided-save-error"
            >
              <AlertTriangle className="w-3 h-3" />
              {saveError}
            </div>
          )}
        </div>
      ) : (
        <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
          {!currentParticipant ? (
            <AuthGateMessage
              message={t("m2.taste.rating.signInToRate", "Sign in to rate whiskies")}
              compact
            />
          ) : (
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              {t("m2.taste.rating.ratingsClosed", "Ratings are currently closed")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function LabsLive({ params }: LabsLiveProps) {
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack(`/labs/tastings/${tastingId}`);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDim, setActiveDim] = useState<Dimension>("nose");
  const [flavorExpanded, setFlavorExpanded] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealFlash, setRevealFlash] = useState(false);

  const { data: tasting, isLoading: tastingLoading, isError: tastingError } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
    refetchInterval: 15000,
  });

  const { data: whiskies } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: 15000,
  });

  const { data: participants } = useQuery({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId && !!tasting?.guidedMode,
    refetchInterval: 15000,
  });

  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useTastingEvents({
    tastingId,
    enabled: !!tastingId,
    onReveal: useCallback(() => {
      setRevealFlash(true);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setRevealFlash(false), 180);
      try { navigator.vibrate?.(80); } catch {}
    }, []),
  });

  useEffect(() => {
    return () => { if (flashTimerRef.current) clearTimeout(flashTimerRef.current); };
  }, []);

  const currentWhisky = whiskies?.[currentIndex];

  const { data: myRating } = useQuery({
    queryKey: ["myRating", currentParticipant?.id, currentWhisky?.id],
    queryFn: () => ratingApi.getMyRating(currentParticipant!.id, currentWhisky!.id),
    enabled: !!currentParticipant && !!currentWhisky && !tasting?.guidedMode,
  });

  const mainScale = useRatingScale(tasting?.ratingScale);
  const maxScore = mainScale.max;
  const mid2 = 75;
  const clampScore = (v: number) => Math.max(60, Math.min(100, v));

  const [scores, setScores] = useState({ nose: mid2, taste: mid2, finish: mid2, overall: mid2 });
  const [notes, setNotes] = useState("");
  const [freeformMemo, setFreeformMemo] = useState<LabsVoiceMemoData | null>(null);
  const [calibrationOpen, setCalibrationOpen] = useState(false);
  const [overrideActive, setOverrideActive] = useState(false);

  const { data: allTastingRatings } = useQuery({
    queryKey: ["tasting-ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId && !!currentParticipant,
    refetchInterval: 10000,
  });

  const myAllRatings = (allTastingRatings || []).filter(
    (r: any) => r.participantId === currentParticipant?.id
  );

  useEffect(() => {
    if (myRating) {
      const n = clampScore(myRating.nose ?? mid2);
      const ta = clampScore(myRating.taste ?? mid2);
      const f = clampScore(myRating.finish ?? mid2);
      const o = clampScore(myRating.overall ?? mid2);
      setScores({ nose: n, taste: ta, finish: f, overall: o });
      setNotes(myRating.notes || "");
      const auto = Math.round((n + ta + f) / 3);
      setOverrideActive(o !== auto);
    } else {
      setScores({ nose: mid2, taste: mid2, finish: mid2, overall: mid2 });
      setNotes("");
      setOverrideActive(false);
    }
  }, [myRating, currentWhisky?.id, mid2]);

  useEffect(() => {
    setFreeformMemo(null);
    setOverrideActive(false);
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

  const presentationSlideVal = tasting?.presentationSlide;
  const isHost = currentParticipant?.id === tasting?.hostId;
  useEffect(() => {
    if (presentationSlideVal != null && !isHost && tastingId) {
      navigate(`/labs/results/${tastingId}`);
    }
  }, [presentationSlideVal, isHost, tastingId, navigate]);

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

  const computeAutoOverall = (s: typeof scores) =>
    Math.round((s.nose + s.taste + s.finish) / 3);

  const updateScore = (dimension: keyof typeof scores, value: number) => {
    const newScores = { ...scores, [dimension]: value };
    if (!overrideActive) {
      newScores.overall = computeAutoOverall(newScores);
    }
    setScores(newScores);
    debouncedSave(newScores, notes);
  };

  const updateOverall = (value: number) => {
    const auto = computeAutoOverall(scores);
    if (value !== auto) setOverrideActive(true);
    const newScores = { ...scores, overall: value };
    setScores(newScores);
    debouncedSave(newScores, notes);
  };

  const resetOverride = () => {
    setOverrideActive(false);
    const auto = computeAutoOverall(scores);
    const newScores = { ...scores, overall: auto };
    setScores(newScores);
    debouncedSave(newScores, notes);
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    debouncedSave(scores, value);
  };

  const activeChips = useMemo(() => {
    const tagsByPhase = parseTagsFromNotes(notes);
    return tagsByPhase[activeDim] || [];
  }, [notes, activeDim]);

  const handleStudioChipsChange = useCallback((newChips: string[]) => {
    const updated = replaceTagsInNotes(notes, activeDim as "nose" | "taste" | "finish", newChips);
    setNotes(updated);
    debouncedSave(scores, updated);
  }, [notes, activeDim, scores, debouncedSave]);

  const openStudio = useCallback(() => {
    setFlavorExpanded(false);
    setStudioOpen(true);
  }, []);

  const freeRevealIdx = tasting?.revealIndex ?? 0;
  const freeRevealStp = tasting?.revealStep ?? 0;
  const FREE_REVEAL_DEFAULT: string[][] = [
    ["name"],
    ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
    ["image"],
  ];
  let freeStepGroups = FREE_REVEAL_DEFAULT;
  try {
    if (tasting?.revealOrder) {
      const parsed = JSON.parse(tasting.revealOrder);
      if (Array.isArray(parsed) && parsed.length > 0) freeStepGroups = parsed;
    }
  } catch {}

  const getFreeRevealedFields = (whiskyIdx: number) => {
    const fields = new Set<string>();
    if (!tasting?.blindMode) return fields;
    if (whiskyIdx < freeRevealIdx) {
      for (const group of freeStepGroups) for (const f of group) fields.add(f);
    } else if (whiskyIdx === freeRevealIdx) {
      for (let s = 0; s < freeRevealStp && s < freeStepGroups.length; s++) {
        for (const f of freeStepGroups[s]) fields.add(f);
      }
    }
    return fields;
  };

  const currentFreeRevealed = getFreeRevealedFields(currentIndex);
  const freeNameRevealed = currentFreeRevealed.has("name") || (freeRevealIdx > currentIndex) || (freeRevealStp >= freeStepGroups.length && freeRevealIdx >= currentIndex);
  const isBlind = tasting?.blindMode && !freeNameRevealed;

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
        <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
          <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
          <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
        </svg>
        <h2 className="labs-empty-title">Tasting not found</h2>
        <p className="labs-empty-sub">This tasting may not exist or you don't have access.</p>
        <button className="labs-empty-action" onClick={goBack} data-testid="labs-live-not-found-back">Back to Tastings</button>
      </div>
    );
  }

  if (tastingLoading) {
    return (
      <div className="labs-page labs-fade-in" style={{ minHeight: "60vh", display: "flex", flexDirection: "column", gap: 16, padding: "2rem 1.5rem" }}>
        <div className="labs-skeleton" style={{ height: 22, width: "50%", marginBottom: 4 }} />
        <div className="labs-skeleton" style={{ height: 13, width: "35%" }} />
        <div style={{ height: 16 }} />
        <div className="labs-skeleton" style={{ height: 56, width: "100%", borderRadius: "var(--labs-radius)" }} />
        <div className="labs-skeleton" style={{ height: 56, width: "100%", borderRadius: "var(--labs-radius)" }} />
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="14" stroke="currentColor" strokeWidth="0.5" opacity="0.15"/>
          <line x1="14" y1="14" x2="26" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
          <line x1="26" y1="14" x2="14" y2="26" stroke="currentColor" strokeWidth="0.8" opacity="0.2"/>
        </svg>
        <h2 className="labs-empty-title">Tasting not found</h2>
        <p className="labs-empty-sub">This tasting may not exist or you don't have access.</p>
        <button className="labs-empty-action" onClick={goBack} data-testid="labs-live-notfound-back">Back to Tastings</button>
      </div>
    );
  }

  const isPresentationLive = tasting.presentationSlide != null && currentParticipant?.id !== tasting.hostId;

  if (tasting.guidedMode) {
    const guidedWhiskyIndex = tasting.guidedWhiskyIndex ?? -1;
    const isSessionComplete = tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal";
    const isLobby = guidedWhiskyIndex === -1 || tasting.status === "draft";
    const guidedWhisky = whiskies?.[guidedWhiskyIndex] ?? null;
    const participantCount = Array.isArray(participants) ? participants.length : 0;

    return (
      <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in" style={{ position: "relative" }}>
        {revealFlash && (
          <div className="labs-reveal-flash" data-testid="reveal-flash-overlay-guided" />
        )}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={goBack}
            className="labs-btn-ghost flex items-center gap-1 -ml-2"
            style={{ color: "var(--labs-text-muted)" }}
            data-testid="labs-live-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Tasting
          </button>
          <div className="flex items-center gap-2">
            {currentParticipant?.id === tasting.hostId && (
              <button
                onClick={() => navigate(`/labs/host/${tastingId}`)}
                className="labs-btn-ghost flex items-center gap-1.5"
                style={{ color: "var(--labs-accent)", fontSize: 12 }}
                data-testid="labs-live-cockpit-btn-guided"
              >
                <Settings className="w-4 h-4" />
                Cockpit
              </button>
            )}
            {currentParticipant?.id !== tasting.hostId && <CompactDownloadButton tasting={tasting as Tasting} />}
          </div>
        </div>

        {isPresentationLive && <PresentationLiveBanner tastingId={tastingId} />}

        {isSessionComplete ? (
          <GuidedComplete tastingId={tastingId} presentationActive={tasting.presentationSlide != null} />
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
            allWhiskies={whiskies || []}
          />
        ) : (
          <GuidedLobby tasting={tasting} participantCount={participantCount} />
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in" style={{ position: "relative" }}>
      {revealFlash && (
        <div className="labs-reveal-flash" data-testid="reveal-flash-overlay" />
      )}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={goBack}
          className="labs-btn-ghost flex items-center gap-1 -ml-2"
          style={{ color: "var(--labs-text-muted)" }}
          data-testid="labs-live-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Tasting
        </button>
        <div className="flex items-center gap-2">
          {currentParticipant?.id === tasting.hostId && (
            <button
              onClick={() => navigate(`/labs/host/${tastingId}`)}
              className="labs-btn-ghost flex items-center gap-1.5"
              style={{ color: "var(--labs-accent)", fontSize: 12 }}
              data-testid="labs-live-cockpit-btn"
            >
              <Settings className="w-4 h-4" />
              Cockpit
            </button>
          )}
          {currentParticipant?.id !== tasting.hostId && <CompactDownloadButton tasting={tasting as Tasting} />}
        </div>
      </div>

      {isPresentationLive && <PresentationLiveBanner tastingId={tastingId} />}

      <div className="mb-5">
        <div className="flex items-center gap-3 mb-2">
          <h1
            className="labs-h3"
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
            {tasting.status === "open" ? "● Live" : tasting.status === "draft" ? "Setting up" : tasting.status === "archived" ? "Completed" : tasting.status}
          </span>
          {totalWhiskies > 0 && (
            <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
              {totalWhiskies} {totalWhiskies === 1 ? "dram" : "drams"}
            </span>
          )}
        </div>
      </div>

      {!whiskies || totalWhiskies === 0 ? (
        <div className="labs-empty labs-fade-in">
          <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
            <path d="M10 14 Q9 20 9 26 L9 34 Q9 37 12 37 L28 37 Q31 37 31 34 L31 26 Q31 20 30 14 Z"
              fill="currentColor" opacity="0.15"/>
            <rect x="14" y="8" width="12" height="8" rx="2" fill="currentColor" opacity="0.1"/>
          </svg>
          <h2 className="labs-empty-title">No whiskies yet</h2>
          <p className="labs-empty-sub">The session is being prepared.</p>
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
                {currentWhisky?.imageUrl && !isBlind && (
                  <img
                    src={currentWhisky.imageUrl}
                    alt={displayName}
                    className="mx-auto mb-2 rounded-xl object-cover"
                    style={{ width: 56, height: 56, border: "1px solid var(--labs-border)" }}
                    data-testid="labs-live-whisky-thumb"
                  />
                )}
                <h2
                  className="labs-h3"
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
                      onClick={() => { setActiveDim(dim); setFlavorExpanded(false); }}
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
                      style={{ width: `${((scores[activeDim] - 60) / 40) * 100}%` }}
                    />
                    <div
                      className="labs-slider-thumb"
                      style={{ left: `${((scores[activeDim] - 60) / 40) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={scores[activeDim]}
                    onChange={(e) => updateScore(activeDim, Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    style={{ height: 22, top: -8 }}
                    data-testid={`labs-live-slider-${activeDim}`}
                  />
                </div>

                <div className="flex justify-between text-[11px] px-0.5" style={{ color: "var(--labs-text-muted)" }}>
                  <span>60</span>
                  <span>80</span>
                  <span>100</span>
                </div>

                {(activeDim === "nose" || activeDim === "taste" || activeDim === "finish") && (
                  <div style={{ borderTop: "1px solid var(--labs-border)", marginTop: 12, paddingTop: 4 }}>
                    <InlineFlavorTags
                      notes={notes}
                      onNotesChange={updateNotes}
                      profileId={getEffectiveProfile(currentWhisky || {}, !!isBlind).profileId}
                      phase={activeDim as "nose" | "taste" | "finish"}
                      expanded={flavorExpanded}
                      onToggle={() => setFlavorExpanded(!flavorExpanded)}
                    />
                    <button
                      type="button"
                      onClick={openStudio}
                      style={{
                        display: "flex", alignItems: "center", gap: 8, width: "100%",
                        background: "linear-gradient(135deg, var(--labs-accent), color-mix(in srgb, var(--labs-accent) 80%, var(--labs-surface)))",
                        border: "1px solid var(--labs-accent)",
                        borderRadius: 12, cursor: "pointer",
                        color: "var(--labs-bg)", fontSize: 13, fontFamily: "inherit",
                        fontWeight: 700, padding: "10px 16px",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                        marginTop: 8,
                      }}
                      data-testid="button-open-flavour-studio-live"
                    >
                      <Sparkles style={{ width: 16, height: 16 }} />
                      Flavour Studio
                      {activeChips.length > 0 && (
                        <span style={{ fontSize: 11, background: "var(--labs-bg)", color: "var(--labs-accent)", padding: "2px 8px", borderRadius: 10, fontWeight: 700, marginLeft: 2 }}
                          data-testid="studio-live-count-badge"
                        >
                          {activeChips.length}
                        </span>
                      )}
                    </button>
                  </div>
                )}
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
                {VOICE_MEMOS_ENABLED && (
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
                )}
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

                <div style={{ marginBottom: 4 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>
                      Overall
                      {overrideActive && (
                        <span className="labs-badge labs-badge-accent" style={{ marginLeft: 8, fontSize: 11 }}>
                          Manual
                        </span>
                      )}
                    </span>
                    <span
                      className="labs-h1 tabular-nums"
                      style={{ color: "var(--labs-accent)" }}
                      data-testid="labs-live-overall"
                    >
                      {scores.overall}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={60}
                    max={100}
                    value={scores.overall}
                    onChange={(e) => updateOverall(Number(e.target.value))}
                    data-testid="labs-live-overall-slider"
                    style={{ width: "100%", accentColor: "var(--labs-accent)", display: "block", cursor: "pointer" }}
                  />
                  {overrideActive && (
                    <button
                      type="button"
                      onClick={resetOverride}
                      data-testid="labs-live-reset-override"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--labs-accent)", fontSize: 11, fontWeight: 500,
                        padding: "4px 0", fontFamily: "inherit", marginTop: 2,
                      }}
                    >
                      Reset to suggested ({computeAutoOverall(scores)})
                    </button>
                  )}
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

              {whiskies && whiskies.length > 1 && (
                <div className="labs-card-elevated mt-4 labs-fade-in labs-stagger-5" data-testid="calibration-overview">
                  <button
                    type="button"
                    onClick={() => setCalibrationOpen(!calibrationOpen)}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                    }}
                    data-testid="button-toggle-calibration"
                  >
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--labs-text)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        My Scores Overview
                      </span>
                      <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                        ({myAllRatings.length}/{whiskies.length} rated)
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)", transform: calibrationOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
                  </button>
                  {calibrationOpen && (
                    <div style={{ padding: "0 16px 16px" }}>
                      <div className="space-y-2">
                        {whiskies.map((w: any, idx: number) => {
                          const rating = myAllRatings.find((r: any) => r.whiskyId === w.id);
                          const overall = rating?.overall;
                          const isActive = idx === currentIndex;
                          const idxRevealed = getFreeRevealedFields(idx);
                          const idxNameHidden = tasting?.blindMode && !idxRevealed.has("name");
                          const label = idxNameHidden
                            ? `Dram ${String.fromCharCode(65 + idx)}`
                            : (w.name || `Dram ${idx + 1}`);
                          return (
                            <button
                              key={w.id}
                              type="button"
                              onClick={() => { setCurrentIndex(idx); setCalibrationOpen(false); }}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", gap: 10,
                                padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontFamily: "inherit",
                                background: isActive ? "var(--labs-accent-muted)" : "transparent",
                                border: isActive ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border-subtle, var(--labs-border))",
                                transition: "all 0.15s",
                              }}
                              data-testid={`calibration-row-${idx}`}
                            >
                              <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--labs-text-muted)", width: 18, textAlign: "center", flexShrink: 0 }}>
                                {idx + 1}
                              </span>
                              <span className="text-xs font-medium truncate flex-1 text-left" style={{ color: isActive ? "var(--labs-accent)" : "var(--labs-text)" }}>
                                {label}
                              </span>
                              <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--labs-border)", flexShrink: 0, overflow: "hidden" }}>
                                {overall != null && (
                                  <div style={{ width: `${(overall / maxScore) * 100}%`, height: "100%", borderRadius: 3, background: isActive ? "var(--labs-accent)" : "var(--labs-text-muted)", transition: "width 0.3s" }} />
                                )}
                              </div>
                              <span className="text-xs font-bold tabular-nums" style={{ color: overall != null ? (isActive ? "var(--labs-accent)" : "var(--labs-text)") : "var(--labs-text-muted)", width: 28, textAlign: "right", flexShrink: 0 }}>
                                {overall != null ? overall : "—"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      {myAllRatings.length >= 2 && (() => {
                        const overalls = myAllRatings.map((r: any) => r.overall).filter((v: any) => v != null);
                        if (overalls.length < 2) return null;
                        const avg = Math.round(overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length * 10) / 10;
                        const min = Math.min(...overalls);
                        const max = Math.max(...overalls);
                        return (
                          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "var(--labs-surface-elevated)" }} data-testid="calibration-stats">
                            <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                              <span>Avg: <strong style={{ color: "var(--labs-text)" }}>{avg}</strong></span>
                              <span>Range: <strong style={{ color: "var(--labs-text)" }}>{min}–{max}</strong></span>
                              <span>Spread: <strong style={{ color: "var(--labs-text)" }}>{Math.round((max - min) * 10) / 10}</strong></span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              <FlavourStudioSheet
                open={studioOpen}
                onOpenChange={setStudioOpen}
                dimension={activeDim as DimKey}
                existingChips={activeChips}
                onChipsChange={handleStudioChipsChange}
              />
            </>
          ) : (
            <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
              {!currentParticipant ? (
                <AuthGateMessage message="Sign in to rate whiskies" />
              ) : tasting.status === "draft" ? (
                <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  This session has not started yet
                </p>
              ) : tasting.status === "archived" || tasting.status === "closed" ? (
                <div>
                  {tasting.presentationSlide != null && (
                    <PresentationLiveBanner tastingId={tastingId} />
                  )}
                  <p className="text-sm mb-3" style={{ color: "var(--labs-text-muted)" }}>
                    {tasting.status === "archived" ? "This session has been completed" : "Ratings are closed"}
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
              ) : null}
            </div>
          )}
        </>
      )}
    </div>
  );
}