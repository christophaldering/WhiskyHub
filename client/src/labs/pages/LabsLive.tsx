import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import { Wine, ChevronLeft, ChevronRight, Eye, EyeOff, Check, Clock, Users, Calendar, Trophy, AlertTriangle, BarChart3, ChevronDown, Monitor } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { tastingApi, whiskyApi, ratingApi } from "@/lib/api";
import { SkeletonList, SkeletonLine } from "@/labs/components/LabsSkeleton";
import { queryClient } from "@/lib/queryClient";
import LabsVoiceMemoRecorder, { type LabsVoiceMemoData } from "@/labs/components/LabsVoiceMemoRecorder";
import { InlineFlavorTags } from "@/labs/components/FlavorTagStrip";
import { getEffectiveProfile } from "@/labs/data/flavor-data";
import LabsRatingPanel, { type DimKey } from "@/labs/components/LabsRatingPanel";
import { CompactDownloadButton } from "@/components/ParticipantDownloads";
import type { Tasting } from "@shared/schema";

const VOICE_MEMOS_ENABLED = false;

interface LabsLiveProps {
  params: { id: string };
}

const DIMENSIONS = ["nose", "taste", "finish"] as const;
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
          className="labs-h2 mb-2"
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
  const [localIndex, setLocalIndex] = useState(whiskyIndex);
  useEffect(() => { setLocalIndex(whiskyIndex); }, [whiskyIndex]);
  const hostMaxIndex = whiskyIndex;
  const activeWhisky = allWhiskies[localIndex] ?? whisky;
  const viewingHostDram = localIndex === whiskyIndex;

  const revealStep = viewingHostDram ? (tasting.guidedRevealStep ?? 0) : 999;
  const maxScore = tasting.ratingScale || 100;

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
  const mid = Math.round(maxScore / 2);
  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };

  const [dimScores, setDimScores] = useState<Record<DimKey, number>>({ nose: mid, taste: mid, finish: mid });
  const [overall, setOverall] = useState(mid);
  const [overrideActive, setOverrideActive] = useState(false);
  const [chips, setChips] = useState<Record<DimKey, string[]>>({ ...emptyChips });
  const [dimTexts, setDimTexts] = useState<Record<DimKey, string>>({ ...emptyTexts });
  const [notes, setNotes] = useState("");
  const [guidedMemo, setGuidedMemo] = useState<LabsVoiceMemoData | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [guidedCalibrationOpen, setGuidedCalibrationOpen] = useState(false);

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

  const parseSavedNotes = useCallback((rawNotes: string) => {
    const parsedChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
    const parsedTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };
    let cleanNotes = rawNotes;
    for (const d of ["nose", "taste", "finish"] as DimKey[]) {
      const re = new RegExp(`\\[${d.toUpperCase()}\\]\\s*([\\s\\S]*?)\\s*\\[\\/${d.toUpperCase()}\\]`);
      const m = rawNotes.match(re);
      if (m) {
        cleanNotes = cleanNotes.replace(m[0], "");
        const content = m[1].trim();
        const parts = content.split(" — ");
        if (parts.length >= 2) {
          parsedChips[d] = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          parsedTexts[d] = parts.slice(1).join(" — ");
        } else if (parts.length === 1) {
          const maybeChips = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          if (maybeChips.every(c => c.length < 20)) parsedChips[d] = maybeChips;
          else parsedTexts[d] = parts[0];
        }
      }
    }
    const flavorMarker = /\[(Nose|Taste|Finish)\]\s*([^\n]*)/gi;
    let fm: RegExpExecArray | null;
    while ((fm = flavorMarker.exec(cleanNotes)) !== null) {
      const dim = fm[1].toLowerCase() as DimKey;
      if (parsedChips[dim].length === 0) {
        parsedChips[dim] = fm[2].split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    cleanNotes = cleanNotes.replace(/\[(Nose|Taste|Finish)\]\s*[^\n]*/gi, "");
    cleanNotes = cleanNotes.replace(/\[SCORES\][\s\S]*?\[\/SCORES\]/, "");
    cleanNotes = cleanNotes.replace(/\n{2,}/g, "\n").trim();
    return { chips: parsedChips, texts: parsedTexts, cleanNotes };
  }, []);

  const buildScoresBlock = useCallback(() => {
    const hasDimData = (["nose", "taste", "finish"] as DimKey[]).some(
      (d) => chips[d].length > 0 || dimTexts[d].trim()
    );
    if (!hasDimData) return "";
    const parts: string[] = [];
    for (const d of ["nose", "taste", "finish"] as DimKey[]) {
      const chipStr = chips[d].length > 0 ? chips[d].join(", ") : "";
      const textStr = dimTexts[d].trim();
      if (chipStr || textStr) {
        parts.push(`[${d.toUpperCase()}] ${[chipStr, textStr].filter(Boolean).join(" — ")} [/${d.toUpperCase()}]`);
      }
    }
    return parts.length > 0 ? "\n" + parts.join("\n") : "";
  }, [chips, dimTexts]);

  useEffect(() => {
    if (myRating) {
      const parsed = parseSavedNotes(myRating.notes || "");
      const n = myRating.nose ?? mid;
      const ta = myRating.taste ?? mid;
      const f = myRating.finish ?? mid;
      const o = myRating.overall ?? mid;
      setDimScores({ nose: n, taste: ta, finish: f });
      setOverall(o);
      setChips(parsed.chips);
      setDimTexts(parsed.texts);
      setNotes(parsed.cleanNotes);
      const auto = Math.round((n + ta + f) / 3);
      setOverrideActive(o !== auto);
    } else {
      setDimScores({ nose: mid, taste: mid, finish: mid });
      setOverall(mid);
      setChips({ ...emptyChips });
      setDimTexts({ ...emptyTexts });
      setNotes("");
      setOverrideActive(false);
    }
  }, [myRating, activeWhisky?.id, mid]);

  useEffect(() => {
    setGuidedMemo(null);
    setOverrideActive(false);
  }, [activeWhisky?.id]);

  const [saveError, setSaveError] = useState<string | null>(null);

  const rateMutation = useMutation({
    mutationFn: (data: any) => ratingApi.upsert(data),
    onSuccess: () => {
      setSaveError(null);
      queryClient.invalidateQueries({ queryKey: ["myRating", currentParticipant?.id, activeWhisky?.id] });
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
  }, [activeWhisky?.id]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  const debouncedSave = useCallback(
    (freshScores: Record<DimKey, number>, freshOverall: number, freshNotes: string) => {
      if (!currentParticipant || !activeWhisky || !tasting) return;
      if (tasting.status !== "open" && tasting.status !== "draft") return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const s = tastingStatusRef.current;
        if (s !== "open" && s !== "draft") return;
        const scoresBlock = buildScoresBlock();
        const combinedNotes = (freshNotes + scoresBlock).trim();
        rateMutation.mutate({
          tastingId,
          whiskyId: activeWhisky.id,
          participantId: currentParticipant.id,
          ...freshScores,
          overall: freshOverall,
          notes: combinedNotes,
        });
      }, 800);
    },
    [currentParticipant, activeWhisky, tasting, tastingId, buildScoresBlock]
  );

  const chipSaveRef = useRef(0);
  useEffect(() => {
    if (!activeWhisky) return;
    chipSaveRef.current++;
    const gen = chipSaveRef.current;
    const timer = setTimeout(() => {
      if (gen !== chipSaveRef.current) return;
      debouncedSave(dimScores, overall, notes);
    }, 100);
    return () => clearTimeout(timer);
  }, [chips, dimTexts]);

  const computeAutoOverall = (s: Record<DimKey, number>) =>
    Math.round((s.nose + s.taste + s.finish) / 3);

  const handleScoreChange = (dim: DimKey, value: number) => {
    const newScores = { ...dimScores, [dim]: value };
    setDimScores(newScores);
    let newOverall = overall;
    if (!overrideActive) {
      newOverall = computeAutoOverall(newScores);
      setOverall(newOverall);
    }
    debouncedSave(newScores, newOverall, notes);
  };

  const handleOverallChange = (value: number) => {
    const auto = computeAutoOverall(dimScores);
    if (value !== auto) setOverrideActive(true);
    setOverall(value);
    debouncedSave(dimScores, value, notes);
  };

  const resetOverride = () => {
    setOverrideActive(false);
    const auto = computeAutoOverall(dimScores);
    setOverall(auto);
    debouncedSave(dimScores, auto, notes);
  };

  const handleChipToggle = (dim: DimKey, chip: string) => {
    setChips(prev => {
      const current = prev[dim];
      const next = current.includes(chip) ? current.filter(c => c !== chip) : [...current, chip];
      return { ...prev, [dim]: next };
    });
  };

  const handleTextChange = (dim: DimKey, text: string) => {
    setDimTexts(prev => ({ ...prev, [dim]: text }));
  };

  const updateNotes = (value: string) => {
    setNotes(value);
    debouncedSave(dimScores, overall, value);
  };

  const REVEAL_FIELD_LABELS: Record<string, string> = {
    name: "Name", distillery: "Distillery", age: "Age", abv: "ABV",
    region: "Region", country: "Country", category: "Category",
    caskInfluence: "Cask", peatLevel: "Peat", bottler: "Bottler",
    vintage: "Vintage", hostNotes: "Notes", hostSummary: "Summary", image: "Image",
    ppm: "PPM", price: "Price", wbId: "WB-ID", wbScore: "WB Score",
  };

  let displayName: string;
  let displaySub: string;
  let stepBadgeLabel: string;
  let stepBadgeClass: string;

  if (revealStep === 0) {
    stepBadgeLabel = "Rating Open";
    stepBadgeClass = "labs-badge-success";
    displayName = isBlindStep ? `Dram ${String.fromCharCode(65 + localIndex)}` : (activeWhisky?.name || "Unknown");
    displaySub = isBlindStep ? "Blind tasting" : "";
  } else if (isFullyRevealed) {
    stepBadgeLabel = "Fully Revealed";
    stepBadgeClass = "labs-badge-accent";
    displayName = activeWhisky?.name || "Unknown";
    const detailParts: string[] = [];
    if (activeWhisky?.distillery) detailParts.push(activeWhisky.distillery);
    if (activeWhisky?.age) detailParts.push(`${activeWhisky.age}y`);
    if (activeWhisky?.region) detailParts.push(activeWhisky.region);
    if (activeWhisky?.abv) detailParts.push(`${activeWhisky.abv}%`);
    displaySub = detailParts.join(" · ");
  } else {
    const currentStepFields = stepGroups[revealStep - 1] || [];
    const fieldLabels = currentStepFields
      .map((f: string) => REVEAL_FIELD_LABELS[f] || f)
      .slice(0, 3);
    stepBadgeLabel = fieldLabels.length > 0
      ? `${fieldLabels.join(", ")} Revealed`
      : "Step Revealed";
    stepBadgeClass = "labs-badge-info";

    displayName = revealedFields.has("name")
      ? (activeWhisky?.name || "Unknown")
      : (isBlindStep ? `Dram ${String.fromCharCode(65 + localIndex)}` : (activeWhisky?.name || "Unknown"));

    const detailParts: string[] = [];
    if (revealedFields.has("distillery") && activeWhisky?.distillery) detailParts.push(activeWhisky.distillery);
    if (revealedFields.has("age") && activeWhisky?.age) detailParts.push(`${activeWhisky.age}y`);
    if (revealedFields.has("region") && activeWhisky?.region) detailParts.push(activeWhisky.region);
    if (revealedFields.has("country") && activeWhisky?.country) detailParts.push(activeWhisky.country);
    if (revealedFields.has("abv") && activeWhisky?.abv) detailParts.push(`${activeWhisky.abv}%`);
    if (revealedFields.has("category") && activeWhisky?.category) detailParts.push(activeWhisky.category);
    if (revealedFields.has("caskInfluence") && activeWhisky?.caskInfluence) detailParts.push(activeWhisky.caskInfluence);
    if (revealedFields.has("bottler") && activeWhisky?.bottler) detailParts.push(activeWhisky.bottler);
    if (revealedFields.has("vintage") && activeWhisky?.vintage) detailParts.push(`${activeWhisky.vintage}`);
    if (revealedFields.has("peatLevel") && activeWhisky?.peatLevel) detailParts.push(activeWhisky.peatLevel);
    if (revealedFields.has("price") && activeWhisky?.price) detailParts.push(Number(activeWhisky.price).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €");
    displaySub = detailParts.join(" · ");
  }

  const canRate = currentParticipant && tasting?.status === "open";

  return (
    <div className="labs-fade-in">
      <div className="labs-card-elevated p-5 mb-5 labs-fade-in labs-stagger-1">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setLocalIndex(Math.max(0, localIndex - 1))}
            disabled={localIndex === 0}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "var(--labs-surface)",
              color: localIndex === 0 ? "var(--labs-border)" : "var(--labs-text)",
              opacity: localIndex === 0 ? 0.3 : 1,
              border: "none",
              cursor: localIndex === 0 ? "default" : "pointer",
            }}
            data-testid="guided-prev"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="text-center">
            <span
              className="text-[11px] font-bold tracking-widest uppercase"
              style={{ color: "var(--labs-text-muted)" }}
              data-testid="guided-step-counter"
            >
              Dram {localIndex + 1} of {totalWhiskies}
            </span>
            <div className="mt-0.5">
              <span className={`labs-badge ${stepBadgeClass}`} data-testid="guided-step-badge">
                {viewingHostDram ? stepBadgeLabel : "Review"}
              </span>
            </div>
          </div>

          <button
            onClick={() => setLocalIndex(Math.min(hostMaxIndex, localIndex + 1))}
            disabled={localIndex >= hostMaxIndex}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background: "var(--labs-surface)",
              color: localIndex >= hostMaxIndex ? "var(--labs-border)" : "var(--labs-text)",
              opacity: localIndex >= hostMaxIndex ? 0.3 : 1,
              border: "none",
              cursor: localIndex >= hostMaxIndex ? "default" : "pointer",
            }}
            data-testid="guided-next"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="text-center py-3">
          <h2
            className="labs-h3"
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

        {activeWhisky?.imageUrl && (revealedFields.has("image") || isFullyRevealed) && (
          <div className="mt-3 rounded-xl overflow-hidden" style={{ maxHeight: 200 }}>
            <img
              src={activeWhisky.imageUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              style={{ maxHeight: 200 }}
              data-testid="guided-whisky-image"
            />
          </div>
        )}

        {viewingHostDram && isFullyRevealed && (
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
          <div className="labs-fade-in labs-stagger-2">
            <LabsRatingPanel
              scores={dimScores}
              onScoreChange={handleScoreChange}
              chips={chips}
              onChipToggle={handleChipToggle}
              texts={dimTexts}
              onTextChange={handleTextChange}
              overall={overall}
              onOverallChange={handleOverallChange}
              overallAuto={computeAutoOverall(dimScores)}
              overrideActive={overrideActive}
              onResetOverride={resetOverride}
              scale={maxScore}
              wizard={true}
            />
          </div>

          <div className="labs-card p-5 mb-4 mt-4 labs-fade-in labs-stagger-3">
            <label
              className="text-xs font-medium mb-2 block"
              style={{ color: "var(--labs-text-muted)", letterSpacing: "0.03em" }}
            >
              Tasting notes
            </label>
            <textarea
              className="labs-input"
              rows={3}
              placeholder="Your general impressions…"
              value={notes}
              onChange={(e) => updateNotes(e.target.value)}
              style={{ resize: "vertical" }}
              data-testid="guided-notes"
            />
            {VOICE_MEMOS_ENABLED && (
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
            )}
          </div>

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
          {!saveError && rateMutation.isSuccess && (
            <div
              className="flex items-center gap-1.5 mb-3 text-xs"
              style={{ color: "var(--labs-success)" }}
              data-testid="guided-saved"
            >
              <Check className="w-3 h-3" />
              Saved
            </div>
          )}

          {allWhiskies.length > 1 && guidedMyRatings.length > 0 && (
            <div className="labs-card-elevated mt-4 labs-fade-in labs-stagger-5" data-testid="guided-calibration-overview">
              <button
                type="button"
                onClick={() => setGuidedCalibrationOpen(!guidedCalibrationOpen)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
                }}
                data-testid="button-toggle-guided-calibration"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--labs-text)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    My Scores Overview
                  </span>
                  <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
                    ({guidedMyRatings.length}/{allWhiskies.length} rated)
                  </span>
                </div>
                <ChevronDown className="w-4 h-4" style={{ color: "var(--labs-text-muted)", transform: guidedCalibrationOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
              </button>
              {guidedCalibrationOpen && (
                <div style={{ padding: "0 16px 16px" }}>
                  <div className="space-y-2">
                    {allWhiskies.map((w: any, idx: number) => {
                      const rating = guidedMyRatings.find((r: any) => r.whiskyId === w.id);
                      const overall = rating?.overall;
                      const isCurrent = idx === localIndex;
                      const label = isBlindStep
                        ? `Dram ${String.fromCharCode(65 + idx)}`
                        : (w.name || `Dram ${idx + 1}`);
                      const isNavigable = idx <= hostMaxIndex;
                      return (
                        <div
                          key={w.id}
                          onClick={() => { if (isNavigable) setLocalIndex(idx); }}
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 10px", borderRadius: 8,
                            background: isCurrent ? "var(--labs-accent-muted)" : "transparent",
                            border: isCurrent ? "1px solid var(--labs-accent)" : "1px solid var(--labs-border-subtle, var(--labs-border))",
                            cursor: isNavigable ? "pointer" : "default",
                            opacity: isNavigable ? 1 : 0.5,
                          }}
                          data-testid={`guided-calibration-row-${idx}`}
                        >
                          <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--labs-text-muted)", width: 18, textAlign: "center", flexShrink: 0 }}>
                            {idx + 1}
                          </span>
                          <span className="text-xs font-medium truncate flex-1 text-left" style={{ color: isCurrent ? "var(--labs-accent)" : "var(--labs-text)" }}>
                            {label}
                          </span>
                          <div style={{ width: 60, height: 6, borderRadius: 3, background: "var(--labs-border)", flexShrink: 0, overflow: "hidden" }}>
                            {overall != null && (
                              <div style={{ width: `${(overall / maxScore) * 100}%`, height: "100%", borderRadius: 3, background: isCurrent ? "var(--labs-accent)" : "var(--labs-text-muted)", transition: "width 0.3s" }} />
                            )}
                          </div>
                          <span className="text-xs font-bold tabular-nums" style={{ color: overall != null ? (isCurrent ? "var(--labs-accent)" : "var(--labs-text)") : "var(--labs-text-muted)", width: 28, textAlign: "right", flexShrink: 0 }}>
                            {overall != null ? overall : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {guidedMyRatings.length >= 2 && (() => {
                    const overalls = guidedMyRatings.map((r: any) => r.overall).filter((v: any) => v != null);
                    if (overalls.length < 2) return null;
                    const avg = Math.round(overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length * 10) / 10;
                    const min = Math.min(...overalls);
                    const max = Math.max(...overalls);
                    return (
                      <div style={{ marginTop: 10, padding: "8px 10px", borderRadius: 8, background: "var(--labs-surface-elevated)" }} data-testid="guided-calibration-stats">
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
        </>
      ) : (
        <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
          {!currentParticipant ? (
            <p className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>
              Sign in to rate whiskies
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
              Ratings are currently closed
            </p>
          )}
        </div>
      )}

      <GuidedProgressDots total={totalWhiskies} currentIndex={localIndex} />
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

  const maxScore = tasting?.ratingScale || 100;
  const mid2 = Math.round(maxScore / 2);

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
      const n = myRating.nose ?? mid2;
      const ta = myRating.taste ?? mid2;
      const f = myRating.finish ?? mid2;
      const o = myRating.overall ?? mid2;
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
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may not exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={goBack} data-testid="labs-live-not-found-back">Tastings</button>
      </div>
    );
  }

  if (tastingLoading) {
    return (
      <div className="labs-page labs-fade-in" style={{ minHeight: "60vh" }}>
        <div className="space-y-4">
          <SkeletonLine width="50%" height={22} />
          <SkeletonLine width="35%" height={13} />
          <div style={{ height: 16 }} />
          <SkeletonList count={2} />
        </div>
      </div>
    );
  }

  if (!tasting) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <Wine className="w-10 h-10 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting may not exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={goBack} data-testid="labs-live-notfound-back">Tastings</button>
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
      <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in">
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
          {currentParticipant?.id !== tasting.hostId && <CompactDownloadButton tasting={tasting as Tasting} />}
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
    <div className="px-5 py-4 max-w-2xl mx-auto labs-fade-in">
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
        {currentParticipant?.id !== tasting.hostId && <CompactDownloadButton tasting={tasting as Tasting} />}
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
          <Wine className="w-12 h-12 mb-3" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} />
          <p className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>
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

                <div className="flex justify-between text-[11px] px-0.5" style={{ color: "var(--labs-text-muted)" }}>
                  <span>0</span>
                  <span>{Math.round(maxScore / 2)}</span>
                  <span>{maxScore}</span>
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
                    min={0}
                    max={maxScore}
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
                          const idxNameHidden = tasting?.blindMode && !idxRevealed.has("name") && !(freeRevealIdx > idx) && !(freeRevealStp >= freeStepGroups.length && freeRevealIdx >= idx);
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
            </>
          ) : (
            <div className="labs-card-elevated p-6 text-center labs-fade-in labs-stagger-2">
              {!currentParticipant ? (
                <p className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>
                  Sign in to rate whiskies
                </p>
              ) : tasting.status === "draft" ? (
                <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>
                  This session has not started yet
                </p>
              ) : tasting.status === "archived" ? (
                <div>
                  {tasting.presentationSlide != null && (
                    <PresentationLiveBanner tastingId={tastingId} />
                  )}
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