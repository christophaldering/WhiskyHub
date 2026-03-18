import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play, Lock, Eye, EyeOff, SkipForward, Users, Wine, Star,
  BarChart3, CheckCircle2, Clock, ChevronLeft, Loader2,
  Monitor, Smartphone, FileText, Radio, X, LockKeyhole, Unlock, ImageOff, Sliders,
} from "lucide-react";
import WhiskyImage from "@/labs/components/WhiskyImage";
import { useAppStore } from "@/lib/store";
import { stripGuestSuffix } from "@/lib/utils";
import { tastingApi, whiskyApi, blindModeApi, ratingApi, guidedApi } from "@/lib/api";
import LabsRatingPanel, { type DimKey } from "@/labs/components/LabsRatingPanel";
import { useTastingEvents } from "@/labs/hooks/useTastingEvents";

const POLL_FAST = 15000;
const POLL_NORMAL = 15000;

function blindLabel(idx: number): string {
  return String.fromCharCode(65 + idx);
}

const REVEAL_DEFAULT_ORDER: string[][] = [
  ["name"],
  ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
  ["image"],
];

function getRevealState(tasting: any, whiskyCount: number) {
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

  const stepLabels = stepGroups.map((group: string[]) => {
    if (group.includes("name")) return "Name";
    if (group.includes("image")) return "Image";
    if (group.includes("distillery") || group.length > 2) return "Details";
    return group[0] || "Step";
  });

  let nextLabel = "Reveal Next";
  if (allRevealed) {
    nextLabel = "All Revealed";
  } else if (revealStep < maxSteps) {
    const lbl = stepLabels[revealStep];
    nextLabel = lbl ? `Reveal ${lbl}` : "Reveal Next";
  } else {
    nextLabel = "Next Dram";
  }

  return { revealIndex, revealStep, maxSteps, allRevealed, stepLabels, nextLabel, stepGroups };
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
  name: "Name", distillery: "Distillery", age: "Age", abv: "ABV",
  region: "Region", country: "Country", category: "Category",
  caskInfluence: "Cask", peatLevel: "Peat", bottler: "Bottler",
  vintage: "Vintage", hostNotes: "Notes", hostSummary: "Summary", image: "Image",
  ppm: "PPM", price: "Price", wbId: "WB-ID", wbScore: "WB Score",
};

interface LabsHostCockpitProps {
  tastingId: string;
  onExit: () => void;
}

export default function LabsHostCockpit({ tastingId, onExit }: LabsHostCockpitProps) {
  const { currentParticipant } = useAppStore();
  const queryClient = useQueryClient();
  const pid = currentParticipant?.id || "";

  const [confirmEnd, setConfirmEnd] = useState(false);
  const [hostRatingIdx, setHostRatingIdx] = useState(0);
  const [cockpitWizard, setCockpitWizard] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("labs-cockpit-wizard-mode") === "true";
    }
    return false;
  });

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

  const updateStatusMut = useMutation({
    mutationFn: (s: string) => tastingApi.updateStatus(tastingId, s, undefined, pid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      queryClient.invalidateQueries({ queryKey: ["tastings"] });
    },
  });

  const revealNextMut = useMutation({
    mutationFn: () => blindModeApi.revealNext(tastingId, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedAdvanceMut = useMutation({
    mutationFn: () => guidedApi.advance(tastingId, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedGoToMut = useMutation({
    mutationFn: (p: { whiskyIndex: number; revealStep?: number }) =>
      guidedApi.goTo(tastingId, pid, p.whiskyIndex, p.revealStep),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const ratingUpsertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => ratingApi.upsert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] }),
  });

  useTastingEvents({
    tastingId,
    enabled: !!tastingId,
  });

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
            const scaleDefault = Math.round((tasting?.ratingScale || 100) / 2);
            setHostScores(prev => ({ ...prev, [w.id]: { nose: existing.nose ?? scaleDefault, taste: existing.taste ?? scaleDefault, finish: existing.finish ?? scaleDefault } }));
            setHostOverall(prev => ({ ...prev, [w.id]: existing.overall ?? scaleDefault }));
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
    const ov = hostOverall[wId] ?? Math.round((sc.nose + sc.taste + sc.finish) / 3);
    const notes = hostNotes[wId] || "";
    const timer = setTimeout(() => {
      if (gen !== chipSaveRef.current) return;
      debouncedSave(wId, sc, ov, notes);
    }, 100);
    return () => clearTimeout(timer);
  }, [hostChips, hostTexts]);

  if (!tasting) return null;

  const status = tasting.status;
  const isBlind = tasting.blindMode;
  const isGuided = tasting.guidedMode;
  const guidedIdx = tasting.guidedWhiskyIndex ?? -1;
  const guidedRevealStep = tasting.guidedRevealStep ?? 0;
  const ratingScale = tasting.ratingScale ?? 100;
  const scaleDefault = Math.round(ratingScale / 2);
  const isLive = status === "open" || status === "reveal";
  const isDraft = status === "draft";

  const rv = isBlind ? getRevealState(tasting, whiskies.length) : null;
  const gv = isBlind && rv ? getGuestVisibility(tasting, rv.stepGroups, isGuided) : null;
  const guestDramIdx = gv ? gv.dramIdx : (isGuided ? Math.max(0, guidedIdx) : 0);
  const activeWhisky = whiskies[guestDramIdx] || null;
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
    if (!confirmEnd) { setConfirmEnd(true); return; }
    updateStatusMut.mutate("closed");
    setConfirmEnd(false);
  };

  const defaultScores = (): Record<DimKey, number> => ({ nose: scaleDefault, taste: scaleDefault, finish: scaleDefault });
  const getScores = (wId: string): Record<DimKey, number> => hostScores[wId] || defaultScores();
  const getOverall = (wId: string) => hostOverall[wId] ?? scaleDefault;
  const getOverallAuto = (wId: string) => {
    const sc = getScores(wId);
    return Math.round((sc.nose + sc.taste + sc.finish) / 3);
  };

  const handleScoreChange = (wId: string, dim: DimKey, val: number) => {
    const current = getScores(wId);
    const updated = { ...current, [dim]: val };
    setHostScores(prev => ({ ...prev, [wId]: updated }));
    let freshOverall: number;
    if (!hostOverride[wId]) {
      freshOverall = Math.round((updated.nose + updated.taste + updated.finish) / 3);
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

  const pName = (p: any) => stripGuestSuffix(p.participant?.name || p.participant?.email || p.name || p.email || "Anonymous");
  const pId = (p: any) => p.participantId || p.id;

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
          grid-template-columns: 1fr 380px;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 1100px) {
          .cockpit-grid {
            grid-template-columns: 1fr 340px;
            gap: 16px;
          }
        }
        @media (max-width: 900px) {
          .cockpit-grid {
            grid-template-columns: 1fr;
          }
          .cockpit-header {
            flex-wrap: wrap;
          }
        }
        @media (max-width: 600px) {
          .cockpit-stats {
            display: none;
          }
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
        .cockpit-badge-live {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          border-radius: 20px;
          background: var(--labs-success-muted);
          color: var(--labs-success);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
        }
        .cockpit-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: var(--labs-success);
          animation: pulse 2s infinite;
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
      `}</style>

      <div className="cockpit-inner">
        {/* ─── HEADER ─── */}
        <div className="cockpit-header">
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
              <span className="cockpit-badge-live" data-testid="cockpit-badge-live">
                <span className="cockpit-live-dot" />
                LIVE
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
        </div>

        {/* ─── PROGRESS BAR ─── */}
        {isLive && whiskies.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600 }}>Overall Progress</span>
              <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{overallProgress}%</span>
            </div>
            <div className="cockpit-progress-bar">
              <div className="cockpit-progress-fill" style={{ width: `${overallProgress}%`, background: overallProgress === 100 ? "var(--labs-success)" : "var(--labs-accent)" }} />
            </div>
          </div>
        )}

        {/* ─── MAIN GRID ─── */}
        <div className="cockpit-grid">

          {/* ── LEFT / MAIN COLUMN ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* GUEST VIEW — Hero card */}
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
                  Guest View
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isBlind && <span className="labs-badge labs-badge-accent" style={{ fontSize: 10 }}><EyeOff style={{ width: 10, height: 10 }} /> Blind</span>}
                  {isGuided && <span className="labs-badge labs-badge-accent" style={{ fontSize: 10 }}><SkipForward style={{ width: 10, height: 10 }} /> Guided</span>}
                </div>
              </div>

              <div className="cockpit-card-body">
                {!isLive && isDraft ? (
                  <div style={{ textAlign: "center", padding: "28px 20px", color: "var(--labs-text-muted)" }}>
                    <Clock style={{ width: 28, height: 28, margin: "0 auto 10px", display: "block", opacity: 0.6 }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Session not started</div>
                    <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Guests will see a waiting screen.</div>
                  </div>
                ) : isLive && isGuided && guidedIdx < 0 ? (
                  <div style={{ textAlign: "center", padding: "28px 20px", color: "var(--labs-text-muted)" }}>
                    <Radio style={{ width: 28, height: 28, margin: "0 auto 10px", display: "block", animation: "pulse 2s infinite" }} />
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Waiting for first dram</div>
                    <div style={{ fontSize: 12, marginTop: 4, opacity: 0.8 }}>Press "Start First Dram" to begin.</div>
                  </div>
                ) : activeWhisky ? (
                  <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0 }}>
                      {(() => {
                        const imageRevealed = !isBlind || (gv && gv.isFieldRevealed("image"));
                        const hasImage = activeWhisky.imageUrl;
                        if (imageRevealed && hasImage) {
                          return <WhiskyImage imageUrl={activeWhisky.imageUrl} name={activeWhisky.name || "?"} size={72} height={90} whiskyId={activeWhisky.id} />;
                        }
                        return (
                          <div style={{
                            width: 72, height: 90, borderRadius: 12,
                            background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)",
                            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4,
                          }}>
                            {!imageRevealed ? (
                              <><LockKeyhole style={{ width: 18, height: 18, color: "var(--labs-text-muted)", opacity: 0.6 }} /><span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontWeight: 600 }}>HIDDEN</span></>
                            ) : (
                              <><ImageOff style={{ width: 18, height: 18, color: "var(--labs-text-muted)", opacity: 0.6 }} /><span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>No image</span></>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {isBlind && gv && !gv.isFieldRevealed("name") ? (
                        <div>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--labs-accent)", fontFamily: "var(--labs-font-serif, Georgia, serif)" }}>
                            Dram {blindLabel(guestDramIdx)}
                          </div>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 4, padding: "2px 10px", borderRadius: 6, background: "color-mix(in srgb, var(--labs-text-muted) 10%, transparent)", fontSize: 11, color: "var(--labs-text-muted)" }}>
                            <EyeOff style={{ width: 10, height: 10 }} /> Name hidden
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", fontFamily: "var(--labs-font-serif, Georgia, serif)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {activeWhisky.name || "—"}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3 }}>
                            {(() => {
                              const detailFields: Array<[string, string | null | undefined]> = [
                                ["distillery", activeWhisky.distillery], ["age", activeWhisky.age ? `${activeWhisky.age}y` : null],
                                ["abv", activeWhisky.abv ? `${activeWhisky.abv}%` : null], ["region", activeWhisky.region],
                                ["country", activeWhisky.country], ["category", activeWhisky.category],
                                ["caskInfluence", activeWhisky.caskInfluence], ["bottler", activeWhisky.bottler],
                                ["vintage", activeWhisky.vintage ? `${activeWhisky.vintage}` : null], ["peatLevel", activeWhisky.peatLevel],
                              ];
                              if (isBlind && gv) {
                                const revealed = detailFields.filter(([f, v]) => v && gv.isFieldRevealed(f)).map(([, v]) => v);
                                return revealed.length === 0 ? "??? · ??? · ???" : revealed.join(" · ");
                              }
                              return detailFields.map(([, v]) => v).filter(Boolean).join(" · ") || "—";
                            })()}
                          </div>
                        </div>
                      )}

                      {tasting.ratingPrompt && (
                        <div style={{ padding: "6px 10px", borderRadius: 8, background: "var(--labs-accent-muted)", fontSize: 12, color: "var(--labs-accent)", fontStyle: "italic", marginTop: 10 }}>
                          "{tasting.ratingPrompt}"
                        </div>
                      )}

                      <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 12 }}>
                        {["Nose", "Taste", "Finish", "Overall"].map(dim => (
                          <div key={dim} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 44, textAlign: "right", fontWeight: 500 }}>{dim}</span>
                            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "var(--labs-surface-elevated)", overflow: "hidden" }}>
                              <div style={{ width: "50%", height: "100%", borderRadius: 3, background: "var(--labs-accent)", opacity: 0.6 }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 20px", color: "var(--labs-text-muted)" }}>
                    <Wine style={{ width: 24, height: 24, margin: "0 auto 8px", display: "block", opacity: 0.5 }} />
                    <div style={{ fontSize: 13 }}>No whiskies added yet.</div>
                  </div>
                )}
              </div>

              {/* Reveal steps — inline at bottom of Guest View */}
              {isBlind && rv && gv && isLive && (
                <div style={{ padding: "0 20px 16px" }}>
                  <div style={{ padding: "12px 14px", borderRadius: 12, background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "var(--labs-text-muted)", letterSpacing: "0.05em", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                      <EyeOff style={{ width: 10, height: 10 }} />
                      REVEAL PROGRESS — DRAM {blindLabel(guestDramIdx)}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      {rv.stepGroups.map((group: string[], sIdx: number) => {
                        const state = gv.stepStates[sIdx] || "hidden";
                        const isRevealed = state === "revealed";
                        const isCurrent = state === "next";
                        const fieldLabels = group.map(f => REVEAL_FIELD_LABELS[f] || f).join(", ");
                        return (
                          <div key={sIdx} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 8,
                            background: isRevealed ? "color-mix(in srgb, var(--labs-success) 8%, transparent)" : isCurrent ? "color-mix(in srgb, var(--labs-accent) 8%, transparent)" : "transparent",
                            border: isCurrent ? "1px solid var(--labs-accent)" : "1px solid transparent",
                            flex: "1 1 auto", minWidth: 0,
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
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LINEUP — Single consolidated card */}
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
                      const isCurrent = isGuided ? idx === guidedIdx : idx === guestDramIdx;
                      const isPast = isGuided ? idx < guidedIdx : false;
                      const whiskyRatings = ratings.filter((r: any) => r.whiskyId === w.id);
                      const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
                      const avgScore = whiskyRatings.length > 0
                        ? Math.round(whiskyRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / whiskyRatings.length)
                        : null;
                      const pct = totalParticipants > 0 ? Math.round((ratedCount / totalParticipants) * 100) : 0;

                      return (
                        <div
                          key={w.id}
                          className="cockpit-dram-row"
                          data-active={isCurrent}
                          data-clickable={isGuided}
                          onClick={() => isGuided && guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 })}
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
                              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{avgScore}</span>
                            )}
                            <span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>{ratedCount}/{totalParticipants} rated</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT / SIDEBAR ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* CONTROLS */}
            <div className="cockpit-card">
              <div className="cockpit-card-header">
                <div className="cockpit-card-title">
                  <Radio style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
                  Controls
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10,
                  background: status === "open" ? "var(--labs-success-muted)" : status === "reveal" ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                  color: status === "open" ? "var(--labs-success)" : status === "reveal" ? "var(--labs-accent)" : "var(--labs-text-muted)",
                }}>
                  {isDraft ? "Setting up" : status === "open" ? "Live" : status === "reveal" ? "Reveal" : status === "closed" ? "Closed" : "Completed"}
                </span>
              </div>

              <div className="cockpit-card-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                  let guidedBtnLabel = "Next Dram";
                  if (guidedIdx < 0) {
                    guidedBtnLabel = "Start First Dram";
                  } else if (allDramsDone) {
                    guidedBtnLabel = "All Drams Done";
                  } else if (isBlind && rv) {
                    if (guidedRevealStep < rv.maxSteps) {
                      const lbl = rv.stepLabels[guidedRevealStep];
                      guidedBtnLabel = lbl ? `Reveal ${lbl}` : "Reveal Next";
                    } else {
                      guidedBtnLabel = "Next Dram";
                    }
                  }
                  return (
                  <button
                    onClick={() => guidedAdvanceMut.mutate()}
                    disabled={guidedAdvanceMut.isPending || allDramsDone}
                    className="cockpit-action-btn cockpit-action-primary"
                    data-testid="cockpit-next-dram"
                  >
                    {guidedAdvanceMut.isPending
                      ? <Loader2 style={{ width: 15, height: 15, animation: "spin 1s linear infinite" }} />
                      : <SkipForward style={{ width: 15, height: 15 }} />}
                    {guidedBtnLabel}
                  </button>
                  );
                })()}

                {isLive && isBlind && !isGuided && (
                  rv && rv.revealIndex < whiskies.length ? (
                    <button
                      onClick={() => revealNextMut.mutate()}
                      disabled={revealNextMut.isPending}
                      className="cockpit-action-btn cockpit-action-secondary"
                      data-testid="cockpit-reveal-next"
                    >
                      {revealNextMut.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Eye style={{ width: 14, height: 14 }} />}
                      {rv?.nextLabel || "Reveal Next"}
                    </button>
                  ) : (
                    <div style={{ textAlign: "center", fontSize: 12, color: "var(--labs-success)", fontWeight: 600, padding: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      <CheckCircle2 style={{ width: 14, height: 14 }} />
                      All whiskies revealed
                    </div>
                  )
                )}

                {status === "open" && (
                  !confirmEnd ? (
                    <button onClick={handleEndSession} className="cockpit-action-btn cockpit-action-secondary" data-testid="cockpit-end">
                      <Lock style={{ width: 14, height: 14 }} />
                      Close Ratings
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => setConfirmEnd(false)} className="cockpit-action-btn cockpit-action-secondary" style={{ flex: 1 }}>Cancel</button>
                      <button onClick={handleEndSession} className="cockpit-action-btn cockpit-action-danger" style={{ flex: 1 }} data-testid="cockpit-confirm-end">
                        <Lock style={{ width: 14, height: 14 }} />
                        Confirm
                      </button>
                    </div>
                  )
                )}

                {status === "closed" && (
                  <button onClick={() => updateStatusMut.mutate("reveal")} className="cockpit-action-btn cockpit-action-primary" data-testid="cockpit-start-reveal">
                    <Eye style={{ width: 15, height: 15 }} />
                    Begin Unveiling
                  </button>
                )}
              </div>
            </div>

            {/* PARTICIPANTS */}
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
                      <span style={{ color: "var(--labs-accent)", fontSize: 12, fontWeight: 700, fontVariantNumeric: "tabular-nums" }} data-testid="cockpit-rating-progress">
                        {ratedCount}/{totalP}
                      </span>
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

                            return (
                              <div key={participantId} className="cockpit-participant-row" data-testid={`cockpit-participant-${participantId}`}>
                                <div className="cockpit-participant-avatar" style={{
                                  background: source === "digital" ? "var(--labs-success-muted)" : source === "paper" ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                                }}>
                                  {source === "digital"
                                    ? <CheckCircle2 style={{ width: 14, height: 14, color: "var(--labs-success)" }} />
                                    : source === "paper"
                                    ? <FileText style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                                    : <Clock style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
                                </div>
                                <span style={{ flex: 1, fontSize: 13, color: "var(--labs-text)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pName(p)}</span>
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

            {/* HOST RATING */}
            <div className="cockpit-card">
              <div className="cockpit-card-header">
                <div className="cockpit-card-title">
                  <Star style={{ width: 13, height: 13, color: "var(--labs-accent)" }} />
                  My Rating
                </div>
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
                    {cockpitWizard ? "Wizard" : "Compact"}
                  </button>
                  {saving && (
                    <span style={{ fontSize: 11, color: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                    </span>
                  )}
                </div>
              </div>

              <div className="cockpit-card-body">
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
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                        {currentRatingWhisky.name || `Whisky ${hostRatingIdx + 1}`}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
                        {[currentRatingWhisky.distillery, currentRatingWhisky.age ? `${currentRatingWhisky.age}y` : null, currentRatingWhisky.abv ? `${currentRatingWhisky.abv}%` : null].filter(Boolean).join(" · ") || "—"}
                      </div>
                    </div>

                    <LabsRatingPanel
                      scores={getScores(currentRatingWhisky.id)}
                      onScoreChange={(dim, val) => handleScoreChange(currentRatingWhisky.id, dim, val)}
                      chips={hostChips[currentRatingWhisky.id] || emptyChips}
                      onChipToggle={(dim, chip) => handleChipToggle(currentRatingWhisky.id, dim, chip)}
                      texts={hostTexts[currentRatingWhisky.id] || emptyTexts}
                      onTextChange={(dim, text) => handleTextChange(currentRatingWhisky.id, dim, text)}
                      overall={getOverall(currentRatingWhisky.id)}
                      onOverallChange={(val) => handleOverallChange(currentRatingWhisky.id, val)}
                      overallAuto={getOverallAuto(currentRatingWhisky.id)}
                      overrideActive={!!hostOverride[currentRatingWhisky.id]}
                      onResetOverride={() => {
                        const wId = currentRatingWhisky.id;
                        setHostOverride(prev => ({ ...prev, [wId]: false }));
                        const auto = getOverallAuto(wId);
                        setHostOverall(prev => ({ ...prev, [wId]: auto }));
                        debouncedSave(wId, getScores(wId), auto, hostNotes[wId] || "");
                      }}
                      scale={ratingScale}
                      showToggle={false}
                      defaultOpen={true}
                      compact={!cockpitWizard}
                      wizard={cockpitWizard}
                    />

                    <textarea
                      value={hostNotes[currentRatingWhisky.id] || ""}
                      onChange={e => {
                        const wId = currentRatingWhisky.id;
                        const newNotes = e.target.value;
                        setHostNotes(prev => ({ ...prev, [wId]: newNotes }));
                        debouncedSave(wId, getScores(wId), getOverall(wId), newNotes);
                      }}
                      placeholder="Your tasting notes..."
                      className="labs-input"
                      style={{ resize: "vertical", minHeight: 56, marginTop: 12, fontSize: 13 }}
                      data-testid="cockpit-host-notes"
                    />
                  </>
                ) : (
                  <div style={{ padding: 16, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>
                    No whiskies to rate yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
