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

const POLL_FAST = 3000;
const POLL_NORMAL = 5000;

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

  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };

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

  const parseSavedNotes = useCallback((rawNotes: string) => {
    const chips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
    const texts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };
    let cleanNotes = rawNotes;
    for (const d of ["nose", "taste", "finish", "balance"] as DimKey[]) {
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
    const hasDimData = (["nose", "taste", "finish", "balance"] as DimKey[]).some(
      (d) => ch[d].length > 0 || tx[d].trim()
    );
    if (!hasDimData) return "";
    const parts: string[] = [];
    for (const d of ["nose", "taste", "finish", "balance"] as DimKey[]) {
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
            setHostScores(prev => ({ ...prev, [w.id]: { nose: existing.nose ?? scaleDefault, taste: existing.taste ?? scaleDefault, finish: existing.finish ?? scaleDefault, balance: existing.balance ?? scaleDefault } }));
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
        nose: freshScores.nose, taste: freshScores.taste, finish: freshScores.finish, balance: freshScores.balance,
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
    const ov = hostOverall[wId] ?? Math.round((sc.nose + sc.taste + sc.finish + sc.balance) / 4);
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
  const revealIdx = tasting.revealIndex ?? 0;
  const revealStep = tasting.revealStep ?? 0;
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

  const defaultScores = (): Record<DimKey, number> => ({ nose: scaleDefault, taste: scaleDefault, finish: scaleDefault, balance: scaleDefault });
  const getScores = (wId: string): Record<DimKey, number> => hostScores[wId] || defaultScores();
  const getOverall = (wId: string) => hostOverall[wId] ?? scaleDefault;
  const getOverallAuto = (wId: string) => {
    const sc = getScores(wId);
    return Math.round((sc.nose + sc.taste + sc.finish + sc.balance) / 4);
  };

  const handleScoreChange = (wId: string, dim: DimKey, val: number) => {
    const current = getScores(wId);
    const updated = { ...current, [dim]: val };
    setHostScores(prev => ({ ...prev, [wId]: updated }));
    let freshOverall: number;
    if (!hostOverride[wId]) {
      freshOverall = Math.round((updated.nose + updated.taste + updated.finish + updated.balance) / 4);
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
    <div style={{ minHeight: "100vh", background: "var(--labs-bg)", padding: "0 20px 40px" }} data-testid="labs-cockpit">
      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ padding: "14px 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={onExit}
            className="labs-btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px" }}
            data-testid="cockpit-exit"
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Exit Cockpit
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isLive && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "4px 14px", borderRadius: 20,
                background: "var(--labs-success-muted)", color: "var(--labs-success)",
                fontSize: 12, fontWeight: 700,
              }} data-testid="cockpit-badge-live">
                <span style={{ width: 8, height: 8, borderRadius: 4, background: "var(--labs-success)", animation: "pulse 2s infinite" }} />
                LIVE
              </span>
            )}
            <h2 className="labs-serif" style={{ fontSize: 18, fontWeight: 600, color: "var(--labs-text)", margin: 0 }} data-testid="cockpit-title">
              {tasting.title || "Untitled Tasting"}
            </h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <StatPill icon={<Users style={{ width: 13, height: 13 }} />} value={totalParticipants} label="Guests" />
            <StatPill icon={<Wine style={{ width: 13, height: 13 }} />} value={whiskies.length} label="Drams" />
            <StatPill icon={<Star style={{ width: 13, height: 13 }} />} value={totalRatings} label="Ratings" />
          </div>
        </div>

        {isLive && whiskies.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 600 }}>Progress</span>
              <span style={{ fontSize: 11, color: "var(--labs-accent)", fontWeight: 700 }}>{overallProgress}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: "var(--labs-surface-elevated)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${overallProgress}%`, background: "var(--labs-accent)", borderRadius: 2, transition: "width 0.5s ease" }} />
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 360px", gap: 20 }}>
          {/* LEFT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="cockpit-left">
            <div className="labs-card" style={{ padding: 16 }}>
              <div className="labs-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Radio style={{ width: 12, height: 12 }} />
                Session Status
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  background: status === "open" ? "var(--labs-success)" : status === "reveal" ? "var(--labs-accent)" : isDraft ? "var(--labs-accent)" : "var(--labs-text-muted)",
                }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--labs-text)" }}>
                  {isDraft ? "Draft" : status === "open" ? "Live — Ratings Open" : status === "reveal" ? "Reveal Phase" : status === "closed" ? "Closed" : "Archived"}
                </span>
              </div>
              {isBlind && <span className="labs-badge labs-badge-accent" style={{ marginRight: 6 }}><EyeOff style={{ width: 11, height: 11 }} /> Blind</span>}
              {isGuided && <span className="labs-badge labs-badge-accent"><SkipForward style={{ width: 11, height: 11 }} /> Guided</span>}
              {isGuided && guidedIdx >= 0 && (
                <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", marginTop: 8 }}>
                  Dram {guidedIdx + 1} / {whiskies.length}
                </div>
              )}
            </div>

            <div className="labs-card" style={{ padding: 16 }}>
              <div className="labs-section-label">Live Controls</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {isDraft && (
                  <button
                    onClick={handleStartSession}
                    disabled={whiskies.length === 0}
                    className="labs-btn-primary"
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      background: whiskies.length > 0 ? "var(--labs-success)" : "var(--labs-border)",
                      opacity: whiskies.length === 0 ? 0.5 : 1,
                    }}
                    data-testid="cockpit-start"
                  >
                    <Play style={{ width: 16, height: 16 }} />
                    Start Tasting
                  </button>
                )}

                {isLive && isGuided && (
                  <button
                    onClick={() => guidedAdvanceMut.mutate()}
                    disabled={guidedAdvanceMut.isPending || guidedIdx >= whiskies.length - 1}
                    className="labs-btn-primary"
                    style={{
                      width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      opacity: (guidedAdvanceMut.isPending || guidedIdx >= whiskies.length - 1) ? 0.5 : 1,
                    }}
                    data-testid="cockpit-next-dram"
                  >
                    {guidedAdvanceMut.isPending
                      ? <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                      : <SkipForward style={{ width: 16, height: 16 }} />}
                    {guidedIdx < 0 ? "Start First Dram" : guidedIdx >= whiskies.length - 1 ? "All Drams Done" : "Next Dram"}
                  </button>
                )}

                {status === "open" && (
                  <>
                    {!confirmEnd ? (
                      <button onClick={handleEndSession} className="labs-btn-secondary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="cockpit-end">
                        <Lock style={{ width: 14, height: 14 }} />
                        Close Ratings
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => setConfirmEnd(false)} className="labs-btn-secondary" style={{ flex: 1 }}>Cancel</button>
                        <button onClick={handleEndSession} className="labs-btn-primary" style={{ flex: 1, background: "var(--labs-danger)" }} data-testid="cockpit-confirm-end">
                          <Lock style={{ width: 14, height: 14 }} />
                          Confirm
                        </button>
                      </div>
                    )}
                  </>
                )}

                {status === "closed" && (
                  <button onClick={() => updateStatusMut.mutate("reveal")} className="labs-btn-primary" style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} data-testid="cockpit-start-reveal">
                    <Eye style={{ width: 16, height: 16 }} />
                    Begin Unveiling
                  </button>
                )}
              </div>
            </div>

            {isBlind && isLive && (
              <div className="labs-card" style={{ padding: 16 }} data-testid="cockpit-blind-reveal">
                <div className="labs-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <EyeOff style={{ width: 12, height: 12 }} />
                  Unveil Whiskies
                </div>
                <div style={{ fontSize: 12, color: "var(--labs-text-secondary)", marginBottom: 10 }}>
                  Unveiled: {revealIdx} / {whiskies.length}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                  {whiskies.map((w: any, idx: number) => {
                    const done = idx < revealIdx;
                    const current = idx === revealIdx;
                    return (
                      <div key={w.id} style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "5px 8px", borderRadius: 8,
                        background: current ? "var(--labs-surface-elevated)" : "transparent",
                        border: current ? "1px solid var(--labs-accent)" : "1px solid transparent",
                      }} data-testid={`cockpit-blind-whisky-${idx}`}>
                        <div style={{
                          width: 20, height: 20, borderRadius: 10, fontSize: 10, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: done ? "var(--labs-success)" : current ? "var(--labs-accent)" : "var(--labs-border)",
                          color: "#fff",
                        }}>
                          {done ? "✓" : blindLabel(idx)}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, color: done ? "var(--labs-text-secondary)" : current ? "var(--labs-text)" : "var(--labs-text-muted)" }}>
                          {w.name || `Whisky ${idx + 1}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {revealIdx < whiskies.length ? (
                  <button
                    onClick={() => revealNextMut.mutate()}
                    disabled={revealNextMut.isPending}
                    className="labs-btn-primary"
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: revealNextMut.isPending ? 0.5 : 1 }}
                    data-testid="cockpit-reveal-next"
                  >
                    {revealNextMut.isPending ? <Loader2 style={{ width: 14, height: 14, animation: "spin 1s linear infinite" }} /> : <Eye style={{ width: 14, height: 14 }} />}
                    {rv?.nextLabel || "Reveal Next"}
                  </button>
                ) : (
                  <div style={{ textAlign: "center", fontSize: 12, color: "var(--labs-success)", fontWeight: 600, padding: 8 }}>
                    <CheckCircle2 style={{ width: 14, height: 14, display: "inline", verticalAlign: "-2px", marginRight: 4 }} />
                    All whiskies revealed
                  </div>
                )}

                <div style={{ marginTop: 12, padding: "10px 12px", borderRadius: 10, background: "var(--labs-surface-elevated)", fontSize: 11, color: "var(--labs-text-muted)" }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>You see (host)</div>
                  <div>{activeWhisky?.name || "—"}</div>
                  <div style={{ borderTop: "1px solid var(--labs-border)", margin: "6px 0", paddingTop: 6, fontWeight: 600 }}>
                    Participants see
                  </div>
                  <div>
                    {gv && !gv.isFieldRevealed("name") ? `Dram ${blindLabel(gv.dramIdx)}` :
                     gv && gv.isFieldRevealed("name") && !gv.isFieldRevealed("distillery") ? (activeWhisky?.name || "—") :
                     gv && gv.isFieldRevealed("distillery") ? `${activeWhisky?.name || "—"} (+ details)` :
                     activeWhisky?.name || "—"}
                  </div>
                </div>
              </div>
            )}

            {isGuided && isLive && (
              <div className="labs-card" style={{ padding: 16 }} data-testid="cockpit-guided-nav">
                <div className="labs-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <SkipForward style={{ width: 12, height: 12 }} />
                  Dram Navigation
                </div>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(whiskies.length, 8)}, 1fr)`, gap: 4 }}>
                  {whiskies.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 })}
                      style={{
                        height: 34, borderRadius: 8,
                        border: idx === guidedIdx ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                        background: idx < guidedIdx ? "var(--labs-success-muted)" : idx === guidedIdx ? "var(--labs-surface-elevated)" : "transparent",
                        color: idx <= guidedIdx ? "var(--labs-text)" : "var(--labs-text-muted)",
                        fontSize: 13, fontWeight: 700, cursor: "pointer",
                        fontFamily: "inherit", transition: "all 0.15s",
                      }}
                      data-testid={`cockpit-guided-${idx}`}
                    >
                      {isBlind ? blindLabel(idx) : idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="labs-card" style={{ padding: 16 }}>
              <div className="labs-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wine style={{ width: 12, height: 12 }} />
                Whisky Lineup
              </div>
              {whiskies.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>No whiskies added yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {whiskies.map((w: any, idx: number) => {
                    const isCurrent = isGuided ? idx === guidedIdx : false;
                    const whiskyRatings = ratings.filter((r: any) => r.whiskyId === w.id);
                    const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
                    return (
                      <div key={w.id} style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "6px 8px", borderRadius: 8,
                        background: isCurrent ? "var(--labs-surface-elevated)" : "transparent",
                        border: isCurrent ? "1px solid var(--labs-accent)" : "1px solid transparent",
                      }} data-testid={`cockpit-whisky-${idx}`}>
                        <div style={{
                          width: 22, height: 22, borderRadius: 6, fontSize: 11, fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          background: isCurrent ? "var(--labs-accent)" : "var(--labs-surface-elevated)",
                          color: isCurrent ? "var(--labs-bg)" : "var(--labs-text-muted)",
                          flexShrink: 0,
                        }}>
                          {isBlind ? blindLabel(idx) : idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {w.name || `Whisky ${idx + 1}`}
                          </div>
                        </div>
                        <span style={{ fontSize: 10, color: "var(--labs-text-muted)", flexShrink: 0 }}>
                          {ratedCount}/{totalParticipants}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* CENTER COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="cockpit-center">
            {/* PROMINENT GUEST VIEW */}
            <div
              className="labs-card"
              style={{
                padding: 0, overflow: "hidden",
                border: "1.5px solid var(--labs-accent)",
                boxShadow: "0 0 24px rgba(212,162,86,0.08)",
              }}
              data-testid="cockpit-guest-preview"
            >
              <div style={{
                padding: "10px 16px",
                background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 12%, var(--labs-surface)), color-mix(in srgb, var(--labs-accent) 6%, var(--labs-surface)))",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                borderBottom: "1px solid var(--labs-border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: "var(--labs-accent)", display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Eye style={{ width: 14, height: 14, color: "var(--labs-bg)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--labs-text)", letterSpacing: "0.02em" }}>
                      GUEST VIEW
                    </div>
                    <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                      What participants see right now
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Smartphone style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                  {isLive && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: "var(--labs-success-muted)", color: "var(--labs-success)",
                    }}>LIVE</span>
                  )}
                </div>
              </div>

              <div style={{ padding: 20 }}>
                {!isLive && isDraft ? (
                  <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--labs-text-muted)" }}>
                    <Clock style={{ width: 32, height: 32, margin: "0 auto 12px", display: "block", opacity: 0.5 }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Session not started</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Guests will see a waiting screen until you start the tasting.</div>
                  </div>
                ) : isLive && isGuided && guidedIdx < 0 ? (
                  <div style={{ textAlign: "center", padding: "32px 20px", color: "var(--labs-text-muted)" }}>
                    <Radio style={{ width: 32, height: 32, margin: "0 auto 12px", display: "block", animation: "pulse 2s infinite" }} />
                    <div style={{ fontSize: 15, fontWeight: 600 }}>Waiting for first dram</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>Press "Start First Dram" to begin the guided tasting.</div>
                  </div>
                ) : activeWhisky ? (
                  <>
                    {/* Dram progress dots */}
                    {whiskies.length > 1 && (
                      <div style={{ display: "flex", gap: 6, marginBottom: 16, justifyContent: "center" }}>
                        {whiskies.map((_: any, idx: number) => {
                          const isActive = idx === guestDramIdx;
                          const isPast = idx < guestDramIdx;
                          return (
                            <div key={idx} style={{
                              width: isActive ? 32 : 28, height: isActive ? 32 : 28, borderRadius: "50%",
                              background: isActive ? "var(--labs-accent)" : isPast ? "var(--labs-success-muted)" : "var(--labs-surface-elevated)",
                              color: isActive ? "var(--labs-bg)" : isPast ? "var(--labs-success)" : "var(--labs-text-muted)",
                              fontSize: isActive ? 13 : 11, fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              border: isActive ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                              transition: "all 0.2s",
                            }}>
                              {isPast ? <CheckCircle2 style={{ width: 14, height: 14 }} /> : isBlind ? blindLabel(idx) : idx + 1}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Main content: Image + Info side by side */}
                    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                      {/* Whisky image area */}
                      <div style={{ flexShrink: 0 }}>
                        {(() => {
                          const imageRevealed = !isBlind || (gv && gv.isFieldRevealed("image"));
                          const hasImage = activeWhisky.imageUrl;
                          if (imageRevealed && hasImage) {
                            return <WhiskyImage imageUrl={activeWhisky.imageUrl} name={activeWhisky.name || "?"} size={80} height={100} whiskyId={activeWhisky.id} />;
                          }
                          return (
                            <div style={{
                              width: 80, height: 100, borderRadius: 12,
                              background: "var(--labs-surface-elevated)", border: "1px solid var(--labs-border)",
                              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                              gap: 4,
                            }}>
                              {!imageRevealed ? (
                                <>
                                  <LockKeyhole style={{ width: 20, height: 20, color: "var(--labs-text-muted)", opacity: 0.5 }} />
                                  <span style={{ fontSize: 8, color: "var(--labs-text-muted)", fontWeight: 600 }}>HIDDEN</span>
                                </>
                              ) : (
                                <>
                                  <ImageOff style={{ width: 20, height: 20, color: "var(--labs-text-muted)", opacity: 0.4 }} />
                                  <span style={{ fontSize: 8, color: "var(--labs-text-muted)" }}>No image</span>
                                </>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* Info area */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Whisky name / blind label */}
                        <div style={{ marginBottom: 12 }}>
                          {isBlind && gv && !gv.isFieldRevealed("name") ? (
                            <>
                              <div style={{
                                fontSize: 22, fontWeight: 800, color: "var(--labs-accent)",
                                fontFamily: "var(--labs-font-serif, Georgia, serif)",
                              }}>
                                Dram {blindLabel(guestDramIdx)}
                              </div>
                              <div style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                marginTop: 4, padding: "2px 10px", borderRadius: 6,
                                background: "color-mix(in srgb, var(--labs-text-muted) 10%, transparent)",
                                fontSize: 11, color: "var(--labs-text-muted)",
                              }}>
                                <EyeOff style={{ width: 10, height: 10 }} />
                                Name hidden
                              </div>
                            </>
                          ) : (
                            <>
                              <div style={{
                                fontSize: 20, fontWeight: 700, color: "var(--labs-text)",
                                fontFamily: "var(--labs-font-serif, Georgia, serif)",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              }}>
                                {activeWhisky.name || "—"}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--labs-text-muted)", marginTop: 3 }}>
                                {(() => {
                                  const detailFields: Array<[string, string | null | undefined]> = [
                                    ["distillery", activeWhisky.distillery],
                                    ["age", activeWhisky.age ? `${activeWhisky.age}y` : null],
                                    ["abv", activeWhisky.abv ? `${activeWhisky.abv}%` : null],
                                    ["region", activeWhisky.region],
                                    ["country", activeWhisky.country],
                                    ["category", activeWhisky.category],
                                    ["caskInfluence", activeWhisky.caskInfluence],
                                    ["bottler", activeWhisky.bottler],
                                    ["vintage", activeWhisky.vintage ? `${activeWhisky.vintage}` : null],
                                    ["peatLevel", activeWhisky.peatLevel],
                                  ];
                                  if (isBlind && gv) {
                                    const revealed = detailFields.filter(([f, v]) => v && gv.isFieldRevealed(f)).map(([, v]) => v);
                                    if (revealed.length === 0) return "??? · ??? · ???";
                                    return revealed.join(" · ");
                                  }
                                  return detailFields.map(([, v]) => v).filter(Boolean).join(" · ") || "—";
                                })()}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Host message */}
                        {tasting.ratingPrompt && (
                          <div style={{
                            padding: "8px 12px", borderRadius: 8,
                            background: "var(--labs-accent-muted)",
                            fontSize: 12, color: "var(--labs-accent)", fontStyle: "italic",
                            marginBottom: 12,
                          }}>
                            "{tasting.ratingPrompt}"
                          </div>
                        )}

                        {/* Rating dimensions preview */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {["Nose", "Taste", "Finish", "Balance", "Overall"].map(dim => (
                            <div key={dim} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span style={{ fontSize: 11, color: "var(--labs-text-muted)", width: 48, textAlign: "right", fontWeight: 500 }}>{dim}</span>
                              <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--labs-surface-elevated)", overflow: "hidden" }}>
                                <div style={{ width: "50%", height: "100%", borderRadius: 3, background: "var(--labs-accent)", opacity: 0.3 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Reveal steps tracker — only in blind mode */}
                    {isBlind && rv && gv && (
                      <div style={{
                        marginTop: 16, padding: "14px 16px", borderRadius: 12,
                        background: "var(--labs-surface-elevated)",
                        border: "1px solid var(--labs-border)",
                      }}>
                        <div style={{
                          fontSize: 11, fontWeight: 700, color: "var(--labs-text-muted)",
                          marginBottom: 10, letterSpacing: "0.04em",
                          display: "flex", alignItems: "center", gap: 6,
                        }}>
                          <EyeOff style={{ width: 11, height: 11 }} />
                          REVEAL PROGRESS — DRAM {blindLabel(guestDramIdx)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {rv.stepGroups.map((group: string[], sIdx: number) => {
                            const state = gv.stepStates[sIdx] || "hidden";
                            const isRevealed = state === "revealed";
                            const isCurrent = state === "next";
                            const fieldLabels = group.map(f => REVEAL_FIELD_LABELS[f] || f).join(", ");

                            return (
                              <div key={sIdx} style={{
                                display: "flex", alignItems: "center", gap: 10,
                                padding: "8px 12px", borderRadius: 8,
                                background: isCurrent ? "color-mix(in srgb, var(--labs-accent) 8%, transparent)"
                                  : isRevealed ? "color-mix(in srgb, var(--labs-success) 6%, transparent)"
                                  : "transparent",
                                border: isCurrent ? "1px solid var(--labs-accent)" : "1px solid transparent",
                              }} data-testid={`cockpit-reveal-step-${sIdx}`}>
                                <div style={{
                                  width: 24, height: 24, borderRadius: 12, flexShrink: 0,
                                  display: "flex", alignItems: "center", justifyContent: "center",
                                  background: isRevealed ? "var(--labs-success)" : isCurrent ? "var(--labs-accent)" : "var(--labs-border)",
                                  color: isRevealed || isCurrent ? "#fff" : "var(--labs-text-muted)",
                                }}>
                                  {isRevealed ? (
                                    <Unlock style={{ width: 12, height: 12 }} />
                                  ) : (
                                    <LockKeyhole style={{ width: 12, height: 12 }} />
                                  )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{
                                    fontSize: 12, fontWeight: 600,
                                    color: isRevealed ? "var(--labs-success)" : isCurrent ? "var(--labs-accent)" : "var(--labs-text-muted)",
                                  }}>
                                    Step {sIdx + 1}
                                  </div>
                                  <div style={{
                                    fontSize: 11,
                                    color: isRevealed ? "var(--labs-text-secondary)" : "var(--labs-text-muted)",
                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                  }}>
                                    {fieldLabels}
                                  </div>
                                </div>
                                <span style={{
                                  fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                  background: isRevealed ? "var(--labs-success-muted)" : isCurrent ? "var(--labs-accent-muted)" : "color-mix(in srgb, var(--labs-text-muted) 10%, transparent)",
                                  color: isRevealed ? "var(--labs-success)" : isCurrent ? "var(--labs-accent)" : "var(--labs-text-muted)",
                                }}>
                                  {isRevealed ? "REVEALED" : isCurrent ? "NEXT" : "HIDDEN"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "24px 20px", color: "var(--labs-text-muted)" }}>
                    <Wine style={{ width: 28, height: 28, margin: "0 auto 8px", display: "block", opacity: 0.4 }} />
                    <div style={{ fontSize: 13 }}>No whiskies in this tasting yet.</div>
                  </div>
                )}
              </div>
            </div>

            <div className="labs-card" style={{ padding: 16 }}>
              <div className="labs-section-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wine style={{ width: 12, height: 12 }} />
                Lineup — Per-Dram Progress
              </div>
              {whiskies.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>No whiskies in this tasting yet.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {whiskies.map((w: any, idx: number) => {
                    const isCurrent = isGuided ? idx === guidedIdx : false;
                    const isPast = isGuided ? idx < guidedIdx : false;
                    const whiskyRatings = ratings.filter((r: any) => r.whiskyId === w.id);
                    const ratedCount = new Set(whiskyRatings.map((r: any) => r.participantId)).size;
                    const avgScore = whiskyRatings.length > 0
                      ? Math.round(whiskyRatings.reduce((s: number, r: any) => s + (r.overall ?? 0), 0) / whiskyRatings.length)
                      : null;
                    const pct = totalParticipants > 0 ? Math.round((ratedCount / totalParticipants) * 100) : 0;

                    return (
                      <div key={w.id} style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "12px 14px", borderRadius: 12,
                        background: isCurrent ? "var(--labs-surface-elevated)" : "transparent",
                        border: isCurrent ? "1.5px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                        cursor: isGuided ? "pointer" : "default",
                        transition: "all 0.2s",
                      }} onClick={() => isGuided && guidedGoToMut.mutate({ whiskyIndex: idx, revealStep: 0 })} data-testid={`cockpit-lineup-${idx}`}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: isCurrent ? "var(--labs-accent)" : isPast ? "var(--labs-success-muted)" : "var(--labs-surface-elevated)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14, fontWeight: 700,
                          color: isCurrent ? "var(--labs-bg)" : isPast ? "var(--labs-success)" : "var(--labs-text-muted)",
                          flexShrink: 0,
                        }}>
                          {isPast ? <CheckCircle2 style={{ width: 16, height: 16 }} /> : isBlind ? blindLabel(idx) : idx + 1}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: isCurrent ? "var(--labs-text)" : "var(--labs-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {w.name || `Whisky ${idx + 1}`}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>
                            {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || "—"}
                          </div>
                          <div style={{ marginTop: 6, height: 4, borderRadius: 2, background: "var(--labs-surface-elevated)", overflow: "hidden" }}>
                            <div style={{
                              height: "100%", width: `${pct}%`,
                              background: pct === 100 ? "var(--labs-success)" : "var(--labs-accent)",
                              borderRadius: 2, transition: "width 0.5s ease",
                            }} />
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                          {avgScore !== null && (
                            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{avgScore}</span>
                          )}
                          <span style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{ratedCount}/{totalParticipants} rated</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="labs-card" style={{ padding: 16 }} data-testid="cockpit-participants">
              {(() => {
                const uniqueRaters = new Set(ratings.map((r: any) => r.participantId));
                const ratedCount = participants.filter((p: any) => uniqueRaters.has(pId(p))).length;
                const totalP = participants.length;
                const progressPct = totalP > 0 ? Math.round((ratedCount / totalP) * 100) : 0;
                const missingCount = totalP - ratedCount;

                return (
                  <>
                    <div className="labs-section-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Users style={{ width: 12, height: 12 }} />
                        Participants
                      </span>
                      <span style={{ color: "var(--labs-accent)", textTransform: "none", fontWeight: 700 }} data-testid="cockpit-rating-progress">
                        {ratedCount}/{totalP} rated
                      </span>
                    </div>

                    {totalP > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ height: 5, borderRadius: 3, background: "var(--labs-surface-elevated)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${progressPct}%`,
                            background: progressPct === 100 ? "var(--labs-success)" : "var(--labs-accent)",
                            borderRadius: 3, transition: "width 0.5s ease",
                          }} />
                        </div>
                        {missingCount > 0 && (
                          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 6 }}>
                            {missingCount} missing — collect their sheets
                          </div>
                        )}
                      </div>
                    )}

                    {totalP === 0 ? (
                      <div style={{ padding: 16, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>No participants have joined yet.</div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {participants.map((p: any) => {
                          const participantId = pId(p);
                          const source = getSource(participantId);
                          const totalWhiskiesRated = new Set(
                            ratings.filter((r: any) => r.participantId === participantId).map((r: any) => r.whiskyId)
                          ).size;

                          return (
                            <div key={participantId} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "8px 10px", borderRadius: 8,
                            }} data-testid={`cockpit-participant-${participantId}`}>
                              <div style={{
                                width: 28, height: 28, borderRadius: 14,
                                background: source === "digital" ? "var(--labs-success-muted)"
                                  : source === "paper" ? "var(--labs-accent-muted)"
                                  : "var(--labs-surface-elevated)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                {source === "digital"
                                  ? <CheckCircle2 style={{ width: 14, height: 14, color: "var(--labs-success)" }} />
                                  : source === "paper"
                                  ? <FileText style={{ width: 14, height: 14, color: "var(--labs-accent)" }} />
                                  : <Clock style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
                              </div>
                              <span style={{ flex: 1, fontSize: 13, color: "var(--labs-text)", fontWeight: 500 }}>{pName(p)}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                                  {totalWhiskiesRated}/{whiskies.length}
                                </span>
                                <span style={{
                                  fontSize: 9, fontWeight: 600, padding: "1px 6px", borderRadius: 8,
                                  background: source === "digital" ? "var(--labs-success-muted)"
                                    : source === "paper" ? "var(--labs-accent-muted)"
                                    : "color-mix(in srgb, var(--labs-text-muted) 12%, transparent)",
                                  color: source === "digital" ? "var(--labs-success)"
                                    : source === "paper" ? "var(--labs-accent)"
                                    : "var(--labs-text-muted)",
                                }} data-testid={`cockpit-source-${participantId}`}>
                                  {source === "digital" ? "Digital" : source === "paper" ? "Paper" : "Pending"}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="cockpit-right">
            <div className="labs-card" style={{ padding: 16 }}>
              <div className="labs-section-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Star style={{ width: 12, height: 12 }} />
                  Host Rating
                </span>
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
                      fontSize: 10, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                      textTransform: "none",
                    }}
                    data-testid="cockpit-wizard-toggle"
                  >
                    <Sliders style={{ width: 10, height: 10 }} />
                    {cockpitWizard ? "Wizard" : "Compact"}
                  </button>
                  {saving && (
                    <span style={{ fontSize: 10, color: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 4, textTransform: "none" }}>
                      <Loader2 style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                      Saving...
                    </span>
                  )}
                </div>
              </div>

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
                <div style={{ padding: 20, textAlign: "center", color: "var(--labs-text-muted)", fontSize: 13 }}>
                  No whiskies to rate yet.
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "6px 14px", borderRadius: 10,
      background: "var(--labs-surface-elevated)", minWidth: 60,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
        <span style={{ color: "var(--labs-accent)" }}>{icon}</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </div>
      <span style={{ fontSize: 10, color: "var(--labs-text-muted)", fontWeight: 500 }}>{label}</span>
    </div>
  );
}
