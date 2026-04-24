import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useLabsBack } from "@/labs/LabsLayout";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { Wine, ChevronLeft, ChevronRight, ChevronDown, Eye, EyeOff, Check, Clock, Trophy, AlertTriangle, BarChart3, Monitor, Sparkles, Settings, Pencil, RotateCcw } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { getStatusConfig } from "@/labs/utils/statusConfig";
import { formatScore } from "@/lib/utils";
import { queryClient } from "@/lib/queryClient";
import LabsVoiceMemoRecorder, { type LabsVoiceMemoData } from "@/labs/components/LabsVoiceMemoRecorder";
import { InlineFlavorTags, parseTagsFromNotes, replaceTagsInNotes } from "@/labs/components/FlavorTagStrip";
import { getEffectiveProfile } from "@/labs/data/flavor-data";
import FlavourStudioSheet from "@/labs/components/FlavourStudioSheet";
import { type DimKey } from "@/labs/components/LabsRatingPanel";
import { useRatingScale } from "@/labs/hooks/useRatingScale";
import { CompactDownloadButton } from "@/components/ParticipantDownloads";
import LabsRevealMoment from "@/labs/pages/LabsRevealMoment";
import { WhiskyHandoutViewer } from "@/labs/components/WhiskyHandoutManager";
import { TastingHandoutViewer } from "@/labs/components/TastingHandoutManager";
import { AutoHandoutViewer } from "@/labs/components/AutoHandoutManager";
import { useTastingEvents } from "@/labs/hooks/useTastingEvents";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import type { RatingFlowDraftState } from "@/labs/components/rating/RatingFlowV2";
import type { RatingData } from "@/labs/components/rating/types";
import DramCarousel from "@/labs/components/DramCarousel";
import { ResumeOrSkipBanner } from "@/labs/components/ResumeRatingBanner";
import ScaleBadge from "@/labs/components/ScaleBadge";
import type { Tasting } from "@shared/schema";
import { saveGroupDraft, loadGroupDraft, clearGroupDraft } from "@/lib/draftStorage";

const VOICE_MEMOS_ENABLED = false;

interface LabsLiveProps {
  params: { id: string };
}

const DIMENSIONS = ["nose", "taste", "finish"] as const;
type Dimension = (typeof DIMENSIONS)[number];
type ActiveTab = Dimension | "overall";

function GuidedLobby({ tasting, participantCount }: { tasting: any; participantCount: number }) {
  const { t } = useTranslation();
  return (
    <div className="labs-lobby labs-fade-in" data-testid="guided-lobby">
      <p className="labs-lobby-eyebrow" data-testid="guided-lobby-title">{tasting.title}</p>
      <div className="labs-pulse-dot" />
      <h1 className="labs-lobby-title">
        {tasting.isBlind ? t("liveUi.blindTasting") : t("liveUi.tasting")}<br />
        <em>{t("liveUi.startsShortly")}</em>
      </h1>
      <div className="labs-lobby-divider" />
      <p className="labs-lobby-meta" data-testid="guided-lobby-waiting">
        {tasting.whiskies?.length ?? '?'} {t("liveUi.drams")} · {participantCount} {t("liveUi.taster")}
        {tasting.location ? ` · ${tasting.location}` : ''}
      </p>
      <p className="labs-lobby-hint" data-testid="guided-lobby-count">{t("liveUi.waitForHost")}</p>
    </div>
  );
}

function PresentationLiveBanner({ tastingId }: { tastingId: string }) {
  const { t } = useTranslation();
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
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-accent)" }}>{t("liveUi.presentationLive")}</span>
        <p style={{ fontSize: 12, color: "var(--labs-text-muted)", margin: 0 }}>{t("liveUi.tapToWatch")}</p>
      </div>
      <Monitor style={{ width: 18, height: 18, color: "var(--labs-accent)" }} />
    </div>
  );
}

function GuidedComplete({ tastingId, presentationActive }: { tastingId: string; presentationActive?: boolean }) {
  const { t } = useTranslation();
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
          {t("liveUi.tastingComplete")}
        </h2>

        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>
          {t("liveUi.thankYou")}
        </p>

        <button
          className="labs-btn-primary"
          onClick={() => navigate(`/labs/results/${tastingId}`)}
          data-testid="guided-complete-results"
        >
          <Eye className="w-4 h-4 inline mr-1.5" />
          {t("liveUi.viewResults")}
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editRatingMode, setEditRatingMode] = useState<"edit" | "retaste" | null>(null);
  const [draftSavedFlash, setDraftSavedFlash] = useState(false);
  const draftFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (draftFlashTimer.current) clearTimeout(draftFlashTimer.current); };
  }, []);

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

  const guidedDraft = useMemo(() => {
    if (!activeWhisky?.id || !tastingId) return null;
    return loadGroupDraft(tastingId, activeWhisky.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tastingId, activeWhisky?.id, dramTransitionKey]);

  const guidedDirtyRef = useRef(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (guidedDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const handleGuidedDraftChange = useCallback((draft: RatingFlowDraftState) => {
    if (!activeWhisky?.id) return;
    guidedDirtyRef.current = true;
    saveGroupDraft({
      tastingId,
      whiskyId: activeWhisky.id,
      ratingMode: draft.mode,
      ratingPhaseIndex: draft.phaseIndex,
      ratingData: draft.data,
    });
    setDraftSavedFlash(true);
    if (draftFlashTimer.current) clearTimeout(draftFlashTimer.current);
    draftFlashTimer.current = setTimeout(() => setDraftSavedFlash(false), 2000);
  }, [tastingId, activeWhisky?.id]);

  const revealStep = viewingHostDram
    ? (tasting.guidedRevealStep ?? 0)
    : (localIndex < whiskyIndex ? 999 : 0);
  const liveScale = useRatingScale(tasting.ratingScale);
  const maxScore = liveScale.max;

  const REVEAL_DEFAULT_ORDER: string[][] = [
    ["name"],
    ["distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
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
    caskType?: string; abv?: string; category?: string; bottler?: string; distilledYear?: string; peatLevel?: string; country?: string; ppm?: string; price?: string;
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
          caskType: revealedFields.has("caskType") ? activeWhisky.caskType : undefined,
          abv: revealedFields.has("abv") && activeWhisky.abv ? `${activeWhisky.abv}%` : undefined,
          category: revealedFields.has("category") ? activeWhisky.category : undefined,
          bottler: revealedFields.has("bottler") ? activeWhisky.bottler : undefined,
          distilledYear: (revealedFields.has("vintage") || revealedFields.has("distilledYear")) && activeWhisky.distilledYear ? `${activeWhisky.distilledYear}` : undefined,
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
  const [failedSaveArgs, setFailedSaveArgs] = useState<Record<string, unknown> | null>(null);

  const rateMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      setSaveError(null);
      setFailedSaveArgs(null);
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, activeWhisky?.id] });
      queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] });
    },
    onError: (err: any) => {
      const msg = err?.message || t("liveUi.saveFailedError");
      setSaveError(msg.includes("locked") || msg.includes("403") ? t("liveUi.ratingsLocked") : msg);
    },
  });

  useEffect(() => {
    setSaveError(null);
    setFailedSaveArgs(null);
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
            setEditRatingMode(null);
            if (rating) {
              setShowEditDialog(true);
            }
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
            scale={liveScale}
            whisky={{
              name: displayName,
              region: activeWhisky?.region || undefined,
              cask: activeWhisky?.caskType || undefined,
              blind: isBlindStep,
            }}
            initialData={myRating && editRatingMode !== "retaste" ? (() => {
              const rawNotes = myRating.notes || "";
              const flavourMatch = rawNotes.match(/\[FLAVOURS\]\s*([\s\S]*?)\s*\[\/FLAVOURS\]/);
              const chips = flavourMatch ? flavourMatch[1].split(",").map((s: string) => s.trim()).filter(Boolean) : [];
              const cleanNotes = flavourMatch ? rawNotes.replace(/\n?\[FLAVOURS\][\s\S]*?\[\/FLAVOURS\]/, "").trim() : rawNotes;
              const fallback = liveScale.max === 100 ? 75 : Math.round((liveScale.max * 0.75) / liveScale.step) * liveScale.step;
              const toUserScale = (v: number | null | undefined) => {
                if (v == null) return fallback;
                if (liveScale.max !== 100 && v > liveScale.max) {
                  return Math.round((v / 100) * liveScale.max * 10) / 10;
                }
                return v;
              };
              return {
                scores: {
                  nose: toUserScale(myRating.nose),
                  palate: toUserScale(myRating.taste),
                  finish: toUserScale(myRating.finish),
                  overall: toUserScale(myRating.overall),
                },
                tags: { nose: chips, palate: [], finish: [], overall: [] },
                notes: { nose: cleanNotes, palate: "", finish: "", overall: "" },
                overallExplicit: true,
              };
            })() : (!myRating && guidedDraft?.ratingData?.scores ? guidedDraft.ratingData as RatingData : undefined)}
            initialMode={!myRating && guidedDraft?.ratingMode ? guidedDraft.ratingMode : undefined}
            initialPhaseIndex={!myRating && guidedDraft ? guidedDraft.ratingPhaseIndex : undefined}
            onDone={async (data: RatingData) => {
              if (!currentParticipant || !activeWhisky) return;
              const liveInv = 1 / liveScale.step;
              const computeOv = (s: { nose: number; palate: number; finish: number }) =>
                Math.round(((s.nose + s.palate + s.finish) / 3) * liveInv) / liveInv;
              const eff = (data.overallExplicit === true || (data.scores.overall != null && data.scores.overall > 0))
                ? data.scores.overall
                : Math.max(liveScale.step, computeOv(data.scores));

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

              const mutArgs = {
                tastingId,
                whiskyId: activeWhisky.id,
                participantId: currentParticipant.id,
                nose: data.scores.nose,
                taste: data.scores.palate,
                finish: data.scores.finish,
                overall: eff,
                notes: combined,
              };

              try {
                await rateMutation.mutateAsync(mutArgs);
                setFailedSaveArgs(null);
                clearGroupDraft(tastingId, activeWhisky.id);
                guidedDirtyRef.current = false;
                setFlowSaved(true);
              } catch (err: any) {
                setFailedSaveArgs(mutArgs);
                setSaveError(err?.message || t("liveUi.saveFailedError"));
              }
            }}
            onBack={() => {
              setFlowSaved(false);
              setDramTransitionKey(k => k + 1);
            }}
            onChange={handleGuidedDraftChange}
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
              className="mb-3 p-3 rounded-xl text-xs"
              style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}
              data-testid="guided-save-error"
            >
              <div className="flex items-start gap-1.5" style={{ color: "var(--labs-danger, #ef4444)" }}>
                <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span>{saveError}</span>
              </div>
              {failedSaveArgs && (
                <button
                  className="mt-2 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg w-full justify-center transition-all"
                  style={{ background: "var(--labs-danger, #ef4444)", color: "#fff", border: "none", cursor: rateMutation.isPending ? "default" : "pointer", opacity: rateMutation.isPending ? 0.7 : 1 }}
                  disabled={rateMutation.isPending}
                  onClick={async () => {
                    try {
                      await rateMutation.mutateAsync(failedSaveArgs);
                      setFailedSaveArgs(null);
                      if (activeWhisky) clearGroupDraft(tastingId, activeWhisky.id);
                      guidedDirtyRef.current = false;
                      setFlowSaved(true);
                    } catch {
                    }
                  }}
                  data-testid="guided-save-retry"
                >
                  {rateMutation.isPending ? (
                    <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  {t("liveUi.retrySave", "Erneut speichern")}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
          {!currentParticipant ? (
            <AuthGateMessage
              title={t("authGate.live.title")}
              bullets={[t("authGate.live.bullet1"), t("authGate.live.bullet2"), t("authGate.live.bullet3")]}
              compact
            />
          ) : (
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              {t("m2.taste.rating.ratingsClosed", "Ratings are currently closed")}
            </p>
          )}
        </div>
      )}

      {showEditDialog && (
        <div
          data-testid="edit-retaste-dialog-overlay"
          onClick={() => setShowEditDialog(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            data-testid="edit-retaste-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--labs-surface-elevated, #1a1a1a)",
              borderRadius: 16,
              padding: 24,
              width: "100%",
              maxWidth: 340,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <h3
              style={{
                fontFamily: "var(--labs-font-display, inherit)",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--labs-text, #fff)",
                margin: 0,
                textAlign: "center",
              }}
            >
              {t("labs.editOrRetaste.title", "Dram bereits bewertet")}
            </h3>
            <button
              data-testid="edit-retaste-edit-btn"
              onClick={() => {
                setShowEditDialog(false);
                setEditRatingMode("edit");
                setDramTransitionKey(k => k + 1);
              }}
              className="labs-btn-primary"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 9999,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              {t("labs.editOrRetaste.edit", "Bewertung bearbeiten")}
            </button>
            <button
              data-testid="edit-retaste-retaste-btn"
              onClick={() => {
                setShowEditDialog(false);
                setEditRatingMode("retaste");
                setDramTransitionKey(k => k + 1);
              }}
              style={{
                width: "100%",
                padding: "12px",
                background: "var(--labs-surface, #222)",
                color: "var(--labs-text, #fff)",
                border: "1px solid var(--labs-border, #333)",
                borderRadius: 9999,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 44,
              }}
            >
              {t("labs.editOrRetaste.retaste", "Nochmal verkosten")}
            </button>
          </div>
        </div>
      )}

      {draftSavedFlash && (
        <div
          data-testid="guided-draft-saved-indicator"
          style={{
            position: "fixed",
            top: 60,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: 20,
            background: "rgba(34,197,94,0.12)",
            border: "1px solid rgba(34,197,94,0.25)",
            color: "var(--labs-success, #22c55e)",
            fontSize: 12,
            fontWeight: 600,
            zIndex: 50,
            animation: "labsFadeIn 200ms ease both",
            pointerEvents: "none",
          }}
        >
          <Check style={{ width: 14, height: 14 }} />
          Draft saved
        </div>
      )}
    </div>
  );
}

export default function LabsLive({ params }: LabsLiveProps) {
  const { t } = useTranslation();
  const tastingId = params.id;
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack(`/labs/tastings/${tastingId}`);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeDim, setActiveDim] = useState<ActiveTab>("nose");
  const [flavorExpanded, setFlavorExpanded] = useState(false);
  const [studioOpen, setStudioOpen] = useState(false);
  const [expandedCalIdx, setExpandedCalIdx] = useState<number | null>(null);
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
  const scaleMin = mainScale.max === 100 ? 60 : 0;
  const scaleMax = mainScale.max;
  const scaleRange = scaleMax - scaleMin;
  const mid2 = Math.round(scaleMax * 0.75);
  const clampScore = (v: number) => Math.max(scaleMin, Math.min(scaleMax, v));

  const [scores, setScores] = useState({ nose: mid2, taste: mid2, finish: mid2, overall: mid2 });
  const [notes, setNotes] = useState("");
  const [freeformMemo, setFreeformMemo] = useState<LabsVoiceMemoData | null>(null);
  const [overrideActive, setOverrideActive] = useState(false);

  const hasUnsavedLiveRef = useRef(false);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedLiveRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

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
      hasUnsavedLiveRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, currentWhisky?.id] });
    },
    onError: (err: any) => {
      const msg = err?.message || t("liveUi.saveFailedError");
      setSaveError(msg.includes("locked") || msg.includes("403") ? t("liveUi.ratingsLocked") : msg);
    },
  });

  const debouncedSave = useCallback(
    (newScores: typeof scores, newNotes: string) => {
      if (!currentParticipant || !currentWhisky || !tasting) return;
      if (tasting.status !== "open" && tasting.status !== "draft") return;
      hasUnsavedLiveRef.current = true;
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
    Math.round(((s.nose + s.taste + s.finish) / 3) * 2) / 2;

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
    if (activeDim === "overall") return;
    const updated = replaceTagsInNotes(notes, activeDim, newChips);
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
    ["distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
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
      <div className="labs-page labs-fade-in" style={{ position: "relative" }}>
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
    <div className="labs-page labs-fade-in" style={{ position: "relative" }}>
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
          {(() => {
            const sc = getStatusConfig(tasting.status);
            return (
              <span className={sc.cssClass} data-testid="labs-live-status">
                {tasting.status === "open" && <span className="labs-status-live-dot" />}
                {t(sc.labelKey, sc.fallbackLabel)}
              </span>
            );
          })()}
          {totalWhiskies > 0 && (
            <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
              {totalWhiskies} {totalWhiskies === 1 ? "dram" : "drams"}
            </span>
          )}
        </div>
      </div>

      {tasting && (
        <div className="mb-4">
          <TastingHandoutViewer tasting={tasting as Tasting} />
        </div>
      )}

      {tasting && (
        <div className="mb-4">
          <AutoHandoutViewer
            tasting={tasting as Tasting}
            // Align with server-side gating: a tasting counts as "revealed"
            // once the host has triggered the global reveal (tasting.revealedAt).
            // The server enforces the same condition before returning content.
            anyRevealed={Boolean((tasting as Tasting | undefined)?.revealedAt)}
            hasHostUpload={Boolean(tasting?.handoutUrl)}
          />
        </div>
      )}

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
                    className="mx-auto mb-3 rounded-2xl object-cover"
                    style={{ width: 110, height: 130, border: "1px solid var(--labs-border)", boxShadow: "0 4px 16px rgba(0,0,0,0.18)" }}
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

          {currentWhisky && (
            <div className="mb-4 labs-fade-in labs-stagger-2">
              <WhiskyHandoutViewer whisky={currentWhisky} isRevealed={!isBlind} />
            </div>
          )}

          {canRate ? (
            <>
              {(() => {
                const allDimsScored = DIMENSIONS.every((d) => scores[d] > 0);
                const ALL_LIVE_TABS: ActiveTab[] = [...DIMENSIONS, "overall"];
                return (
                  <div className="flex gap-0 mb-4 labs-fade-in labs-stagger-2" style={{ borderRadius: 8, overflow: "hidden", border: "1px solid var(--labs-border)" }}>
                    {ALL_LIVE_TABS.map((tab) => {
                      const isActive = activeDim === tab;
                      const isOverall = tab === "overall";
                      const tabDisabled = isOverall && !allDimsScored;
                      const label = isOverall ? "Overall" : tab.charAt(0).toUpperCase() + tab.slice(1);
                      return (
                        <button
                          key={tab}
                          className="flex-1 transition-all"
                          style={{
                            padding: "10px 0",
                            background: isActive ? "var(--labs-accent)" : "transparent",
                            color: isActive ? "var(--labs-bg)" : "var(--labs-text-secondary)",
                            border: "none",
                            borderRight: tab !== "overall" ? "1px solid var(--labs-border)" : "none",
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            fontFamily: "inherit",
                            cursor: tabDisabled ? "default" : "pointer",
                            opacity: tabDisabled ? 0.35 : 1,
                          }}
                          onClick={() => {
                            if (tabDisabled) return;
                            setActiveDim(tab);
                            setFlavorExpanded(false);
                          }}
                          data-testid={`labs-live-dim-${tab}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="labs-card p-5 mb-4 labs-fade-in labs-stagger-3">
                {activeDim === "overall" ? (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--labs-border-subtle)" }}>
                      {DIMENSIONS.map((d) => (
                        <div key={d} style={{ textAlign: "center" }}>
                          <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-text-muted)", marginBottom: 4 }}>
                            {d.charAt(0).toUpperCase() + d.slice(1)}
                          </div>
                          <div
                            className="tabular-nums font-bold"
                            style={{ fontSize: 22, color: "var(--labs-accent)" }}
                            data-testid={`labs-live-overall-dim-${d}`}
                          >
                            {scores[d]}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium" style={{ color: "var(--labs-text-secondary)" }}>Overall</span>
                      <span
                        className="text-xl font-bold tabular-nums"
                        style={{ color: "var(--labs-accent)" }}
                        data-testid="labs-live-overall"
                      >
                        {scores.overall}
                      </span>
                    </div>
                    <div className="relative mb-5">
                      <div className="labs-slider-track">
                        <div className="labs-slider-fill" style={{ width: `${((scores.overall - scaleMin) / scaleRange) * 100}%` }} />
                        <div className="labs-slider-thumb" style={{ left: `${((scores.overall - scaleMin) / scaleRange) * 100}%` }} />
                      </div>
                      <input
                        type="range"
                        min={scaleMin}
                        max={scaleMax}
                        step={mainScale.step}
                        value={scores.overall}
                        onChange={(e) => updateOverall(Number(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        style={{ height: 22, top: -8 }}
                        data-testid="labs-live-overall-slider"
                      />
                    </div>
                    <div className="flex justify-between text-[11px] px-0.5" style={{ color: "var(--labs-text-muted)" }}>
                      <span>{scaleMin}</span>
                      <span>{Math.round((scaleMin + scaleMax) / 2)}</span>
                      <span>{scaleMax}</span>
                    </div>
                    {overrideActive && (
                      <button
                        type="button"
                        onClick={resetOverride}
                        data-testid="labs-live-reset-override"
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--labs-accent)", fontSize: 11, fontWeight: 500, padding: "6px 0 0", fontFamily: "inherit", display: "block", margin: "0 auto" }}
                      >
                        Reset to suggested ({computeAutoOverall(scores)})
                      </button>
                    )}
                    {saveError && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "var(--labs-danger, #ef4444)" }} data-testid="labs-live-save-error">
                        <AlertTriangle className="w-3 h-3" />
                        {saveError}
                      </div>
                    )}
                    {!saveError && rateMutation.isSuccess && (
                      <div className="flex items-center gap-1.5 mt-3 text-xs" style={{ color: "var(--labs-success)" }} data-testid="labs-live-saved">
                        <Check className="w-3 h-3" />
                        Saved
                      </div>
                    )}
                  </>
                ) : (
                  <>
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
                          style={{ width: `${((scores[activeDim] - scaleMin) / scaleRange) * 100}%` }}
                        />
                        <div
                          className="labs-slider-thumb"
                          style={{ left: `${((scores[activeDim] - scaleMin) / scaleRange) * 100}%` }}
                        />
                      </div>
                      <input
                        type="range"
                        min={scaleMin}
                        max={scaleMax}
                        step={mainScale.step}
                        value={scores[activeDim]}
                        onChange={(e) => updateScore(activeDim as Dimension, Number(e.target.value))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                        style={{ height: 22, top: -8 }}
                        data-testid={`labs-live-slider-${activeDim}`}
                      />
                    </div>

                    <div className="flex justify-between text-[11px] px-0.5" style={{ color: "var(--labs-text-muted)" }}>
                      <span>{scaleMin}</span>
                      <span>{Math.round((scaleMin + scaleMax) / 2)}</span>
                      <span>{scaleMax}</span>
                    </div>

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
                  </>
                )}
              </div>

              {activeDim !== "overall" && <div className="labs-card p-5 mb-4 labs-fade-in labs-stagger-3">
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
              </div>}

              {whiskies && whiskies.length > 1 && (
                <div className="labs-card-elevated mt-4 labs-fade-in labs-stagger-5" data-testid="calibration-overview">
                  <div
                    style={{
                      width: "100%", display: "flex", alignItems: "center",
                      padding: "14px 16px",
                    }}
                    data-testid="calibration-header"
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
                  </div>
                  <div style={{ padding: "0 16px 16px" }}>
                      <div className="space-y-2">
                        {whiskies.map((w: any, idx: number) => {
                          const rating = myAllRatings.find((r: any) => r.whiskyId === w.id);
                          const overall = rating?.overall;
                          const isActive = idx === currentIndex;
                          const isExpanded = expandedCalIdx === idx;
                          const idxRevealed = getFreeRevealedFields(idx);
                          const idxNameHidden = tasting?.blindMode && !idxRevealed.has("name");
                          const label = idxNameHidden
                            ? `Dram ${String.fromCharCode(65 + idx)}`
                            : (w.name || `Dram ${idx + 1}`);
                          return (
                            <div key={w.id} style={{ borderRadius: 8, overflow: "hidden", border: isActive ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border-subtle, var(--labs-border))", transition: "border-color 0.15s" }}>
                              <button
                                type="button"
                                onClick={() => setExpandedCalIdx(isExpanded ? null : idx)}
                                style={{
                                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                                  padding: "8px 10px", cursor: "pointer", fontFamily: "inherit",
                                  background: isActive ? "var(--labs-accent-muted)" : "transparent",
                                  border: "none",
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
                                <ChevronDown
                                  style={{ width: 13, height: 13, flexShrink: 0, color: "var(--labs-text-muted)", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}
                                />
                              </button>
                              <div
                                aria-hidden={!isExpanded}
                                {...(!isExpanded ? { inert: "" as any } : {})}
                                style={{
                                  maxHeight: isExpanded ? 999 : 0,
                                  opacity: isExpanded ? 1 : 0,
                                  overflow: "hidden",
                                  transition: "max-height 200ms ease, opacity 200ms ease",
                                  pointerEvents: isExpanded ? "auto" : "none",
                                }}
                              >
                                <div style={{ padding: "10px 10px 12px", borderTop: "1px solid var(--labs-border-subtle, var(--labs-border))", background: "var(--labs-surface-alt, rgba(255,255,255,0.02))" }} data-testid={`calibration-detail-${idx}`}>
                                  {rating ? (
                                    <>
                                      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                                        {(["nose", "taste", "finish"] as const).map((dim) => {
                                          const val = (rating as Record<string, number | null>)[dim];
                                          const pct = val != null ? Math.max(0, Math.min(100, ((val - scaleMin) / scaleRange) * 100)) : 0;
                                          return (
                                            <div key={dim} style={{ flex: 1 }}>
                                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em", color: "var(--labs-text-muted)" }}>
                                                  {dim}
                                                </span>
                                                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--labs-text-secondary)", fontVariantNumeric: "tabular-nums" }} data-testid={`cal-dim-${idx}-${dim}`}>
                                                  {val != null ? val : "—"}
                                                </span>
                                              </div>
                                              <div style={{ height: 4, borderRadius: 2, background: "var(--labs-border)", overflow: "hidden" }}>
                                                <div style={{ height: "100%", width: val != null ? `${pct}%` : "0%", borderRadius: 2, background: "var(--labs-accent)", transition: "width 0.3s ease" }} />
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => { setCurrentIndex(idx); setExpandedCalIdx(null); }}
                                        data-testid={`calibration-edit-${idx}`}
                                        style={{
                                          display: "inline-flex", alignItems: "center", gap: 5,
                                          fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                                          color: "var(--labs-accent)", background: "none",
                                          border: "1px solid var(--labs-accent)", borderRadius: 6,
                                          padding: "4px 10px", cursor: "pointer",
                                        }}
                                      >
                                        <Pencil style={{ width: 11, height: 11 }} />
                                        Bearbeiten
                                      </button>
                                    </>
                                  ) : (
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                      <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>Noch nicht bewertet</span>
                                      <button
                                        type="button"
                                        onClick={() => { setCurrentIndex(idx); setExpandedCalIdx(null); }}
                                        data-testid={`calibration-rate-${idx}`}
                                        style={{
                                          display: "inline-flex", alignItems: "center", gap: 5,
                                          fontSize: 11, fontWeight: 600, fontFamily: "inherit",
                                          color: "var(--labs-accent)", background: "none",
                                          border: "1px solid var(--labs-accent)", borderRadius: 6,
                                          padding: "4px 10px", cursor: "pointer",
                                        }}
                                      >
                                        Jetzt bewerten
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {myAllRatings.length >= 2 && (() => {
                        const overalls = myAllRatings.map((r: any) => r.overall).filter((v: any) => v != null);
                        if (overalls.length < 2) return null;
                        const avg = overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length;
                        const min = Math.min(...overalls);
                        const max = Math.max(...overalls);
                        return (
                          <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "var(--labs-surface-elevated)" }} data-testid="calibration-stats">
                            <div className="flex items-center justify-between text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                              <span>Avg: <strong style={{ color: "var(--labs-text)" }}>{formatScore(avg)}</strong></span>
                              <span>Range: <strong style={{ color: "var(--labs-text)" }}>{formatScore(min)}–{formatScore(max)}</strong></span>
                              <span>Spread: <strong style={{ color: "var(--labs-text)" }}>{formatScore(max - min)}</strong></span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
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
                <AuthGateMessage
                  title={t("authGate.live.title")}
                  bullets={[t("authGate.live.bullet1"), t("authGate.live.bullet2"), t("authGate.live.bullet3")]}
                />
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