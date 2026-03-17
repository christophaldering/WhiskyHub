import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useLabsBack } from "@/labs/LabsLayout";
import {
  Plus, X, Trash2, Copy, Check, EyeOff, Eye, Play, Square,
  Users, Calendar, MapPin, ChevronLeft, Loader2,
  Wine, BarChart3, CheckCircle2, Clock, CircleDashed,
  ChevronDown, ChevronUp, ChevronRight, Compass, SkipForward, StopCircle, AlertTriangle,
  QrCode, Mail, Send, Star, Monitor, Gauge, Globe, Sliders,
  MessageCircle, Video, FileText, Settings, Upload, Share2,
  Sparkles, RefreshCw, Camera, BookOpen, Heart, Pencil, Image,
  Download, ExternalLink, Lock, Printer, ScanLine, GripVertical, Layers, ArrowRightLeft,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { stripGuestSuffix } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { FLAVOR_PROFILES, detectFlavorProfile, type FlavorProfileId } from "@/labs/data/flavor-data";
import LabsRatingPanel, { type DimKey as LabsDimKey } from "@/labs/components/LabsRatingPanel";
import LabsHostCockpit from "@/labs/pages/LabsHostCockpit";
import { tastingApi, whiskyApi, blindModeApi, ratingApi, guidedApi, inviteApi, collectionApi, wishlistApi } from "@/lib/api";
import FriendsQuickSelect from "@/labs/components/FriendsQuickSelect";
import { downloadDataUrl } from "@/lib/download";
import { generateTastingMenu } from "@/components/tasting-menu-pdf";
import { generateBlankTastingSheet, generateBlankTastingMat, generateBatchPersonalizedPdf, generateTastingNotesSheet, generateBlindEvaluationSheet } from "@/components/printable-tasting-sheets";
import QRCode from "qrcode";

interface LabsHostProps {
  params?: { id?: string };
}

const REVEAL_DEFAULT_ORDER: string[][] = [
  ["name"],
  ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"],
  ["image"],
];

const normalizeName = (n: string) => n.trim().toLowerCase().replace(/\s+/g, " ");
const tokenize = (s: string) => normalizeName(s).replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
const tokenSimilarity = (a: string, b: string): number => {
  const ta = tokenize(a);
  const tb = tokenize(b);
  if (ta.length === 0 && tb.length === 0) return 1;
  if (ta.length === 0 || tb.length === 0) return 0;
  const setB = new Set(tb);
  const matches = ta.filter(t => setB.has(t)).length;
  return (2 * matches) / (ta.length + tb.length);
};
const DUPE_THRESHOLD = 0.7;
const isSimilarWhisky = (
  name1: string, dist1: string,
  name2: string, dist2: string,
): boolean => {
  const nameSim = tokenSimilarity(name1, name2);
  if (nameSim >= DUPE_THRESHOLD) {
    if (!dist1 && !dist2) return true;
    if (!dist1 || !dist2) return nameSim >= 0.85;
    return tokenSimilarity(dist1, dist2) >= 0.5;
  }
  return false;
};

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

  const revealedFields = new Set<string>();
  for (let s = 0; s < revealStep && s < stepGroups.length; s++) {
    for (const f of stepGroups[s]) revealedFields.add(f);
  }

  return { revealIndex, revealStep, maxSteps, allRevealed, stepLabels, nextLabel, revealedFields, stepGroups };
}

function isFieldRevealed(rv: ReturnType<typeof getRevealState> | null, fieldOrGroup: string | string[]): boolean {
  if (!rv) return true;
  const fields = Array.isArray(fieldOrGroup) ? fieldOrGroup : [fieldOrGroup];
  return fields.some(f => rv.revealedFields.has(f));
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  draft: { label: "Draft", color: "var(--labs-text-muted)", bg: "var(--labs-surface)" },
  open: { label: "Live", color: "var(--labs-success)", bg: "var(--labs-success-muted)" },
  closed: { label: "Closed", color: "var(--labs-accent)", bg: "var(--labs-accent-muted)" },
  reveal: { label: "Reveal", color: "var(--labs-info)", bg: "var(--labs-info-muted)" },
  archived: { label: "Completed", color: "var(--labs-text-muted)", bg: "var(--labs-surface)" },
};

type DimKey = "nose" | "taste" | "finish";

const WIZARD_PREF_KEY = "labs-host-rating-wizard";

function HostRatingPanel({
  whiskies,
  tastingId,
  participantId,
  ratingScale,
}: {
  whiskies: Array<{ id: string; name?: string; distillery?: string; age?: number; abv?: number }>;
  tastingId: string;
  participantId: string;
  ratingScale: number;
}) {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [activeIdx, setActiveIdx] = useState(0);
  const [wizardMode, setWizardMode] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(WIZARD_PREF_KEY);
      return stored === "true";
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

  const scaleMax = ratingScale || 100;
  const scaleDefault = Math.round(scaleMax / 2);
  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "" };

  const useWizard = isMobile || wizardMode;

  const toggleWizardMode = () => {
    const next = !wizardMode;
    setWizardMode(next);
    localStorage.setItem(WIZARD_PREF_KEY, String(next));
  };

  const ratingUpsertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => ratingApi.upsert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] }),
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
    const flavorMarker = /\[(Nose|Taste|Finish)\]\s*([^\n]*)/gi;
    let fm: RegExpExecArray | null;
    while ((fm = flavorMarker.exec(cleanNotes)) !== null) {
      const dim = fm[1].toLowerCase() as DimKey;
      if (chips[dim].length === 0) {
        chips[dim] = fm[2].split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    cleanNotes = cleanNotes.replace(/\[(Nose|Taste|Finish)\]\s*[^\n]*/gi, "");
    cleanNotes = cleanNotes.replace(/\[SCORES\][\s\S]*?\[\/SCORES\]/, "");
    cleanNotes = cleanNotes.replace(/\n{2,}/g, "\n").trim();
    return { chips, texts, cleanNotes };
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
    if (whiskies.length === 0) return;
    const loadExisting = async () => {
      for (const w of whiskies) {
        if (hostScores[w.id]) continue;
        try {
          const existing = await ratingApi.getMyRating(participantId, w.id);
          if (existing) {
            const parsed = parseSavedNotes(existing.notes || "");
            setHostScores(prev => ({ ...prev, [w.id]: { nose: existing.nose ?? scaleDefault, taste: existing.taste ?? scaleDefault, finish: existing.finish ?? scaleDefault } }));
            setHostOverall(prev => ({ ...prev, [w.id]: existing.overall ?? scaleDefault }));
            setHostChips(prev => ({ ...prev, [w.id]: parsed.chips }));
            setHostTexts(prev => ({ ...prev, [w.id]: parsed.texts }));
            setHostNotes(prev => ({ ...prev, [w.id]: parsed.cleanNotes }));
          }
        } catch {}
      }
    };
    loadExisting();
  }, [whiskies.length, participantId]);

  const debouncedSave = useCallback((whiskyId: string, freshScores: Record<DimKey, number>, freshOverall: number, freshNotes: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const scoresBlock = buildScoresBlock(whiskyId);
      const combinedNotes = (freshNotes + scoresBlock).trim();
      setSaving(true);
      ratingUpsertMut.mutate({
        participantId,
        whiskyId,
        tastingId,
        nose: freshScores.nose, taste: freshScores.taste, finish: freshScores.finish,
        overall: freshOverall,
        notes: combinedNotes,
      }, { onSettled: () => setSaving(false) });
    }, 800);
  }, [participantId, tastingId, buildScoresBlock]);

  const chipSaveRef = useRef(0);
  useEffect(() => {
    if (!whiskies.length) return;
    const wId = whiskies[activeIdx]?.id;
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

  const currentWhisky = whiskies[activeIdx];
  if (!currentWhisky) {
    return (
      <div className="labs-card p-5 text-center" data-testid="host-rating-empty">
        <Star className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>No whiskies to rate yet.</p>
      </div>
    );
  }

  return (
    <div className="labs-card" style={{ padding: 0 }} data-testid="host-rating-panel">
      <div style={{
        padding: "14px 16px",
        borderBottom: "1px solid var(--labs-border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Star className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>Host Rating</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {!isMobile && (
            <button
              type="button"
              onClick={toggleWizardMode}
              style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "3px 8px", borderRadius: 6,
                border: "1px solid var(--labs-border)",
                background: wizardMode ? "var(--labs-accent-muted)" : "transparent",
                color: wizardMode ? "var(--labs-accent)" : "var(--labs-text-muted)",
                fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
              }}
              data-testid="host-wizard-toggle"
            >
              <Sliders className="w-3 h-3" />
              {wizardMode ? "Wizard" : "Compact"}
            </button>
          )}
          {saving && (
            <span style={{ fontSize: 11, color: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 4 }}>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
      </div>

      <div style={{
        padding: "10px 16px",
        display: "flex",
        gap: 4,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--labs-border-subtle)",
      }}>
        {whiskies.map((w, idx) => (
          <button
            key={w.id}
            onClick={() => setActiveIdx(idx)}
            style={{
              padding: "4px 10px",
              borderRadius: 8,
              border: idx === activeIdx ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
              background: idx === activeIdx ? "var(--labs-surface-elevated)" : "transparent",
              color: idx === activeIdx ? "var(--labs-accent)" : "var(--labs-text-muted)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
            data-testid={`host-rating-tab-${idx}`}
          >
            {String.fromCharCode(65 + idx)}
          </button>
        ))}
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ marginBottom: 12 }}>
          <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
            {currentWhisky.name || `Whisky ${activeIdx + 1}`}
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)", marginTop: 2 }}>
            {[currentWhisky.distillery, currentWhisky.age ? `${currentWhisky.age}y` : null, currentWhisky.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>

        <LabsRatingPanel
          scores={getScores(currentWhisky.id)}
          onScoreChange={(dim, val) => handleScoreChange(currentWhisky.id, dim, val)}
          chips={hostChips[currentWhisky.id] || emptyChips}
          onChipToggle={(dim, chip) => handleChipToggle(currentWhisky.id, dim, chip)}
          texts={hostTexts[currentWhisky.id] || emptyTexts}
          onTextChange={(dim, text) => handleTextChange(currentWhisky.id, dim, text)}
          overall={getOverall(currentWhisky.id)}
          onOverallChange={(val) => handleOverallChange(currentWhisky.id, val)}
          overallAuto={getOverallAuto(currentWhisky.id)}
          overrideActive={!!hostOverride[currentWhisky.id]}
          onResetOverride={() => {
            const wId = currentWhisky.id;
            setHostOverride(prev => ({ ...prev, [wId]: false }));
            const auto = getOverallAuto(wId);
            setHostOverall(prev => ({ ...prev, [wId]: auto }));
            debouncedSave(wId, getScores(wId), auto, hostNotes[wId] || "");
          }}
          scale={scaleMax}
          showToggle={false}
          defaultOpen={true}
          compact={!useWizard}
          wizard={useWizard}
        />

        <textarea
          value={hostNotes[currentWhisky.id] || ""}
          onChange={e => {
            const wId = currentWhisky.id;
            const newNotes = e.target.value;
            setHostNotes(prev => ({ ...prev, [wId]: newNotes }));
            debouncedSave(wId, getScores(wId), getOverall(wId), newNotes);
          }}
          placeholder="Your tasting notes..."
          className="labs-input"
          style={{ resize: "vertical", minHeight: 56, marginTop: 12, fontSize: 13 }}
          data-testid="host-rating-notes"
        />
      </div>
    </div>
  );
}

function PrintMaterialsSection({
  tasting,
  whiskies,
  participants,
  currentParticipant,
}: {
  tasting: Record<string, unknown>;
  whiskies: Array<Record<string, unknown>>;
  participants: Array<Record<string, unknown>>;
  currentParticipant: Record<string, unknown>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait");
  const [blindMode, setBlindMode] = useState(!!tasting.blindMode);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(tasting.coverImageUrl as string || null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [aiCoverLoading, setAiCoverLoading] = useState(false);

  const whiskyCount = whiskies.length;
  if (whiskyCount === 0) return null;

  const resolveHostName = (): string => {
    const found = participants.find((p: Record<string, unknown>) =>
      (p.participantId || p.id) === tasting.hostId
    );
    return ((found?.name as string) || (currentParticipant as Record<string, unknown>)?.name as string) || "Host";
  };

  const handleGenerateMenu = async () => {
    setGenerating("menu");
    try {
      const pList = participants.map((p: Record<string, unknown>) => ({
        name: stripGuestSuffix((p.name || (p.participant as Record<string, unknown>)?.name || "Unknown") as string),
        photoUrl: (p.photoUrl || (p.participant as Record<string, unknown>)?.photoUrl || null) as string | null,
      }));
      const hostName = resolveHostName();

      let finalCover = coverImage;
      if (!finalCover && coverPreview) {
        try {
          const imgRes = await fetch(coverPreview);
          const blob = await imgRes.blob();
          finalCover = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          setCoverImage(finalCover);
        } catch {}
      }

      await generateTastingMenu({
        tasting: tasting as unknown as import("@shared/schema").Tasting,
        whiskies: whiskies as unknown as import("@shared/schema").Whisky[],
        participants: pList,
        hostName,
        coverImageBase64: finalCover || null,
        orientation,
        blindMode,
        language: "de",
      });
    } catch (e) {
      console.error("Menu generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateBatchSheets = async () => {
    setGenerating("sheets");
    try {
      const pList = participants.map((p: Record<string, unknown>) => ({
        id: (p.participantId || p.id) as string,
        name: stripGuestSuffix((p.name || (p.participant as Record<string, unknown>)?.name || "Unknown") as string),
      }));
      if (pList.length === 0) return;
      const type = blindMode ? "blind" : "tasting";
      const hostName = resolveHostName();
      await generateBatchPersonalizedPdf(
        tasting as unknown as import("@shared/schema").Tasting,
        whiskies as unknown as import("@shared/schema").Whisky[],
        pList,
        "de",
        type,
        "download",
        hostName,
        orientation,
        null,
      );
    } catch (e) {
      console.error("Batch sheets failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMasterSheet = async () => {
    setGenerating("master");
    try {
      const hostName = resolveHostName();
      const sheetFn = blindMode ? generateBlindEvaluationSheet : generateTastingNotesSheet;
      await sheetFn(
        tasting as unknown as import("@shared/schema").Tasting,
        whiskies as unknown as import("@shared/schema").Whisky[],
        "de",
        undefined,
        "download",
        hostName,
        orientation,
        null,
      );
    } catch (e) {
      console.error("Master sheet failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMat = () => {
    setGenerating("mat");
    try {
      generateBlankTastingMat("de", whiskyCount, (tasting.ratingScale as number) || 10);
    } catch (e) {
      console.error("Mat generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateBlankSheet = () => {
    setGenerating("blank");
    try {
      generateBlankTastingSheet("de", whiskyCount);
    } catch (e) {
      console.error("Sheet generation failed:", e);
    } finally {
      setGenerating(null);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setCoverImage(base64);
      setCoverPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleAiCover = async () => {
    setAiCoverLoading(true);
    try {
      const pid = (currentParticipant as Record<string, unknown>)?.id as string | undefined;
      const res = await fetch(`/api/tastings/${tasting.id}/menu-cover`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(pid ? { "x-participant-id": pid } : {}) },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.imageUrl) {
          setCoverPreview(data.imageUrl);
          try {
            const imgRes = await fetch(data.imageUrl);
            const blob = await imgRes.blob();
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
            setCoverImage(base64);
          } catch {}
        }
      }
    } catch (e) {
      console.error("AI cover generation failed:", e);
    } finally {
      setAiCoverLoading(false);
    }
  };

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: 0, fontFamily: "inherit" }}
        data-testid="toggle-print-materials"
      >
        <h2 className="labs-section-label mb-0 flex items-center gap-2">
          <Printer className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          Print & Materials
        </h2>
        <ChevronDown
          className="w-4 h-4"
          style={{ color: "var(--labs-text-muted)", transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
        />
      </button>

      {expanded && (
        <div className="mt-3 space-y-4">
          <div className="labs-card p-4">
            <p className="text-sm font-semibold mb-3" style={{ color: "var(--labs-text)" }}>Tasting Menu Card</p>

            <div className="flex gap-4 mb-3">
              <div className="flex-1">
                <p className="text-[11px] mb-1.5" style={{ color: "var(--labs-text-muted)" }}>Orientation</p>
                <div className="flex gap-1">
                  <button
                    className={`labs-btn-ghost text-xs px-3 py-1.5 rounded-lg ${orientation === "portrait" ? "ring-1" : ""}`}
                    style={orientation === "portrait" ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)" } : {}}
                    onClick={() => setOrientation("portrait")}
                    data-testid="print-orientation-portrait"
                  >
                    Portrait
                  </button>
                  <button
                    className={`labs-btn-ghost text-xs px-3 py-1.5 rounded-lg ${orientation === "landscape" ? "ring-1" : ""}`}
                    style={orientation === "landscape" ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)" } : {}}
                    onClick={() => setOrientation("landscape")}
                    data-testid="print-orientation-landscape"
                  >
                    Landscape
                  </button>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[11px] mb-1.5" style={{ color: "var(--labs-text-muted)" }}>Content Mode</p>
                <div className="flex gap-1">
                  <button
                    className={`labs-btn-ghost text-xs px-3 py-1.5 rounded-lg ${!blindMode ? "ring-1" : ""}`}
                    style={!blindMode ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)" } : {}}
                    onClick={() => setBlindMode(false)}
                    data-testid="print-mode-open"
                  >
                    Open
                  </button>
                  <button
                    className={`labs-btn-ghost text-xs px-3 py-1.5 rounded-lg ${blindMode ? "ring-1" : ""}`}
                    style={blindMode ? { background: "var(--labs-accent-muted)", color: "var(--labs-accent)", ringColor: "var(--labs-accent)" } : {}}
                    onClick={() => setBlindMode(true)}
                    data-testid="print-mode-blind"
                  >
                    Blind
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-[11px] mb-1.5" style={{ color: "var(--labs-text-muted)" }}>Cover Image</p>
              <div className="flex gap-2 items-center">
                <label
                  className="labs-btn-ghost text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                  data-testid="print-upload-cover"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} data-testid="input-print-cover-file" />
                </label>
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)", opacity: 0.75 }} data-testid="text-photo-rights-hint-cover">{t("labs.settings.photoRightsHint", "Please only upload your own photos or license-free images.")}</span>
                <button
                  className="labs-btn-ghost text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  onClick={handleAiCover}
                  disabled={aiCoverLoading}
                  data-testid="print-ai-cover"
                >
                  {aiCoverLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {aiCoverLoading ? "Generating..." : "AI Cover"}
                </button>
                {coverPreview && (
                  <button
                    className="labs-btn-ghost text-xs px-2 py-1"
                    onClick={() => { setCoverImage(null); setCoverPreview(null); }}
                    data-testid="print-remove-cover"
                  >
                    <X className="w-3 h-3" style={{ color: "var(--labs-danger)" }} />
                  </button>
                )}
              </div>
              {coverPreview && (
                <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid var(--labs-border-subtle)", maxHeight: 120 }}>
                  <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" style={{ maxHeight: 120 }} data-testid="print-cover-preview" />
                </div>
              )}
            </div>

            <button
              className="labs-btn-primary text-sm flex items-center gap-2 w-full justify-center"
              onClick={handleGenerateMenu}
              disabled={generating === "menu"}
              data-testid="print-generate-menu"
            >
              {generating === "menu" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {generating === "menu" ? "Generating..." : "Generate Menu Card"}
            </button>
          </div>

          <div className="labs-card p-4">
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Participant Score Sheets</p>
            <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
              Personalized sheets with QR codes for each participant
            </p>

            {participants.length > 0 && (
              <div className="mb-3 rounded-lg overflow-hidden" style={{ border: "1px solid var(--labs-border-subtle)" }}>
                {participants.map((p: Record<string, unknown>, idx: number) => {
                  const pName = stripGuestSuffix((p.name || (p.participant as Record<string, unknown>)?.name || "Unknown") as string);
                  return (
                    <div
                      key={(p.participantId || p.id) as string}
                      className="flex items-center gap-2 px-3 py-2"
                      style={{
                        background: idx % 2 === 0 ? "var(--labs-surface-elevated)" : "transparent",
                        borderBottom: idx < participants.length - 1 ? "1px solid var(--labs-border-subtle)" : "none",
                      }}
                      data-testid={`print-participant-${idx}`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
                        style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                      >
                        {pName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs truncate" style={{ color: "var(--labs-text)" }}>{pName}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex gap-2">
              <button
                className="labs-btn-primary text-sm flex items-center gap-2 flex-1 justify-center"
                onClick={handleGenerateBatchSheets}
                disabled={generating === "sheets" || participants.length === 0}
                data-testid="print-generate-sheets"
              >
                {generating === "sheets" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                {generating === "sheets" ? "Generating..." : `All Sheets (${participants.length})`}
              </button>
              <button
                className="labs-btn-secondary text-sm flex items-center gap-2 justify-center"
                onClick={handleGenerateMasterSheet}
                disabled={generating === "master"}
                data-testid="print-generate-master-sheet"
              >
                {generating === "master" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                Master
              </button>
              <button
                className="labs-btn-ghost text-sm flex items-center gap-2 justify-center"
                onClick={handleGenerateBlankSheet}
                disabled={generating === "blank"}
                data-testid="print-generate-blank-sheet"
              >
                {generating === "blank" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
                Blank
              </button>
            </div>
          </div>

          <div className="labs-card p-4">
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Tasting Mat</p>
            <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
              A4 landscape mat with {whiskyCount} numbered positions for your lineup
            </p>
            <button
              className="labs-btn-secondary text-sm flex items-center gap-2 w-full justify-center"
              onClick={handleGenerateMat}
              disabled={generating === "mat"}
              data-testid="print-generate-mat"
            >
              {generating === "mat" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {generating === "mat" ? "Generating..." : "Download Tasting Mat"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileCompanion({
  tasting,
  whiskies,
  participants,
  ratings,
  currentParticipant,
  queryClient,
  tastingId,
  navigate,
}: {
  tasting: Record<string, unknown>;
  whiskies: Array<Record<string, unknown>>;
  participants: Array<Record<string, unknown>>;
  ratings: Array<Record<string, unknown>>;
  currentParticipant: Record<string, unknown>;
  queryClient: ReturnType<typeof useQueryClient>;
  tastingId: string;
  navigate: (path: string) => void;
}) {
  const goBack = useLabsBack("/labs/tastings");
  const statusCfg = STATUS_CONFIG[(tasting.status as string)] || STATUS_CONFIG.draft;
  const whiskyCount = whiskies.length;
  const participantCount = participants.length;
  const ratingCount = ratings.length;
  const { t } = useTranslation();
  const isLive = tasting.status === "open";
  const isDraft = tasting.status === "draft";
  const isEnded = tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal";
  const pid = currentParticipant?.id as string;

  const [mobileEditTitle, setMobileEditTitle] = useState<string | null>(null);
  const mobileEditCancelled = useRef(false);
  const [mobileWhiskyListOpen, setMobileWhiskyListOpen] = useState<boolean | null>(null);
  const whiskyListInitRef = useRef(false);
  useEffect(() => {
    if (!whiskyListInitRef.current && whiskyCount > 0) {
      whiskyListInitRef.current = true;
      setMobileWhiskyListOpen(whiskyCount <= 3);
    }
  }, [whiskyCount]);
  const whiskyListExpanded = mobileWhiskyListOpen ?? true;
  const [mobileWhiskyName, setMobileWhiskyName] = useState("");
  const [mobileShowAdd, setMobileShowAdd] = useState(isDraft && whiskyCount === 0);
  const [mobileAiImport, setMobileAiImport] = useState(false);
  const [mobileAiFiles, setMobileAiFiles] = useState<File[]>([]);
  const [mobileAiText, setMobileAiText] = useState("");
  const [mobileAiLoading, setMobileAiLoading] = useState(false);
  const [mobileAiResults, setMobileAiResults] = useState<any[]>([]);
  const [mobileAiSelected, setMobileAiSelected] = useState<Set<number>>(new Set());
  const [mobileDragOver, setMobileDragOver] = useState(false);
  const [mobileEditId, setMobileEditId] = useState<string | null>(null);
  const [mobileEditName, setMobileEditName] = useState("");

  const patchMobileDetails = async (fields: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/tastings/${tastingId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: pid, ...fields }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      }
    } catch {}
  };

  const addWhiskyMut = useMutation({
    mutationFn: (data: any) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setMobileWhiskyName("");
    },
  });

  const deleteWhiskyMut = useMutation({
    mutationFn: (id: string) => whiskyApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] }),
  });

  const updateWhiskyMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => whiskyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setMobileEditId(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ status }: { status: string }) =>
      tastingApi.updateStatus(tastingId, status, undefined, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedAdvanceMut = useMutation({
    mutationFn: () => guidedApi.advance(tastingId, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const revealMutation = useMutation({
    mutationFn: () => blindModeApi.revealNext(tastingId, pid),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] }),
  });

  const guidedIdx = (tasting.guidedWhiskyIndex as number) ?? -1;
  const activeWhisky = tasting.guidedMode && guidedIdx >= 0 && guidedIdx < whiskyCount ? whiskies[guidedIdx] : null;
  const activeRatedPids = new Set(
    activeWhisky ? ratings.filter((r: Record<string, unknown>) => r.whiskyId === (activeWhisky as Record<string, unknown>).id).map((r: Record<string, unknown>) => r.participantId) : []
  );

  const handleMobileAdd = () => {
    if (!mobileWhiskyName.trim()) return;
    addWhiskyMut.mutate({
      tastingId,
      name: mobileWhiskyName.trim(),
      sortOrder: whiskyCount + 1,
    });
  };

  const [mobileAiError, setMobileAiError] = useState("");
  const [mobileAiSummary, setMobileAiSummary] = useState<{ added: number; duplicatesAdded: number; duplicatesSkipped: number; failed: number } | null>(null);

  const getMobileDuplicateIndices = useCallback(() => {
    if (!whiskies || !mobileAiResults.length) return new Set<number>();
    const dupes = new Set<number>();
    mobileAiResults.forEach((w: any, i: number) => {
      const match = whiskies.some((ew: any) =>
        isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || "")
      );
      if (match) dupes.add(i);
    });
    return dupes;
  }, [whiskies, mobileAiResults]);

  const handleMobileAiImport = async () => {
    if (mobileAiFiles.length === 0 && !mobileAiText.trim()) return;
    setMobileAiLoading(true);
    setMobileAiError("");
    setMobileAiSummary(null);
    try {
      const result = await tastingApi.aiImport(mobileAiFiles, mobileAiText.trim(), pid);
      if (result?.whiskies?.length) {
        setMobileAiResults(result.whiskies);
        const existingList = (whiskies || []) as Array<Record<string, unknown>>;
        const nonDupeIndices = new Set(
          result.whiskies.map((_: any, i: number) => i).filter((i: number) =>
            !existingList.some((ew: any) => isSimilarWhisky(result.whiskies[i].name || "", result.whiskies[i].distillery || "", ew.name || "", ew.distillery || ""))
          )
        );
        setMobileAiSelected(nonDupeIndices);
      } else {
        setMobileAiError(t("labs.aiImport.noResults", "No whiskies found. Try a clearer photo or text."));
      }
    } catch (e: unknown) {
      setMobileAiError((e instanceof Error ? e.message : null) || t("labs.aiImport.importFailed", "AI import failed. Please try again."));
    }
    setMobileAiLoading(false);
  };

  const handleMobileAiConfirm = async () => {
    let added = 0, dupeAdded = 0, fail = 0;
    const dupeIndices = getMobileDuplicateIndices();
    const duplicatesSkipped = Array.from(dupeIndices).filter(i => !mobileAiSelected.has(i)).length;
    const existingList = (whiskies || []) as Array<Record<string, unknown>>;
    for (const idx of Array.from(mobileAiSelected)) {
      const w = mobileAiResults[idx];
      if (w) {
        const isDupe = existingList.some((ew: any) => isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || ""));
        try {
          await whiskyApi.create({
            tastingId,
            name: w.name || "",
            distillery: w.distillery || "",
            abv: w.abv ? parseFloat(w.abv) || null : null,
            caskInfluence: w.caskInfluence || w.caskType || w.cask || "",
            age: w.age ? String(w.age) : "",
            category: w.category || "",
            country: w.country || "",
            region: w.region || "",
            bottler: w.bottler || "",
            peatLevel: w.peatLevel || "",
            ppm: w.ppm ? parseFloat(w.ppm) || null : null,
            price: w.price ? parseFloat(w.price) || null : null,
            sortOrder: whiskyCount + added + dupeAdded + 1,
          });
          if (isDupe) dupeAdded++; else added++;
        } catch { fail++; }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    setMobileAiSummary({ added, duplicatesAdded: dupeAdded, duplicatesSkipped, failed: fail });
    setMobileAiResults([]);
    setMobileAiSelected(new Set());
    if (fail === 0) {
      setMobileAiFiles([]);
      setMobileAiText("");
      setTimeout(() => { setMobileAiImport(false); setMobileAiSummary(null); }, 2500);
    }
  };

  return (
    <div className="px-4 py-5 labs-fade-in" style={{ paddingBottom: 120 }} data-testid="labs-mobile-companion">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-mobile-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="labs-card p-4 mb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          {mobileEditTitle !== null ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                className="labs-input flex-1"
                value={mobileEditTitle}
                onChange={e => setMobileEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    mobileEditCancelled.current = true;
                    setMobileEditTitle(null);
                  }
                }}
                onBlur={() => {
                  if (mobileEditCancelled.current) {
                    mobileEditCancelled.current = false;
                    return;
                  }
                  const trimmed = (mobileEditTitle || "").trim();
                  if (trimmed && trimmed !== tasting.title) {
                    patchMobileDetails({ title: trimmed });
                  }
                  setMobileEditTitle(null);
                }}
                autoFocus
                data-testid="labs-mobile-edit-title-input"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h1
                className="labs-h3"
                style={{ color: "var(--labs-text)", margin: 0, cursor: "pointer" }}
                onClick={() => setMobileEditTitle((tasting.title as string) || "")}
                data-testid="labs-mobile-title"
              >
                {(tasting.title as string) || "Untitled Tasting"}
              </h1>
              <button
                className="labs-btn-ghost p-1 flex-shrink-0"
                onClick={() => setMobileEditTitle((tasting.title as string) || "")}
                data-testid="labs-mobile-edit-title-btn"
              >
                <Pencil className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
              </button>
            </div>
          )}
          <span className="labs-badge flex-shrink-0" style={{ background: statusCfg.bg, color: statusCfg.color }}>
            {isLive && (
              <span style={{
                width: 6, height: 6, borderRadius: 3, background: statusCfg.color,
                display: "inline-block", marginRight: 4, animation: "pulse 2s infinite",
              }} />
            )}
            {statusCfg.label}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {[
            { value: whiskyCount, label: "Drams" },
            { value: participantCount, label: "Guests" },
            { value: ratingCount, label: "Ratings" },
          ].map(({ value, label }) => (
            <div key={label} style={{ flex: 1, background: "var(--labs-surface-elevated)", borderRadius: 10, padding: 10, textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-accent)" }}>{value}</div>
              <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {currentParticipant && (
        <div className="mb-4">
          <LabsSettingsPanel
            tasting={tasting}
            tastingId={tastingId}
            pid={currentParticipant.id as string}
            queryClient={queryClient}
            navigate={navigate}
            whiskies={whiskies}
            participants={participants}
          />
        </div>
      )}

      {isDraft && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="labs-section-label mb-0">Whiskies ({whiskyCount})</p>
            <button
              className="labs-btn-ghost flex items-center gap-1 text-xs"
              onClick={() => { setMobileShowAdd(!mobileShowAdd); setMobileAiImport(false); }}
              data-testid="mobile-add-whisky-toggle"
            >
              {mobileShowAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              {mobileShowAdd ? "Close" : "Add"}
            </button>
          </div>

          {!mobileAiImport && !mobileShowAdd && whiskyCount === 0 && (
            <button
              onClick={() => { setMobileAiImport(true); setMobileShowAdd(false); }}
              className="w-full mb-3 p-4 rounded-2xl flex items-center gap-4 transition-all"
              style={{
                background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 12%, transparent), color-mix(in srgb, var(--labs-accent) 6%, transparent))",
                border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)",
                cursor: "pointer",
                textAlign: "left",
              }}
              data-testid="mobile-ai-import-hero"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "var(--labs-accent-muted)" }}
              >
                <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: "var(--labs-text)", margin: 0 }}>
                  AI Import
                </p>
                <p className="text-xs" style={{ color: "var(--labs-text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>
                  Snap a menu, paste a list — AI fills in everything
                </p>
              </div>
              <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
            </button>
          )}

          {!mobileAiImport && (whiskyCount > 0 || mobileShowAdd) && (
            <div className="flex items-center mb-2">
              <button
                className="labs-btn-ghost flex items-center gap-1.5 text-xs"
                onClick={() => { setMobileAiImport(true); setMobileShowAdd(false); }}
                style={{ color: "var(--labs-accent)" }}
                data-testid="mobile-ai-import-toggle"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Import
              </button>
            </div>
          )}

          {mobileAiImport && (
            <div className="labs-card mb-3 overflow-hidden" data-testid="mobile-ai-import-panel" style={{ border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: "color-mix(in srgb, var(--labs-accent) 8%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--labs-accent) 15%, transparent)" }}>
                <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <span className="text-sm font-semibold flex-1" style={{ color: "var(--labs-text)" }}>AI Import</span>
                <button className="labs-btn-ghost text-xs" onClick={() => { setMobileAiImport(false); setMobileAiFiles([]); setMobileAiText(""); setMobileAiResults([]); setMobileAiError(""); }} style={{ padding: "2px 6px" }}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-3 space-y-3">
                <div
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-sm"
                  style={{
                    border: `2px dashed ${mobileDragOver ? "var(--labs-accent)" : "var(--labs-border)"}`,
                    color: "var(--labs-text-muted)",
                    background: mobileDragOver ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                    transition: "all 0.2s",
                  }}
                  onDragOver={e => { e.preventDefault(); setMobileDragOver(true); }}
                  onDragLeave={() => setMobileDragOver(false)}
                  onDrop={e => {
                    e.preventDefault();
                    setMobileDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length) setMobileAiFiles(prev => [...prev, ...files]);
                  }}
                >
                  <Camera className="w-6 h-6" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
                  <p className="text-xs text-center" style={{ color: "var(--labs-text-secondary)" }}>
                    Photo, PDF or tasting sheet
                  </p>
                  <div className="flex gap-2">
                    <label className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer flex items-center gap-1.5" style={{ background: "var(--labs-accent)", color: "var(--labs-bg)", border: "none" }}>
                      <Camera className="w-3 h-3" />
                      Camera
                      <input type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => { if (e.target.files) setMobileAiFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                    </label>
                    <label className="labs-btn-ghost text-xs cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3 h-3" />
                      Browse
                      <input type="file" accept="image/*,.pdf,.csv,.txt,.xlsx" multiple style={{ display: "none" }} onChange={e => { if (e.target.files) setMobileAiFiles(prev => [...prev, ...Array.from(e.target.files!)]); }} />
                    </label>
                  </div>
                </div>
                {mobileAiFiles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {mobileAiFiles.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>
                        {f.name.length > 15 ? f.name.slice(0, 12) + "..." : f.name}
                        <button onClick={() => setMobileAiFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ position: "relative" }}>
                  <textarea
                    className="labs-input w-full"
                    rows={2}
                    placeholder="Or paste whisky names, menu text..."
                    value={mobileAiText}
                    onChange={e => setMobileAiText(e.target.value)}
                    style={{ resize: "none", fontSize: 13 }}
                    data-testid="mobile-ai-import-text"
                  />
                </div>
                <button
                  className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  onClick={handleMobileAiImport}
                  disabled={mobileAiLoading || (mobileAiFiles.length === 0 && !mobileAiText.trim())}
                  style={{
                    background: (mobileAiFiles.length > 0 || mobileAiText.trim()) ? "var(--labs-accent)" : "var(--labs-surface-elevated)",
                    color: (mobileAiFiles.length > 0 || mobileAiText.trim()) ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    border: "none",
                    cursor: (mobileAiFiles.length > 0 || mobileAiText.trim()) ? "pointer" : "not-allowed",
                    opacity: mobileAiLoading ? 0.7 : 1,
                  }}
                  data-testid="mobile-ai-import-analyze"
                >
                  {mobileAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  {mobileAiLoading ? "Analyzing..." : "Analyze with AI"}
                </button>

                {mobileAiError && (
                  <div className="text-xs p-2 rounded-lg" style={{ background: "color-mix(in srgb, var(--labs-danger) 15%, transparent)", color: "var(--labs-danger)" }}>
                    {mobileAiError}
                  </div>
                )}

                {mobileAiSummary && (
                  <div className="text-xs p-3 rounded-lg space-y-1" style={{ background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 20%, transparent)" }} data-testid="mobile-ai-summary">
                    {mobileAiSummary.added > 0 && <p style={{ color: "var(--labs-success)", margin: 0 }}>{mobileAiSummary.added} {t("labs.aiImport.added", "added")}</p>}
                    {mobileAiSummary.duplicatesAdded > 0 && <p style={{ color: "var(--labs-warning, var(--labs-text-muted))", margin: 0 }}>{mobileAiSummary.duplicatesAdded} {t("labs.aiImport.duplicatesAdded", "duplicates added")}</p>}
                    {mobileAiSummary.duplicatesSkipped > 0 && <p style={{ color: "var(--labs-text-muted)", margin: 0 }}>{mobileAiSummary.duplicatesSkipped} {t("labs.aiImport.duplicatesSkipped", "duplicates skipped")}</p>}
                    {mobileAiSummary.failed > 0 && <p style={{ color: "var(--labs-danger)", margin: 0 }}>{mobileAiSummary.failed} {t("labs.aiImport.failed", "failed")}</p>}
                  </div>
                )}

                {mobileAiResults.length > 0 && (() => {
                  const dupeIndices = getMobileDuplicateIndices();
                  const nonDupeCount = mobileAiResults.length - dupeIndices.size;
                  return (
                  <div className="space-y-2 mt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>
                        {t("labs.aiImport.found", "Found {{count}}", { count: mobileAiResults.length })}
                        {dupeIndices.size > 0 && <span style={{ color: "var(--labs-text-muted)" }}> ({dupeIndices.size} {t("labs.aiImport.alreadyInLineup", "already in lineup")})</span>}
                      </span>
                      <button
                        className="labs-btn-ghost text-xs"
                        onClick={() => setMobileAiSelected(mobileAiSelected.size === nonDupeCount ? new Set() : new Set(mobileAiResults.map((_, i) => i).filter(i => !dupeIndices.has(i))))}
                        data-testid="mobile-ai-select-all"
                      >
                        {mobileAiSelected.size === nonDupeCount && nonDupeCount > 0 ? t("labs.aiImport.deselectAll", "Deselect") : t("labs.aiImport.selectNew", "Select New")}
                      </button>
                    </div>
                    {mobileAiResults.map((w: any, i: number) => {
                      const isDupe = dupeIndices.has(i);
                      return (
                      <label key={i} className="labs-card p-2 flex items-center gap-2 cursor-pointer" style={{ opacity: mobileAiSelected.has(i) ? 1 : isDupe ? 0.4 : 0.5 }}>
                        <input type="checkbox" checked={mobileAiSelected.has(i)} onChange={() => { const s = new Set(mobileAiSelected); s.has(i) ? s.delete(i) : s.add(i); setMobileAiSelected(s); }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate" style={{ margin: 0 }}>{w.name}</p>
                            {isDupe && <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--labs-warning, #f59e0b) 20%, transparent)", color: "var(--labs-warning, #f59e0b)", whiteSpace: "nowrap" }} data-testid={`mobile-ai-dupe-badge-${i}`}>{t("labs.aiImport.duplicate", "duplicate")}</span>}
                          </div>
                          <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                            {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                      </label>
                      );
                    })}
                    <button className="labs-btn-primary w-full text-sm" onClick={handleMobileAiConfirm} disabled={mobileAiSelected.size === 0} data-testid="mobile-ai-confirm">
                    {t("labs.aiImport.addCount", "Add {{count}} Whiskies", { count: mobileAiSelected.size })}
                  </button>
                </div>
                  );
                })()}
            </div>
            </div>
          )}

          {mobileShowAdd && (
            <div className="labs-card p-3 mb-3 flex gap-2">
              <input
                className="labs-input flex-1"
                placeholder="Whisky name..."
                value={mobileWhiskyName}
                onChange={e => setMobileWhiskyName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleMobileAdd()}
                data-testid="mobile-whisky-name-input"
                autoFocus
              />
              <button
                className="labs-btn-primary px-4"
                onClick={handleMobileAdd}
                disabled={!mobileWhiskyName.trim() || addWhiskyMut.isPending}
                data-testid="mobile-whisky-add-btn"
              >
                {addWhiskyMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </button>
            </div>
          )}

          {whiskyCount > 0 && (
            <div className="space-y-2 mb-3">
              {whiskies.map((w: any, i: number) => (
                <div key={w.id} className="labs-card p-3 flex items-center gap-2" data-testid={`mobile-whisky-${w.id}`}>
                  {mobileEditId === w.id ? (
                    <>
                      <input
                        className="labs-input flex-1"
                        value={mobileEditName}
                        onChange={e => setMobileEditName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") updateWhiskyMut.mutate({ id: w.id, data: { name: mobileEditName } }); }}
                        autoFocus
                        data-testid="mobile-edit-whisky-input"
                      />
                      <button className="labs-btn-primary px-2 text-xs" onClick={() => updateWhiskyMut.mutate({ id: w.id, data: { name: mobileEditName } })} data-testid="mobile-edit-whisky-save">
                        {updateWhiskyMut.isPending ? "..." : <Check className="w-3 h-3" />}
                      </button>
                      <button className="labs-btn-ghost px-1" onClick={() => setMobileEditId(null)}>
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      {w.imageUrl ? (
                        <img src={w.imageUrl} alt={w.name} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid var(--labs-border)" }} />
                      ) : (
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{w.name || `Whisky ${i + 1}`}</p>
                        <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                          {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || "No details"}
                        </p>
                      </div>
                      <button className="labs-btn-ghost p-1" onClick={() => { setMobileEditId(w.id); setMobileEditName(w.name || ""); }} data-testid={`mobile-edit-whisky-${w.id}`}>
                        <Pencil className="w-3 h-3" style={{ color: "var(--labs-text-muted)" }} />
                      </button>
                      <button className="labs-btn-ghost p-1" onClick={() => deleteWhiskyMut.mutate(w.id)} data-testid={`mobile-delete-whisky-${w.id}`}>
                        <Trash2 className="w-3 h-3" style={{ color: "var(--labs-danger)" }} />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {whiskyCount === 0 && !mobileShowAdd && !mobileAiImport && (
            <div className="labs-card p-4 text-center mb-3">
              <Wine className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--labs-text-muted)" }} />
              <p className="text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>No whiskies yet</p>
              <button
                className="labs-btn-primary text-sm flex items-center gap-1.5 mx-auto"
                onClick={() => setMobileShowAdd(true)}
                data-testid="mobile-add-first-whisky"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Your First Whisky
              </button>
            </div>
          )}
        </div>
      )}

      {tasting.guidedMode && isLive && activeWhisky && (
        <div className="labs-card p-4 mb-4">
          <p className="labs-section-label">Current Dram</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p className="text-base font-semibold" style={{ color: "var(--labs-text)" }}>
                {tasting.blindMode ? `Dram ${String.fromCharCode(65 + guidedIdx)}` : ((activeWhisky as Record<string, unknown>).name as string) || `Whisky ${guidedIdx + 1}`}
              </p>
            </div>
            <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
              {activeRatedPids.size}/{participantCount} rated
            </span>
          </div>
        </div>
      )}

      {(() => {
        const showBlindReveal = tasting.blindMode && !tasting.guidedMode && (isLive || tasting.status === "reveal");
        if (!showBlindReveal || whiskyCount === 0) return null;
        const rv = getRevealState(tasting, whiskyCount);
        const currentWhisky = whiskies[rv.revealIndex];
        return (
          <div className="labs-card p-4 mb-4" data-testid="mobile-reveal-state">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p className="labs-section-label mb-0" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Eye className="w-3.5 h-3.5" style={{ color: "var(--labs-info)" }} />
                Reveal Progress
              </p>
              <span className="labs-badge" style={{ background: rv.allRevealed ? "var(--labs-success-muted)" : "var(--labs-info-muted)", color: rv.allRevealed ? "var(--labs-success)" : "var(--labs-info)", fontSize: 11 }}>
                {rv.allRevealed ? "Complete" : `Dram ${rv.revealIndex + 1} of ${whiskyCount}`}
              </span>
            </div>

            {currentWhisky && !rv.allRevealed && (
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                >
                  {String.fromCharCode(65 + rv.revealIndex)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                    {isFieldRevealed(rv, "name") ? (currentWhisky.name || `Whisky ${rv.revealIndex + 1}`) : `Dram ${String.fromCharCode(65 + rv.revealIndex)} (Blind)`}
                  </p>
                  {isFieldRevealed(rv, ["distillery", "age", "abv"]) && (
                    <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                      {[currentWhisky.distillery, currentWhisky.age ? `${currentWhisky.age}y` : null, currentWhisky.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ") || "No details"}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-1 mb-1">
              {rv.stepLabels.map((label: string, idx: number) => (
                <div
                  key={label}
                  className="flex-1 h-1.5 rounded-full"
                  style={{
                    background: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-border)",
                    transition: "background 300ms ease",
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between">
              {rv.stepLabels.map((label: string, idx: number) => (
                <span key={label} className="text-[11px]" style={{ color: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                  {label}
                </span>
              ))}
            </div>

            {whiskyCount > 1 && (
              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {whiskies.map((_: any, i: number) => {
                  let bg = "var(--labs-border)";
                  let fg = "var(--labs-text-muted)";
                  if (i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps)) {
                    bg = "var(--labs-success)";
                    fg = "var(--labs-bg)";
                  } else if (i === rv.revealIndex) {
                    bg = "var(--labs-accent)";
                    fg = "var(--labs-bg)";
                  }
                  return (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold"
                      style={{ background: bg, color: fg }}
                    >
                      {i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps) ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {isDraft && (
          <button
            className="labs-btn-primary flex items-center justify-center gap-2 w-full"
            onClick={async () => {
              if (tasting.guidedMode) {
                await guidedApi.updateMode(tastingId, pid, { guidedMode: true, guidedWhiskyIndex: 0, guidedRevealStep: 0 });
              }
              await tastingApi.updateStatus(tastingId, "open", undefined, pid);
              queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
            }}
            disabled={whiskyCount === 0}
            style={{ opacity: whiskyCount === 0 ? 0.5 : 1 }}
            data-testid="mobile-start-tasting"
          >
            <Play className="w-4 h-4" />
            Start Tasting
          </button>
        )}

        {isLive && tasting.guidedMode && (
          <button
            className="labs-btn-primary flex items-center justify-center gap-2 w-full"
            onClick={() => guidedAdvanceMut.mutate()}
            disabled={guidedAdvanceMut.isPending || guidedIdx >= whiskyCount - 1}
            style={{ opacity: guidedIdx >= whiskyCount - 1 ? 0.5 : 1 }}
            data-testid="mobile-next-dram"
          >
            {guidedAdvanceMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
            {guidedIdx < 0 ? "Start First Dram" : guidedIdx >= whiskyCount - 1 ? "All Drams Done" : "Next Dram"}
          </button>
        )}

        {(isLive || tasting.status === "reveal") && tasting.blindMode && !tasting.guidedMode && whiskyCount > 0 && (() => {
          const rv = getRevealState(tasting, whiskyCount);
          return (
            <button
              className="labs-btn-secondary flex items-center justify-center gap-2 w-full"
              onClick={() => revealMutation.mutate()}
              disabled={revealMutation.isPending || rv.allRevealed}
              style={{ opacity: rv.allRevealed ? 0.5 : 1 }}
              data-testid="mobile-reveal"
            >
              {revealMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              {rv.nextLabel}
            </button>
          );
        })()}

        {isLive && (
          <button
            className="labs-btn-secondary flex items-center justify-center gap-2 w-full"
            onClick={() => statusMutation.mutate({ status: "closed" })}
            disabled={statusMutation.isPending}
            data-testid="mobile-end-tasting"
          >
            <Square className="w-4 h-4" />
            Close Ratings
          </button>
        )}

        {isEnded && (
          <button
            className="labs-btn-primary flex items-center justify-center gap-2 w-full"
            onClick={() => navigate(`/labs/results/${tastingId}`)}
            data-testid="mobile-view-results"
          >
            <BarChart3 className="w-4 h-4" />
            View Results
          </button>
        )}

        {isLive && (
          <button
            className="labs-btn-ghost flex items-center justify-center gap-2 w-full"
            onClick={() => navigate(`/labs/live/${tastingId}`)}
            style={{ color: "var(--labs-accent)", fontSize: 13 }}
            data-testid="mobile-rate-btn"
          >
            <Star className="w-4 h-4" />
            {t("m2.host.myRating", "My Rating")}
          </button>
        )}
      </div>

      {!isDraft && whiskyCount > 0 && (() => {
        const rv = tasting.blindMode && !tasting.guidedMode ? getRevealState(tasting, whiskyCount) : null;
        return (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setMobileWhiskyListOpen(!whiskyListExpanded)}
              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: 0, fontFamily: "inherit" }}
              data-testid="toggle-whisky-list"
            >
              <p className="labs-section-label mb-0">Whiskies ({whiskyCount})</p>
              <ChevronDown
                className="w-4 h-4"
                style={{ color: "var(--labs-text-muted)", transform: whiskyListExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              />
            </button>
            {whiskyListExpanded && (
            <div className="space-y-2 mt-2">
              {whiskies.map((w: any, i: number) => {
                const isRevealed = !rv || i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps);
                const isActive = rv && i === rv.revealIndex && rv.revealStep < rv.maxSteps;
                const isHidden = rv && !isRevealed && !isActive;
                const itemRv = isActive ? rv : null;
                const showName = isRevealed || isFieldRevealed(itemRv, "name");
                const showDetails = isRevealed || isFieldRevealed(itemRv, ["distillery", "age", "abv"]);
                return (
                  <div key={w.id} className="labs-card p-3 flex items-center gap-2" style={{ opacity: isHidden ? 0.4 : 1, transition: "opacity 300ms" }} data-testid={`mobile-whisky-readonly-${w.id}`}>
                    {w.imageUrl && (isRevealed || isFieldRevealed(itemRv, "image")) ? (
                      <img src={w.imageUrl} alt={w.name || `Whisky ${i + 1}`} className="w-7 h-7 rounded-lg object-cover flex-shrink-0" style={{ border: "1px solid var(--labs-border)" }} />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                        style={{
                          background: isRevealed ? "var(--labs-success-muted)" : isActive ? "var(--labs-accent-muted)" : "var(--labs-surface-elevated)",
                          color: isRevealed ? "var(--labs-success)" : isActive ? "var(--labs-accent)" : "var(--labs-text-muted)",
                        }}
                      >
                        {isRevealed ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{showName ? (w.name || `Whisky ${i + 1}`) : `Dram ${String.fromCharCode(65 + i)}`}</p>
                      <p className="text-xs truncate" style={{ color: "var(--labs-text-muted)" }}>
                        {showDetails
                          ? ([w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null].filter(Boolean).join(" · ") || "No details")
                          : (isHidden ? "Hidden" : "Partially revealed")}
                      </p>
                    </div>
                    {isActive && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>
                        Active
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            )}
          </div>
        );
      })()}


      {pid && whiskies.length > 0 && (
        <div className="mt-6">
          <HostRatingPanel
            whiskies={whiskies as Array<{ id: string; name?: string; distillery?: string; age?: number; abv?: number }>}
            tastingId={tastingId}
            participantId={pid}
            ratingScale={(tasting.ratingScale as number) || 100}
          />
        </div>
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </div>
  );
}

function LabsToggle({ checked, onChange, icon, label, description, testId }: {
  checked: boolean; onChange: (v: boolean) => void;
  icon: React.ReactNode; label: string; description: string; testId: string;
}) {
  return (
    <div
      className="labs-card p-4 flex items-center justify-between cursor-pointer"
      onClick={() => onChange(!checked)}
      data-testid={testId}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: checked ? "var(--labs-accent-muted)" : "var(--labs-surface)" }}
        >
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>{label}</p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>{description}</p>
        </div>
      </div>
      <div
        className="w-12 h-7 rounded-full transition-all flex items-center px-0.5"
        style={{
          background: checked ? "var(--labs-accent)" : "var(--labs-border)",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <div className="w-6 h-6 rounded-full transition-all" style={{ background: "var(--labs-bg)" }} />
      </div>
    </div>
  );
}

const REVEAL_ALL_FIELDS = [
  "name", "distillery", "age", "abv", "region", "country",
  "category", "caskInfluence", "peatLevel", "bottler", "vintage",
  "hostNotes", "hostSummary", "image",
] as const;

const REVEAL_FIELD_LABELS: Record<string, string> = {
  name: "Name", distillery: "Distillery", age: "Age", abv: "ABV",
  region: "Region", country: "Country", category: "Category",
  caskInfluence: "Cask", peatLevel: "Peat", bottler: "Bottler",
  vintage: "Vintage", hostNotes: "Notes", hostSummary: "Summary", image: "Image",
  ppm: "PPM", price: "Price", wbId: "WB-ID", wbScore: "WB Score",
};

const REVEAL_PRESETS_MAP: Record<string, string[][]> = {
  classic: [["name"], ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"], ["image"]],
  "photo-first": [["image"], ["name"], ["distillery", "age", "abv", "region", "country", "category", "caskInfluence", "bottler", "vintage", "peatLevel", "ppm", "price", "wbId", "wbScore", "hostNotes", "hostSummary"]],
  "one-by-one": [["name"], ["distillery"], ["age", "abv"], ["region", "country"], ["category", "caskInfluence"], ["peatLevel", "bottler", "vintage"], ["hostNotes", "hostSummary"], ["image"]],
  "details-first": [["distillery", "age", "abv", "region", "caskInfluence"], ["name"], ["image"]],
};

function detectPresetKey(order: string[][] | null): string {
  if (!order) return "classic";
  const json = JSON.stringify(order);
  for (const [key, preset] of Object.entries(REVEAL_PRESETS_MAP)) {
    if (JSON.stringify(preset) === json) return key;
  }
  return "custom";
}

function CustomRevealEditor({ steps, onChange }: {
  steps: string[][];
  onChange: (steps: string[][]) => void;
}) {
  const [dragFrom, setDragFrom] = useState<{ step: number; field: number } | null>(null);
  const [dragOverStep, setDragOverStep] = useState<number | null>(null);

  const allUsed = new Set(steps.flat());
  const missingFields = REVEAL_ALL_FIELDS.filter(f => !allUsed.has(f));

  const moveField = (fromStep: number, fromIdx: number, toStep: number) => {
    const next = steps.map(s => [...s]);
    const field = next[fromStep].splice(fromIdx, 1)[0];
    if (toStep >= next.length) {
      next.push([field]);
    } else {
      next[toStep].push(field);
    }
    onChange(next.filter(s => s.length > 0));
  };

  const splitField = (stepIdx: number, fieldIdx: number) => {
    const next = steps.map(s => [...s]);
    const field = next[stepIdx].splice(fieldIdx, 1)[0];
    next.splice(stepIdx + 1, 0, [field]);
    onChange(next.filter(s => s.length > 0));
  };

  const mergeStepUp = (stepIdx: number) => {
    if (stepIdx === 0) return;
    const next = steps.map(s => [...s]);
    next[stepIdx - 1] = [...next[stepIdx - 1], ...next[stepIdx]];
    next.splice(stepIdx, 1);
    onChange(next);
  };

  const moveStepUp = (stepIdx: number) => {
    if (stepIdx === 0) return;
    const next = steps.map(s => [...s]);
    [next[stepIdx - 1], next[stepIdx]] = [next[stepIdx], next[stepIdx - 1]];
    onChange(next);
  };

  const moveStepDown = (stepIdx: number) => {
    if (stepIdx >= steps.length - 1) return;
    const next = steps.map(s => [...s]);
    [next[stepIdx], next[stepIdx + 1]] = [next[stepIdx + 1], next[stepIdx]];
    onChange(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }} data-testid="custom-reveal-editor">
      {steps.map((step, sIdx) => (
        <div
          key={sIdx}
          onDragOver={(e) => { e.preventDefault(); setDragOverStep(sIdx); }}
          onDragLeave={() => setDragOverStep(null)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverStep(null);
            if (dragFrom && dragFrom.step !== sIdx) {
              moveField(dragFrom.step, dragFrom.field, sIdx);
            }
            setDragFrom(null);
          }}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 8px", borderRadius: 10,
            background: dragOverStep === sIdx ? "var(--labs-accent-muted)" : "var(--labs-surface)",
            border: `1.5px solid ${dragOverStep === sIdx ? "var(--labs-accent)" : "var(--labs-border)"}`,
            transition: "all 0.15s",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => moveStepUp(sIdx)}
              disabled={sIdx === 0}
              style={{
                background: "none", border: "none", cursor: sIdx === 0 ? "default" : "pointer",
                padding: 0, color: sIdx === 0 ? "var(--labs-border)" : "var(--labs-text-muted)",
                fontSize: 11, lineHeight: 1,
              }}
              data-testid={`reveal-step-up-${sIdx}`}
            >
              <ChevronUp style={{ width: 12, height: 12 }} />
            </button>
            <button
              type="button"
              onClick={() => moveStepDown(sIdx)}
              disabled={sIdx >= steps.length - 1}
              style={{
                background: "none", border: "none", cursor: sIdx >= steps.length - 1 ? "default" : "pointer",
                padding: 0, color: sIdx >= steps.length - 1 ? "var(--labs-border)" : "var(--labs-text-muted)",
                fontSize: 11, lineHeight: 1,
              }}
              data-testid={`reveal-step-down-${sIdx}`}
            >
              <ChevronDown style={{ width: 12, height: 12 }} />
            </button>
          </div>

          <span style={{
            fontSize: 11, fontWeight: 700, color: "var(--labs-accent)",
            background: "var(--labs-accent-muted)", borderRadius: 6,
            padding: "2px 6px", flexShrink: 0, minWidth: 16, textAlign: "center",
          }}>
            {sIdx + 1}
          </span>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, flex: 1 }}>
            {step.map((field, fIdx) => (
              <div
                key={field}
                draggable
                onDragStart={() => setDragFrom({ step: sIdx, field: fIdx })}
                onDragEnd={() => { setDragFrom(null); setDragOverStep(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: "var(--labs-surface-elevated)", color: "var(--labs-text)",
                  border: "1px solid var(--labs-border)", cursor: "grab",
                  userSelect: "none",
                }}
                data-testid={`reveal-field-${field}`}
              >
                <GripVertical style={{ width: 10, height: 10, color: "var(--labs-text-muted)", flexShrink: 0 }} />
                {REVEAL_FIELD_LABELS[field] || field}
                {step.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); splitField(sIdx, fIdx); }}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 0, color: "var(--labs-text-muted)", fontSize: 11, lineHeight: 1,
                    }}
                    title="Split into own step"
                    data-testid={`reveal-split-${field}`}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {sIdx > 0 && (
            <button
              type="button"
              onClick={() => mergeStepUp(sIdx)}
              title="Merge with previous step"
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "2px", color: "var(--labs-text-muted)", flexShrink: 0,
              }}
              data-testid={`reveal-merge-${sIdx}`}
            >
              <Layers style={{ width: 12, height: 12 }} />
            </button>
          )}
        </div>
      ))}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOverStep(steps.length); }}
        onDragLeave={() => setDragOverStep(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverStep(null);
          if (dragFrom) {
            moveField(dragFrom.step, dragFrom.field, steps.length);
            setDragFrom(null);
          }
        }}
        style={{
          padding: "8px 12px", borderRadius: 10,
          border: `1.5px dashed ${dragOverStep === steps.length ? "var(--labs-accent)" : "var(--labs-border)"}`,
          background: dragOverStep === steps.length ? "var(--labs-accent-muted)" : "transparent",
          textAlign: "center", fontSize: 11, color: "var(--labs-text-muted)",
          transition: "all 0.15s",
        }}
      >
        Drop here to create new step
      </div>

      {missingFields.length > 0 && (
        <div style={{
          marginTop: 4, padding: "8px 10px", borderRadius: 8,
          background: "var(--labs-surface)", border: "1px dashed var(--labs-border)",
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--labs-text-muted)", marginBottom: 4 }}>
            Not included (click to add as new step):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {missingFields.map(field => (
              <button
                key={field}
                type="button"
                onClick={() => onChange([...steps, [field]])}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 3,
                  padding: "2px 7px", borderRadius: 5, fontSize: 11, fontWeight: 600,
                  background: "var(--labs-surface-elevated)", color: "var(--labs-text-muted)",
                  border: "1px solid var(--labs-border)", cursor: "pointer",
                }}
                data-testid={`reveal-add-${field}`}
              >
                <Plus style={{ width: 8, height: 8 }} />
                {REVEAL_FIELD_LABELS[field] || field}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: 4, padding: "8px 10px", borderRadius: 8,
        background: "var(--labs-surface)", fontSize: 11, color: "var(--labs-text-muted)",
        lineHeight: 1.6,
      }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <span style={{ fontWeight: 700, color: "var(--labs-accent)", minWidth: 44, flexShrink: 0, fontSize: 11 }}>
              Step {i + 1}:
            </span>
            <span style={{ color: "var(--labs-text)" }}>
              {step.map(f => REVEAL_FIELD_LABELS[f] || f).join(" & ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LabsSegmentedSelect({ value, options, onChange }: {
  value: string | number; options: { value: string | number; label: string; desc?: string; disabled?: boolean }[];
  onChange: (v: any) => void;
}) {
  const cols = options.length <= 4 ? options.length : options.length <= 6 ? 3 : 4;
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {options.map((opt) => {
        const active = value === opt.value;
        const isDisabled = !!opt.disabled;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => !isDisabled && onChange(opt.value)}
            className="rounded-lg transition-all text-center"
            style={{
              padding: "10px 4px",
              background: isDisabled ? "var(--labs-surface)" : active ? "var(--labs-accent-muted)" : "var(--labs-surface)",
              border: `1.5px solid ${isDisabled ? "var(--labs-border)" : active ? "var(--labs-accent)" : "var(--labs-border)"}`,
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.4 : 1,
            }}
            disabled={isDisabled}
            data-testid={`labs-opt-${opt.value}`}
          >
            <div className="font-bold" style={{ fontSize: 16, color: isDisabled ? "var(--labs-text-muted)" : active ? "var(--labs-accent)" : "var(--labs-text)" }}>{opt.label}</div>
            {opt.desc && <div style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.2, marginTop: 2 }}>{opt.desc}</div>}
          </button>
        );
      })}
    </div>
  );
}

function CreateTastingForm() {
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const { currentParticipant } = useAppStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [revealOrder, setRevealOrder] = useState("classic");
  const [customRevealSteps, setCustomRevealSteps] = useState<string[][]>(REVEAL_PRESETS_MAP.classic);
  const [ratingScale, setRatingScale] = useState(100);
  const [guidedMode, setGuidedMode] = useState(false);
  const [guestMode, setGuestMode] = useState("standard");
  const [sessionUiMode, setSessionUiMode] = useState("flow");
  const [reflectionEnabled, setReflectionEnabled] = useState(false);
  const [reflectionMode, setReflectionMode] = useState("standard");
  const [reflectionVisibility, setReflectionVisibility] = useState("named");
  const [videoLink, setVideoLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!currentParticipant) { setError("Please sign in to create a tasting"); return; }
    setSubmitting(true);
    setError("");
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const result = await tastingApi.create({
        title: title.trim(),
        date,
        location: location.trim() || "",
        description: description.trim() || "",
        hostId: currentParticipant.id,
        code,
        blindMode,
        revealOrder: blindMode && revealOrder !== "classic" ? JSON.stringify(revealOrder === "custom" ? customRevealSteps : (REVEAL_PRESETS_MAP[revealOrder] || REVEAL_PRESETS_MAP.classic)) : null,
        ratingScale,
        guidedMode,
        guestMode,
        sessionUiMode: sessionUiMode || null,
        reflectionEnabled,
        reflectionMode,
        reflectionVisibility,
        videoLink: videoLink.trim() || null,
        status: "draft",
      });
      if (result?.id) {
        navigate(`/labs/host/${result.id}`);
      }
    } catch (err: any) {
      console.error("Failed to create tasting:", err);
      setError(err.message || "Failed to create tasting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentParticipant) {
    return (
      <div className="labs-empty labs-fade-in">
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>
          Sign in to host a tasting
        </p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in">
      <h1
        className="labs-h2 mb-2"
        style={{ color: "var(--labs-text)" }}
        data-testid="labs-host-title"
      >
        Host a Tasting
      </h1>
      <p className="text-sm mb-8" style={{ color: "var(--labs-text-secondary)" }}>
        Create a new tasting session for your group
      </p>

      <div className="space-y-5">
        <div>
          <label className="labs-section-label" htmlFor="tasting-title">Title *</label>
          <input
            id="tasting-title"
            className="labs-input"
            placeholder="e.g. Highland Evening, Spring Tasting..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
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

        <div>
          <label className="labs-section-label" htmlFor="tasting-description">
            <FileText className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
            Description
          </label>
          <textarea
            id="tasting-description"
            className="labs-input"
            placeholder="Optional notes for your guests..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            style={{ resize: "vertical", minHeight: 48 }}
            data-testid="labs-host-input-description"
          />
        </div>

        <LabsToggle
          checked={blindMode}
          onChange={setBlindMode}
          icon={<EyeOff className="w-5 h-5" style={{ color: blindMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
          label="Blind Tasting"
          description="Hide whisky details until reveal"
          testId="labs-host-toggle-blind"
        />

        {blindMode && (
          <div>
            <label className="labs-section-label">
              <Eye className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
              Reveal Order
            </label>
            <LabsSegmentedSelect
              value={revealOrder}
              options={[
                { value: "classic", label: "Classic", desc: "Name then details" },
                { value: "photo-first", label: "Photo First", desc: "Photo then name" },
                { value: "details-first", label: "Details", desc: "Details then name" },
                { value: "one-by-one", label: "One by One", desc: "Reveal individually" },
                { value: "custom", label: "Custom", desc: "Your own order" },
              ]}
              onChange={(val: string | number) => {
                const v = String(val);
                setRevealOrder(v);
                if (v !== "custom" && REVEAL_PRESETS_MAP[v]) {
                  setCustomRevealSteps(REVEAL_PRESETS_MAP[v]);
                }
                const stepsCount = v === "custom" ? customRevealSteps.length : (REVEAL_PRESETS_MAP[v]?.length ?? 3);
                if (stepsCount > 4 && sessionUiMode === "flow") {
                  setSessionUiMode("focus");
                }
              }}
            />
            {revealOrder === "custom" && (
              <CustomRevealEditor
                steps={customRevealSteps}
                onChange={(newSteps) => {
                  setCustomRevealSteps(newSteps);
                  if (newSteps.length > 4 && sessionUiMode === "flow") {
                    setSessionUiMode("focus");
                  }
                }}
              />
            )}
          </div>
        )}

        <div>
          <label className="labs-section-label">
            <Gauge className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
            Rating Scale
          </label>
          <LabsSegmentedSelect
            value={ratingScale}
            options={[
              { value: 5, label: "5", desc: "Simple 5-star" },
              { value: 10, label: "10", desc: "Classic 10-point" },
              { value: 20, label: "20", desc: "Detailed 20-point" },
              { value: 100, label: "100", desc: "Professional 100-point" },
            ]}
            onChange={setRatingScale}
          />
        </div>

        <div className="labs-card overflow-hidden" style={{ border: "1px solid var(--labs-border)" }}>
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between"
            style={{
              padding: "14px 16px",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--labs-text)",
              fontSize: 14,
              fontWeight: 600,
            }}
            data-testid="labs-host-toggle-advanced"
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
              Advanced Options
            </span>
            <ChevronDown
              className="w-4 h-4 transition-transform"
              style={{
                color: "var(--labs-text-muted)",
                transform: advancedOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </button>

          {advancedOpen && (
            <div style={{ padding: "0 16px 16px" }} className="space-y-5">
              <LabsToggle
                checked={guidedMode}
                onChange={(v: boolean) => {
                  setGuidedMode(v);
                  if (v && sessionUiMode === "flow") {
                    setSessionUiMode("focus");
                  }
                }}
                icon={<Compass className="w-5 h-5" style={{ color: guidedMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
                label="Host Controls the Pace"
                description="Guide all guests through each dram together"
                testId="labs-host-toggle-guided"
              />

              <div>
                <label className="labs-section-label">
                  <Globe className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  How Guests Join
                </label>
                <p className="text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  Choose whether guests need an account or can join instantly
                </p>
                <LabsSegmentedSelect
                  value={guestMode}
                  options={[
                    { value: "standard", label: "With Account", desc: "Ratings are saved" },
                    { value: "ultra", label: "Instant Join", desc: "No sign-in needed" },
                  ]}
                  onChange={setGuestMode}
                />
              </div>

              <div>
                <label className="labs-section-label">
                  <Sliders className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  Tasting Experience
                </label>
                <p className="text-xs mb-2" style={{ color: "var(--labs-text-muted)" }}>
                  How guests navigate through the whiskies
                </p>
                <LabsSegmentedSelect
                  value={sessionUiMode}
                  options={[
                    { value: "flow", label: "Free Tasting", desc: guidedMode ? "Not available with Host Controls" : "Explore all drams freely", disabled: guidedMode },
                    { value: "focus", label: "One at a Time", desc: "Focus on one dram" },
                    { value: "journal", label: "Tasting Journal", desc: "Step-by-step guided notes" },
                  ]}
                  onChange={(val: string | number) => {
                    const v = String(val);
                    setSessionUiMode(v);
                    if (v === "flow" && (revealOrder === "one-by-one" || (revealOrder === "custom" && customRevealSteps.length > 4))) {
                      setRevealOrder("classic");
                      setCustomRevealSteps(REVEAL_PRESETS_MAP.classic);
                    }
                  }}
                />
              </div>

              <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 16 }}>
                <label className="labs-section-label">
                  <MessageCircle className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  Group Discussion
                </label>
                <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>
                  Let guests share thoughts and comments on each whisky
                </p>
                <LabsToggle
                  checked={reflectionEnabled}
                  onChange={setReflectionEnabled}
                  icon={<MessageCircle className="w-5 h-5" style={{ color: reflectionEnabled ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
                  label="Enable Discussion Round"
                  description="Add a discussion phase after tasting"
                  testId="labs-host-toggle-reflection"
                />
                {reflectionEnabled && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="labs-section-label" style={{ fontSize: 11 }}>Discussion Format</label>
                      <LabsSegmentedSelect
                        value={reflectionMode}
                        options={[
                          { value: "standard", label: "Standard", desc: "Pre-set questions" },
                          { value: "custom", label: "Custom", desc: "Your own questions" },
                        ]}
                        onChange={setReflectionMode}
                      />
                    </div>
                    <div>
                      <label className="labs-section-label" style={{ fontSize: 11 }}>Show Names in Discussion</label>
                      <LabsSegmentedSelect
                        value={reflectionVisibility}
                        options={[
                          { value: "named", label: "Named", desc: "Names shown" },
                          { value: "anonymous", label: "Anonymous", desc: "Names hidden" },
                          { value: "optional", label: "Optional", desc: "Guest decides" },
                        ]}
                        onChange={setReflectionVisibility}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="labs-section-label">
                  <Video className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                  Video Call Link
                </label>
                <input
                  type="url"
                  className="labs-input"
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  placeholder="https://zoom.us/j/..."
                  data-testid="labs-host-input-video"
                />
                <p className="text-xs mt-1" style={{ color: "var(--labs-text-secondary)" }}>
                  Add a Zoom, Teams or Google Meet link for remote guests
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div
            className="rounded-lg text-sm"
            style={{
              padding: "10px 14px",
              color: "var(--labs-danger, #e74c3c)",
              background: "rgba(231, 76, 60, 0.1)",
              border: "1px solid rgba(231, 76, 60, 0.2)",
            }}
            data-testid="labs-host-create-error"
          >
            {error}
          </div>
        )}

        {!currentParticipant && (
          <div
            className="text-sm p-3 rounded-lg flex items-center gap-2"
            style={{
              background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)",
              color: "var(--labs-accent)",
            }}
            data-testid="labs-host-signin-hint"
          >
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Please sign in to create a tasting
          </div>
        )}

        <button
          className="labs-btn-primary w-full flex items-center justify-center gap-2"
          onClick={handleCreate}
          disabled={!title.trim() || submitting || !currentParticipant}
          data-testid="labs-host-create-btn"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {submitting ? "Creating..." : "Create & Add Whiskies"}
        </button>
      </div>
    </div>
  );
}

function ParticipantStatusSection({
  participants,
  ratings,
  whiskies,
  whiskyCount,
}: {
  participants: any[];
  ratings: any[];
  whiskies: any[];
  whiskyCount: number;
}) {
  const [expandedWhisky, setExpandedWhisky] = useState<string | null>(null);

  const grouped = (participants || []).reduce(
    (acc: { done: any[]; progress: any[]; none: any[] }, p: any) => {
      const count = (ratings || []).filter((r: any) => r.participantId === p.id).length;
      if (whiskyCount > 0 && count >= whiskyCount) acc.done.push({ ...p, ratedCount: count });
      else if (count > 0) acc.progress.push({ ...p, ratedCount: count });
      else acc.none.push({ ...p, ratedCount: 0 });
      return acc;
    },
    { done: [], progress: [], none: [] },
  );

  const statusGroups = [
    {
      key: "done",
      label: "Rated All",
      icon: CheckCircle2,
      color: "var(--labs-success)",
      bg: "var(--labs-success-muted)",
      items: grouped.done,
    },
    {
      key: "progress",
      label: "In Progress",
      icon: Clock,
      color: "var(--labs-accent)",
      bg: "var(--labs-accent-muted)",
      items: grouped.progress,
    },
    {
      key: "none",
      label: "Not Started",
      icon: CircleDashed,
      color: "var(--labs-text-muted)",
      bg: "var(--labs-surface)",
      items: grouped.none,
    },
  ];

  return (
    <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h2 className="labs-section-label">Participants ({(participants || []).length})</h2>
        <div className="space-y-3">
          {statusGroups.map((group) =>
            group.items.length > 0 ? (
              <div key={group.key} className="labs-card overflow-hidden">
                <div
                  className="flex items-center gap-2 px-4 py-3"
                  style={{ borderBottom: `1px solid var(--labs-border-subtle)` }}
                >
                  <group.icon className="w-4 h-4" style={{ color: group.color }} />
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: group.color }}>
                    {group.label}
                  </span>
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: group.bg, color: group.color }}
                  >
                    {group.items.length}
                  </span>
                </div>
                <div className="divide-y" style={{ borderColor: "var(--labs-border-subtle)" }}>
                  {group.items.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-4 py-3"
                      data-testid={`labs-host-participant-${p.id}`}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                        style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                      >
                        {stripGuestSuffix((p.name || "?") as string).charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium truncate flex-1 min-w-0">{stripGuestSuffix((p.name || "Anonymous") as string)}</p>
                      <span className="text-xs flex-shrink-0" style={{ color: "var(--labs-text-muted)" }}>
                        {p.ratedCount}/{whiskyCount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {whiskyCount > 0 && (participants || []).length > 0 && (
        <div>
          <h2 className="labs-section-label">Per-Whisky Completion</h2>
          <div className="space-y-2">
            {(whiskies || []).map((w: any, i: number) => {
              const whiskyRatings = (ratings || []).filter((r: any) => r.whiskyId === w.id);
              const ratedIds = new Set(whiskyRatings.map((r: any) => r.participantId));
              const isExpanded = expandedWhisky === w.id;
              return (
                <div key={w.id} className="labs-card overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    onClick={() => setExpandedWhisky(isExpanded ? null : w.id)}
                    style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}
                    data-testid={`labs-host-whisky-completion-${w.id}`}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                    >
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="text-sm font-medium truncate flex-1 min-w-0">
                      {w.name || `Whisky ${i + 1}`}
                    </span>
                    <span className="text-xs flex-shrink-0 mr-1" style={{ color: "var(--labs-text-muted)" }}>
                      {ratedIds.size}/{(participants || []).length}
                    </span>
                    <div
                      className="w-16 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                      style={{ background: "var(--labs-border)" }}
                    >
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(participants || []).length > 0 ? (ratedIds.size / (participants || []).length) * 100 : 0}%`,
                          background: ratedIds.size === (participants || []).length ? "var(--labs-success)" : "var(--labs-accent)",
                        }}
                      />
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                    ) : (
                      <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                    )}
                  </button>
                  {isExpanded && (
                    <div
                      className="px-4 pb-3 pt-1 grid grid-cols-2 gap-1.5"
                      style={{ borderTop: `1px solid var(--labs-border-subtle)` }}
                    >
                      {(participants || []).map((p: any) => {
                        const hasRated = ratedIds.has(p.id);
                        return (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 py-1"
                            data-testid={`labs-host-completion-${w.id}-${p.id}`}
                          >
                            {hasRated ? (
                              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-success)" }} />
                            ) : (
                              <CircleDashed className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
                            )}
                            <span
                              className="text-xs truncate"
                              style={{ color: hasRated ? "var(--labs-text-secondary)" : "var(--labs-text-muted)" }}
                            >
                              {stripGuestSuffix((p.name || "Anonymous") as string)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function GuidedTastingEngine({
  tasting,
  whiskies,
  participants,
  ratings,
  currentParticipant,
  queryClient,
  tastingId,
}: {
  tasting: any;
  whiskies: any[];
  participants: any[];
  ratings: any[];
  currentParticipant: any;
  queryClient: any;
  tastingId: string;
}) {
  const whiskyList = whiskies || [];
  const participantList = participants || [];
  const ratingList = ratings || [];
  const whiskyCount = whiskyList.length;
  const guidedIndex = tasting.guidedWhiskyIndex ?? -1;
  const revealStep = tasting.guidedRevealStep ?? 0;
  const isLobby = guidedIndex === -1;
  const isCompleted = guidedIndex >= whiskyCount && whiskyCount > 0;
  const activeWhisky = !isLobby && !isCompleted && whiskyList[guidedIndex] ? whiskyList[guidedIndex] : null;
  const maxRevealStep = 3;

  const [engineError, setEngineError] = useState<string | null>(null);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] });
  };

  const handleMutationError = (err: any) => {
    const msg = err?.message || "Action failed";
    setEngineError(msg);
    setTimeout(() => setEngineError(null), 5000);
  };

  const startMutation = useMutation({
    mutationFn: async () => {
      await guidedApi.updateMode(tastingId, currentParticipant.id, {
        guidedMode: true,
        guidedWhiskyIndex: 0,
        guidedRevealStep: 0,
      });
      if (tasting.status === "draft") {
        await tastingApi.updateStatus(tastingId, "open", undefined, currentParticipant.id);
      }
    },
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const advanceMutation = useMutation({
    mutationFn: () => guidedApi.advance(tastingId, currentParticipant.id),
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const endMutation = useMutation({
    mutationFn: () => tastingApi.updateStatus(tastingId, "closed", undefined, currentParticipant.id),
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const goToMutation = useMutation({
    mutationFn: ({ idx, step }: { idx: number; step?: number }) =>
      guidedApi.goTo(tastingId, currentParticipant.id, idx, step),
    onSuccess: () => { setEngineError(null); invalidateAll(); },
    onError: handleMutationError,
  });

  const anyPending = startMutation.isPending || advanceMutation.isPending || endMutation.isPending || goToMutation.isPending;

  const activeWhiskyRatings = activeWhisky
    ? ratingList.filter((r: any) => r.whiskyId === activeWhisky.id)
    : [];
  const ratedParticipantIds = new Set(activeWhiskyRatings.map((r: any) => r.participantId));

  let stateLabel = "LOBBY";
  let stateBg = "var(--labs-info-muted)";
  let stateColor = "var(--labs-info)";
  if (isCompleted) {
    stateLabel = "COMPLETED";
    stateBg = "var(--labs-success-muted)";
    stateColor = "var(--labs-success)";
  } else if (!isLobby) {
    stateLabel = `DRAM ${guidedIndex + 1} of ${whiskyCount}`;
    stateBg = "var(--labs-accent-muted)";
    stateColor = "var(--labs-accent)";
  }

  const revealLabels = ["Blind", "Name", "Details", "Image"];

  return (
    <div className="mb-6 space-y-4" data-testid="guided-engine">
      <div
        className="labs-card p-4 flex items-center justify-between"
        data-testid="guided-state-bar"
      >
        <div className="flex items-center gap-3">
          <Compass className="w-5 h-5" style={{ color: stateColor }} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>
              Guided Mode
            </p>
            <p className="text-base font-bold" style={{ color: stateColor }}>
              {stateLabel}
            </p>
          </div>
        </div>
        <span
          className="labs-badge"
          style={{ background: stateBg, color: stateColor }}
          data-testid="guided-state-badge"
        >
          {isLobby ? "Waiting" : isCompleted ? "Done" : `Reveal: ${revealLabels[revealStep] || revealStep}`}
        </span>
      </div>

      {whiskyCount > 0 && (
        <div className="labs-card p-4" data-testid="guided-progress">
          <p className="labs-section-label">Progress</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            {whiskyList.map((w: any, i: number) => {
              let dotBg = "var(--labs-border)";
              let dotColor = "var(--labs-text-muted)";
              let dotBorder = "transparent";
              if (i < guidedIndex) {
                dotBg = "var(--labs-success)";
                dotColor = "var(--labs-bg)";
              } else if (i === guidedIndex && !isCompleted) {
                dotBg = "var(--labs-accent)";
                dotColor = "var(--labs-bg)";
                dotBorder = "var(--labs-accent-hover)";
              }
              return (
                <button
                  key={w.id}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                  style={{
                    background: dotBg,
                    color: dotColor,
                    border: `2px solid ${dotBorder}`,
                    cursor: !isLobby && !isCompleted ? "pointer" : "default",
                    opacity: 1,
                  }}
                  title={w.name || `Whisky ${i + 1}`}
                  onClick={() => {
                    if (!isLobby && !isCompleted && i !== guidedIndex) {
                      goToMutation.mutate({ idx: i, step: 0 });
                    }
                  }}
                  disabled={isLobby || isCompleted || anyPending}
                  data-testid={`guided-dot-${i}`}
                >
                  {i < guidedIndex ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    String.fromCharCode(65 + i)
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="labs-card p-4" data-testid="guided-controls">
        <p className="labs-section-label">Controls</p>
        <div className="flex flex-wrap gap-2">
          {isLobby && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => startMutation.mutate()}
              disabled={anyPending || whiskyCount === 0}
              data-testid="guided-start"
            >
              {startMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Tasting
            </button>
          )}
          {!isLobby && !isCompleted && revealStep < maxRevealStep && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => advanceMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-reveal"
            >
              {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Reveal Bottle
            </button>
          )}
          {!isLobby && !isCompleted && revealStep >= maxRevealStep && guidedIndex < whiskyCount - 1 && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => advanceMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-next"
            >
              {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SkipForward className="w-4 h-4" />}
              Next Dram
            </button>
          )}
          {!isLobby && !isCompleted && revealStep >= maxRevealStep && guidedIndex === whiskyCount - 1 && (
            <button
              className="labs-btn-primary flex items-center gap-2"
              onClick={() => advanceMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-finish"
            >
              {advanceMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Finish Last Dram
            </button>
          )}
          {!isLobby && tasting.status === "open" && (
            <button
              className="labs-btn-secondary flex items-center gap-2"
              onClick={() => endMutation.mutate()}
              disabled={anyPending}
              data-testid="guided-end"
            >
              {endMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <StopCircle className="w-4 h-4" />}
              End Tasting
            </button>
          )}
        </div>
      </div>

      {engineError && (
        <div
          className="labs-card p-3 flex items-center gap-2"
          style={{ background: "var(--labs-danger-muted, rgba(239,68,68,0.1))", border: "1px solid var(--labs-danger, #ef4444)" }}
          data-testid="guided-engine-error"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-danger, #ef4444)" }} />
          <span className="text-xs font-medium" style={{ color: "var(--labs-danger, #ef4444)" }}>
            {engineError}
          </span>
        </div>
      )}

      {activeWhisky && (
        <div className="labs-card p-4" data-testid="guided-current-dram">
          <p className="labs-section-label">Current Dram</p>
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
            >
              {String.fromCharCode(65 + guidedIndex)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold truncate" style={{ color: "var(--labs-text)" }}>
                {revealStep >= 1 ? (activeWhisky.name || `Whisky ${guidedIndex + 1}`) : `Dram ${String.fromCharCode(65 + guidedIndex)} (Blind)`}
              </p>
              {revealStep >= 2 && (
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  {[activeWhisky.distillery, activeWhisky.age ? `${activeWhisky.age}y` : null, activeWhisky.abv ? `${activeWhisky.abv}%` : null]
                    .filter(Boolean)
                    .join(" · ") || "No additional details"}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold" style={{ color: ratedParticipantIds.size === participantList.length && participantList.length > 0 ? "var(--labs-success)" : "var(--labs-accent)" }}>
                {ratedParticipantIds.size}/{participantList.length}
              </p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>rated</p>
            </div>
          </div>
          <div className="flex gap-1">
            {revealLabels.map((label, idx) => (
              <div
                key={label}
                className="flex-1 h-1.5 rounded-full"
                style={{
                  background: idx <= revealStep ? "var(--labs-accent)" : "var(--labs-border)",
                  transition: "background 300ms ease",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1">
            {revealLabels.map((label, idx) => (
              <span key={label} className="text-[11px]" style={{ color: idx <= revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {activeWhisky && participantList.length > 0 && (
        <div className="labs-card p-4" data-testid="guided-participant-grid">
          <p className="labs-section-label">Participant Status — Dram {String.fromCharCode(65 + guidedIndex)}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {participantList.map((p: any) => {
              const hasRated = ratedParticipantIds.has(p.id);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2 rounded-lg"
                  style={{
                    background: hasRated ? "var(--labs-success-muted)" : "var(--labs-surface)",
                    border: `1px solid ${hasRated ? "var(--labs-success)" : "var(--labs-border-subtle)"}`,
                    opacity: hasRated ? 1 : 0.7,
                  }}
                  data-testid={`guided-participant-${p.id}`}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                    style={{
                      background: hasRated ? "var(--labs-success)" : "var(--labs-border)",
                      color: hasRated ? "var(--labs-bg)" : "var(--labs-text-muted)",
                    }}
                  >
                    {hasRated ? <Check className="w-3.5 h-3.5" /> : stripGuestSuffix((p.name || "?") as string).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {stripGuestSuffix((p.name || "Anonymous") as string)}
                    </p>
                    <p className="text-[11px]" style={{ color: hasRated ? "var(--labs-success)" : "var(--labs-text-muted)" }}>
                      {hasRated ? "SUBMITTED" : "NOT STARTED"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function LabsSettingsPanel({
  tasting,
  tastingId,
  pid,
  queryClient,
  navigate,
  whiskies,
  participants,
}: {
  tasting: Record<string, unknown>;
  tastingId: string;
  pid: string;
  queryClient: ReturnType<typeof useQueryClient>;
  navigate: (path: string) => void;
  whiskies?: Array<Record<string, unknown>>;
  participants?: Array<Record<string, unknown>>;
}) {
  const [open, setOpen] = useState(false);
  const [ratingPrompt, setRatingPrompt] = useState((tasting.ratingPrompt as string) || "");
  const [savingPrompt, setSavingPrompt] = useState(false);
  const [videoLinkLocal, setVideoLinkLocal] = useState((tasting.videoLink as string) || "");
  const [savingVideo, setSavingVideo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [localCoverUrl, setLocalCoverUrl] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [forceCustomReveal, setForceCustomReveal] = useState(false);
  const [showTransferHost, setShowTransferHost] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const { data: settingsParticipants } = useQuery({
    queryKey: ["participants", tastingId],
    queryFn: async () => {
      const res = await fetch(`/api/tastings/${tastingId}/participants`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showTransferHost,
  });

  const transferableGuests = (settingsParticipants || []).filter(
    (tp: { participant: { id: string } }) => tp.participant.id !== pid
  );

  const handleTransferHost = async () => {
    if (!transferTargetId) return;
    setTransferring(true);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/transfer-host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: pid, newHostId: transferTargetId }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
        navigate("/labs/tastings");
      } else {
        const err = await res.json().catch(() => ({}));
        setSaveStatus(err.message || "Transfer failed");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch {
      setSaveStatus("Transfer failed");
      setTimeout(() => setSaveStatus(null), 3000);
    }
    setTransferring(false);
  };

  const isDraft = tasting.status === "draft";

  const patchDetails = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/tastings/${tastingId}/details`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostId: pid, ...body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setSaveStatus(err.message || "Save failed");
      setTimeout(() => setSaveStatus(null), 3000);
      throw new Error(err.message || "Save failed");
    }
    queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    setSaveStatus("Saved");
    setTimeout(() => setSaveStatus(null), 2000);
  };

  const handleToggle = async (field: string, currentValue: boolean) => {
    try { await patchDetails({ [field]: !currentValue }); } catch {}
  };

  const handleSavePrompt = async () => {
    setSavingPrompt(true);
    try { await patchDetails({ ratingPrompt: ratingPrompt.trim() || null }); } catch {}
    setSavingPrompt(false);
  };

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    try { await patchDetails({ videoLink: videoLinkLocal.trim() || null }); } catch {}
    setSavingVideo(false);
  };

  const handleChangeScale = async (scale: number) => {
    try { await patchDetails({ ratingScale: scale }); } catch {}
  };

  const handleChangeGuestMode = async (mode: string) => {
    try { await patchDetails({ guestMode: mode }); } catch {}
  };

  const handleChangeSessionUi = async (mode: string) => {
    const patch: Record<string, unknown> = { sessionUiMode: mode || null };
    if (mode === "flow" && tasting.blindMode) {
      try {
        const parsed = JSON.parse(tasting.revealOrder as string || "null");
        if (Array.isArray(parsed) && parsed.length > 4) {
          patch.revealOrder = null;
        }
      } catch {}
    }
    try { await patchDetails(patch); } catch {}
  };

  const handleToggleReflection = async () => {
    try { await patchDetails({ reflectionEnabled: !tasting.reflectionEnabled }); } catch {}
  };

  const handleChangeReflectionMode = async (mode: string) => {
    try { await patchDetails({ reflectionMode: mode }); } catch {}
  };

  const handleChangeReflectionVis = async (vis: string) => {
    try { await patchDetails({ reflectionVisibility: vis }); } catch {}
  };

  const handleCoverUpload = async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setLocalCoverUrl(previewUrl);
    try {
      await tastingApi.uploadCoverImage(tastingId, file, pid);
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
    } catch {
      setLocalCoverUrl(null);
      setSaveStatus("Upload failed");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleDuplicate = async () => {
    setDuplicating(true);
    try {
      const newTasting = await tastingApi.duplicate(tastingId, pid);
      if (newTasting?.id) {
        navigate(`/labs/tastings/${newTasting.id}`);
      }
    } catch {}
    setDuplicating(false);
  };

  const handleDelete = async () => {
    try {
      await tastingApi.updateStatus(tastingId, "deleted", undefined, pid);
      navigate("/labs/tastings");
    } catch (e: any) {
      console.error("Delete failed:", e);
    }
  };

  return (
    <div className="labs-card overflow-hidden" data-testid="labs-settings-panel">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between"
        style={{
          padding: "14px 16px",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--labs-text)",
          fontSize: 14,
          fontWeight: 600,
        }}
        data-testid="labs-toggle-settings"
      >
        <span className="flex items-center gap-2">
          <Settings className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} />
          Settings & Actions
        </span>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{
            color: "var(--labs-text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </button>

      {saveStatus && (
        <div className="px-4 pb-2 flex items-center gap-2" style={{ fontSize: 12, color: "var(--labs-success)" }}>
          <Check className="w-3 h-3" />
          {saveStatus}
        </div>
      )}

      {open && (
        <div style={{ padding: "0 16px 16px" }} className="space-y-4">
          <div>
            <p className="labs-section-label">Session</p>
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Gauge className="w-3 h-3" />
              Rating Scale
              {!isDraft && <Lock className="w-2.5 h-2.5" style={{ color: "var(--labs-text-muted)" }} />}
            </label>
            {isDraft ? (
              <LabsSegmentedSelect
                value={(tasting.ratingScale as number) ?? 100}
                options={[
                  { value: 5, label: "5", desc: "Simple" },
                  { value: 10, label: "10", desc: "Classic" },
                  { value: 20, label: "20", desc: "Detailed" },
                  { value: 100, label: "100", desc: "Pro" },
                ]}
                onChange={handleChangeScale}
              />
            ) : (
              <div className="text-sm labs-card p-3" style={{ color: "var(--labs-text)" }}>
                {(tasting.ratingScale as number) ?? 100}-point scale
                <span className="text-xs ml-2" style={{ color: "var(--labs-text-muted)" }}>(locked while active)</span>
              </div>
            )}
          </div>

          <LabsToggle
            checked={!!tasting.blindMode}
            onChange={() => handleToggle("blindMode", !!tasting.blindMode)}
            icon={<EyeOff className="w-5 h-5" style={{ color: tasting.blindMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label="Blind Tasting"
            description="Hide whisky names until reveal"
            testId="labs-settings-toggle-blind"
          />

          {tasting.blindMode && (() => {
            let detectedKey = "classic";
            let currentSteps = REVEAL_PRESETS_MAP.classic;
            try {
              if (tasting.revealOrder) {
                currentSteps = JSON.parse(tasting.revealOrder as string);
                detectedKey = detectPresetKey(currentSteps);
              }
            } catch {}
            const activeKey = forceCustomReveal ? "custom" : detectedKey;
            return (
              <div>
                <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
                  <Eye className="w-3 h-3" />
                  Reveal Order
                </label>
                <LabsSegmentedSelect
                  value={activeKey}
                  options={[
                    { value: "classic", label: "Classic", desc: "Name then details" },
                    { value: "photo-first", label: "Photo First", desc: "Photo then name" },
                    { value: "details-first", label: "Details", desc: "Details then name" },
                    { value: "one-by-one", label: "One by One", desc: "Reveal individually" },
                    { value: "custom", label: "Custom", desc: "Your own order" },
                  ]}
                  onChange={(val: string | number) => {
                    const key = String(val);
                    if (key === "custom") {
                      setForceCustomReveal(true);
                    } else {
                      setForceCustomReveal(false);
                      const patch: Record<string, unknown> = { revealOrder: key === "classic" ? null : JSON.stringify(REVEAL_PRESETS_MAP[key] || REVEAL_PRESETS_MAP.classic) };
                      if (key === "one-by-one" && (tasting.sessionUiMode as string || "flow") === "flow") {
                        patch.sessionUiMode = "focus";
                      }
                      patchDetails(patch);
                    }
                  }}
                />
                {activeKey === "custom" && (
                  <CustomRevealEditor
                    steps={currentSteps}
                    onChange={(newSteps) => {
                      const patch: Record<string, unknown> = { revealOrder: JSON.stringify(newSteps) };
                      if (newSteps.length > 4 && (tasting.sessionUiMode as string || "flow") === "flow") {
                        patch.sessionUiMode = "focus";
                      }
                      patchDetails(patch);
                    }}
                  />
                )}
              </div>
            );
          })()}

          <LabsToggle
            checked={!!tasting.guidedMode}
            onChange={async () => {
              const newGuided = !tasting.guidedMode;
              const patch: Record<string, unknown> = { guidedMode: newGuided };
              if (newGuided && ((tasting.sessionUiMode as string) || "flow") === "flow") {
                patch.sessionUiMode = "focus";
              }
              try { await patchDetails(patch); } catch {}
            }}
            icon={<Compass className="w-5 h-5" style={{ color: tasting.guidedMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label="Host Controls the Pace"
            description="Guide all guests through each dram"
            testId="labs-settings-toggle-guided"
          />

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Sliders className="w-3 h-3" />
              Tasting Experience
            </label>
            <LabsSegmentedSelect
              value={(tasting.sessionUiMode as string) || "flow"}
              options={[
                { value: "flow", label: "Free", desc: tasting.guidedMode ? "Not with Host Controls" : "Explore freely", disabled: !!tasting.guidedMode },
                { value: "focus", label: "One at a Time", desc: "Focus mode" },
                { value: "journal", label: "Journal", desc: "Guided notes" },
              ]}
              onChange={handleChangeSessionUi}
            />
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Globe className="w-3 h-3" />
              How Guests Join
            </label>
            <LabsSegmentedSelect
              value={(tasting.guestMode as string) || "standard"}
              options={[
                { value: "standard", label: "Account", desc: "Saved ratings" },
                { value: "ultra", label: "Instant", desc: "No sign-in" },
              ]}
              onChange={handleChangeGuestMode}
            />
          </div>

          <div>
            <p className="labs-section-label">What Guests See</p>
          </div>

          <LabsToggle
            checked={!!tasting.showRanking}
            onChange={() => handleToggle("showRanking", !!tasting.showRanking)}
            icon={<BarChart3 className="w-5 h-5" style={{ color: tasting.showRanking ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label="Show Ranking"
            description="Guests see how whiskies rank"
            testId="labs-settings-toggle-ranking"
          />
          {tasting.blindMode && tasting.showRanking && (
            <p className="text-xs mt-1 px-1" style={{ color: "var(--labs-accent)", opacity: 0.8 }} data-testid="blind-ranking-hint">
              Ranking wird Gästen erst nach dem Reveal angezeigt
            </p>
          )}

          <LabsToggle
            checked={!!tasting.showGroupAvg}
            onChange={() => handleToggle("showGroupAvg", !!tasting.showGroupAvg)}
            icon={<Users className="w-5 h-5" style={{ color: tasting.showGroupAvg ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label="Show Group Scores"
            description="Guests see average scores"
            testId="labs-settings-toggle-avg"
          />

          <LabsToggle
            checked={tasting.showReveal !== false}
            onChange={() => handleToggle("showReveal", tasting.showReveal !== false)}
            icon={<Eye className="w-5 h-5" style={{ color: tasting.showReveal !== false ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
            label="Show Results After Tasting"
            description="Guests access results when done"
            testId="labs-settings-toggle-reveal"
          />

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Star className="w-3 h-3" />
              Rating Prompt
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ratingPrompt}
                onChange={e => setRatingPrompt(e.target.value)}
                placeholder="e.g. Rate your overall impression"
                className="labs-input flex-1"
                data-testid="labs-settings-rating-prompt"
              />
              <button
                className="labs-btn-primary px-3"
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                data-testid="labs-settings-save-prompt"
              >
                {savingPrompt ? "..." : "Save"}
              </button>
            </div>
          </div>

          <div>
            <p className="labs-section-label">Extras</p>
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <MessageCircle className="w-3 h-3" />
              Group Discussion
            </label>
            <LabsToggle
              checked={!!tasting.reflectionEnabled}
              onChange={handleToggleReflection}
              icon={<MessageCircle className="w-5 h-5" style={{ color: tasting.reflectionEnabled ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />}
              label="Enable Discussion Round"
              description="Add a discussion phase after tasting"
              testId="labs-settings-toggle-reflection"
            />
            {tasting.reflectionEnabled && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="labs-section-label" style={{ fontSize: 11 }}>Discussion Format</label>
                  <LabsSegmentedSelect
                    value={(tasting.reflectionMode as string) || "standard"}
                    options={[
                      { value: "standard", label: "Standard", desc: "Pre-set questions" },
                      { value: "custom", label: "Custom", desc: "Your own questions" },
                    ]}
                    onChange={handleChangeReflectionMode}
                  />
                </div>
                <div>
                  <label className="labs-section-label" style={{ fontSize: 11 }}>Show Names</label>
                  <LabsSegmentedSelect
                    value={(tasting.reflectionVisibility as string) || "named"}
                    options={[
                      { value: "named", label: "Named", desc: "Names shown" },
                      { value: "anonymous", label: "Anonymous", desc: "Hidden" },
                      { value: "optional", label: "Optional", desc: "Guest decides" },
                    ]}
                    onChange={handleChangeReflectionVis}
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Video className="w-3 h-3" />
              Video Call Link
            </label>
            <div className="flex gap-2">
              <input
                type="url"
                value={videoLinkLocal}
                onChange={e => setVideoLinkLocal(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="labs-input flex-1"
                data-testid="labs-settings-video-link"
              />
              <button
                className="labs-btn-primary px-3"
                onClick={handleSaveVideo}
                disabled={savingVideo}
                data-testid="labs-settings-save-video"
              >
                {savingVideo ? "..." : "Save"}
              </button>
            </div>
          </div>

          <div>
            <label className="labs-section-label flex items-center gap-1" style={{ fontSize: 12 }}>
              <Image className="w-3 h-3" />
              Cover Image
            </label>
            <label
              className="flex items-center justify-center gap-2 p-3 rounded-lg cursor-pointer text-sm"
              style={{
                border: "1px dashed var(--labs-border)",
                color: "var(--labs-text-muted)",
                background: "var(--labs-surface)",
              }}
              data-testid="labs-settings-upload-cover"
            >
              <Upload className="w-4 h-4" />
              {(tasting.coverImageUrl as string) ? "Change Cover" : "Upload Cover Image"}
              <input
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={e => { if (e.target.files?.[0]) handleCoverUpload(e.target.files[0]); }}
              />
            </label>
            {(localCoverUrl || (tasting.coverImageUrl as string)) && (
              <img
                src={localCoverUrl || (tasting.coverImageUrl as string) || ""}
                alt="Cover"
                className="w-full rounded-lg mt-2"
                style={{ height: 120, objectFit: "cover" }}
                data-testid="labs-settings-cover-preview"
              />
            )}
          </div>

          {whiskies && whiskies.length > 0 && participants && (
            <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 16 }}>
              <p className="labs-section-label">Tools</p>
              <div className="space-y-3">
                <PrintMaterialsSection
                  tasting={tasting}
                  whiskies={whiskies}
                  participants={participants}
                  currentParticipant={{ id: pid, name: "Host" }}
                />
                <button
                  className="labs-btn-secondary w-full flex items-center justify-center gap-2"
                  onClick={() => navigate(`/labs/tastings/${tastingId}/scan`)}
                  data-testid="settings-paper-scan"
                >
                  <ScanLine className="w-4 h-4" />
                  Paper Sheet Scanner
                </button>
              </div>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--labs-border)", paddingTop: 16 }} className="space-y-2">
            <button
              className="labs-btn-secondary w-full flex items-center justify-center gap-2"
              onClick={handleDuplicate}
              disabled={duplicating}
              data-testid="labs-settings-duplicate"
            >
              <RefreshCw className="w-4 h-4" />
              {duplicating ? "Duplicating..." : "Duplicate Tasting"}
            </button>

            <button
              className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg cursor-pointer"
              style={{
                background: "none",
                color: "var(--labs-text-muted)",
                border: "1px solid var(--labs-border)",
              }}
              onClick={() => { setShowTransferHost(!showTransferHost); setTransferTargetId(null); }}
              data-testid="labs-settings-transfer-host"
            >
              <ArrowRightLeft className="w-4 h-4" />
              Host übertragen
            </button>

            {showTransferHost && (
              <div
                className="p-3 rounded-lg space-y-2"
                style={{ background: "var(--labs-surface)", border: "1px solid var(--labs-border)" }}
                data-testid="labs-transfer-host-panel"
              >
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  Wähle einen Teilnehmer, der das Tasting als neuer Host übernehmen soll. Du verlierst danach die Host-Rechte.
                </p>
                {transferableGuests.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                    Keine anderen Teilnehmer vorhanden.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {transferableGuests.map((tp: { participant: { id: string; name: string } }) => (
                      <label
                        key={tp.participant.id}
                        className="flex items-center gap-2 p-2 rounded-md cursor-pointer"
                        style={{
                          background: transferTargetId === tp.participant.id ? "var(--labs-surface-elevated)" : "transparent",
                          border: transferTargetId === tp.participant.id ? "1px solid var(--labs-accent)" : "1px solid transparent",
                        }}
                        data-testid={`labs-transfer-target-${tp.participant.id}`}
                      >
                        <input
                          type="radio"
                          name="transferTarget"
                          checked={transferTargetId === tp.participant.id}
                          onChange={() => setTransferTargetId(tp.participant.id)}
                          style={{ accentColor: "var(--labs-accent)" }}
                        />
                        <span className="text-sm" style={{ color: "var(--labs-text)" }}>
                          {stripGuestSuffix(tp.participant.name || "Anonymous")}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {transferTargetId && (
                  <div className="flex gap-2 pt-1">
                    <button
                      className="labs-btn-primary text-sm flex-1"
                      onClick={handleTransferHost}
                      disabled={transferring}
                      data-testid="labs-transfer-host-confirm"
                    >
                      {transferring ? "Übertrage..." : "Host übertragen"}
                    </button>
                    <button
                      className="labs-btn-ghost text-sm"
                      onClick={() => { setShowTransferHost(false); setTransferTargetId(null); }}
                      data-testid="labs-transfer-host-cancel"
                    >
                      Abbrechen
                    </button>
                  </div>
                )}
              </div>
            )}

            {!confirmDelete ? (
              <button
                className="w-full flex items-center justify-center gap-2 text-sm py-2.5 rounded-lg cursor-pointer"
                style={{
                  background: "none",
                  color: "var(--labs-danger, #e74c3c)",
                  border: "1px solid color-mix(in srgb, var(--labs-danger, #e74c3c) 40%, transparent)",
                }}
                onClick={() => setConfirmDelete(true)}
                data-testid="labs-settings-delete"
              >
                <Trash2 className="w-4 h-4" />
                Delete Tasting
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  className="flex-1 py-2.5 text-sm font-semibold rounded-lg cursor-pointer"
                  style={{ background: "var(--labs-danger, #e74c3c)", color: "#fff", border: "none" }}
                  onClick={handleDelete}
                  data-testid="labs-settings-confirm-delete"
                >
                  Yes, Delete
                </button>
                <button
                  className="flex-1 py-2.5 text-sm rounded-lg cursor-pointer"
                  style={{ background: "none", color: "var(--labs-text-muted)", border: "1px solid var(--labs-border)" }}
                  onClick={() => setConfirmDelete(false)}
                  data-testid="labs-settings-cancel-delete"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ManageTasting({ tastingId }: { tastingId: string }) {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
  const goBack = useLabsBack("/labs/tastings");
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [codeCopied, setCodeCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showEmailInvite, setShowEmailInvite] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailList, setEmailList] = useState<string[]>([]);
  const [personalNote, setPersonalNote] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [topDuplicating, setTopDuplicating] = useState(false);
  const [showDesktopTransfer, setShowDesktopTransfer] = useState(false);
  const [desktopTransferTargetId, setDesktopTransferTargetId] = useState<string | null>(null);
  const [desktopTransferring, setDesktopTransferring] = useState(false);

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

  const desktopTransferGuests = (participants || []).filter(
    (tp: { participant: { id: string } }) => tp.participant.id !== currentParticipant?.id
  );

  const [desktopTransferError, setDesktopTransferError] = useState<string | null>(null);

  const handleDesktopTransferHost = async () => {
    if (!desktopTransferTargetId || !currentParticipant) return;
    setDesktopTransferring(true);
    setDesktopTransferError(null);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/transfer-host`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: currentParticipant.id, newHostId: desktopTransferTargetId }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
        navigate("/labs/tastings");
      } else {
        const err = await res.json().catch(() => ({}));
        setDesktopTransferError(err.message || "Übertragung fehlgeschlagen");
      }
    } catch {
      setDesktopTransferError("Übertragung fehlgeschlagen");
    }
    setDesktopTransferring(false);
  };

  const [newWhiskyName, setNewWhiskyName] = useState("");
  const [showAddWhisky, setShowAddWhisky] = useState(false);
  const [showExtendedFields, setShowExtendedFields] = useState(false);
  const [extFields, setExtFields] = useState<Record<string, string>>({});
  const [editingWhiskyId, setEditingWhiskyId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Record<string, string>>({});
  const [showAiImport, setShowAiImport] = useState(false);
  const [aiImportFiles, setAiImportFiles] = useState<File[]>([]);
  const [aiImportText, setAiImportText] = useState("");
  const [aiImportLoading, setAiImportLoading] = useState(false);
  const [aiImportResults, setAiImportResults] = useState<any[]>([]);
  const [aiImportSelected, setAiImportSelected] = useState<Set<number>>(new Set());
  const [showCollectionImport, setShowCollectionImport] = useState(false);
  const [showWishlistImport, setShowWishlistImport] = useState(false);
  const [showEditTasting, setShowEditTasting] = useState(false);
  const [editTastingFields, setEditTastingFields] = useState<Record<string, string>>({});
  const [showSocial, setShowSocial] = useState(false);
  const [aiNarrative, setAiNarrative] = useState<string | null>(null);
  const [narrativeLoading, setNarrativeLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [cockpitMode, setCockpitMode] = useState(false);

  const addWhiskyMutation = useMutation({
    mutationFn: (data: any) => whiskyApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setNewWhiskyName("");
      setExtFields({});
      setShowExtendedFields(false);
      setShowAddWhisky(false);
    },
  });

  const deleteWhiskyMutation = useMutation({
    mutationFn: (id: string) => whiskyApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
  });

  const updateWhiskyMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => whiskyApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
      setEditingWhiskyId(null);
      setEditFields({});
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; sortOrder: number }[]) => whiskyApi.reorder(tastingId, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    },
  });

  const handleMoveWhisky = (index: number, direction: "up" | "down") => {
    if (!whiskies) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= whiskies.length) return;
    const reordered = [...whiskies];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    reorderMutation.mutate(reordered.map((w: any, i: number) => ({ id: w.id, sortOrder: i + 1 })));
  };

  const handleWhiskyImageUpload = async (whiskyId: string, file: File) => {
    try {
      await whiskyApi.uploadImage(whiskyId, file);
      queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    } catch {}
  };

  const [aiImportError, setAiImportError] = useState("");
  const [aiImportSummary, setAiImportSummary] = useState<{ added: number; duplicatesAdded: number; duplicatesSkipped: number; failed: number } | null>(null);

  const getDesktopDuplicateIndices = useCallback(() => {
    if (!whiskies || !aiImportResults.length) return new Set<number>();
    const dupes = new Set<number>();
    aiImportResults.forEach((w: any, i: number) => {
      const match = whiskies.some((ew: any) =>
        isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || "")
      );
      if (match) dupes.add(i);
    });
    return dupes;
  }, [whiskies, aiImportResults]);

  const handleAiImport = async () => {
    if (aiImportFiles.length === 0 && !aiImportText.trim()) return;
    setAiImportLoading(true);
    setAiImportError("");
    setAiImportSummary(null);
    try {
      const result = await tastingApi.aiImport(aiImportFiles, aiImportText.trim(), currentParticipant?.id || "");
      if (result?.whiskies?.length) {
        setAiImportResults(result.whiskies);
        const existingList = (whiskies || []) as Array<Record<string, unknown>>;
        const nonDupeIndices = new Set(
          result.whiskies.map((_: any, i: number) => i).filter((i: number) =>
            !existingList.some((ew: any) => isSimilarWhisky(result.whiskies[i].name || "", result.whiskies[i].distillery || "", ew.name || "", ew.distillery || ""))
          )
        );
        setAiImportSelected(nonDupeIndices);
      } else {
        setAiImportError(t("labs.aiImport.noResults", "No whiskies found. Try a clearer photo or text."));
      }
    } catch (e: unknown) {
      setAiImportError((e instanceof Error ? e.message : null) || t("labs.aiImport.importFailed", "AI import failed. Please try again."));
    }
    setAiImportLoading(false);
  };

  const handleAiImportConfirm = async () => {
    let added = 0, dupeAdded = 0, failed = 0;
    const dupeIndices = getDesktopDuplicateIndices();
    const duplicatesSkipped = Array.from(dupeIndices).filter(i => !aiImportSelected.has(i)).length;
    const existingList = (whiskies || []) as Array<Record<string, unknown>>;
    for (const idx of Array.from(aiImportSelected)) {
      const w = aiImportResults[idx];
      if (w) {
        const isDupe = existingList.some((ew: any) => isSimilarWhisky(w.name || "", w.distillery || "", ew.name || "", ew.distillery || ""));
        try {
          await whiskyApi.create({
            tastingId,
            name: w.name || "",
            distillery: w.distillery || "",
            abv: w.abv ? parseFloat(w.abv) || null : null,
            caskInfluence: w.caskInfluence || w.caskType || w.cask || "",
            age: w.age ? String(w.age) : "",
            category: w.category || "",
            country: w.country || "",
            region: w.region || "",
            bottler: w.bottler || "",
            peatLevel: w.peatLevel || "",
            ppm: w.ppm ? parseFloat(w.ppm) || null : null,
            price: w.price ? parseFloat(w.price) || null : null,
            sortOrder: (whiskies?.length || 0) + added + dupeAdded + 1,
          });
          if (isDupe) dupeAdded++; else added++;
        } catch {
          failed++;
        }
      }
    }
    queryClient.invalidateQueries({ queryKey: ["whiskies", tastingId] });
    setAiImportSummary({ added, duplicatesAdded: dupeAdded, duplicatesSkipped, failed });
    setAiImportResults([]);
    setAiImportSelected(new Set());
    setAiImportFiles([]);
    setAiImportText("");
    if (failed === 0) {
      setTimeout(() => { setShowAiImport(false); setAiImportSummary(null); }, 2500);
    }
  };

  const handleAddWhiskyExtended = () => {
    if (!newWhiskyName.trim()) return;
    addWhiskyMutation.mutate({
      tastingId,
      name: newWhiskyName.trim(),
      distillery: extFields.distillery || "",
      abv: extFields.abv ? parseFloat(extFields.abv) || null : null,
      caskInfluence: extFields.caskType || "",
      age: extFields.age || "",
      category: extFields.category || "",
      country: extFields.country || "",
      region: extFields.region || "",
      bottler: extFields.bottler || "",
      vintage: extFields.vintage || "",
      whiskybaseId: extFields.whiskybaseId || "",
      wbScore: extFields.wbScore ? parseFloat(extFields.wbScore) || null : null,
      price: extFields.price ? parseFloat(extFields.price) || null : null,
      peatLevel: extFields.peatLevel || "",
      ppm: extFields.ppm ? parseFloat(extFields.ppm) || null : null,
      hostSummary: extFields.hostSummary || "",
      notes: extFields.notes || "",
      flavorProfile: extFields.flavorProfile === "auto" || !extFields.flavorProfile ? null : extFields.flavorProfile,
      sortOrder: (whiskies?.length || 0) + 1,
    });
  };

  const handleSaveEditWhisky = (whiskyId: string) => {
    const coerced: Record<string, unknown> = { ...editFields };
    if (coerced.abv !== undefined) coerced.abv = coerced.abv ? parseFloat(coerced.abv as string) || null : null;
    if (coerced.price !== undefined) coerced.price = coerced.price ? parseFloat(coerced.price as string) || null : null;
    if (coerced.ppm !== undefined) coerced.ppm = coerced.ppm ? parseFloat(coerced.ppm as string) || null : null;
    if (coerced.wbScore !== undefined) coerced.wbScore = coerced.wbScore ? parseFloat(coerced.wbScore as string) || null : null;
    if (coerced.caskType !== undefined) { coerced.caskInfluence = coerced.caskType; delete coerced.caskType; }
    if (coerced.flavorProfile !== undefined) { coerced.flavorProfile = coerced.flavorProfile === "auto" || !coerced.flavorProfile ? null : coerced.flavorProfile; }
    updateWhiskyMutation.mutate({ id: whiskyId, data: coerced });
  };

  const startEditWhisky = (w: any) => {
    setEditingWhiskyId(w.id);
    setEditFields({
      name: w.name || "",
      distillery: w.distillery || "",
      abv: w.abv ? String(w.abv) : "",
      caskType: w.caskInfluence || "",
      age: w.age ? String(w.age) : "",
      category: w.category || "",
      country: w.country || "",
      region: w.region || "",
      bottler: w.bottler || "",
      vintage: w.vintage || "",
      price: w.price ? String(w.price) : "",
      hostSummary: w.hostSummary || "",
      notes: w.notes || "",
      flavorProfile: w.flavorProfile || "",
    });
  };

  const [editTastingError, setEditTastingError] = useState("");

  const handleEditTastingSave = async () => {
    const body: Record<string, unknown> = { hostId: currentParticipant?.id };
    if (editTastingFields.title) body.title = editTastingFields.title;
    if (editTastingFields.date !== undefined) body.date = editTastingFields.date;
    if (editTastingFields.location !== undefined) body.location = editTastingFields.location;
    if (editTastingFields.description !== undefined) body.description = editTastingFields.description;
    setEditTastingError("");
    try {
      const res = await fetch(`/api/tastings/${tastingId}/details`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save");
      }
      queryClient.invalidateQueries({ queryKey: ["tasting", tastingId] });
      setShowEditTasting(false);
    } catch (e: any) {
      setEditTastingError(e.message || "Failed to save");
    }
  };

  const handleGenerateNarrative = async () => {
    setNarrativeLoading(true);
    try {
      const res = await fetch(`/api/tastings/${tastingId}/ai-narrative`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostId: currentParticipant?.id }),
      });
      const data = await res.json();
      if (data?.narrative) setAiNarrative(data.narrative);
    } catch {}
    setNarrativeLoading(false);
  };

  const joinUrl = tasting ? `${window.location.origin}/labs/join?code=${tasting?.code}` : "";

  const handleShareSocial = (platform: string) => {
    if (!tasting) return;
    const text = `Join my whisky tasting "${tasting.title}" on CaskSense!`;
    const url = joinUrl;
    const encodedText = encodeURIComponent(text);
    const encodedUrl = encodeURIComponent(url);
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`,
      email: `mailto:?subject=${encodeURIComponent(`Join: ${tasting.title}`)}&body=${encodedText}%20${encodedUrl}`,
    };
    if (links[platform]) window.open(links[platform], "_blank");
  };

  const handleNativeShare = async () => {
    if (!tasting || !navigator.share) return;
    try {
      await navigator.share({
        title: tasting.title,
        text: `Join my whisky tasting "${tasting.title}" on CaskSense!`,
        url: joinUrl,
      });
    } catch {}
  };

  const handleDownloadQr = () => {
    if (qrDataUrl && tasting) {
      downloadDataUrl(qrDataUrl, `casksense-${tasting.code}-qr.png`);
    }
  };

  const copyCode = () => {
    if (tasting?.code) {
      navigator.clipboard.writeText(tasting.code);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  useEffect(() => {
    if (tasting?.code) {
      const joinUrl = `${window.location.origin}/labs/join?code=${tasting.code}`;
      QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: { dark: "#1a1714", light: "#f5f0e8" },
      }).then(setQrDataUrl).catch(() => {});
    }
  }, [tasting?.code]);

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !emailList.includes(email)) {
      setEmailList([...emailList, email]);
      setEmailInput("");
    }
  };

  const removeEmail = (email: string) => {
    setEmailList(emailList.filter(e => e !== email));
  };

  const handleSendInvites = async () => {
    if (emailList.length === 0) return;
    setSendingInvites(true);
    try {
      await inviteApi.sendInvites(tastingId, emailList, personalNote.trim() || undefined);
      setInviteSent(true);
      setEmailList([]);
      setPersonalNote("");
      queryClient.invalidateQueries({ queryKey: ["invites", tastingId] });
      setTimeout(() => setInviteSent(false), 3000);
    } catch (err) {
      console.error("Failed to send invites:", err);
    } finally {
      setSendingInvites(false);
    }
  };

  const handleAddWhisky = () => {
    if (!newWhiskyName.trim()) return;
    if (showExtendedFields) {
      handleAddWhiskyExtended();
    } else {
      addWhiskyMutation.mutate({
        tastingId,
        name: newWhiskyName.trim(),
        sortOrder: (whiskies?.length || 0) + 1,
      });
    }
  };

  if (tastingError) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Wine className="w-12 h-12 mb-4" style={{ color: "var(--labs-text-muted)" }} />
        <p className="text-base font-medium mb-2" style={{ color: "var(--labs-text)" }}>Tasting not found</p>
        <p className="text-sm mb-6" style={{ color: "var(--labs-text-muted)" }}>This tasting doesn't exist or you don't have access.</p>
        <button className="labs-btn-secondary" onClick={goBack} data-testid="labs-host-error-back">
          Tastings
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
        <button className="labs-btn-ghost mt-4" onClick={goBack} data-testid="labs-host-back-to-tastings">
          Tastings
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

  if (isMobile && currentParticipant) {
    return (
      <MobileCompanion
        tasting={tasting}
        whiskies={whiskies || []}
        participants={participants || []}
        ratings={ratings || []}
        currentParticipant={currentParticipant}
        queryClient={queryClient}
        tastingId={tastingId}
        navigate={navigate}
      />
    );
  }

  const showCockpitButton = !isMobile && tasting && (tasting.status === "open" || tasting.status === "reveal");

  if (cockpitMode && tasting && currentParticipant && (tasting.status === "open" || tasting.status === "reveal")) {
    return (
      <LabsHostCockpit
        tastingId={tastingId}
        onExit={() => setCockpitMode(false)}
      />
    );
  }

  return (
    <div className="px-5 py-6 max-w-5xl mx-auto labs-fade-in">
      <button
        onClick={goBack}
        className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
        style={{ color: "var(--labs-text-muted)" }}
        data-testid="labs-host-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="flex items-start justify-between mb-6">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="labs-h2 mb-1"
              data-testid="labs-host-tasting-title"
            >
              {tasting.title}
            </h1>
            <button
              className="labs-btn-ghost p-1"
              onClick={() => {
                setEditTastingFields({
                  title: tasting.title || "",
                  date: tasting.date || "",
                  location: tasting.location || "",
                  description: tasting.description || "",
                });
                setShowEditTasting(!showEditTasting);
              }}
              data-testid="labs-host-edit-tasting"
            >
              <Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
            </button>
          </div>
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
            {tasting.description && (
              <span className="truncate max-w-[200px]">{tasting.description}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {showCockpitButton && (
            <button
              onClick={() => setCockpitMode(true)}
              className="labs-btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 13 }}
              data-testid="labs-host-cockpit-toggle"
            >
              <Gauge className="w-4 h-4" />
              Desktop Cockpit
            </button>
          )}
          <span
            className="labs-badge"
            style={{ background: statusCfg.bg, color: statusCfg.color }}
            data-testid="labs-host-status"
          >
            {statusCfg.label}
          </span>
        </div>
      </div>

      {showEditTasting && (
        <div className="labs-card p-4 mb-5 space-y-3" data-testid="labs-edit-tasting-form">
          <div className="flex items-center gap-2 mb-2">
            <Pencil className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
            <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>Edit Tasting Details</span>
          </div>
          <input
            className="labs-input w-full"
            placeholder="Title"
            value={editTastingFields.title || ""}
            onChange={e => setEditTastingFields({ ...editTastingFields, title: e.target.value })}
            data-testid="labs-edit-tasting-title"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              className="labs-input"
              type="date"
              value={editTastingFields.date || ""}
              onChange={e => setEditTastingFields({ ...editTastingFields, date: e.target.value })}
              data-testid="labs-edit-tasting-date"
            />
            <input
              className="labs-input"
              placeholder="Location"
              value={editTastingFields.location || ""}
              onChange={e => setEditTastingFields({ ...editTastingFields, location: e.target.value })}
              data-testid="labs-edit-tasting-location"
            />
          </div>
          <textarea
            className="labs-input w-full"
            rows={2}
            placeholder="Description (optional)"
            value={editTastingFields.description || ""}
            onChange={e => setEditTastingFields({ ...editTastingFields, description: e.target.value })}
            style={{ resize: "vertical" }}
            data-testid="labs-edit-tasting-description"
          />
          {editTastingError && (
            <p className="text-xs" style={{ color: "var(--labs-danger, #e74c3c)" }} data-testid="labs-edit-tasting-error">{editTastingError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              className="labs-btn-ghost text-sm"
              onClick={() => setShowEditTasting(false)}
              data-testid="labs-edit-tasting-cancel"
            >
              Cancel
            </button>
            <button
              className="labs-btn-primary text-sm"
              onClick={handleEditTastingSave}
              data-testid="labs-edit-tasting-save"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {tasting.code && (
        <div className="labs-card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
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
            <div className="flex items-center gap-2">
              <button
                className="labs-btn-ghost flex items-center gap-1.5"
                onClick={copyCode}
                data-testid="labs-host-copy-code"
              >
                {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? "Copied" : "Copy"}
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1.5"
                onClick={() => setShowQr(!showQr)}
                data-testid="labs-host-toggle-qr"
              >
                <QrCode className="w-4 h-4" />
                {showQr ? "Hide QR" : "QR"}
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1.5"
                onClick={() => setShowEmailInvite(!showEmailInvite)}
                data-testid="labs-host-toggle-email"
              >
                <Mail className="w-4 h-4" />
                Invite
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1.5"
                onClick={() => setShowSocial(!showSocial)}
                data-testid="labs-host-toggle-social"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>

          {showQr && qrDataUrl && (
            <div
              className="flex flex-col items-center gap-2 py-4"
              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{ width: 180, height: 180, borderRadius: 10 }}
                data-testid="img-labs-host-qr"
              />
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                Scan to join this tasting
              </p>
              <button
                className="labs-btn-ghost flex items-center gap-1.5 text-xs mt-1"
                onClick={handleDownloadQr}
                data-testid="labs-host-download-qr"
              >
                <Download className="w-3.5 h-3.5" />
                Download QR
              </button>
            </div>
          )}

          {showSocial && (
            <div
              className="pt-4 space-y-3"
              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>Share Tasting</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "whatsapp", label: "WhatsApp", color: "#25d366" },
                  { key: "telegram", label: "Telegram", color: "#0088cc" },
                  { key: "facebook", label: "Facebook", color: "#1877f2" },
                  { key: "twitter", label: "X", color: "#1da1f2" },
                  { key: "email", label: "Email", color: "var(--labs-text-muted)" },
                ].map(p => (
                  <button
                    key={p.key}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer"
                    style={{
                      background: "var(--labs-surface)",
                      border: "1px solid var(--labs-border)",
                      color: p.color,
                    }}
                    onClick={() => handleShareSocial(p.key)}
                    data-testid={`labs-host-share-${p.key}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    {p.label}
                  </button>
                ))}
                {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                  <button
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium labs-btn-primary"
                    onClick={handleNativeShare}
                    data-testid="labs-host-native-share"
                  >
                    <Share2 className="w-3 h-3" />
                    Share
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input
                  readOnly
                  value={joinUrl}
                  className="labs-input flex-1 text-xs"
                  style={{ fontFamily: "monospace" }}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  data-testid="labs-host-share-link"
                />
                <button
                  className="labs-btn-ghost text-xs"
                  onClick={() => { navigator.clipboard.writeText(joinUrl); }}
                  data-testid="labs-host-copy-link"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {showEmailInvite && (
            <div
              className="pt-4 space-y-3"
              style={{ borderTop: "1px solid var(--labs-border-subtle)" }}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-accent)" }} />
                <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>Email Invitations</span>
              </div>

              {currentParticipant?.id && (
                <FriendsQuickSelect
                  participantId={currentParticipant.id}
                  tastingId={tastingId}
                  selectedEmails={emailList}
                  onToggle={(email, selected) => {
                    if (selected) {
                      if (!emailList.some(e => e.toLowerCase() === email.toLowerCase())) {
                        setEmailList([...emailList, email]);
                      }
                    } else {
                      setEmailList(emailList.filter(e => e.toLowerCase() !== email.toLowerCase()));
                    }
                  }}
                />
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addEmail(); } }}
                  placeholder="Enter email address"
                  className="labs-input flex-1"
                  style={{
                    background: "var(--labs-surface)",
                    border: "1px solid var(--labs-border)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    color: "var(--labs-text)",
                    fontSize: 13,
                    outline: "none",
                    fontFamily: "inherit",
                  }}
                  data-testid="input-labs-invite-email"
                />
                <button
                  className="labs-btn-secondary"
                  onClick={addEmail}
                  data-testid="button-labs-add-email"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {emailList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {emailList.map(email => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
                      style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}
                      data-testid={`badge-labs-invite-${email}`}
                    >
                      {email}
                      <button
                        onClick={() => removeEmail(email)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0, lineHeight: 1 }}
                        data-testid={`button-labs-remove-email-${email}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <textarea
                value={personalNote}
                onChange={e => setPersonalNote(e.target.value)}
                placeholder="Add a personal note (optional)"
                rows={2}
                style={{
                  width: "100%",
                  background: "var(--labs-surface)",
                  border: "1px solid var(--labs-border)",
                  borderRadius: 8,
                  padding: "8px 12px",
                  color: "var(--labs-text)",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                data-testid="textarea-labs-invite-note"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  {emailList.length} recipient{emailList.length !== 1 ? "s" : ""}
                </span>
                <button
                  className="labs-btn-primary flex items-center gap-2"
                  onClick={handleSendInvites}
                  disabled={emailList.length === 0 || sendingInvites}
                  style={{ opacity: emailList.length === 0 ? 0.5 : 1 }}
                  data-testid="button-labs-send-invites"
                >
                  {sendingInvites ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : inviteSent ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendingInvites ? "Sending..." : inviteSent ? "Sent!" : "Send Invites"}
                </button>
              </div>
            </div>
          )}
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

      {tasting.guidedMode && (
        <GuidedTastingEngine
          tasting={tasting}
          whiskies={whiskies || []}
          participants={participants || []}
          ratings={ratings || []}
          currentParticipant={currentParticipant}
          queryClient={queryClient}
          tastingId={tastingId}
        />
      )}

      {!tasting.guidedMode && (
      <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div>
          <h2 className="labs-section-label">Session Controls</h2>
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
                <button
                  className="labs-btn-secondary flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "closed" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-close"
                >
                  <Square className="w-4 h-4" />
                  Close Ratings
                </button>
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
                <button
                  className="labs-btn-ghost flex items-center gap-2"
                  onClick={() => statusMutation.mutate({ status: "archived" })}
                  disabled={statusMutation.isPending}
                  data-testid="labs-host-archive-reveal"
                >
                  Complete & Archive
                </button>
              )}
            </div>
          </div>
        </div>

        {tasting.blindMode && (tasting.status === "open" || tasting.status === "closed" || tasting.status === "reveal") && (() => {
          const whiskyCount = (whiskies || []).length;
          const rv = getRevealState(tasting, whiskyCount);
          return (
            <div>
              <h2 className="labs-section-label">Reveal Controls</h2>
              <div className="labs-card p-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(tasting.status === "open" || tasting.status === "closed") && (
                    <button
                      className="labs-btn-secondary flex items-center gap-2"
                      onClick={() => statusMutation.mutate({ status: "reveal" })}
                      disabled={statusMutation.isPending}
                      data-testid={tasting.status === "open" ? "labs-host-reveal-mode" : "labs-host-enter-reveal"}
                    >
                      <Eye className="w-4 h-4" />
                      Enter Reveal
                    </button>
                  )}
                  {tasting.status === "reveal" && whiskyCount > 0 && (
                    <button
                      className="labs-btn-primary flex items-center gap-2"
                      onClick={() => revealMutation.mutate()}
                      disabled={revealMutation.isPending || rv.allRevealed}
                      style={{ opacity: rv.allRevealed ? 0.5 : 1 }}
                      data-testid="labs-host-reveal-next"
                    >
                      {revealMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                      {rv.nextLabel}
                    </button>
                  )}
                </div>

                {tasting.status === "reveal" && whiskyCount > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium" style={{ color: "var(--labs-text-muted)" }}>
                        {rv.allRevealed ? "All drams revealed" : `Dram ${rv.revealIndex + 1} of ${whiskyCount}`}
                      </span>
                      <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        Step {Math.min(rv.revealStep, rv.maxSteps)}/{rv.maxSteps}
                      </span>
                    </div>
                    <div className="flex gap-1 mb-1.5">
                      {rv.stepLabels.map((label: string, idx: number) => (
                        <div
                          key={label}
                          className="flex-1 h-1.5 rounded-full"
                          style={{
                            background: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-border)",
                            transition: "background 300ms ease",
                          }}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between mb-3">
                      {rv.stepLabels.map((label: string, idx: number) => (
                        <span key={label} className="text-[11px]" style={{ color: idx < rv.revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                          {label}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(whiskies || []).map((_: any, i: number) => {
                        const fullyDone = i < rv.revealIndex || (i === rv.revealIndex && rv.revealStep >= rv.maxSteps);
                        const isCurrent = i === rv.revealIndex && rv.revealStep < rv.maxSteps;
                        let bg = "var(--labs-border)";
                        let fg = "var(--labs-text-muted)";
                        if (fullyDone) { bg = "var(--labs-success)"; fg = "var(--labs-bg)"; }
                        else if (isCurrent) { bg = "var(--labs-accent)"; fg = "var(--labs-bg)"; }
                        return (
                          <div
                            key={i}
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                            style={{ background: bg, color: fg }}
                          >
                            {fullyDone ? <Check className="w-3 h-3" /> : String.fromCharCode(65 + i)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="labs-section-label mb-0">Whiskies ({whiskyCount})</h2>
          {tasting.status === "draft" && (
            <div className="flex items-center gap-1">
              <button
                className="labs-btn-ghost flex items-center gap-1.5 text-xs"
                onClick={() => { setShowAiImport(!showAiImport); if (!showAiImport) setShowAddWhisky(false); }}
                style={{ color: "var(--labs-accent)" }}
                data-testid="labs-host-ai-import-toggle"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Import
              </button>
              <button
                className="labs-btn-ghost flex items-center gap-1 text-xs"
                onClick={() => { setShowAddWhisky(!showAddWhisky); if (!showAddWhisky) setShowAiImport(false); }}
                data-testid="labs-host-add-whisky-toggle"
              >
                {showAddWhisky ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showAddWhisky ? "Cancel" : "Add"}
              </button>
            </div>
          )}
        </div>

        {tasting.status === "draft" && whiskyCount === 0 && !showAiImport && !showAddWhisky && (
          <button
            onClick={() => { setShowAiImport(true); setShowAddWhisky(false); }}
            className="w-full mb-3 p-4 rounded-2xl flex items-center gap-4 transition-all"
            style={{
              background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-accent) 12%, transparent), color-mix(in srgb, var(--labs-accent) 6%, transparent))",
              border: "1px solid color-mix(in srgb, var(--labs-accent) 25%, transparent)",
              cursor: "pointer",
              textAlign: "left",
            }}
            data-testid="desktop-ai-import-hero"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "var(--labs-accent-muted)" }}
            >
              <Sparkles className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: "var(--labs-text)", margin: 0 }}>
                AI Import
              </p>
              <p className="text-xs" style={{ color: "var(--labs-text-secondary)", margin: "2px 0 0", lineHeight: 1.4 }}>
                Snap a menu photo or paste text — AI extracts all whiskies with details
              </p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--labs-text-muted)" }} />
          </button>
        )}

        {showAiImport && tasting.status === "draft" && (
          <div className="labs-card p-4 mb-3 space-y-3" data-testid="labs-ai-import-panel">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              <span className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>AI Import</span>
            </div>
            <div
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg text-sm cursor-pointer"
              style={{
                border: `2px dashed ${dragOver ? "var(--labs-accent)" : "var(--labs-border)"}`,
                color: "var(--labs-text-muted)",
                background: dragOver ? "var(--labs-accent-muted)" : "var(--labs-surface)",
                transition: "all 0.2s",
              }}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const files = Array.from(e.dataTransfer.files);
                if (files.length) setAiImportFiles(prev => [...prev, ...files]);
              }}
            >
              <Upload className="w-6 h-6" />
              <p>Drop photos, PDFs or files here</p>
              <div className="flex gap-2 mt-1">
                <label className="labs-btn-ghost text-xs cursor-pointer">
                  <Camera className="w-3 h-3 inline mr-1" />
                  Camera
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files) setAiImportFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                  />
                </label>
                <label className="labs-btn-ghost text-xs cursor-pointer">
                  <Upload className="w-3 h-3 inline mr-1" />
                  Browse
                  <input
                    type="file"
                    accept="image/*,.pdf,.csv,.txt,.xlsx"
                    multiple
                    style={{ display: "none" }}
                    onChange={e => { if (e.target.files) setAiImportFiles(prev => [...prev, ...Array.from(e.target.files!)]); }}
                  />
                </label>
              </div>
            </div>
            {aiImportFiles.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiImportFiles.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs" style={{ background: "var(--labs-accent-muted)", color: "var(--labs-accent)" }}>
                    {f.name}
                    <button onClick={() => setAiImportFiles(prev => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", padding: 0 }}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <textarea
              className="labs-input w-full"
              rows={2}
              placeholder="Or paste whisky names, tasting notes, menu text..."
              value={aiImportText}
              onChange={e => setAiImportText(e.target.value)}
              style={{ resize: "vertical" }}
              data-testid="labs-ai-import-text"
            />
            <div className="flex gap-2 justify-end">
              <button className="labs-btn-ghost text-sm" onClick={() => { setShowAiImport(false); setAiImportFiles([]); setAiImportText(""); setAiImportResults([]); setAiImportError(""); setAiImportSummary(null); }}>Cancel</button>
              <button
                className="labs-btn-primary text-sm flex items-center gap-1.5"
                onClick={handleAiImport}
                disabled={aiImportLoading || (aiImportFiles.length === 0 && !aiImportText.trim())}
                data-testid="labs-ai-import-analyze"
              >
                {aiImportLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                {aiImportLoading ? "Analyzing..." : "Analyze"}
              </button>
            </div>

            {aiImportError && (
              <div className="text-xs p-2 rounded-lg mt-2" style={{ background: "color-mix(in srgb, var(--labs-danger) 15%, transparent)", color: "var(--labs-danger)" }} data-testid="labs-ai-import-error">
                {aiImportError}
              </div>
            )}

            {aiImportSummary && (
              <div className="text-xs p-3 rounded-lg space-y-1 mt-2" style={{ background: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--labs-accent) 20%, transparent)" }} data-testid="labs-ai-import-summary">
                {aiImportSummary.added > 0 && <p style={{ color: "var(--labs-success)", margin: 0 }}>{aiImportSummary.added} {t("labs.aiImport.added", "added")}</p>}
                {aiImportSummary.duplicatesAdded > 0 && <p style={{ color: "var(--labs-warning, var(--labs-text-muted))", margin: 0 }}>{aiImportSummary.duplicatesAdded} {t("labs.aiImport.duplicatesAdded", "duplicates added")}</p>}
                {aiImportSummary.duplicatesSkipped > 0 && <p style={{ color: "var(--labs-text-muted)", margin: 0 }}>{aiImportSummary.duplicatesSkipped} {t("labs.aiImport.duplicatesSkipped", "duplicates skipped")}</p>}
                {aiImportSummary.failed > 0 && <p style={{ color: "var(--labs-danger)", margin: 0 }}>{aiImportSummary.failed} {t("labs.aiImport.failed", "failed")}</p>}
              </div>
            )}

            {aiImportResults.length > 0 && (() => {
              const dupeIndices = getDesktopDuplicateIndices();
              const nonDupeCount = aiImportResults.length - dupeIndices.size;
              return (
              <div className="space-y-2 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: "var(--labs-text)" }}>
                    {t("labs.aiImport.found", "Found {{count}}", { count: aiImportResults.length })}
                    {dupeIndices.size > 0 && <span style={{ color: "var(--labs-text-muted)" }}> ({dupeIndices.size} {t("labs.aiImport.alreadyInLineup", "already in lineup")})</span>}
                  </span>
                  <button
                    className="labs-btn-ghost text-xs"
                    onClick={() => {
                      if (aiImportSelected.size === nonDupeCount && nonDupeCount > 0) {
                        setAiImportSelected(new Set());
                      } else {
                        setAiImportSelected(new Set(aiImportResults.map((_, i) => i).filter(i => !dupeIndices.has(i))));
                      }
                    }}
                    data-testid="labs-ai-import-select-all"
                  >
                    {aiImportSelected.size === nonDupeCount && nonDupeCount > 0 ? t("labs.aiImport.deselectAll", "Deselect All") : t("labs.aiImport.selectNew", "Select New")}
                  </button>
                </div>
                {aiImportResults.map((w: any, i: number) => {
                  const isDupe = dupeIndices.has(i);
                  return (
                  <label
                    key={i}
                    className="labs-card p-3 flex items-center gap-3 cursor-pointer"
                    style={{ opacity: aiImportSelected.has(i) ? 1 : isDupe ? 0.4 : 0.5 }}
                  >
                    <input
                      type="checkbox"
                      checked={aiImportSelected.has(i)}
                      onChange={() => {
                        const s = new Set(aiImportSelected);
                        s.has(i) ? s.delete(i) : s.add(i);
                        setAiImportSelected(s);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium" style={{ margin: 0 }}>{w.name}</p>
                        {isDupe && <span className="text-[11px] px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "color-mix(in srgb, var(--labs-warning, #f59e0b) 20%, transparent)", color: "var(--labs-warning, #f59e0b)", whiteSpace: "nowrap" }} data-testid={`labs-ai-dupe-badge-${i}`}>{t("labs.aiImport.duplicate", "duplicate")}</span>}
                      </div>
                      <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                        {[w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null, w.country].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </label>
                  );
                })}
                <button
                  className="labs-btn-primary w-full text-sm"
                  onClick={handleAiImportConfirm}
                  disabled={aiImportSelected.size === 0}
                  data-testid="labs-ai-import-confirm"
                >
                  {t("labs.aiImport.addCount", "Add {{count}} Whiskies", { count: aiImportSelected.size })}
                </button>
              </div>
              );
            })()}
          </div>
        )}

        {showAddWhisky && tasting.status === "draft" && (
          <div className="labs-card p-4 mb-3 space-y-3">
            <div className="flex gap-2">
              <input
                className="labs-input flex-1"
                placeholder="Whisky name..."
                value={newWhiskyName}
                onChange={(e) => setNewWhiskyName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !showExtendedFields && handleAddWhisky()}
                data-testid="labs-host-whisky-name-input"
              />
              <button
                className="labs-btn-ghost text-xs"
                onClick={() => setShowExtendedFields(!showExtendedFields)}
                data-testid="labs-host-toggle-extended"
              >
                <Sliders className="w-3.5 h-3.5" />
              </button>
              <button
                className="labs-btn-primary px-4"
                onClick={handleAddWhisky}
                disabled={!newWhiskyName.trim() || addWhiskyMutation.isPending}
                data-testid="labs-host-whisky-add-btn"
              >
                {addWhiskyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add"}
              </button>
            </div>
            {showExtendedFields && (
              <div className="grid grid-cols-2 gap-2">
                <input className="labs-input" placeholder="Distillery" value={extFields.distillery || ""} onChange={e => setExtFields({ ...extFields, distillery: e.target.value })} data-testid="labs-ext-distillery" />
                <input className="labs-input" placeholder="ABV %" value={extFields.abv || ""} onChange={e => setExtFields({ ...extFields, abv: e.target.value })} data-testid="labs-ext-abv" />
                <input className="labs-input" placeholder="Cask Type" value={extFields.caskType || ""} onChange={e => setExtFields({ ...extFields, caskType: e.target.value })} data-testid="labs-ext-cask" />
                <input className="labs-input" placeholder="Age" value={extFields.age || ""} onChange={e => setExtFields({ ...extFields, age: e.target.value })} data-testid="labs-ext-age" />
                <input className="labs-input" placeholder="Category" value={extFields.category || ""} onChange={e => setExtFields({ ...extFields, category: e.target.value })} data-testid="labs-ext-category" />
                <input className="labs-input" placeholder="Country" value={extFields.country || ""} onChange={e => setExtFields({ ...extFields, country: e.target.value })} data-testid="labs-ext-country" />
                <input className="labs-input" placeholder="Region" value={extFields.region || ""} onChange={e => setExtFields({ ...extFields, region: e.target.value })} data-testid="labs-ext-region" />
                <input className="labs-input" placeholder="Bottler" value={extFields.bottler || ""} onChange={e => setExtFields({ ...extFields, bottler: e.target.value })} data-testid="labs-ext-bottler" />
                <input className="labs-input" placeholder="Vintage" value={extFields.vintage || ""} onChange={e => setExtFields({ ...extFields, vintage: e.target.value })} data-testid="labs-ext-vintage" />
                <input className="labs-input" placeholder="Price" value={extFields.price || ""} onChange={e => setExtFields({ ...extFields, price: e.target.value })} data-testid="labs-ext-price" />
                <input className="labs-input" placeholder="Peat Level" value={extFields.peatLevel || ""} onChange={e => setExtFields({ ...extFields, peatLevel: e.target.value })} data-testid="labs-ext-peat" />
                <input className="labs-input" placeholder="PPM" value={extFields.ppm || ""} onChange={e => setExtFields({ ...extFields, ppm: e.target.value })} data-testid="labs-ext-ppm" />
                <select className="labs-input col-span-2" value={extFields.flavorProfile || "auto"} onChange={e => setExtFields({ ...extFields, flavorProfile: e.target.value })} data-testid="labs-ext-flavor-profile" style={{ fontSize: 13 }}>
                  <option value="auto">{`Auto${(() => { const d = detectFlavorProfile({ region: extFields.region, peatLevel: extFields.peatLevel, caskInfluence: extFields.caskType }); const lbl = d ? FLAVOR_PROFILES.find(p => p.id === d)?.en : null; return lbl ? ` (detected: ${lbl})` : ""; })()}`}</option>
                  <option value="none">None (no ordering)</option>
                  {FLAVOR_PROFILES.map(fp => <option key={fp.id} value={fp.id}>{fp.en}</option>)}
                </select>
                <textarea className="labs-input col-span-2" rows={2} placeholder="Host summary" value={extFields.hostSummary || ""} onChange={e => setExtFields({ ...extFields, hostSummary: e.target.value })} style={{ resize: "vertical" }} data-testid="labs-ext-summary" />
                <textarea className="labs-input col-span-2" rows={2} placeholder="Notes" value={extFields.notes || ""} onChange={e => setExtFields({ ...extFields, notes: e.target.value })} style={{ resize: "vertical" }} data-testid="labs-ext-notes" />
              </div>
            )}
          </div>
        )}

        {(() => {
          const rvDesktop = tasting.blindMode && !tasting.guidedMode && tasting.status === "reveal"
            ? getRevealState(tasting, whiskyCount) : null;
          return whiskyCount === 0 ? (
          <div className="labs-card p-6 text-center">
            <Wine className="w-8 h-8 mx-auto mb-2" style={{ color: "var(--labs-text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--labs-text-secondary)" }}>
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
              const rvRevealed = !rvDesktop || i < rvDesktop.revealIndex || (i === rvDesktop.revealIndex && rvDesktop.revealStep >= rvDesktop.maxSteps);
              const rvActive = rvDesktop && i === rvDesktop.revealIndex && rvDesktop.revealStep < rvDesktop.maxSteps;
              const rvHidden = rvDesktop && !rvRevealed && !rvActive;
              const itemRvD = rvActive ? rvDesktop : null;
              const rvShowName = rvRevealed || isFieldRevealed(itemRvD, "name");
              const rvShowDetails = rvRevealed || isFieldRevealed(itemRvD, ["distillery", "age", "abv"]);

              if (editingWhiskyId === w.id) {
                return (
                  <div key={w.id} className="labs-card p-4 space-y-2" data-testid={`labs-host-whisky-edit-${w.id}`}>
                    <div className="grid grid-cols-2 gap-2">
                      <input className="labs-input col-span-2" placeholder="Name" value={editFields.name || ""} onChange={e => setEditFields({ ...editFields, name: e.target.value })} data-testid="labs-edit-whisky-name" />
                      <input className="labs-input" placeholder="Distillery" value={editFields.distillery || ""} onChange={e => setEditFields({ ...editFields, distillery: e.target.value })} />
                      <input className="labs-input" placeholder="ABV %" value={editFields.abv || ""} onChange={e => setEditFields({ ...editFields, abv: e.target.value })} />
                      <input className="labs-input" placeholder="Cask Type" value={editFields.caskType || ""} onChange={e => setEditFields({ ...editFields, caskType: e.target.value })} />
                      <input className="labs-input" placeholder="Age" value={editFields.age || ""} onChange={e => setEditFields({ ...editFields, age: e.target.value })} />
                      <input className="labs-input" placeholder="Category" value={editFields.category || ""} onChange={e => setEditFields({ ...editFields, category: e.target.value })} />
                      <input className="labs-input" placeholder="Country" value={editFields.country || ""} onChange={e => setEditFields({ ...editFields, country: e.target.value })} />
                      <input className="labs-input" placeholder="Region" value={editFields.region || ""} onChange={e => setEditFields({ ...editFields, region: e.target.value })} />
                      <input className="labs-input" placeholder="Bottler" value={editFields.bottler || ""} onChange={e => setEditFields({ ...editFields, bottler: e.target.value })} />
                      <input className="labs-input" placeholder="Price" value={editFields.price || ""} onChange={e => setEditFields({ ...editFields, price: e.target.value })} />
                      <select className="labs-input col-span-2" value={editFields.flavorProfile || "auto"} onChange={e => setEditFields({ ...editFields, flavorProfile: e.target.value })} data-testid="labs-edit-flavor-profile" style={{ fontSize: 13 }}>
                        <option value="auto">{`Auto${(() => { const d = detectFlavorProfile({ region: editFields.region, peatLevel: editFields.peatLevel, caskInfluence: editFields.caskType }); const lbl = d ? FLAVOR_PROFILES.find(p => p.id === d)?.en : null; return lbl ? ` (detected: ${lbl})` : ""; })()}`}</option>
                        <option value="none">None (no ordering)</option>
                        {FLAVOR_PROFILES.map(fp => <option key={fp.id} value={fp.id}>{fp.en}</option>)}
                      </select>
                      <textarea className="labs-input col-span-2" rows={2} placeholder="Host summary" value={editFields.hostSummary || ""} onChange={e => setEditFields({ ...editFields, hostSummary: e.target.value })} style={{ resize: "vertical" }} />
                      <textarea className="labs-input col-span-2" rows={2} placeholder="Notes" value={editFields.notes || ""} onChange={e => setEditFields({ ...editFields, notes: e.target.value })} style={{ resize: "vertical" }} />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button className="labs-btn-ghost text-sm" onClick={() => setEditingWhiskyId(null)}>Cancel</button>
                      <button className="labs-btn-primary text-sm" onClick={() => handleSaveEditWhisky(w.id)} disabled={updateWhiskyMutation.isPending} data-testid="labs-edit-whisky-save">
                        {updateWhiskyMutation.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={w.id}
                  className="labs-card p-4 flex items-center gap-3"
                  style={{ opacity: rvHidden ? 0.4 : 1, transition: "opacity 300ms" }}
                  data-testid={`labs-host-whisky-${w.id}`}
                >
                  {w.imageUrl && rvShowDetails ? (
                    <img
                      src={w.imageUrl}
                      alt={w.name}
                      className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                      style={{
                        background: rvRevealed && rvDesktop ? "var(--labs-success-muted)" : rvActive ? "var(--labs-info-muted)" : "var(--labs-accent-muted)",
                        color: rvRevealed && rvDesktop ? "var(--labs-success)" : rvActive ? "var(--labs-info)" : "var(--labs-accent)",
                      }}
                    >
                      {rvRevealed && rvDesktop ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + i)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {rvShowName ? (w.name || `Whisky ${i + 1}`) : `Dram ${String.fromCharCode(65 + i)}`}
                    </p>
                    <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {rvShowDetails
                        ? ([w.distillery, w.age ? `${w.age}y` : null, w.abv ? `${w.abv}%` : null, w.country, w.caskType].filter(Boolean).join(" · ") || "No details")
                        : (rvHidden ? "Hidden" : rvActive ? "Partially revealed" : "No details")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {rvActive && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--labs-info-muted)", color: "var(--labs-info)" }}>
                        Active
                      </span>
                    )}
                    <span className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                      {whiskyRatings.length}/{participantCount} rated
                    </span>
                    {avgScore !== null && (
                      <span className="text-sm font-bold" style={{ color: "var(--labs-accent)" }}>
                        {avgScore}
                      </span>
                    )}
                    {tasting.status === "draft" && (
                      <>
                        <div className="flex flex-col">
                          <button
                            className="labs-btn-ghost p-0.5"
                            onClick={() => handleMoveWhisky(i, "up")}
                            disabled={i === 0 || reorderMutation.isPending}
                            style={{ opacity: i === 0 ? 0.3 : 1 }}
                            data-testid={`labs-host-move-up-${w.id}`}
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            className="labs-btn-ghost p-0.5"
                            onClick={() => handleMoveWhisky(i, "down")}
                            disabled={i === (whiskies?.length || 0) - 1 || reorderMutation.isPending}
                            style={{ opacity: i === (whiskies?.length || 0) - 1 ? 0.3 : 1 }}
                            data-testid={`labs-host-move-down-${w.id}`}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <label className="labs-btn-ghost p-1 cursor-pointer" data-testid={`labs-host-upload-img-${w.id}`} title={t("labs.settings.photoRightsHint", "Please only upload your own photos or license-free images.")}>
                          <Image className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { if (e.target.files?.[0]) handleWhiskyImageUpload(w.id, e.target.files[0]); }} />
                        </label>
                        <button
                          className="labs-btn-ghost p-1"
                          onClick={() => startEditWhisky(w)}
                          data-testid={`labs-host-edit-whisky-${w.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)" }} />
                        </button>
                        <button
                          className="labs-btn-ghost p-1"
                          onClick={() => deleteWhiskyMutation.mutate(w.id)}
                          data-testid={`labs-host-delete-whisky-${w.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" style={{ color: "var(--labs-danger)" }} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
        })()}
      </div>

      {participantCount > 0 && !tasting.guidedMode && (
        <ParticipantStatusSection
          participants={participants}
          ratings={ratings}
          whiskies={whiskies}
          whiskyCount={whiskyCount}
        />
      )}

      {currentParticipant && whiskyCount > 0 && (
        <div className="mt-8 pt-6" style={{ borderTop: "1px solid var(--labs-border, rgba(255,255,255,0.08))" }}>
          <PrintMaterialsSection
            tasting={tasting}
            whiskies={whiskies || []}
            participants={participants || []}
            currentParticipant={currentParticipant}
          />
        </div>
      )}

      {currentParticipant && (
        <div className="mt-6 mb-6">
          <button
            className="labs-btn-secondary w-full flex items-center justify-center gap-2"
            onClick={() => navigate(`/labs/tastings/${tastingId}/scan`)}
            data-testid="desktop-paper-scan"
          >
            <ScanLine className="w-4 h-4" />
            Paper Sheet Scanner
          </button>
        </div>
      )}

      {currentParticipant && whiskyCount > 0 && (
        <div className="mt-6 mb-6">
          <h2 className="labs-section-label">Host Rating</h2>
          <HostRatingPanel
            whiskies={whiskies}
            tastingId={tastingId}
            participantId={currentParticipant.id}
            ratingScale={tasting.ratingScale || 100}
          />
        </div>
      )}

      {(tasting.status === "closed" || tasting.status === "archived") && (
        <div className="mb-6">
          <h2 className="labs-section-label">AI Narrative</h2>
          <div className="labs-card p-4">
            {tasting.aiNarrative || aiNarrative ? (
              <div>
                <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--labs-text)", lineHeight: 1.7 }} data-testid="labs-host-narrative-text">
                  {aiNarrative || (tasting.aiNarrative as string)}
                </p>
                <button
                  className="labs-btn-ghost text-xs mt-3 flex items-center gap-1.5"
                  onClick={handleGenerateNarrative}
                  disabled={narrativeLoading}
                  data-testid="labs-host-regenerate-narrative"
                >
                  {narrativeLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  Regenerate
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <Sparkles className="w-6 h-6 mx-auto mb-2" style={{ color: "var(--labs-accent)" }} />
                <p className="text-sm mb-3" style={{ color: "var(--labs-text-muted)" }}>
                  Generate an AI summary of this tasting session
                </p>
                <button
                  className="labs-btn-primary text-sm flex items-center gap-1.5 mx-auto"
                  onClick={handleGenerateNarrative}
                  disabled={narrativeLoading}
                  data-testid="labs-host-generate-narrative"
                >
                  {narrativeLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {narrativeLoading ? "Generating..." : "Generate Narrative"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      

      {(tasting.status === "archived" || tasting.status === "completed" || tasting.status === "closed") && (whiskies?.length || 0) > 0 && (
        <div className="mb-4">
          <button
            className="labs-btn-primary flex items-center gap-2 w-full justify-center"
            onClick={() => navigate(`/labs/results/${tastingId}/present`)}
            data-testid="labs-host-present-results"
          >
            <Monitor className="w-4 h-4" />
            Present Results
          </button>
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

      {currentParticipant && (
        <div className="mt-3">
          <button
            className="labs-btn-secondary w-full flex items-center justify-center gap-2"
            onClick={async () => {
              setTopDuplicating(true);
              try {
                const pid = currentParticipant.id;
                const newTasting = await tastingApi.duplicate(tastingId, pid);
                if (newTasting?.id) navigate(`/labs/tastings/${newTasting.id}`);
              } catch {}
              setTopDuplicating(false);
            }}
            disabled={topDuplicating}
            data-testid="labs-host-duplicate"
          >
            <Copy className="w-4 h-4" />
            {topDuplicating ? "Kopiere..." : "Tasting kopieren"}
          </button>

          <button
            className="labs-btn-secondary w-full flex items-center justify-center gap-2 mt-2"
            onClick={() => { setShowDesktopTransfer(!showDesktopTransfer); setDesktopTransferTargetId(null); }}
            data-testid="labs-host-transfer-host"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Host übertragen
          </button>

          {showDesktopTransfer && (
            <div
              className="labs-card p-4 mt-2 space-y-2"
              data-testid="labs-desktop-transfer-panel"
            >
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                Wähle einen Teilnehmer, der das Tasting als neuer Host übernehmen soll. Du verlierst danach die Host-Rechte.
              </p>
              {desktopTransferGuests.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                  Keine anderen Teilnehmer vorhanden.
                </p>
              ) : (
                <div className="space-y-1">
                  {desktopTransferGuests.map((tp: { participant: { id: string; name: string } }) => (
                    <label
                      key={tp.participant.id}
                      className="flex items-center gap-2 p-2 rounded-md cursor-pointer"
                      style={{
                        background: desktopTransferTargetId === tp.participant.id ? "var(--labs-surface-elevated)" : "transparent",
                        border: desktopTransferTargetId === tp.participant.id ? "1px solid var(--labs-accent)" : "1px solid transparent",
                      }}
                      data-testid={`labs-desktop-transfer-target-${tp.participant.id}`}
                    >
                      <input
                        type="radio"
                        name="desktopTransferTarget"
                        checked={desktopTransferTargetId === tp.participant.id}
                        onChange={() => setDesktopTransferTargetId(tp.participant.id)}
                        style={{ accentColor: "var(--labs-accent)" }}
                      />
                      <span className="text-sm" style={{ color: "var(--labs-text)" }}>
                        {stripGuestSuffix(tp.participant.name || "Anonymous")}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {desktopTransferError && (
                <p className="text-xs" style={{ color: "var(--labs-danger, #e74c3c)" }} data-testid="labs-desktop-transfer-error">
                  {desktopTransferError}
                </p>
              )}
              {desktopTransferTargetId && (
                <div className="flex gap-2 pt-1">
                  <button
                    className="labs-btn-primary text-sm flex-1"
                    onClick={handleDesktopTransferHost}
                    disabled={desktopTransferring}
                    data-testid="labs-desktop-transfer-confirm"
                  >
                    {desktopTransferring ? "Übertrage..." : "Host übertragen"}
                  </button>
                  <button
                    className="labs-btn-ghost text-sm"
                    onClick={() => { setShowDesktopTransfer(false); setDesktopTransferTargetId(null); setDesktopTransferError(null); }}
                    data-testid="labs-desktop-transfer-cancel"
                  >
                    Abbrechen
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
