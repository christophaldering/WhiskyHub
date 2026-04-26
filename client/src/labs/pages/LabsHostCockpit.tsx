import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Play, Lock, Eye, EyeOff, SkipForward, Users, Wine, Star,
  BarChart3, CheckCircle2, Clock, ChevronLeft, Loader2,
  Monitor, Smartphone, FileText, Radio, X, LockKeyhole, Unlock, ImageOff, Sliders, RotateCcw, AlertTriangle,
  ChevronDown, Layers, Archive,
} from "lucide-react";
import ModalPortal from "@/labs/components/ModalPortal";
import ManageTastersDialog, { invalidateTastingAggregates } from "@/labs/components/ManageTastersDialog";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { useAppStore } from "@/lib/store";
import { stripGuestSuffix, formatScore } from "@/lib/utils";
import { getStatusConfig } from "@/labs/utils/statusConfig";
import { tastingApi, whiskyApi, blindModeApi, ratingApi, guidedApi } from "@/lib/api";
import LabsRatingPanel, { type DimKey } from "@/labs/components/LabsRatingPanel";
import RatingFlowV2 from "@/labs/components/rating/RatingFlowV2";
import { useRatingScale } from "@/labs/hooks/useRatingScale";
import type { RatingData } from "@/labs/components/rating/types";
import { useTastingEvents } from "@/labs/hooks/useTastingEvents";
import { signalRatingQueued } from "@/labs/components/OfflineBanner";
import { useToast } from "@/hooks/use-toast";

const POLL_FAST = 15000;
const POLL_NORMAL = 15000;

function blindLabel(idx: number): string {
  return String.fromCharCode(65 + idx);
}

const REVEAL_DEFAULT_ORDER: string[][] = [
  ["name"],
  ["distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
  ["image"],
];

type RevealPresetKey = "classic" | "nameFirst" | "photoFirst" | "custom";

const REVEAL_PRESETS: Record<RevealPresetKey, { labelKey: string; fallbackLabel: string; order: string[][] }> = {
  classic: {
    labelKey: "cockpit.presetClassic",
    fallbackLabel: "Classic",
    order: [["name"], ["distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"], ["image"]],
  },
  nameFirst: {
    labelKey: "cockpit.presetNameFirst",
    fallbackLabel: "Name First",
    order: [["name", "distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"], ["image"]],
  },
  photoFirst: {
    labelKey: "cockpit.presetPhotoFirst",
    fallbackLabel: "Photo First",
    order: [["image"], ["name"], ["distillery", "age", "abv", "region", "country", "category", "caskType", "bottler", "distilledYear", "bottledYear", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"]],
  },
  custom: {
    labelKey: "cockpit.presetCustom",
    fallbackLabel: "Custom",
    order: [["name"], ["distillery"], ["age", "abv"], ["region", "country", "category"], ["caskType", "peatLevel", "ppm"], ["bottler", "price"], ["image"]],
  },
};

function getRevealState(tasting: any, whiskyCount: number, translate?: (key: string) => string) {
  let stepGroups = REVEAL_DEFAULT_ORDER;
  try {
    if (tasting.revealOrder) {
      const parsed = JSON.parse(tasting.revealOrder);
      if (Array.isArray(parsed) && parsed.length > 0) stepGroups = parsed;
    }
  } catch {}
  const maxSteps = stepGroups.length;
  const revealIndex = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;
  const allRevealed = whiskyCount > 0 && revealIndex >= whiskyCount - 1 && revealStep >= maxSteps;

  const FIELD_LABELS: Record<string, string> = {
    name: "cockpitUi.fieldName", distillery: "cockpitUi.fieldDistillery", age: "cockpitUi.fieldAge", abv: "cockpitUi.fieldAbv",
    region: "cockpitUi.fieldRegion", country: "cockpitUi.fieldCountry", category: "cockpitUi.fieldCategory",
    caskType: "cockpitUi.fieldCask", peatLevel: "cockpitUi.fieldPeat", image: "cockpitUi.fieldImage",
    bottler: "cockpitUi.fieldBottler", vintage: "cockpitUi.fieldVintage", distilledYear: "cockpitUi.fieldDistilled",
    bottledYear: "cockpitUi.fieldBottled", hostNotes: "cockpitUi.fieldNotes",
    hostSummary: "cockpitUi.fieldSummary", price: "cockpitUi.fieldPrice", ppm: "cockpitUi.fieldPpm",
    wbId: "cockpitUi.fieldWbId", wbScore: "cockpitUi.fieldWbScore",
  };
  const tr = translate || ((k: string) => k);
  const stepLabels = stepGroups.map((group: string[]) => {
    const labels = group.map(f => tr(FIELD_LABELS[f] || f));
    if (labels.length <= 2) return labels.join(" & ");
    return labels.slice(0, 2).join(" & ") + " +";
  });

  let nextLabelKey = "cockpitUi.revealNext";
  let nextLabelParams: Record<string, string> = {};
  if (allRevealed) {
    nextLabelKey = "cockpitUi.allRevealed";
  } else if (revealStep < maxSteps) {
    const lbl = stepLabels[revealStep];
    if (lbl) {
      nextLabelKey = "cockpitUi.revealNextField";
      nextLabelParams = { field: lbl };
    }
  } else {
    nextLabelKey = "cockpitUi.nextDram";
  }

  return { revealIndex, revealStep, maxSteps, allRevealed, stepLabels, nextLabelKey, nextLabelParams, stepGroups };
}

function getGuestVisibility(tasting: any, stepGroups: string[][], isGuided: boolean) {
  const dramIdx = isGuided
    ? Math.max(0, tasting.guidedWhiskyIndex ?? 0)
    : (tasting.revealIndex ?? 0);
  const currentStep = isGuided
    ? (tasting.guidedRevealStep ?? 0)
    : (tasting.revealStep ?? 0);

  const revealedFields = new Set<string>();
  for (let s = 0; s < currentStep && s < stepGroups.length; s++) {
    for (const f of stepGroups[s]) revealedFields.add(f);
  }

  const isFieldRevealed = (field: string) => revealedFields.has(field);

  const stepStates = stepGroups.map((_: string[], sIdx: number) => {
    if (sIdx < currentStep) return "revealed" as const;
    if (sIdx === currentStep) return "next" as const;
    return "hidden" as const;
  });

  return { dramIdx, currentStep, revealedFields, isFieldRevealed, stepStates };
}

const REVEAL_FIELD_LABELS: Record<string, string> = {
  name: "cockpitUi.fieldName", distillery: "cockpitUi.fieldDistillery", age: "cockpitUi.fieldAge", abv: "cockpitUi.fieldAbv",
  region: "cockpitUi.fieldRegion", country: "cockpitUi.fieldCountry", category: "cockpitUi.fieldCategory",
  caskType: "cockpitUi.fieldCask", peatLevel: "cockpitUi.fieldPeat", bottler: "cockpitUi.fieldBottler",
  vintage: "cockpitUi.fieldVintage", distilledYear: "cockpitUi.fieldDistilled", bottledYear: "cockpitUi.fieldBottled",
  hostNotes: "cockpitUi.fieldNotes", hostSummary: "cockpitUi.fieldSummary", image: "cockpitUi.fieldImage",
  ppm: "cockpitUi.fieldPpm", price: "cockpitUi.fieldPrice", wbId: "cockpitUi.fieldWbId", wbScore: "cockpitUi.fieldWbScore",
};

interface LabsHostCockpitProps {
  tastingId: string;
  onExit: () => void;
}

type CockpitTab = "live" | "lineup" | "guests" | "rating";

function getDefaultTab(status: string): CockpitTab {
  switch (status) {
    case "closed":
    case "archived":
      return "guests";
    case "draft":
    case "open":
    case "reveal":
    default:
      return "live";
  }
}

export default function LabsHostCockpit({ tastingId, onExit }: LabsHostCockpitProps) {
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const pid = currentParticipant?.id || "";

  const [activeTab, setActiveTab] = useState<CockpitTab>("live");
  const tabInitRef = useRef(false);
  const userSelectedTabRef = useRef(false);
  const lastStatusRef = useRef<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < 768);
  const [isWideDesktop, setIsWideDesktop] = useState(() => typeof window !== "undefined" && window.innerWidth >= 1200);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(56);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    const mqWide = window.matchMedia("(min-width: 1200px)");
    setIsWideDesktop(mqWide.matches);
    const wideHandler = (e: MediaQueryListEvent) => setIsWideDesktop(e.matches);
    mqWide.addEventListener("change", wideHandler);
    return () => {
      mq.removeEventListener("change", handler);
      mqWide.removeEventListener("change", wideHandler);
    };
  }, []);
  useEffect(() => {
    if (!headerRef.current || !isMobile) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setHeaderHeight(entry.contentRect.height + 16);
      }
    });
    ro.observe(headerRef.current);
    return () => ro.disconnect();
  }, [isMobile]);

  const [showParticipantPicker, setShowParticipantPicker] = useState(false);
  const [pickerSaving, setPickerSaving] = useState(false);
  const [showManageTasters, setShowManageTasters] = useState(false);
  const [restartDialog, setRestartDialog] = useState<false | "choose" | "confirmClear">(false);
  const [hostRatingIdx, setHostRatingIdx] = useState(0);
  const [cockpitWizard, setCockpitWizard] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("labs-cockpit-wizard-mode") === "true";
    }
    return false;
  });

  const { t } = useTranslation();
  const [revealConfirmed, setRevealConfirmed] = useState(false);
  const revealConfirmTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealFlash, setRevealFlash] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  const [localRevealStep, setLocalRevealStep] = useState<number | null>(null);
  const [localGuidedIdx, setLocalGuidedIdx] = useState<number | null>(null);
  const [hostViewIdx, setHostViewIdx] = useState<number | null>(null);

  const [hostScores, setHostScores] = useState<Record<string, Record<DimKey, number>>>({});
  const [hostChips, setHostChips] = useState<Record<string, Record<DimKey, string[]>>>({});
  const [hostTexts, setHostTexts] = useState<Record<string, Record<DimKey, string>>>({});
  const [hostOverall, setHostOverall] = useState<Record<string, number>>({});
  const [hostOverride, setHostOverride] = useState<Record<string, boolean>>({});
  const [hostNotes, setHostNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };

  const { data: tasting } = useQuery({
    queryKey: ["tasting", tastingId],
    queryFn: () => tastingApi.get(tastingId),
    enabled: !!tastingId,
    refetchInterval: POLL_FAST,
  });

  const { data: whiskies = [] } = useQuery({
    queryKey: ["whiskies", tastingId],
    queryFn: () => whiskyApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: POLL_NORMAL,
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["tasting-participants", tastingId],
    queryFn: () => tastingApi.getParticipants(tastingId),
    enabled: !!tastingId,
    refetchInterval: POLL_NORMAL,
  });

  const { data: ratings = [] } = useQuery({
    queryKey: ["tasting-ratings", tastingId],
    queryFn: () => ratingApi.getForTasting(tastingId),
    enabled: !!tastingId,
    refetchInterval: POLL_NORMAL,
  });

  function pName(p: any) { return stripGuestSuffix(p.participant?.name || p.participant?.email || p.name || p.email || t("ui.anonymous")); }
  function pId(p: any) { return p.participantId || p.id; }

  const updateStatusMut = useMutation({
    mutationFn: (s: string) => tastingApi.updateStatus(tastingId, s, undefined, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
    },
  });

  const restartMut = useMutation({
    mutationFn: (clearRatings: boolean) => tastingApi.updateStatus(tastingId, "open", undefined, pid, clearRatings),
    onSuccess: () => {
      setRestartDialog(false);
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
      queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] });
    },
  });

  const revealNextMut = useMutation({
    mutationFn: () => blindModeApi.revealNext(tastingId, pid),
    onMutate: () => {
      setLocalRevealStep(prev => (prev ?? 0) + 1);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedAdvanceMut = useMutation({
    mutationFn: () => guidedApi.advance(tastingId, pid),
    onMutate: () => {
      const currentStep = localRevealStep ?? (tasting?.guidedRevealStep ?? 0);
      const currentIdx = localGuidedIdx ?? (tasting?.guidedWhiskyIndex ?? -1);
      let maxSteps = 3;
      try { if (tasting?.revealOrder) maxSteps = JSON.parse(tasting.revealOrder).length; } catch {}
      const prevIdx = currentIdx;
      const prevStep = currentStep;
      if (currentIdx === -1) {
        setLocalGuidedIdx(0);
        setLocalRevealStep(0);
      } else if (tasting?.blindMode && currentStep < maxSteps) {
        setLocalRevealStep(currentStep + 1);
      } else {
        setLocalGuidedIdx(currentIdx + 1);
        setLocalRevealStep(0);
      }
      return { prevIdx, prevStep };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
    onError: (_err: Error, _vars: void, context: { prevIdx: number; prevStep: number } | undefined) => {
      if (context) {
        setLocalGuidedIdx(context.prevIdx);
        setLocalRevealStep(context.prevStep);
      }
      toast({ title: t("cockpit.advanceError", "Failed to advance"), description: _err.message, variant: "destructive" });
    },
  });

  const guidedGoToMut = useMutation({
    mutationFn: (p: { whiskyIndex: number; revealStep?: number }) =>
      guidedApi.goTo(tastingId, pid, p.whiskyIndex, p.revealStep),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const ratingUpsertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => ratingApi.upsert(data),
    onSuccess: (result: Record<string, unknown>) => {
      if (result && typeof result === "object" && "queued" in result && result.queued) signalRatingQueued();
      queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] });
    },
  });

  useTastingEvents({
    tastingId,
    enabled: !!tastingId,
    onReveal: useCallback((data: Record<string, unknown>) => {
      setRevealConfirmed(true);
      if (revealConfirmTimerRef.current) clearTimeout(revealConfirmTimerRef.current);
      revealConfirmTimerRef.current = setTimeout(() => setRevealConfirmed(false), 1200);
      setRevealFlash(true);
      setTimeout(() => setRevealFlash(false), 180);
      if (typeof data.guidedRevealStep === "number") setLocalRevealStep(data.guidedRevealStep);
      if (typeof data.guidedWhiskyIndex === "number") setLocalGuidedIdx(data.guidedWhiskyIndex);
    }, []),
    onDramAdvanced: useCallback((data: Record<string, unknown>) => {
      setConfirmAdvance(false);
      if (typeof data.guidedWhiskyIndex === "number") {
        setLocalGuidedIdx(data.guidedWhiskyIndex);
        setLocalRevealStep(0);
      }
    }, []),
  });

  useEffect(() => {
    return () => { if (revealConfirmTimerRef.current) clearTimeout(revealConfirmTimerRef.current); };
  }, []);

  useEffect(() => {
    if (tasting) {
      setLocalRevealStep(null);
      setLocalGuidedIdx(null);
    }
  }, [tasting?.guidedRevealStep, tasting?.guidedWhiskyIndex]);

  const parseSavedNotes = useCallback((rawNotes: string) => {
    const chips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
    const texts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };
    let cleanNotes = rawNotes;
    for (const d of ["nose", "taste", "finish"] as DimKey[]) {
      const re = new RegExp(`\\[${d.toUpperCase()}\\]\\s*([\\s\\S]*?)\\s*\\[\\/${d.toUpperCase()}\\]`);
      const m = rawNotes.match(re);
      if (m) {
        cleanNotes = cleanNotes.replace(m[0], "");
        const content = m[1].trim();
        const parts = content.split(" — ");
        if (parts.length >= 2) {
          chips[d] = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          texts[d] = parts.slice(1).join(" — ");
        } else if (parts.length === 1) {
          const maybeChips = parts[0].split(",").map(s => s.trim()).filter(Boolean);
          if (maybeChips.every(c => c.length < 20)) chips[d] = maybeChips;
          else texts[d] = parts[0];
        }
      }
    }
    cleanNotes = cleanNotes.replace(/\[SCORES\][\s\S]*?\[\/SCORES\]/, "");
    return { chips, texts, cleanNotes: cleanNotes.trim() };
  }, []);

  const buildScoresBlock = useCallback((wId: string) => {
    const ch = hostChips[wId] || emptyChips;
    const tx = hostTexts[wId] || emptyTexts;
    const hasDimData = (["nose", "taste", "finish"] as DimKey[]).some(
      (d) => ch[d].length > 0 || tx[d].trim()
    );
    if (!hasDimData) return "";
    const parts: string[] = [];
    for (const d of ["nose", "taste", "finish"] as DimKey[]) {
      const chipStr = ch[d].length > 0 ? ch[d].join(", ") : "";
      const textStr = tx[d].trim();
      if (chipStr || textStr) {
        parts.push(`[${d.toUpperCase()}] ${[chipStr, textStr].filter(Boolean).join(" — ")} [/${d.toUpperCase()}]`);
      }
    }
    return parts.length > 0 ? "\n" + parts.join("\n") : "";
  }, [hostChips, hostTexts]);

  useEffect(() => {
    if (whiskies.length === 0 || !pid) return;
    const load = async () => {
      for (const w of whiskies) {
        if (hostScores[w.id]) continue;
        try {
          const existing = await ratingApi.getMyRating(pid, w.id);
          if (existing) {
            const parsed = parseSavedNotes(existing.notes || "");
            const sMax = ratingScale;
            const sMin = sMax === 100 ? 60 : 0;
            const sDef = sMax === 100 ? 75 : Math.round((sMax * 0.75) / cockpitScale.step) * cockpitScale.step;
            const toUserScale = (v: number | null | undefined) => {
              if (v == null) return sDef;
              if (sMax !== 100 && v > sMax) {
                return Math.round((v / 100) * sMax * 10) / 10;
              }
              return Math.max(sMin, Math.min(sMax, v));
            };
            setHostScores(prev => ({ ...prev, [w.id]: { nose: toUserScale(existing.nose), taste: toUserScale(existing.taste), finish: toUserScale(existing.finish) } }));
            setHostOverall(prev => ({ ...prev, [w.id]: toUserScale(existing.overall) }));
            setHostChips(prev => ({ ...prev, [w.id]: parsed.chips }));
            setHostTexts(prev => ({ ...prev, [w.id]: parsed.texts }));
            setHostNotes(prev => ({ ...prev, [w.id]: parsed.cleanNotes }));
          }
        } catch {}
      }
    };
    load();
  }, [whiskies.length, pid]);

  const debouncedSave = useCallback((whiskyId: string, freshScores: Record<DimKey, number>, freshOverall: number, freshNotes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const scoresBlock = buildScoresBlock(whiskyId);
      const combinedNotes = (freshNotes + scoresBlock).trim();
      setSaving(true);
      ratingUpsertMut.mutate({
        participantId: pid,
        whiskyId,
        tastingId,
        nose: freshScores.nose, taste: freshScores.taste, finish: freshScores.finish,
        overall: freshOverall,
        notes: combinedNotes,
      }, { onSettled: () => setSaving(false) });
    }, 800);
  }, [pid, tastingId, buildScoresBlock]);

  const chipSaveRef = useRef(0);
  useEffect(() => {
    if (!whiskies.length) return;
    const wId = whiskies[hostRatingIdx]?.id;
    if (!wId || !hostScores[wId]) return;
    chipSaveRef.current++;
    const gen = chipSaveRef.current;
    const sc = hostScores[wId];
    const _inv = 1 / cockpitScale.step;
    const ov = hostOverall[wId] ?? (Math.round(((sc.nose + sc.taste + sc.finish) / 3) * _inv) / _inv);
    const notes = hostNotes[wId] || "";
    const timer = setTimeout(() => {
      if (gen !== chipSaveRef.current) return;
      debouncedSave(wId, sc, ov, notes);
    }, 100);
    return () => clearTimeout(timer);
  }, [hostChips, hostTexts]);

  useEffect(() => {
    if (!tasting) return;
    if (!tabInitRef.current) {
      tabInitRef.current = true;
      lastStatusRef.current = tasting.status;
      setActiveTab(getDefaultTab(tasting.status));
      return;
    }
    if (tasting.status !== lastStatusRef.current && !userSelectedTabRef.current) {
      lastStatusRef.current = tasting.status;
      setActiveTab(getDefaultTab(tasting.status));
    } else {
      lastStatusRef.current = tasting.status;
    }
  }, [tasting?.status]);

  const status = tasting?.status ?? "draft";
  const isBlind = tasting?.blindMode ?? false;
  const isGuided = tasting?.guidedMode ?? false;
  const guidedIdx = localGuidedIdx ?? (tasting?.guidedWhiskyIndex ?? -1);
  const guidedRevealStep = localRevealStep ?? (tasting?.guidedRevealStep ?? 0);
  const ratingScale = tasting?.ratingScale ?? 100;
  const cockpitScale = useRatingScale(ratingScale);
  const scaleDefault = ratingScale === 100 ? 75 : Math.round((ratingScale * 0.75) / cockpitScale.step) * cockpitScale.step;
  const isLive = status === "open" || status === "reveal";
  const isDraft = status === "draft";

  const rv = isBlind && tasting ? getRevealState(tasting, whiskies.length, t) : null;
  const optimisticTasting = useMemo(() => {
    if (!tasting) return tasting;
    const t = { ...tasting };
    if (localRevealStep != null) t.guidedRevealStep = localRevealStep;
    if (localGuidedIdx != null) t.guidedWhiskyIndex = localGuidedIdx;
    return t;
  }, [tasting, localRevealStep, localGuidedIdx]);
  const gv = isBlind && rv && optimisticTasting ? getGuestVisibility(optimisticTasting, rv.stepGroups, isGuided) : null;
  const guestDramIdx = gv ? gv.dramIdx : (isGuided ? Math.max(0, guidedIdx) : 0);
  const effectiveDramIdx = hostViewIdx ?? guestDramIdx;
  const activeWhisky = whiskies[effectiveDramIdx] || null;

  const activePreset: RevealPresetKey = useMemo(() => {
    if (!tasting?.revealOrder) return "classic";
    try {
      const parsed = JSON.parse(tasting.revealOrder);
      for (const [key, preset] of Object.entries(REVEAL_PRESETS)) {
        if (JSON.stringify(preset.order) === JSON.stringify(parsed)) return key as RevealPresetKey;
      }
      return "custom";
    } catch { return "classic"; }
  }, [tasting?.revealOrder]);

  const incompleteParticipants = useMemo(() => {
    if (!isGuided || guidedIdx < 0 || !whiskies[guidedIdx]) return [];
    const currentWhiskyId = whiskies[guidedIdx].id;
    const ratedPids = new Set(
      ratings.filter((r: any) => r.whiskyId === currentWhiskyId).map((r: any) => r.participantId)
    );
    return participants
      .filter((p: any) => !ratedPids.has(pId(p)))
      .map((p: any) => pName(p));
  }, [isGuided, guidedIdx, whiskies, ratings, participants]);

  const nextDramName = useMemo(() => {
    if (!isGuided || guidedIdx < 0) return null;
    const nextIdx = guidedIdx + 1;
    if (nextIdx >= whiskies.length) return null;
    const w = whiskies[nextIdx];
    return isBlind ? `Dram ${blindLabel(nextIdx)}` : (w.name || `Dram ${nextIdx + 1}`);
  }, [isGuided, guidedIdx, whiskies, isBlind]);

  const groupStats = useMemo(() => {
    if (!activeWhisky) return null;
    const excludedIds = new Set(
      participants.filter((p: any) => p.excludedFromResults).map((p: any) => pId(p))
    );
    const whiskyRatings = ratings.filter((r: any) => r.whiskyId === activeWhisky.id && !excludedIds.has(r.participantId));
    if (whiskyRatings.length === 0) return null;
    const dims = ["nose", "taste", "finish", "overall"] as const;
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    for (const d of dims) {
      const vals = whiskyRatings.map((r: any) => r[d]).filter((v: any) => v != null) as number[];
      if (vals.length === 0) { result[d] = { avg: 0, min: 0, max: 0, count: 0 }; continue; }
      const sum = vals.reduce((a, b) => a + b, 0);
      result[d] = {
        avg: Math.round(sum / vals.length * 2) / 2,
        min: Math.min(...vals),
        max: Math.max(...vals),
        count: vals.length,
      };
    }
    return result;
  }, [activeWhisky, ratings, participants]);

  if (!tasting) return null;

  const lockedDrams: string[] = (() => {
    try { return JSON.parse(tasting.lockedDrams || "[]"); } catch { return []; }
  })();
  const isDramLocked = (whiskyId: string) => lockedDrams.includes(whiskyId);
  const toggleDramLock = async (whiskyId: string) => {
    const next = isDramLocked(whiskyId)
      ? lockedDrams.filter((id: string) => id !== whiskyId)
      : [...lockedDrams, whiskyId];
    await tastingApi.updateDetails(tastingId, pid, { lockedDrams: JSON.stringify(next) });
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
  };
  const currentRatingWhisky = whiskies[hostRatingIdx] || null;

  const totalParticipants = participants.length;
  const totalRatings = ratings.length;
  const totalExpected = whiskies.length * totalParticipants;
  const overallProgress = totalExpected > 0 ? Math.round((totalRatings / totalExpected) * 100) : 0;

  const handleStartSession = async () => {
    await tastingApi.updateStatus(tastingId, "open", undefined, pid);
    if (whiskies.length > 0) {
      await guidedApi.updateMode(tastingId, pid, { guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 });
    }
    await tastingApi.join(tastingId, pid);
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    queryClient.invalidateQueries({ queryKey: ["tastings"] });
  };

  const handleEndSession = () => {
    setShowParticipantPicker(true);
  };

  const handlePickerConfirm = async () => {
    setPickerSaving(true);
    try {
      invalidateTastingAggregates(queryClient, tastingId);
      updateStatusMut.mutate("closed");
      setShowParticipantPicker(false);
    } catch {
      // keep modal open on error
    } finally {
      setPickerSaving(false);
    }
  };

  const defaultScores = (): Record<DimKey, number> => ({ nose: scaleDefault, taste: scaleDefault, finish: scaleDefault });
  const getScores = (wId: string): Record<DimKey, number> => hostScores[wId] || defaultScores();
  const getOverall = (wId: string) => hostOverall[wId] ?? scaleDefault;
  const roundToStep = (v: number) => {
    const inv = 1 / cockpitScale.step;
    return Math.round(v * inv) / inv;
  };
  const getOverallAuto = (wId: string) => {
    const sc = getScores(wId);
    return roundToStep((sc.nose + sc.taste + sc.finish) / 3);
  };

  const handleScoreChange = (wId: string, dim: DimKey, val: number) => {
    const current = getScores(wId);
    const updated = { ...current, [dim]: val };
    setHostScores(prev => ({ ...prev, [wId]: updated }));
    let freshOverall: number;
    if (!hostOverride[wId]) {
      freshOverall = roundToStep((updated.nose + updated.taste + updated.finish) / 3);
      setHostOverall(prev => ({ ...prev, [wId]: freshOverall }));
    } else {
      freshOverall = hostOverall[wId] ?? scaleDefault;
    }
    debouncedSave(wId, updated, freshOverall, hostNotes[wId] || "");
  };

  const handleOverallChange = (wId: string, val: number) => {
    setHostOverall(prev => ({ ...prev, [wId]: val }));
    setHostOverride(prev => ({ ...prev, [wId]: true }));
    debouncedSave(wId, getScores(wId), val, hostNotes[wId] || "");
  };

  const handleChipToggle = (wId: string, dim: DimKey, chip: string) => {
    setHostChips(prev => {
      const current = prev[wId] || emptyChips;
      const dimChips = current[dim];
      const next = dimChips.includes(chip) ? dimChips.filter(c => c !== chip) : [...dimChips, chip];
      return { ...prev, [wId]: { ...current, [dim]: next } };
    });
  };

  const handleTextChange = (wId: string, dim: DimKey, text: string) => {
    setHostTexts(prev => {
      const current = prev[wId] || emptyTexts;
      return { ...prev, [wId]: { ...current, [dim]: text } };
    });
  };

  const handlePresetChange = async (key: RevealPresetKey) => {
    const newOrder = JSON.stringify(REVEAL_PRESETS[key].order);
    await tastingApi.updateDetails(tastingId, pid, { revealOrder: newOrder });
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    setShowPresetPicker(false);
  };

  const handleAdvanceWithConfirm = () => {
    const isMovingToNextDram = guidedIdx >= 0 && (!isBlind || !rv || guidedRevealStep >= (rv?.maxSteps ?? 0));
    if (!confirmAdvance && isMovingToNextDram) {
      setConfirmAdvance(true);
      return;
    }
    setConfirmAdvance(false);
    guidedAdvanceMut.mutate();
  };

  const getSource = (participantId: string): "digital" | "paper" | "pending" => {
    const pRatings = ratings.filter((r: any) => r.participantId === participantId);
    if (pRatings.length === 0) return "pending";
    const hasPaper = pRatings.some((r: any) => r.source === "paper");
    const hasApp = pRatings.some((r: any) => !r.source || r.source === "app");
    if (hasPaper && !hasApp) return "paper";
    return "digital";
  };

  return (
    <div className="cockpit-root" data-testid="labs-cockpit">
      <style>{`
        .cockpit-root {
          min-height: 100vh;
          background: var(--labs-bg);
          padding: 0 clamp(12px, 2vw, 24px) 48px;
        }
        .cockpit-inner {
          max-width: 1400px;
          margin: 0 auto;
        }
        .cockpit-header {
          padding: 16px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .cockpit-header-left {
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 0;
        }
        .cockpit-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-shrink: 0;
        }
        .cockpit-stats {
          display: flex;
          gap: 6px;
        }
        .cockpit-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 10px;
          background: var(--labs-surface);
          border: 1px solid var(--labs-border);
          font-size: 13px;
          font-weight: 600;
          color: var(--labs-text);
          font-variant-numeric: tabular-nums;
        }
        .cockpit-stat-icon {
          color: var(--labs-accent);
          display: flex;
        }
        .cockpit-stat-label {
          font-size: 11px;
          color: var(--labs-text-muted);
          font-weight: 500;
        }
        .cockpit-grid {
          display: grid;
          grid-template-columns: 260px 1fr 360px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 1199px) {
          .cockpit-grid {
            grid-template-columns: 1fr 340px;
            gap: 16px;
          }
        }
        @media (max-width: 767px) {
          .cockpit-grid {
            grid-template-columns: 1fr;
          }
          .cockpit-header {
            flex-wrap: wrap;
            position: sticky;
            top: 0;
            z-index: 20;
            background: var(--labs-bg);
            padding-bottom: 8px;
          }
          .cockpit-stats .cockpit-stat-label {
            display: none;
          }
          .cockpit-stats .cockpit-stat {
            padding: 4px 8px;
          }
        }
        .cockpit-segmented {
          display: flex;
          position: sticky;
          z-index: 19;
          background: var(--labs-bg);
          padding: 0 0 12px;
        }
        .cockpit-segmented-inner {
          display: flex;
          position: relative;
          background: var(--labs-surface);
          border: 1px solid var(--labs-border);
          border-radius: 10px;
          padding: 3px;
          width: 100%;
          gap: 2px;
        }
        .cockpit-seg-btn {
          flex: 1;
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 4px;
          border: none;
          background: transparent;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          color: var(--labs-text-muted);
          cursor: pointer;
          font-family: inherit;
          transition: color 200ms ease;
          white-space: nowrap;
        }
        .cockpit-seg-btn[data-active="true"] {
          color: var(--labs-text);
        }
        .cockpit-seg-indicator {
          position: absolute;
          top: 3px;
          bottom: 3px;
          border-radius: 8px;
          background: var(--labs-surface-elevated);
          border: 1px solid var(--labs-border);
          transition: left 250ms cubic-bezier(0.4, 0, 0.2, 1), width 250ms cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 1;
        }
        .cockpit-card {
          background: var(--labs-surface);
          border: 1px solid var(--labs-border);
          border-radius: 16px;
          overflow: hidden;
        }
        .cockpit-card-body {
          padding: 20px;
        }
        .cockpit-card-header {
          padding: 14px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--labs-border);
          background: color-mix(in srgb, var(--labs-surface-elevated) 50%, var(--labs-surface));
        }
        .cockpit-card-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--labs-text-muted);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cockpit-progress-bar {
          height: 4px;
          border-radius: 2px;
          background: var(--labs-surface-elevated);
          overflow: hidden;
        }
        .cockpit-progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.5s ease;
        }
        .cockpit-dram-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1.5px solid transparent;
          transition: all 0.15s;
          cursor: default;
        }
        .cockpit-dram-row[data-active="true"] {
          background: var(--labs-surface-elevated);
          border-color: var(--labs-accent);
        }
        .cockpit-dram-row[data-clickable="true"] {
          cursor: pointer;
        }
        .cockpit-dram-row[data-clickable="true"]:hover {
          background: var(--labs-surface-elevated);
        }
        .cockpit-lineup-sidebar {
          position: sticky;
          top: 16px;
          max-height: calc(100vh - 32px);
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .cockpit-compact-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          border-radius: 10px;
          border: 1.5px solid transparent;
          transition: all 0.15s;
          cursor: default;
        }
        .cockpit-compact-row[data-active="true"] {
          background: color-mix(in srgb, var(--labs-accent) 12%, var(--labs-surface));
          border-color: var(--labs-accent);
        }
        .cockpit-compact-row[data-clickable="true"] {
          cursor: pointer;
        }
        .cockpit-compact-row[data-clickable="true"]:hover {
          background: var(--labs-surface-elevated);
        }
        .cockpit-compact-badge {
          width: 26px;
          height: 26px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .cockpit-compact-progress-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
          transition: background 0.3s;
        }
        @media (max-width: 1199px) {
          .cockpit-lineup-sidebar {
            display: none;
          }
        }
        .cockpit-dram-badge {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 700;
          flex-shrink: 0;
          transition: all 0.15s;
        }
        .cockpit-participant-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border-radius: 10px;
        }
        .cockpit-participant-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .cockpit-action-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.15s;
        }
        .cockpit-action-primary {
          background: var(--labs-accent);
          color: var(--labs-bg);
        }
        .cockpit-action-primary:hover {
          filter: brightness(1.05);
        }
        .cockpit-action-primary:disabled {
          opacity: 0.5;
          cursor: default;
        }
        .cockpit-action-success {
          background: var(--labs-success);
          color: #fff;
        }
        .cockpit-action-secondary {
          background: var(--labs-surface-elevated);
          color: var(--labs-text);
          border: 1px solid var(--labs-border);
        }
        .cockpit-action-secondary:hover {
          border-color: var(--labs-accent);
        }
        .cockpit-action-danger {
          background: var(--labs-danger);
          color: #fff;
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeScale {
          0% { opacity: 0; transform: scale(0.92); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cockpitFlash {
          0% { opacity: 0.65; }
          100% { opacity: 0; }
        }
        .cockpit-reveal-flash {
          position: fixed;
          inset: 0;
          background: #fff;
          z-index: 9999;
          pointer-events: none;
          animation: cockpitFlash 180ms ease-out forwards;
        }
        .cockpit-stage-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 600;
          border: 1px solid transparent;
          transition: all 150ms;
        }
        .cockpit-stage-pill[data-state="done"] {
          background: color-mix(in srgb, var(--labs-success) 10%, transparent);
          color: var(--labs-success);
          border-color: color-mix(in srgb, var(--labs-success) 25%, transparent);
        }
        .cockpit-stage-pill[data-state="active"] {
          background: color-mix(in srgb, var(--labs-accent) 12%, transparent);
          color: var(--labs-accent);
          border-color: var(--labs-accent);
        }
        .cockpit-stage-pill[data-state="pending"] {
          background: transparent;
          color: var(--labs-text-muted);
          border-color: var(--labs-border);
        }
        .cockpit-preset-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          margin-top: 4px;
          background: var(--labs-surface-elevated);
          border: 1px solid var(--labs-border);
          border-radius: 10px;
          padding: 4px;
          min-width: 160px;
          z-index: 30;
          box-shadow: 0 8px 20px rgba(0,0,0,0.3);
        }
        .cockpit-preset-option {
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: transparent;
          border-radius: 7px;
          font-size: 12px;
          font-weight: 500;
          color: var(--labs-text);
          cursor: pointer;
          text-align: left;
          font-family: inherit;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: background 100ms;
        }
        .cockpit-preset-option:hover {
          background: var(--labs-surface);
        }
        .cockpit-preset-option[data-active="true"] {
          color: var(--labs-accent);
          font-weight: 700;
        }
        .cockpit-confirm-inline {
          padding: 10px 14px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--labs-accent) 6%, var(--labs-surface));
          border: 1px solid var(--labs-accent);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
      `}</style>

      {revealFlash && <div className="cockpit-reveal-flash" data-testid="cockpit-reveal-flash" />}

      <div className="cockpit-inner">
        {/* ─── HEADER ─── */}
        <div className="cockpit-header" ref={headerRef}>
          <div className="cockpit-header-left">
            <button
              onClick={onExit}
              className="labs-btn-ghost"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", flexShrink: 0 }}
              data-testid="cockpit-exit"
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Exit
            </button>

            <h2
              className="labs-serif"
              style={{ fontSize: 17, fontWeight: 600, color: "var(--labs-text)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              data-testid="cockpit-title"
            >
              {tasting.title || "Untitled Tasting"}
            </h2>

            {isLive && (
              <span className="labs-status-chip labs-status-chip--live" data-testid="cockpit-badge-live">
                <span className="labs-status-live-dot" />
                {t("tastingStatus.open", "Live")}
              </span>
            )}
          </div>

          <div className="cockpit-header-right">
            <div className="cockpit-stats">
              <div className="cockpit-stat">
                <span className="cockpit-stat-icon"><Users style={{ width: 13, height: 13 }} /></span>
                {totalParticipants}
                <span className="cockpit-stat-label">Guests</span>
              </div>
              <div className="cockpit-stat">
                <span className="cockpit-stat-icon"><Wine style={{ width: 13, height: 13 }} /></span>
                {whiskies.length}
                <span className="cockpit-stat-label">Drams</span>
              </div>
              <div className="cockpit-stat">
                <span className="cockpit-stat-icon"><Star style={{ width: 13, height: 13 }} /></span>
                {totalRatings}
                <span className="cockpit-stat-label">Ratings</span>
              </div>
            </div>
          </div>

          {isMobile && isLive && whiskies.length > 0 && (
            <div style={{ width: "100%", marginTop: 4 }}>
              <div className="cockpit-progress-bar" style={{ height: 3 }}>
                <div className="cockpit-progress-fill" style={{ width: `${overallProgress}%`, background: overallProgress === 100 ? "var(--labs-success)" : "var(--labs-accent)" }} />
              </div>
            </div>
          )}
        </div>

        {isMobile && (() => {
          const tabs: { key: CockpitTab; label: string }[] = [
            { key: "live", label: t("cockpit.tabOverview", "Overview") },
            { key: "guests", label: t("cockpit.tabGroup", "Group") },
          ];
          const activeIdx = tabs.findIndex(t => t.key === activeTab);
          const pct = 100 / tabs.length;
          return (
            <div className="cockpit-segmented" style={{ top: headerHeight }} data-testid="cockpit-segmented-control">
              <div className="cockpit-segmented-inner">
                <div
                  className="cockpit-seg-indicator"
                  style={{ left: `calc(${activeIdx * pct}% + 3px)`, width: `calc(${pct}% - 4px)` }}
                />
                {tabs.map(t => (
                  <button
                    key={t.key}
                    className="cockpit-seg-btn"
                    data-active={activeTab === t.key}
                    onClick={() => { userSelectedTabRef.current = true; setActiveTab(t.key); }}
                    data-testid={`cockpit-tab-${t.key}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ─── MAIN CONTENT ─── */}
        {isMobile ? (
          <>
            {/* Mobile: Tab-based layout */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {activeTab === "live" && (<>
                {renderGuestView()}
                {renderControls(true)}
                {renderLineup()}
                {renderParticipants()}
                <button
                  onClick={() => { navigate(`/labs/live/${tastingId}`); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    width: "100%", padding: "14px 16px", borderRadius: 12,
                    border: "1px solid var(--labs-border)",
                    background: "var(--labs-surface-elevated)",
                    cursor: "pointer", fontFamily: "inherit",
                    textAlign: "left",
                  }}
                  data-testid="cockpit-rate-dram-btn"
                >
                  <Star style={{ width: 18, height: 18, color: "var(--labs-accent)", flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                      {t("cockpit.rateDram", "Dram bewerten")}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 2 }}>
                      {t("cockpit.rateDramDesc", "Zur Tasting-Seite wechseln")}
                    </div>
                  </div>
                  <ChevronDown style={{ width: 14, height: 14, color: "var(--labs-text-muted)", transform: "rotate(-90deg)", flexShrink: 0 }} />
                </button>
              </>)}

              {activeTab === "guests" && renderGroupStats()}

            </div>
          </>
        ) : (
          <>
            {/* Desktop: 3-column grid (≥1200px) or 2-column (768–1199px) */}
            <div className="cockpit-grid">
              {/* Left column: Lineup sidebar (visible ≥1200px only) */}
              <div className="cockpit-lineup-sidebar" data-testid="cockpit-lineup-sidebar">
                {/* Session status badge */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={getStatusConfig(status).cssClass} data-testid="cockpit-sidebar-status">
                    {status === "open" && <span className="labs-status-live-dot" />}
                    {status === "archived" && <Lock style={{ width: 10, height: 10 }} />}
                    {t(getStatusConfig(status).labelKey, getStatusConfig(status).fallbackLabel)}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600 }}>
                    {whiskies.length} Drams
                  </span>
                </div>

                {/* Overall progress */}
                {isLive && whiskies.length > 0 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontWeight: 600 }}>Progress</span>
                      <span style={{ fontSize: 10, color: "var(--labs-accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{overallProgress}%</span>
                    </div>
                    <div className="cockpit-progress-bar">
                      <div className="cockpit-progress-fill" style={{ width: `${overallProgress}%`, background: overallProgress === 100 ? "var(--labs-success)" : "var(--labs-accent)" }} />
                    </div>
                  </div>
                )}

                {/* Compact lineup list */}
                {renderCompactLineup()}
              </div>

              {/* Middle column: Controls, Lineup (hidden when sidebar visible), Participants, My Rating */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {renderControls(false)}
                {!isWideDesktop && renderLineup()}
                {renderParticipants()}
                {renderMyRating()}
              </div>

              {/* Right column: Guest View */}
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {renderGuestView()}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );

  function renderGuestView() {
    return (
      <div
        className="cockpit-card"
        style={{ border: "1.5px solid var(--labs-accent)", boxShadow: "0 0 20px rgba(212,162,86,0.06)" }}
        data-testid="cockpit-guest-preview"
      >
        <div className="cockpit-card-header" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 10%, var(--labs-surface)), var(--labs-surface))" }}>
          <div className="cockpit-card-title">
            <div style={{ width: 24, height: 24, borderRadius: 7, background: "var(--labs-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Smartphone style={{ width: 13, height: 13, color: "var(--labs-bg)" }} />
            </div>
            {t("cockpit.guestView", "Guest View")}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isBlind && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowPresetPicker(v => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 4,
                    padding: "3px 8px", borderRadius: 6,
                    border: "1px solid var(--labs-border)",
                    background: "transparent", color: "var(--labs-accent)",
                    fontSize: 10, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                  }}
                  data-testid="cockpit-preset-trigger"
                >
                  <Layers style={{ width: 10, height: 10 }} />
                  {t(REVEAL_PRESETS[activePreset].labelKey, REVEAL_PRESETS[activePreset].fallbackLabel)}
                  <ChevronDown style={{ width: 9, height: 9 }} />
                </button>
                {showPresetPicker && (
                  <div className="cockpit-preset-dropdown" data-testid="cockpit-preset-dropdown">
                    {(Object.keys(REVEAL_PRESETS) as RevealPresetKey[]).map(key => (
                      <button
                        key={key}
                        className="cockpit-preset-option"
                        data-active={key === activePreset}
                        onClick={() => handlePresetChange(key)}
                        data-testid={`cockpit-preset-${key}`}
                      >
                        {key === activePreset && <CheckCircle2 style={{ width: 11, height: 11 }} />}
                        {t(REVEAL_PRESETS[key].labelKey, REVEAL_PRESETS[key].fallbackLabel)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {isBlind && <span className="labs-badge labs-badge-accent"><EyeOff style={{ width: 12, height: 12 }} /> Blind</span>}
            {isGuided && <span className="labs-badge labs-badge-accent"><SkipForward style={{ width: 12, height: 12 }} /> Guided</span>}
          </div>
        </div>

        <div className="cockpit-card-body">
          {!isLive && isDraft ? (
            <div style={{ textAlign: "center", padding: "28px 20px", color: "var(--labs-text-muted)" }}>
              <Clock style={{ width: 28, height: 28, margin: "0 auto 10px", display: "block", opacity: 0.6 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t("cockpitUi.sessionNotStarted")}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Guests will see a waiting screen.</div>
            </div>
          ) : isLive && isGuided && guidedIdx < 0 ? (
            <div style={{ textAlign: "center", padding: "28px 20px", color: "var(--labs-text-muted)" }}>
              <Radio style={{ width: 28, height: 28, margin: "0 auto 10px", display: "block", animation: "pulse 2s infinite" }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>{t("cockpitUi.waitingForFirstDram")}</div>
              <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Press "Start First Dram" to begin.</div>
            </div>
          ) : activeWhisky ? (
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ flexShrink: 0 }}>
                {(() => {
                  const imageRevealed = !isBlind || (gv && gv.isFieldRevealed("image"));
                  const imageJustRevealed = isBlind && gv && gv.isFieldRevealed("image");
                  const hasImage = activeWhisky.imageUrl;
                  if (hasImage) {
                    return (
                      <div style={{ position: "relative", ...(imageJustRevealed ? { animation: "fadeScale 400ms ease-out" } : {}) }}>
                        <div style={{ opacity: imageRevealed ? 1 : 0.35, filter: imageRevealed ? "none" : "blur(2px) grayscale(0.5)" }}>
                          <WhiskyImage imageUrl={activeWhisky.imageUrl} name={activeWhisky.name || "?"} size={72} height={90} whiskyId={activeWhisky.id} />
                        </div>
                        {!imageRevealed && (
                          <div style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.55)", borderRadius: 4, padding: "2px 4px", display: "flex", alignItems: "center", gap: 2 }}>
                            <LockKeyhole style={{ width: 10, height: 10, color: "#fff" }} />
                          </div>
                        )}
                      </div>
                    );
                  }
                  return (
                    <div style={{
                      width: 72, height: 90, borderRadius: 12,
                      background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                    }}>
                      <ImageOff style={{ width: 18, height: 18, color: "var(--labs-text-muted)", opacity: 0.6 }} />
                      <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>No image</span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {(() => {
                  const nameHidden = isBlind && gv && !gv.isFieldRevealed("name");
                  const nameRevealed = isBlind && gv && gv.isFieldRevealed("name");
                  return (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        fontSize: 18, fontWeight: 700,
                        color: nameHidden ? "var(--labs-text-muted)" : "var(--labs-text)",
                        fontFamily: "var(--labs-font-serif, Georgia, serif)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        ...(nameRevealed ? { animation: "popIn 350ms ease-out" } : {}),
                      }}>
                        {nameHidden ? `Dram ${blindLabel(effectiveDramIdx)}` : (activeWhisky.name || "—")}
                      </div>
                      {nameHidden && (
                        <LockKeyhole style={{ width: 13, height: 13, color: "var(--labs-text-muted)", opacity: 0.7, flexShrink: 0 }} />
                      )}
                    </div>
                    {nameHidden && (
                      <div style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 600, marginTop: 2 }}>
                        Guests see: Dram {blindLabel(effectiveDramIdx)}
                      </div>
                    )}
                    <div style={{
                      fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3,
                      ...(isBlind && gv && gv.currentStep > 0 ? { animation: "slideUp 300ms ease-out" } : {}),
                    }}>
                      {(() => {
                        const detailFields: Array<[string, string | null | undefined]> = [
                          ["distillery", activeWhisky.distillery], ["age", activeWhisky.age ? `${activeWhisky.age}y` : null],
                          ["abv", activeWhisky.abv ? `${activeWhisky.abv}%` : null], ["region", activeWhisky.region],
                          ["country", activeWhisky.country], ["category", activeWhisky.category],
                          ["caskType", activeWhisky.caskType], ["bottler", activeWhisky.bottler],
                          ["distilledYear", (activeWhisky as any).distilledYear ? `Dist. ${(activeWhisky as any).distilledYear}` : null],
                          ["bottledYear", (activeWhisky as any).bottledYear ? `Btl. ${(activeWhisky as any).bottledYear}` : null],
                          ["peatLevel", activeWhisky.peatLevel],
                          ["ppm", activeWhisky.ppm ? `${activeWhisky.ppm} ppm` : null],
                          ["price", activeWhisky.price ? Number(activeWhisky.price).toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €" : null],
                        ];
                        if (isBlind && gv) {
                          const withValues = detailFields.filter(([, v]) => v);
                          if (withValues.length === 0) return "—";
                          return withValues.map(([f, v]) => {
                            const revealed = gv.isFieldRevealed(f);
                            return (
                              <span key={f} style={{
                                opacity: revealed ? 1 : 0.5,
                                display: "inline",
                              }}>
                                {revealed ? v : "●●●"}
                              </span>
                            );
                          }).reduce<ReactNode[]>((acc, el, i) => {
                            if (i > 0) acc.push(<span key={`sep-${i}`}> · </span>);
                            acc.push(el);
                            return acc;
                          }, []);
                        }
                        return detailFields.map(([, v]) => v).filter(Boolean).join(" · ") || "—";
                      })()}
                    </div>
                  </div>
                  );
                })()}

                {tasting.ratingPrompt && (
                  <div style={{ padding: "6px 10px", borderRadius: 8, background: "var(--labs-accent-muted)", fontSize: 12, color: "var(--labs-accent)", fontStyle: "italic", marginTop: 10 }}>
                    "{tasting.ratingPrompt}"
                  </div>
                )}

                {activeWhisky?.handoutUrl && (
                  <a
                    href={activeWhisky.handoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10,
                      padding: "5px 10px", borderRadius: 6, background: "var(--labs-surface-elevated)",
                      border: "1px solid var(--labs-border)", textDecoration: "none",
                      fontSize: 11, color: "var(--labs-text-secondary)", fontWeight: 500,
                    }}
                    data-testid={`cockpit-handout-link-${activeWhisky.id}`}
                  >
                    <FileText style={{ width: 12, height: 12, color: "var(--labs-accent)" }} />
                    {activeWhisky.handoutTitle || "Handout"}
                    <span style={{ fontSize: 9, color: "var(--labs-text-muted)" }}>
                      · {activeWhisky.handoutVisibility === "after_reveal" ? "nach Reveal" : "immer sichtbar"}
                    </span>
                  </a>
                )}

                {(() => {
                  const optimisticRevealStep = localRevealStep ?? (rv?.revealStep ?? 0);
                  const isFullyRevealed = !isBlind || (rv && optimisticRevealStep >= rv.maxSteps);
                  if (!isFullyRevealed) {
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12, padding: "8px 10px", borderRadius: 8, background: "var(--labs-surface-elevated)" }}>
                        <LockKeyhole style={{ width: 12, height: 12, color: "var(--labs-text-muted)" }} />
                        <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 500 }}>
                          {t("cockpit.scoresAfterReveal", "Group scores visible after full reveal")}
                        </span>
                      </div>
                    );
                  }
                  const whiskyRatings = activeWhisky
                    ? ratings.filter((r: any) => r.whiskyId === activeWhisky.id)
                    : [];
                  const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
                  const dims: { label: string; key: string }[] = [
                    { label: t("cockpitUi.nose"), key: "nose" },
                    { label: t("cockpitUi.taste"), key: "taste" },
                    { label: t("cockpitUi.finish"), key: "finish" },
                    { label: t("cockpitUi.overall"), key: "overall" },
                  ];
                  const avgs = dims.map(d => {
                    const validRatings = whiskyRatings.filter((r: any) => r[d.key] != null);
                    if (validRatings.length === 0) return 0;
                    const sum = validRatings.reduce((acc: number, r: any) => acc + r[d.key], 0);
                    return Math.round(sum / validRatings.length * 2) / 2;
                  });
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
                      {dims.map((d, i) => {
                        const pct = ratedCount > 0 ? Math.max(0, Math.min(100, (avgs[i] / ratingScale) * 100)) : 0;
                        return (
                          <div key={d.key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 44, textAlign: "right", fontWeight: 500 }}>{d.label}</span>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--labs-surface-elevated)", overflow: "hidden" }}>
                              <div style={{ width: `${pct}%`, height: "100%", borderRadius: 3, background: "var(--labs-accent)", opacity: 0.6, transition: "width 0.4s ease" }} />
                            </div>
                            <span data-testid={`guest-avg-${d.key}`} style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 40, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                              {ratedCount > 0 ? `${formatScore(avgs[i])}/${ratingScale}` : "—"}
                            </span>
                          </div>
                        );
                      })}
                      <div data-testid="guest-rated-counter" style={{ fontSize: 10, color: "var(--labs-text-muted)", textAlign: "right", marginTop: 2 }}>
                        {ratedCount > 0 ? `${ratedCount}/${totalParticipants} ${t("ui.rated")}` : t("cockpitUi.noRatingsYet")}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 20px", color: "var(--labs-text-muted)" }}>
              <Wine style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
              <div style={{ fontSize: 13 }}>No whiskies added yet.</div>
            </div>
          )}
        </div>

        {isBlind && rv && gv && isLive && (
          <div style={{ padding: "0 20px 16px" }}>
            <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--labs-text-muted)", marginBottom: 4 }}>
                <Eye style={{ width: 10, height: 10 }} />
                {t("cockpit.hostSees", "Host sees")}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeWhisky?.name || "—"} {activeWhisky?.distillery ? `· ${activeWhisky.distillery}` : ""}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: "var(--labs-text-muted)", marginTop: 8, marginBottom: 4 }}>
                <EyeOff style={{ width: 10, height: 10 }} />
                {t("cockpit.paxSees", "Guests see")}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-accent)" }}>
                {gv.currentStep === 0
                  ? `Dram ${blindLabel(effectiveDramIdx)}`
                  : (() => {
                      const parts: string[] = [];
                      for (let s = 0; s < gv.currentStep && s < rv.stepGroups.length; s++) {
                        for (const f of rv.stepGroups[s]) {
                          const val: Record<string, string> = {
                            name: activeWhisky?.name || "", distillery: activeWhisky?.distillery || "",
                            age: activeWhisky?.age ? `${activeWhisky.age}y` : "", abv: activeWhisky?.abv ? `${activeWhisky.abv}%` : "",
                            region: activeWhisky?.region || "", image: activeWhisky?.imageUrl ? "📷" : "",
                          };
                          if (val[f]) parts.push(val[f]);
                        }
                      }
                      return parts.slice(0, 4).join(" · ") + (parts.length > 4 ? " …" : "") || `Dram ${blindLabel(effectiveDramIdx)}`;
                    })()
                }
              </div>
            </div>

            <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <EyeOff style={{ width: 10, height: 10 }} />
                {t("cockpit.revealProgress", "REVEAL STAGES")} — Dram {blindLabel(effectiveDramIdx)}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }} data-testid="cockpit-stage-pills">
                {rv.stepGroups.map((group: string[], sIdx: number) => {
                  const state = gv.stepStates[sIdx] || "hidden";
                  const pillState = state === "revealed" ? "done" : state === "next" ? "active" : "pending";
                  const label = group.map(f => t(REVEAL_FIELD_LABELS[f] || f));
                  const shortLabel = label.length <= 2 ? label.join(" & ") : label[0] + ` +${label.length - 1}`;
                  return (
                    <span key={sIdx} className="cockpit-stage-pill" data-state={pillState} data-testid={`stage-pill-${sIdx}`}>
                      {pillState === "done" ? <CheckCircle2 style={{ width: 10, height: 10 }} /> : pillState === "active" ? <Eye style={{ width: 10, height: 10 }} /> : <LockKeyhole style={{ width: 10, height: 10 }} />}
                      {shortLabel}
                    </span>
                  );
                })}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {rv.stepGroups.map((group: string[], sIdx: number) => {
                  const state = gv.stepStates[sIdx] || "hidden";
                  const isRevealed = state === "revealed";
                  const isCurrent = state === "next";
                  const fieldLabels = group.map(f => t(REVEAL_FIELD_LABELS[f] || f)).join(", ");
                  const fieldValueMap: Record<string, string> = {
                    name: activeWhisky?.name || "", distillery: activeWhisky?.distillery || "",
                    age: activeWhisky?.age ? `${activeWhisky.age}y` : "", abv: activeWhisky?.abv ? `${activeWhisky.abv}%` : "",
                    region: activeWhisky?.region || "", country: activeWhisky?.country || "",
                    category: activeWhisky?.category || "", caskType: activeWhisky?.caskType || "",
                    bottler: activeWhisky?.bottler || "", peatLevel: activeWhisky?.peatLevel || "",
                    distilledYear: activeWhisky?.distilledYear || "", bottledYear: activeWhisky?.bottledYear || "",
                    ppm: activeWhisky?.ppm ? String(activeWhisky.ppm) : "", price: activeWhisky?.price || "",
                    wbId: activeWhisky?.whiskybaseId || "", wbScore: activeWhisky?.wbScore ? String(activeWhisky.wbScore) : "",
                    hostNotes: activeWhisky?.hostNotes ? "✓" : "", hostSummary: activeWhisky?.hostSummary ? "✓" : "",
                    image: activeWhisky?.imageUrl ? "✓" : "",
                  };
                  const revealedValues = isRevealed && activeWhisky
                    ? group.map(f => fieldValueMap[f]).filter(Boolean).join(" · ")
                    : "";
                  return (
                    <div key={sIdx} style={{
                      display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8,
                      background: isRevealed ? "color-mix(in srgb, var(--labs-success) 8%, transparent)" : isCurrent ? "color-mix(in srgb, var(--labs-accent) 8%, transparent)" : "transparent",
                      border: isCurrent ? "1px solid var(--labs-accent)" : "1px solid transparent",
                    }} data-testid={`cockpit-reveal-step-${sIdx}`}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 10, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        background: isRevealed ? "var(--labs-success)" : isCurrent ? "var(--labs-accent)" : "var(--labs-border)",
                        color: isRevealed || isCurrent ? "#fff" : "var(--labs-text-muted)", fontSize: 10,
                      }}>
                        {isRevealed ? <Unlock style={{ width: 10, height: 10 }} /> : <LockKeyhole style={{ width: 10, height: 10 }} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: isRevealed ? "var(--labs-success)" : isCurrent ? "var(--labs-accent)" : "var(--labs-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {fieldLabels}
                        </div>
                        {isRevealed && revealedValues && (
                          <div style={{ fontSize: 10, color: "var(--labs-text-secondary)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {revealedValues}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGroupStats() {
    return (
      <div className="cockpit-card" data-testid="cockpit-group-stats">
        <div className="cockpit-card-header">
          <div className="cockpit-card-title">
            <BarChart3 style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
            {t("cockpit.groupTitle", "Group Ratings")}
          </div>
          {activeWhisky && (
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)" }}>
              {isBlind ? `Dram ${blindLabel(effectiveDramIdx)}` : (activeWhisky.name || `Dram ${effectiveDramIdx + 1}`)}
            </span>
          )}
        </div>
        <div className="cockpit-card-body">
          {!groupStats ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>
              {t("cockpit.noRatingsYet", "No ratings yet for this dram.")}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {(["nose", "taste", "finish", "overall"] as const).map(dim => {
                const s = groupStats[dim];
                if (!s || s.count === 0) return null;
                const pct = Math.max(0, Math.min(100, (s.avg / ratingScale) * 100));
                const spread = s.max - s.min;
                const consensus = spread <= ratingScale * 0.15 ? "high" : spread <= ratingScale * 0.3 ? "medium" : "low";
                return (
                  <div key={dim} data-testid={`group-stat-${dim}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", textTransform: "capitalize" }}>
                        {t(`cockpit.dim${dim.charAt(0).toUpperCase() + dim.slice(1)}`, dim.charAt(0).toUpperCase() + dim.slice(1))}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>
                          {formatScore(s.avg)}
                        </span>
                        <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>/ {ratingScale}</span>
                      </div>
                    </div>
                    <div className="cockpit-progress-bar" style={{ height: 5 }}>
                      <div className="cockpit-progress-fill" style={{ width: `${pct}%`, background: "var(--labs-accent)" }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3, fontSize: 10, color: "var(--labs-text-muted)" }}>
                      <span>{t("cockpit.range", "Range")}: {formatScore(s.min)}–{formatScore(s.max)}</span>
                      <span style={{
                        color: consensus === "high" ? "var(--labs-success)" : consensus === "medium" ? "var(--labs-accent)" : "var(--labs-text-muted)",
                        fontWeight: 600,
                      }}>
                        {consensus === "high" ? t("cockpit.consensusHigh", "High consensus") : consensus === "medium" ? t("cockpit.consensusMed", "Medium") : t("cockpit.consensusLow", "Low consensus")}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textAlign: "right", marginTop: 4 }}>
                {t("cockpit.basedOn", "Based on {{count}} ratings", { count: groupStats.overall?.count || 0 })}
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, borderTop: "1px solid var(--labs-border)", paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Users style={{ width: 11, height: 11 }} />
              {t("cockpit.participantStatus", "Participant Status")}
            </div>
            {participants.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>No participants yet.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {participants.map((p: any) => {
                  const participantId = pId(p);
                  const whiskyRatings = activeWhisky
                    ? ratings.filter((r: any) => r.whiskyId === activeWhisky.id && r.participantId === participantId)
                    : [];
                  const hasRated = whiskyRatings.length > 0;
                  const score = hasRated ? whiskyRatings[0]?.overall : null;
                  return (
                    <div key={participantId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", borderRadius: 8 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                        background: hasRated ? "var(--labs-success)" : "var(--labs-text-muted)",
                      }} />
                      <span style={{ flex: 1, fontSize: 12, color: "var(--labs-text)", fontWeight: 500 }}>{pName(p)}</span>
                      <span style={{ fontSize: 11, color: hasRated ? "var(--labs-accent)" : "var(--labs-text-muted)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {hasRated && score != null ? `${formatScore(score)}/${ratingScale}` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  function renderControls(inline: boolean) {
    const controlButtons = (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {isDraft && (
          <button
            onClick={handleStartSession}
            disabled={whiskies.length === 0}
            className="cockpit-action-btn cockpit-action-success"
            data-testid="cockpit-start"
          >
            <Play style={{ width: 15, height: 15 }} />
            Start Tasting
          </button>
        )}

        {isLive && isGuided && (() => {
          const allDramsDone = guidedIdx >= whiskies.length - 1 && (!isBlind || guidedRevealStep >= (rv?.maxSteps ?? 0));
          let guidedBtnLabel = t("cockpit.nextDram", "Next Dram");
          if (guidedIdx < 0) {
            guidedBtnLabel = t("cockpit.revealStart", "Start Reveal");
          } else if (allDramsDone) {
            guidedBtnLabel = t("cockpit.revealDone", "All Drams Done");
          } else if (isBlind && rv) {
            if (guidedRevealStep < rv.maxSteps) {
              const lbl = rv.stepLabels[guidedRevealStep];
              guidedBtnLabel = lbl ? t("cockpit.revealNext", "Next: {{stage}}", { stage: lbl }) : t("cockpit.revealNextGeneric", "Reveal Next");
            } else {
              guidedBtnLabel = t("cockpit.allRevealed", "All info revealed");
            }
          }

          const isAdvancingDram = guidedIdx >= 0 && (!isBlind || !rv || guidedRevealStep >= (rv?.maxSteps ?? 0));

          return (
            <>
              {confirmAdvance && isAdvancingDram && (
                <div className="cockpit-confirm-inline" data-testid="cockpit-advance-confirm">
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)" }}>
                    {nextDramName
                      ? t("cockpit.confirmNext", "Advance to {{name}}?", { name: nextDramName })
                      : t("cockpit.confirmFinish", "Finish all drams?")}
                  </div>
                  {incompleteParticipants.length > 0 && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11, color: "var(--labs-accent)" }}>
                      <AlertTriangle style={{ width: 12, height: 12, flexShrink: 0, marginTop: 1 }} />
                      <span>
                        {t("cockpit.incomplete", "{{count}} participant(s) haven't rated yet: {{names}}", {
                          count: incompleteParticipants.length,
                          names: incompleteParticipants.slice(0, 3).join(", ") + (incompleteParticipants.length > 3 ? ` +${incompleteParticipants.length - 3}` : ""),
                        })}
                      </span>
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={() => setConfirmAdvance(false)}
                      className="cockpit-action-btn cockpit-action-secondary"
                      style={{ flex: 1, padding: "8px 12px" }}
                      data-testid="cockpit-advance-cancel"
                    >
                      {t("common.cancel", "Cancel")}
                    </button>
                    <button
                      onClick={() => { setConfirmAdvance(false); guidedAdvanceMut.mutate(); }}
                      className="cockpit-action-btn cockpit-action-primary"
                      style={{ flex: 1, padding: "8px 12px" }}
                      disabled={guidedAdvanceMut.isPending}
                      data-testid="cockpit-advance-proceed"
                    >
                      {guidedAdvanceMut.isPending
                        ? <Loader2 style={{ width: 13, height: 13, animation: "spin 1s linear infinite" }} />
                        : <SkipForward style={{ width: 13, height: 13 }} />}
                      {t("cockpit.proceed", "Proceed")}
                    </button>
                  </div>
                </div>
              )}

              {!confirmAdvance && (
                <button
                  onClick={handleAdvanceWithConfirm}
                  disabled={guidedAdvanceMut.isPending || allDramsDone}
                  className="cockpit-action-btn cockpit-action-primary"
                  style={revealConfirmed ? { boxShadow: "0 0 12px var(--labs-accent)", transition: "box-shadow 300ms ease" } : undefined}
                  data-testid="cockpit-next-dram"
                >
                  {guidedAdvanceMut.isPending
                    ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                    : revealConfirmed
                      ? <CheckCircle2 style={{ width: 15, height: 15, color: "var(--labs-success)" }} />
                      : <SkipForward style={{ width: 15, height: 15 }} />}
                  {revealConfirmed ? t("cockpit.sent", "Sent!") : guidedBtnLabel}
                </button>
              )}
            </>
          );
        })()}

        {isLive && isBlind && !isGuided && (
          rv && rv.revealIndex < whiskies.length ? (
            <button
              onClick={() => revealNextMut.mutate()}
              disabled={revealNextMut.isPending}
              className="cockpit-action-btn cockpit-action-secondary"
              style={revealConfirmed ? { boxShadow: "0 0 12px var(--labs-accent)", transition: "box-shadow 300ms ease" } : undefined}
              data-testid="cockpit-reveal-next"
            >
              {revealNextMut.isPending
                ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} />
                : revealConfirmed
                  ? <CheckCircle2 style={{ width: 14, height: 14, color: "var(--labs-success)" }} />
                  : <Eye style={{ width: 14, height: 14 }} />}
              {revealConfirmed ? t("analyticsUi.sent") : (rv ? t(rv.nextLabelKey, rv.nextLabelParams) : t("cockpitUi.revealNext"))}
            </button>
          ) : (
            <div style={{ textAlign: "center", fontSize: 12, color: "var(--labs-success)", fontWeight: 600, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <CheckCircle2 style={{ width: 14, height: 14 }} />
              All whiskies revealed
            </div>
          )
        )}

        {status === "open" && (
          <button onClick={handleEndSession} className="cockpit-action-btn cockpit-action-secondary" data-testid="cockpit-end">
            <Lock style={{ width: 14, height: 14 }} />
            {t("cockpit.endTasting", "End Session")}
          </button>
        )}

        {status === "reveal" && !restartDialog && (
          <button
            onClick={() => {
              if (confirm("Archive this tasting? It will become immutable and appear in the Historical Tastings archive. An admin can reopen it if needed.")) {
                tastingApi.updateStatus(tastingId, "archived", undefined, pid).then(() => {
                  queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
                });
              }
            }}
            className="cockpit-action-btn cockpit-action-primary"
            data-testid="cockpit-archive"
          >
            <Archive style={{ width: 14, height: 14 }} />
            Archive Tasting
          </button>
        )}

        {["closed", "reveal"].includes(status) && !restartDialog && (
          <button onClick={() => setRestartDialog("choose")} className="cockpit-action-btn cockpit-action-secondary" data-testid="cockpit-restart">
            <RotateCcw style={{ width: 14, height: 14 }} />
            Restart Session
          </button>
        )}

        {status === "archived" && currentParticipant?.role === "admin" && !restartDialog && (
          <button onClick={() => setRestartDialog("choose")} className="cockpit-action-btn cockpit-action-secondary" data-testid="cockpit-restart">
            <RotateCcw style={{ width: 14, height: 14 }} />
            Reopen (Admin)
          </button>
        )}

        {restartDialog === "choose" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--labs-text-muted)", textAlign: "center", fontWeight: 600 }}>Restart Options</div>
            <button
              onClick={() => restartMut.mutate(false)}
              disabled={restartMut.isPending}
              className="cockpit-action-btn cockpit-action-primary"
              data-testid="cockpit-restart-continue"
            >
              {restartMut.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Play style={{ width: 14, height: 14 }} />}
              Continue (keep ratings)
            </button>
            <button
              onClick={() => setRestartDialog("confirmClear")}
              className="cockpit-action-btn cockpit-action-danger"
              data-testid="cockpit-restart-full"
            >
              <AlertTriangle style={{ width: 14, height: 14 }} />
              Full restart (delete ratings)
            </button>
            <button onClick={() => setRestartDialog(false)} className="cockpit-action-btn cockpit-action-secondary" data-testid="cockpit-restart-cancel">
              {t("ui.cancel")}
            </button>
          </div>
        )}

        {restartDialog === "confirmClear" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "8px 0" }}>
            <div style={{ fontSize: 12, color: "var(--labs-danger, #e53e3e)", textAlign: "center", fontWeight: 600 }}>
              <AlertTriangle style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 4 }} />
              Are you sure? All ratings will be permanently deleted.
            </div>
            <button
              onClick={() => restartMut.mutate(true)}
              disabled={restartMut.isPending}
              className="cockpit-action-btn cockpit-action-danger"
              data-testid="cockpit-restart-confirm-clear"
            >
              {restartMut.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <AlertTriangle style={{ width: 14, height: 14 }} />}
              Yes, delete all ratings & restart
            </button>
            <button onClick={() => setRestartDialog("choose")} className="cockpit-action-btn cockpit-action-secondary" data-testid="cockpit-restart-back">
              Back
            </button>
          </div>
        )}
      </div>
    );

    if (inline) {
      return (
        <div style={{ padding: "16px 0 0", display: "flex", flexDirection: "column", gap: 8 }}>
          {controlButtons}
        </div>
      );
    }

    return (
      <div className="cockpit-card">
        <div className="cockpit-card-header">
          <div className="cockpit-card-title">
            <Radio style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
            Controls
          </div>
          <span className={getStatusConfig(status).cssClass}>
            {status === "open" && <span className="labs-status-live-dot" />}
            {t(getStatusConfig(status).labelKey, getStatusConfig(status).fallbackLabel)}
          </span>
        </div>
        <div className="cockpit-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {controlButtons}
        </div>
      </div>
    );
  }

  function renderCompactLineup() {
    if (whiskies.length === 0) {
      return (
        <div style={{ padding: 16, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 12 }}>
          No drams yet
        </div>
      );
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }} data-testid="cockpit-compact-lineup">
        {whiskies.map((w: any, idx: number) => {
          const isCurrent = isGuided ? idx === guidedIdx : idx === effectiveDramIdx;
          const isPast = isGuided ? idx < guidedIdx : false;
          const whiskyRatings = ratings.filter((r: any) => r.whiskyId === w.id);
          const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
          const avgScore = whiskyRatings.length > 0
            ? Math.round(whiskyRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / whiskyRatings.length * 2) / 2
            : null;
          const pct = totalParticipants > 0 ? Math.round((ratedCount / totalParticipants) * 100) : 0;
          const shortName = (w.name || `Whisky ${idx + 1}`).length > 18
            ? (w.name || `Whisky ${idx + 1}`).slice(0, 16) + "…"
            : (w.name || `Whisky ${idx + 1}`);

          return (
            <div
              key={w.id}
              className="cockpit-compact-row"
              data-active={isCurrent}
              data-clickable={true}
              onClick={() => isGuided ? guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 }) : setHostViewIdx(idx)}
              data-testid={`cockpit-compact-lineup-${idx}`}
            >
              <div className="cockpit-compact-badge" style={{
                background: isCurrent ? "var(--labs-accent)" : isPast ? "var(--labs-success-muted)" : "var(--labs-surface-elevated)",
                color: isCurrent ? "var(--labs-bg)" : isPast ? "var(--labs-success)" : "var(--labs-text-muted)",
              }}>
                {isPast ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : isBlind ? blindLabel(idx) : idx + 1}
              </div>

              <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 600, color: isCurrent ? "var(--labs-text)" : "var(--labs-text-secondary)" }}>
                {shortName}
              </div>

              <div className="cockpit-compact-progress-dot" style={{
                background: pct === 100 ? "var(--labs-success)" : pct > 0 ? "var(--labs-accent)" : "var(--labs-border)",
              }} title={`${pct}% rated`} />

              {avgScore !== null && (
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{formatScore(avgScore)}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderLineup() {
    return (
      <div className="cockpit-card" data-testid="cockpit-lineup">
        <div className="cockpit-card-header">
          <div className="cockpit-card-title">
            <Wine style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
            Lineup
            {isGuided && guidedIdx >= 0 && (
              <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 700, textTransform: "none" }}>
                — Dram {guidedIdx + 1} / {whiskies.length}
              </span>
            )}
          </div>
          {isBlind && isLive && (
            <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
              Unveiled: {isGuided ? Math.max(0, guidedIdx) : (rv?.revealIndex ?? 0)} / {whiskies.length}
            </span>
          )}
        </div>

        <div className="cockpit-card-body" style={{ padding: "12px 16px" }}>
          {whiskies.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>No whiskies added yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {whiskies.map((w: any, idx: number) => {
                const isCurrent = isGuided ? idx === guidedIdx : idx === effectiveDramIdx;
                const isPast = isGuided ? idx < guidedIdx : false;
                const whiskyRatings = ratings.filter((r: any) => r.whiskyId === w.id);
                const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
                const avgScore = whiskyRatings.length > 0
                  ? Math.round(whiskyRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / whiskyRatings.length * 2) / 2
                  : null;
                const pct = totalParticipants > 0 ? Math.round((ratedCount / totalParticipants) * 100) : 0;

                return (
                  <div
                    key={w.id}
                    className="cockpit-dram-row"
                    data-active={isCurrent}
                    data-clickable={true}
                    onClick={() => isGuided ? guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 }) : setHostViewIdx(idx)}
                    data-testid={`cockpit-lineup-${idx}`}
                  >
                    <div className="cockpit-dram-badge" style={{
                      background: isCurrent ? "var(--labs-accent)" : isPast ? "var(--labs-success-muted)" : "var(--labs-surface-elevated)",
                      color: isCurrent ? "var(--labs-bg)" : isPast ? "var(--labs-success)" : "var(--labs-text-muted)",
                    }}>
                      {isPast ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : isBlind ? blindLabel(idx) : idx + 1}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? "var(--labs-text)" : "var(--labs-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {w.name || `Whisky ${idx + 1}`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>
                        {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || "—"}
                      </div>
                      <div style={{ marginTop: 5 }}>
                        <div className="cockpit-progress-bar" style={{ height: 3 }}>
                          <div className="cockpit-progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--labs-success)" : "var(--labs-accent)" }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                      {avgScore !== null && (
                        <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{formatScore(avgScore)}</span>
                      )}
                      <span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>{ratedCount}/{totalParticipants} {t("ui.rated")}</span>
                      {isLive && (
                        <button
                          onClick={e => { e.stopPropagation(); toggleDramLock(w.id); }}
                          style={{
                            background: isDramLocked(w.id) ? "var(--labs-success-muted)" : "transparent",
                            border: isDramLocked(w.id) ? "1px solid var(--labs-success)" : "1px solid var(--labs-border)",
                            borderRadius: 6, padding: "2px 8px", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 3,
                            color: isDramLocked(w.id) ? "var(--labs-success)" : "var(--labs-text-muted)",
                            fontSize: 10, fontWeight: 600, marginTop: 2,
                          }}
                          data-testid={`cockpit-lock-${w.id}`}
                        >
                          <Lock style={{ width: 9, height: 9 }} />
                          {isDramLocked(w.id) ? t("cockpitUi.locked") : t("cockpitUi.lock")}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderParticipants() {
    return (
      <div className="cockpit-card" data-testid="cockpit-participants">
        {(() => {
          const uniqueRaters = new Set(ratings.map((r: any) => r.participantId));
          const ratedCount = participants.filter((p: any) => uniqueRaters.has(pId(p))).length;
          const totalP = participants.length;
          const progressPct = totalP > 0 ? Math.round((ratedCount / totalP) * 100) : 0;

          return (
            <>
              <div className="cockpit-card-header">
                <div className="cockpit-card-title">
                  <Users style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
                  Participants
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setShowManageTasters(true)}
                    title={t("manageTasters.openButton", "Taster verwalten")}
                    data-testid="cockpit-open-manage-tasters"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: "1px solid var(--labs-border)",
                      background: "transparent",
                      color: "var(--labs-text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <Sliders style={{ width: 11, height: 11 }} />
                    {t("manageTasters.openButton", "Taster verwalten")}
                  </button>
                  <span style={{ color: "var(--labs-accent)", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} data-testid="cockpit-rating-progress">
                    {ratedCount}/{totalP}
                  </span>
                </div>
              </div>

              <div className="cockpit-card-body" style={{ padding: "12px 16px" }}>
                {totalP > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div className="cockpit-progress-bar">
                      <div className="cockpit-progress-fill" style={{ width: `${progressPct}%`, background: progressPct === 100 ? "var(--labs-success)" : "var(--labs-accent)" }} />
                    </div>
                  </div>
                )}

                {totalP === 0 ? (
                  <div style={{ padding: 12, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 12 }}>No participants yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {participants.map((p: any) => {
                      const participantId = pId(p);
                      const source = getSource(participantId);
                      const totalWhiskiesRated = new Set(
                        ratings.filter((r: any) => r.participantId === participantId).map((r: any) => r.whiskyId)
                      ).size;

                      const isExcluded = !!p.excludedFromResults;
                      return (
                        <div key={participantId} className="cockpit-participant-row" data-testid={`cockpit-participant-${participantId}`}
                          style={{ opacity: isExcluded ? 0.5 : 1 }}>
                          <div className="cockpit-participant-avatar" style={{
                            background: source === "digital" ? "var(--labs-success-muted)" : source === "paper" ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                          }}>
                            {source === "digital"
                              ? <CheckCircle2 style={{ width: 14, height: 14, color: "var(--labs-success)" }} />
                              : source === "paper"
                              ? <FileText style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                              : <Clock style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
                          </div>
                          <span style={{ flex: 1, fontSize: 13, color: isExcluded ? "var(--labs-text-muted)" : "var(--labs-text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: isExcluded ? "line-through" : "none" }}>{pName(p)}</span>
                          {isExcluded && (
                            <span title={t("manageTasters.excludedBadge", "Ausgeschlossen")} style={{ flexShrink: 0, color: "var(--labs-text-muted)" }}>
                              <EyeOff style={{ width: 12, height: 12 }} />
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
                            {totalWhiskiesRated}/{whiskies.length}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </div>
    );
  }

  function renderMyRating() {
    return (
      <>
      <div className="cockpit-card">
        <div className="cockpit-card-header">
          <div className="cockpit-card-title">
            <Star style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
            My Rating
          </div>
          {!isDraft && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => {
                const next = !cockpitWizard;
                setCockpitWizard(next);
                localStorage.setItem("labs-cockpit-wizard-mode", String(next));
              }}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 6,
                border: "1px solid var(--labs-border)",
                background: cockpitWizard ? "var(--labs-accent-muted)" : "transparent",
                color: cockpitWizard ? "var(--labs-accent)" : "var(--labs-text-muted)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
              data-testid="cockpit-wizard-toggle"
            >
              <Sliders style={{ width: 10, height: 10 }} />
              {cockpitWizard ? t("cockpitUi.wizard") : t("cockpitUi.compact")}
            </button>
            {saving && (
              <span style={{ fontSize: 11, color: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
              </span>
            )}
          </div>
          )}
        </div>

        <div className="cockpit-card-body">
          {isDraft ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }} data-testid="rating-draft-placeholder">
              <Star style={{ width: 24, height: 24, color: "var(--labs-border)", marginBottom: 8 }} />
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("cockpitUi.ratingNotAvailable")}</div>
              <div>{t("cockpitUi.startTastingToRate")}</div>
            </div>
          ) : (
          <>
          <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
            {whiskies.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => setHostRatingIdx(idx)}
                style={{
                  padding: "4px 10px", borderRadius: 8,
                  border: idx === hostRatingIdx ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                  background: idx === hostRatingIdx ? "var(--labs-surface-elevated)" : "transparent",
                  color: idx === hostRatingIdx ? "var(--labs-accent)" : "var(--labs-text-muted)",
                  fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                }}
                data-testid={`cockpit-rating-tab-${idx}`}
              >
                {isBlind ? blindLabel(idx) : idx + 1}
              </button>
            ))}
          </div>

          {currentRatingWhisky ? (
            <RatingFlowV2
              key={currentRatingWhisky.id}
              scale={cockpitScale}
              whisky={{
                name: isBlind ? `Dram ${blindLabel(hostRatingIdx)}` : currentRatingWhisky.name || `Whisky ${hostRatingIdx + 1}`,
                region: currentRatingWhisky.region || undefined,
                cask: currentRatingWhisky.caskType || undefined,
                blind: isBlind,
              }}
              initialData={(() => {
                const wId = currentRatingWhisky.id;
                const sc = getScores(wId);
                const ov = getOverall(wId);
                const ch = hostChips[wId] || emptyChips;
                const tx = hostTexts[wId] || emptyTexts;
                return {
                  scores: { nose: sc.nose, palate: sc.taste, finish: sc.finish, overall: ov },
                  tags: { nose: ch.nose, palate: ch.taste, finish: ch.finish, overall: [] },
                  notes: { nose: tx.nose, palate: tx.taste, finish: tx.finish, overall: hostNotes[wId] || "" },
                } as RatingData;
              })()}
              onDone={(data: RatingData) => {
                const wId = currentRatingWhisky.id;
                const updatedScores: Record<DimKey, number> = {
                  nose: data.scores.nose,
                  taste: data.scores.palate,
                  finish: data.scores.finish,
                };
                setHostScores(prev => ({ ...prev, [wId]: updatedScores }));

                const computeOv = (s: { nose: number; palate: number; finish: number }) =>
                  roundToStep((s.nose + s.palate + s.finish) / 3);
                const eff = data.scores.overall > 0
                  ? data.scores.overall
                  : Math.max(cockpitScale.step, computeOv(data.scores));
                setHostOverall(prev => ({ ...prev, [wId]: eff }));

                setHostChips(prev => ({
                  ...prev,
                  [wId]: { nose: data.tags.nose, taste: data.tags.palate, finish: data.tags.finish },
                }));

                setHostTexts(prev => ({
                  ...prev,
                  [wId]: { nose: data.notes.nose || "", taste: data.notes.palate || "", finish: data.notes.finish || "" },
                }));

                const overallNote = data.notes.overall?.trim() || "";
                setHostNotes(prev => ({ ...prev, [wId]: overallNote }));

                debouncedSave(wId, updatedScores, eff, overallNote);
              }}
              onBack={() => {}}
            />
          ) : (
            <div style={{ padding: 16, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>
              No whiskies to rate yet.
            </div>
          )}
          </>
          )}
        </div>
      </div>

      <ManageTastersDialog
        open={showParticipantPicker}
        onClose={() => setShowParticipantPicker(false)}
        tastingId={tastingId}
        participants={participants as any}
        hostId={tasting?.hostId || null}
        confirmAction={{
          label: t("cockpit.participantPickerConfirm", "Tasting schließen"),
          icon: <Lock style={{ width: 14, height: 14 }} />,
          variant: "danger",
          busy: pickerSaving || updateStatusMut.isPending,
          onConfirm: handlePickerConfirm,
        }}
      />

      <ManageTastersDialog
        open={showManageTasters}
        onClose={() => setShowManageTasters(false)}
        tastingId={tastingId}
        participants={participants as any}
        hostId={tasting?.hostId || null}
      />
      </>
    );
  }
}
