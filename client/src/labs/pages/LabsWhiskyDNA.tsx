import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import BackLink from "@/labs/components/BackLink";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useSession } from "@/lib/session";
import { pidHeaders, wishlistApi } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { wishlistKey } from "@/lib/wishlistKey";
import type { WishlistEntry } from "@shared/schema";
import { Activity, Download, Copy, Check, TrendingUp, Sparkles, ChevronLeft, Compass, BookmarkPlus, BookmarkCheck, X } from "lucide-react";

interface DnaCategory {
  id: string;
  en: string;
  de: string;
  color: string;
  count: number;
  pct: number;
  lower: number;
  upper: number;
}

interface DnaRecommendation {
  name: string;
  distillery: string | null;
  region: string | null;
  category: string | null;
  imageUrl: string | null;
  source: "whisky" | "benchmark";
  matchedCategories: Array<{ id: string; en: string; de: string; color: string; hits: number }>;
  score: number;
}

interface DnaRecommendationsResponse {
  weakCategories: Array<{ id: string; en: string; de: string; color: string; pct: number }>;
  recommendations: DnaRecommendation[];
}

interface DnaResponse {
  n: number;
  stability: number;
  ciHalf: number;
  nForCI10: number;
  phase: "unknown" | "emerging" | "stable" | "crystal";
  categories: DnaCategory[];
  topKeywords: Array<{ keyword: string; count: number }>;
  dominantCategory: string | null;
  rareCategory: string | null;
}

const RADIUS = 150;
const CENTER = 200;
const SIZE = 400;

function drawRadar(canvas: HTMLCanvasElement, dna: DnaResponse, lang: "en" | "de", labels: { upper: string; point: string; band: string; smoky: string; fruity: string; stability: string }) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = SIZE * dpr;
  canvas.height = SIZE * dpr;
  canvas.style.width = `${SIZE}px`;
  canvas.style.height = `${SIZE}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, SIZE, SIZE);

  const cats = dna.categories;
  const n = cats.length;
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  // Background
  ctx.fillStyle = "#1a1612";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Concentric rings (4)
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1;
  for (let r = 1; r <= 4; r++) {
    const radius = (RADIUS * r) / 4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const a = angleFor(i);
      const x = CENTER + Math.cos(a) * radius;
      const y = CENTER + Math.sin(a) * radius;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
  }

  // Spokes + labels
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "rgba(232,222,202,0.70)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const xEnd = CENTER + Math.cos(a) * RADIUS;
    const yEnd = CENTER + Math.sin(a) * RADIUS;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(xEnd, yEnd);
    ctx.stroke();
    const labelR = RADIUS + 18;
    const lx = CENTER + Math.cos(a) * labelR;
    const ly = CENTER + Math.sin(a) * labelR;
    const label = lang === "de" ? cats[i].de : cats[i].en;
    ctx.fillText(label, lx, ly);
  }

  // Upper CI (dashed)
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "rgba(196,146,42,0.55)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const r = cats[i].upper * RADIUS;
    const x = CENTER + Math.cos(a) * r;
    const y = CENTER + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  // Lower CI (dashed)
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const r = cats[i].lower * RADIUS;
    const x = CENTER + Math.cos(a) * r;
    const y = CENTER + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.setLineDash([]);

  // CI band fill (between lower and upper) — fill upper, then erase lower with destination-out
  ctx.save();
  ctx.fillStyle = "rgba(196,146,42,0.10)";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const r = cats[i].upper * RADIUS;
    const x = CENTER + Math.cos(a) * r;
    const y = CENTER + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const r = cats[i].lower * RADIUS;
    const x = CENTER + Math.cos(a) * r;
    const y = CENTER + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Point estimator polygon (gold)
  ctx.fillStyle = "rgba(196,146,42,0.18)";
  ctx.strokeStyle = "#C4922A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const r = cats[i].pct * RADIUS;
    const x = CENTER + Math.cos(a) * r;
    const y = CENTER + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vertices (small dots)
  for (let i = 0; i < n; i++) {
    const a = angleFor(i);
    const r = cats[i].pct * RADIUS;
    const x = CENTER + Math.cos(a) * r;
    const y = CENTER + Math.sin(a) * r;
    ctx.fillStyle = cats[i].color;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // CI brackets on Smoky (id=smoky) and Fruity (id=fruity) axes
  const drawBracket = (catId: string) => {
    const idx = cats.findIndex((c) => c.id === catId);
    if (idx < 0) return;
    const cat = cats[idx];
    const a = angleFor(idx);
    const rL = cat.lower * RADIUS;
    const rU = cat.upper * RADIUS;
    const xL = CENTER + Math.cos(a) * rL;
    const yL = CENTER + Math.sin(a) * rL;
    const xU = CENTER + Math.cos(a) * rU;
    const yU = CENTER + Math.sin(a) * rU;
    ctx.strokeStyle = "rgba(196,146,42,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(xL, yL);
    ctx.lineTo(xU, yU);
    ctx.stroke();
    // Tick marks perpendicular
    const perpX = -Math.sin(a) * 4;
    const perpY = Math.cos(a) * 4;
    ctx.beginPath();
    ctx.moveTo(xL - perpX, yL - perpY);
    ctx.lineTo(xL + perpX, yL + perpY);
    ctx.moveTo(xU - perpX, yU - perpY);
    ctx.lineTo(xU + perpX, yU + perpY);
    ctx.stroke();
    // Label ±X%
    const ciPct = Math.round(((cat.upper - cat.lower) / 2) * 100);
    const midX = (xL + xU) / 2 + perpX * 4;
    const midY = (yL + yU) / 2 + perpY * 4;
    ctx.fillStyle = "#C4922A";
    ctx.font = "bold 10px system-ui, -apple-system, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`±${ciPct}%`, midX, midY);
  };
  drawBracket("smoky");
  drawBracket("fruity");

  // Inline legend (top-left)
  ctx.font = "10px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const legendX = 12;
  let legendY = 16;
  // Point estimator swatch
  ctx.fillStyle = "#C4922A";
  ctx.fillRect(legendX, legendY - 4, 12, 8);
  ctx.fillStyle = "rgba(232,222,202,0.85)";
  ctx.fillText(labels.point, legendX + 18, legendY);
  legendY += 14;
  // CI band swatch
  ctx.fillStyle = "rgba(196,146,42,0.30)";
  ctx.fillRect(legendX, legendY - 4, 12, 8);
  ctx.strokeStyle = "rgba(196,146,42,0.55)";
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(legendX, legendY - 4, 12, 8);
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(232,222,202,0.85)";
  ctx.fillText(labels.band, legendX + 18, legendY);

  // Center stability badge
  const centerColor =
    dna.phase === "crystal" ? "#C4922A" :
    dna.phase === "stable" ? "#6B8E5A" :
    dna.phase === "emerging" ? "#D4A853" : "#7A6855";
  ctx.beginPath();
  ctx.arc(CENTER, CENTER, 32, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(26,22,18,0.92)";
  ctx.fill();
  ctx.strokeStyle = centerColor;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = centerColor;
  ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${dna.stability}%`, CENTER, CENTER - 6);
  ctx.fillStyle = "rgba(232,222,202,0.75)";
  ctx.font = "9px system-ui, -apple-system, sans-serif";
  ctx.fillText(labels.stability.toUpperCase(), CENTER, CENTER + 10);
}

function phaseColor(phase: DnaResponse["phase"]) {
  switch (phase) {
    case "unknown": return "#7A6855";
    case "emerging": return "#D4A853";
    case "stable": return "#6B8E5A";
    case "crystal": return "#C4922A";
  }
}

export default function LabsWhiskyDNA() {
  const { t } = useTranslation();
  const session = useSession();
  const pid = session.pid;
  const lang = ((i18n.language || "en").substring(0, 2) as "en" | "de");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: dna, isLoading, error } = useQuery<DnaResponse>({
    queryKey: ["whisky-dna", pid],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${pid}/whisky-dna`, {
        headers: pidHeaders(),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
    enabled: !!pid,
    staleTime: 5 * 60 * 1000,
  });

  const { data: recs } = useQuery<DnaRecommendationsResponse>({
    queryKey: ["whisky-dna-recs", pid],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${pid}/whisky-dna/recommendations`, {
        headers: pidHeaders(),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      return res.json();
    },
    enabled: !!pid && !!dna && dna.n >= 5,
    staleTime: 5 * 60 * 1000,
  });

  const { data: wishlistEntries } = useQuery<WishlistEntry[]>({
    queryKey: ["wishlist", pid],
    queryFn: () => wishlistApi.getAll(pid!),
    enabled: !!pid,
    staleTime: 60 * 1000,
  });

  const savedKeys = useMemo(() => {
    const set = new Set<string>();
    (wishlistEntries || []).forEach((e) => set.add(wishlistKey(e.name, e.distillery)));
    return set;
  }, [wishlistEntries]);

  const wishlistIdByKey = useMemo(() => {
    const map = new Map<string, string>();
    (wishlistEntries || []).forEach((e) => map.set(wishlistKey(e.name, e.distillery), e.id));
    return map;
  }, [wishlistEntries]);

  const [justSavedKeys, setJustSavedKeys] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [removingKey, setRemovingKey] = useState<string | null>(null);

  const saveRecMutation = useMutation({
    mutationFn: async (rec: DnaRecommendation) => {
      const categoryLabel = rec.matchedCategories.length
        ? rec.matchedCategories.map((mc) => (lang === "de" ? mc.de : mc.en)).join(", ")
        : rec.category || null;
      const notes = categoryLabel
        ? (lang === "de" ? `Kategorie: ${categoryLabel}` : `Category: ${categoryLabel}`)
        : null;
      return wishlistApi.create(pid!, {
        name: rec.name,
        distillery: rec.distillery || null,
        region: rec.region || null,
        notes,
        priority: "medium",
        source: "whisky-dna",
      });
    },
    onMutate: (rec) => {
      setSavingKey(wishlistKey(rec.name, rec.distillery));
    },
    onSuccess: (_data, rec) => {
      const key = wishlistKey(rec.name, rec.distillery);
      setJustSavedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onSettled: () => {
      setSavingKey(null);
    },
  });

  const removeRecMutation = useMutation({
    mutationFn: async ({ id }: { id: string; key: string }) => {
      return wishlistApi.delete(pid!, id);
    },
    onMutate: ({ key }) => {
      setRemovingKey(key);
    },
    onSuccess: (_data, { key }) => {
      setJustSavedKeys((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
    onSettled: () => {
      setRemovingKey(null);
    },
  });

  const labels = useMemo(() => ({
    upper: t("dnaUpperBound", "Upper bound"),
    point: t("dnaPointEstimate", "Point estimate"),
    band: t("dnaConfidenceBand", "Confidence band"),
    smoky: lang === "de" ? "Rauchig" : "Smoky",
    fruity: lang === "de" ? "Fruchtig" : "Fruity",
    stability: t("dnaStability", "Stability"),
  }), [t, lang]);

  useEffect(() => {
    if (!dna || !canvasRef.current || dna.n < 5) return;
    drawRadar(canvasRef.current, dna, lang, labels);
  }, [dna, lang, labels]);

  const phaseLabel = useCallback((phase: DnaResponse["phase"]) => {
    switch (phase) {
      case "unknown": return t("dnaPhaseUnknown", "Undetermined");
      case "emerging": return t("dnaPhaseEmerging", "Emerging");
      case "stable": return t("dnaPhaseStable", "Stable");
      case "crystal": return t("dnaPhaseCrystal", "Crystallized");
    }
  }, [t]);

  const phaseDesc = useCallback((phase: DnaResponse["phase"]) => {
    switch (phase) {
      case "unknown": return t("dnaPhaseUnknownDesc", "Too few drams logged — your DNA is still forming. Keep tasting and noting your impressions.");
      case "emerging": return t("dnaPhaseEmergingDesc", "First patterns are appearing. Your aroma preferences are starting to take shape.");
      case "stable": return t("dnaPhaseStableDesc", "Your DNA has stabilized. Confidence intervals are narrow enough to trust the dominant axes.");
      case "crystal": return t("dnaPhaseCrystalDesc", "Crystal-clear: your aroma fingerprint is well-established with high statistical confidence.");
    }
  }, [t]);

  const handleSaveImage = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `whisky-dna-${pid}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [pid]);

  const handleCopy = useCallback(async () => {
    if (!dna) return;
    const top = [...dna.categories].sort((a, b) => b.pct - a.pct).slice(0, 3)
      .map((c) => `${lang === "de" ? c.de : c.en} ${Math.round(c.pct * 100)}% (±${Math.round(((c.upper - c.lower) / 2) * 100)}%)`)
      .join(", ");
    const summary = lang === "de"
      ? `Meine Whisky-DNA (${dna.n} Drams, Phase: ${phaseLabel(dna.phase)}, Stabilität ${dna.stability}%): ${top}`
      : `My Whisky DNA (${dna.n} drams, phase: ${phaseLabel(dna.phase)}, stability ${dna.stability}%): ${top}`;
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }, [dna, lang, phaseLabel]);

  if (!pid) {
    return (
      <div className="labs-page" data-testid="labs-whisky-dna">
        <BackLink href="/labs/taste/connoisseur" style={{ textDecoration: "none" }}>
          <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-dna">
            <ChevronLeft className="w-4 h-4" /> {t("labs.connoisseur.title", "Connoisseur")}
          </button>
        </BackLink>
        <AuthGateMessage />
      </div>
    );
  }

  const sortedTop = dna ? [...dna.categories].sort((a, b) => b.pct - a.pct).slice(0, 5) : [];

  return (
    <div className="labs-page" data-testid="labs-whisky-dna">
      <BackLink href="/labs/taste/connoisseur" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-dna">
          <ChevronLeft className="w-4 h-4" /> {t("labs.connoisseur.title", "Connoisseur")}
        </button>
      </BackLink>

      <div className="labs-fade-in" style={{ marginBottom: 16 }}>
        <h1 className="labs-h1" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Activity className="w-6 h-6" style={{ color: "var(--labs-gold)" }} />
          <span data-testid="text-page-title">{t("whiskyDna", "Your Whisky DNA")}</span>
        </h1>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
          {t("whiskyDnaDesc", "A 12-axis aroma radar with a 95% confidence band that shrinks as you log more drams.")}
        </p>
      </div>

      {isLoading && (
        <div className="labs-card p-8 text-center">
          <div className="labs-spinner mx-auto" />
        </div>
      )}

      {error && !isLoading && (
        <div className="labs-card p-6 text-center" data-testid="dna-error">
          <p style={{ color: "var(--labs-danger)", fontSize: 13 }}>
            {(error as Error).message}
          </p>
        </div>
      )}

      {dna && !isLoading && dna.n < 5 && (
        <div className="labs-card p-8 text-center labs-fade-in" data-testid="dna-empty-state">
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 16px",
            background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-gold) 15%, transparent), color-mix(in srgb, var(--labs-accent) 10%, transparent))",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Sparkles className="w-7 h-7" style={{ color: "var(--labs-gold)" }} />
          </div>
          <p style={{ color: "var(--labs-text)", fontSize: 14, lineHeight: 1.6 }} data-testid="text-empty-state">
            {t("dnaEmptyState", "Log at least 5 drams with tasting notes to see your Whisky DNA emerge.")}
          </p>
          <p style={{ color: "var(--labs-text-muted)", fontSize: 12, marginTop: 10 }}>
            {dna.n} / 5
          </p>
        </div>
      )}

      {dna && !isLoading && dna.n >= 5 && (
        <>
          {/* Phase badge + explanation */}
          <div className="labs-card labs-fade-in" style={{ padding: "16px 18px", marginBottom: 12, textAlign: "center" }}>
            <span
              data-testid="badge-phase"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, marginBottom: 10,
                background: `color-mix(in srgb, ${phaseColor(dna.phase)} 18%, transparent)`,
                border: `1px solid color-mix(in srgb, ${phaseColor(dna.phase)} 45%, transparent)`,
                color: phaseColor(dna.phase),
                fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em",
              }}
            >
              <TrendingUp className="w-3 h-3" />
              {phaseLabel(dna.phase)}
            </span>
            <p
              data-testid="text-phase-description"
              style={{ fontSize: 13, color: "var(--labs-text-muted)", lineHeight: 1.5, margin: "0 auto", maxWidth: 480 }}
            >
              {phaseDesc(dna.phase)}
            </p>
            <p style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 8, opacity: 0.8 }}>
              <strong style={{ color: "var(--labs-text)", fontWeight: 600 }}>{dna.n}</strong> {t("dnaDramsNeeded", "Drams logged")}
            </p>
          </div>

          {/* Stability bar */}
          <div className="labs-card labs-fade-in" style={{ padding: "14px 18px", marginBottom: 12 }} data-testid="stability-bar-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-text-muted)" }}>
                {t("dnaStability", "Stability")}
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: phaseColor(dna.phase) }} data-testid="text-stability-value">
                {dna.stability}%
              </span>
            </div>
            <div
              style={{
                height: 8, borderRadius: 999, overflow: "hidden",
                background: "color-mix(in srgb, var(--labs-text-muted) 20%, transparent)",
              }}
              role="progressbar"
              aria-valuenow={dna.stability}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                data-testid="stability-bar-fill"
                style={{
                  height: "100%",
                  width: `${dna.stability}%`,
                  background: phaseColor(dna.phase),
                  transition: "width 600ms ease",
                }}
              />
            </div>
          </div>

          {/* Stat tiles (3) */}
          <div className="labs-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
            <div className="labs-card p-3 text-center" data-testid="stat-stability">
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-gold)" }}>{dna.stability}%</div>
              <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>
                {t("dnaStability", "Stability")}
              </div>
            </div>
            <div className="labs-card p-3 text-center" data-testid="stat-ci-width">
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-gold)" }}>±{Math.round(dna.ciHalf * 100)}%</div>
              <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>
                {t("dnaCiAvg", "Avg CI width")}
              </div>
            </div>
            <div className="labs-card p-3 text-center" data-testid="stat-drams-for-10">
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--labs-gold)" }}>
                {dna.nForCI10 > 0 ? `+${dna.nForCI10}` : t("dnaReached", "reached")}
              </div>
              <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>
                {t("dnaStillNeeded", "Still needed")}
              </div>
            </div>
          </div>

          {/* Radar canvas */}
          <div className="labs-card labs-fade-in" style={{ padding: 16, marginBottom: 16, display: "flex", justifyContent: "center" }}>
            <canvas
              ref={canvasRef}
              data-testid="canvas-dna-radar"
              style={{ maxWidth: "100%", height: "auto", borderRadius: 12 }}
              aria-label={t("dna95Confidence", "95% confidence")}
            />
          </div>

          {/* Top aromas */}
          <div className="labs-card p-5 labs-fade-in" style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-accent)", marginBottom: 10 }}>
              {t("dnaTopAromas", "Top aromas in your notes")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sortedTop.map((c) => {
                const pct = Math.round(c.pct * 100);
                const ciPct = Math.round(((c.upper - c.lower) / 2) * 100);
                return (
                  <div key={c.id} data-testid={`row-aroma-${c.id}`} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: c.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, fontSize: 13, color: "var(--labs-text)" }}>
                      {lang === "de" ? c.de : c.en}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                      {pct}% <span style={{ opacity: 0.6 }}>±{ciPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Try next — recommendations to strengthen weak axes */}
          {recs && recs.recommendations.length > 0 && (
            <div className="labs-card p-5 labs-fade-in" style={{ marginBottom: 16 }} data-testid="section-try-next">
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--labs-accent)", marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
                <Compass className="w-3.5 h-3.5" />
                {t("dnaTryNext", "Try next")}
              </p>
              <p style={{ fontSize: 12, color: "var(--labs-text-muted)", lineHeight: 1.5, marginBottom: 12 }} data-testid="text-try-next-intro">
                {t(
                  "dnaTryNextDesc",
                  "Whiskies that prominently feature aromas your DNA hasn't explored yet: {{cats}}.",
                  { cats: recs.weakCategories.map((c) => (lang === "de" ? c.de : c.en)).join(", ") },
                )}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {recs.recommendations.map((r, idx) => {
                  const subtitleParts = [r.distillery, r.region, r.category].filter(Boolean) as string[];
                  const recKey = wishlistKey(r.name, r.distillery);
                  const isSaved = savedKeys.has(recKey) || justSavedKeys.has(recKey);
                  const isSaving = savingKey === recKey && saveRecMutation.isPending;
                  const isRemoving = removingKey === recKey && removeRecMutation.isPending;
                  const wishlistId = wishlistIdByKey.get(recKey);
                  return (
                    <div
                      key={`${r.distillery || ""}|${r.name}|${idx}`}
                      data-testid={`card-recommendation-${idx}`}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 12,
                        padding: 12, borderRadius: 10,
                        background: isSaved
                          ? "color-mix(in srgb, var(--labs-accent) 8%, transparent)"
                          : "color-mix(in srgb, var(--labs-gold) 6%, transparent)",
                        border: isSaved
                          ? "1px solid color-mix(in srgb, var(--labs-accent) 35%, transparent)"
                          : "1px solid color-mix(in srgb, var(--labs-gold) 18%, transparent)",
                        transition: "background 200ms ease, border-color 200ms ease",
                      }}
                    >
                      <div style={{
                        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                        background: "linear-gradient(135deg, color-mix(in srgb, var(--labs-gold) 25%, transparent), color-mix(in srgb, var(--labs-accent) 15%, transparent))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--labs-gold)", fontWeight: 700, fontSize: 14,
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div data-testid={`text-recommendation-name-${idx}`} style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)", lineHeight: 1.3 }}>
                          {r.name}
                        </div>
                        {subtitleParts.length > 0 && (
                          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2, lineHeight: 1.4 }}>
                            {subtitleParts.join(" · ")}
                          </div>
                        )}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                          {r.matchedCategories.map((mc) => (
                            <span
                              key={mc.id}
                              data-testid={`chip-recommendation-${idx}-${mc.id}`}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "2px 8px", borderRadius: 999,
                                background: `color-mix(in srgb, ${mc.color} 18%, transparent)`,
                                border: `1px solid color-mix(in srgb, ${mc.color} 40%, transparent)`,
                                color: mc.color,
                                fontSize: 10, fontWeight: 600,
                              }}
                            >
                              <span style={{ width: 6, height: 6, borderRadius: 999, background: mc.color }} />
                              {lang === "de" ? mc.de : mc.en}
                            </span>
                          ))}
                        </div>
                        <div style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => {
                              if (isSaved || isSaving) return;
                              saveRecMutation.mutate(r);
                            }}
                            disabled={isSaved || isSaving}
                            data-testid={`button-save-recommendation-${idx}`}
                            aria-label={isSaved
                              ? t("dnaTryNextSaved", "Saved to wishlist")
                              : t("dnaTryNextSave", "Save to wishlist")}
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "6px 12px", borderRadius: 999,
                              fontSize: 11, fontWeight: 600,
                              cursor: isSaved || isSaving ? "default" : "pointer",
                              background: isSaved
                                ? "color-mix(in srgb, var(--labs-accent) 18%, transparent)"
                                : "color-mix(in srgb, var(--labs-gold) 14%, transparent)",
                              border: isSaved
                                ? "1px solid color-mix(in srgb, var(--labs-accent) 50%, transparent)"
                                : "1px solid color-mix(in srgb, var(--labs-gold) 40%, transparent)",
                              color: isSaved ? "var(--labs-accent)" : "var(--labs-gold)",
                              opacity: isSaving ? 0.7 : 1,
                              transition: "all 180ms ease",
                            }}
                          >
                            {isSaved ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                <span data-testid={`text-save-status-${idx}`}>
                                  {t("dnaTryNextSaved", "Saved to wishlist")}
                                </span>
                              </>
                            ) : (
                              <>
                                <BookmarkPlus className="w-3.5 h-3.5" />
                                <span>
                                  {isSaving
                                    ? t("dnaTryNextSaving", "Saving…")
                                    : t("dnaTryNextSave", "Save to wishlist")}
                                </span>
                              </>
                            )}
                          </button>
                          {isSaved && wishlistId && (
                            <button
                              type="button"
                              onClick={() => {
                                if (isRemoving) return;
                                removeRecMutation.mutate({ id: wishlistId, key: recKey });
                              }}
                              disabled={isRemoving}
                              data-testid={`button-remove-recommendation-${idx}`}
                              aria-label={t("dnaTryNextRemove", "Remove from wishlist")}
                              title={t("dnaTryNextRemove", "Remove from wishlist")}
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                padding: "6px 10px", borderRadius: 999,
                                fontSize: 11, fontWeight: 600,
                                cursor: isRemoving ? "default" : "pointer",
                                background: "transparent",
                                border: "1px solid color-mix(in srgb, var(--labs-text-muted) 35%, transparent)",
                                color: "var(--labs-text-muted)",
                                opacity: isRemoving ? 0.6 : 1,
                                transition: "all 180ms ease",
                              }}
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>
                                {isRemoving
                                  ? t("dnaTryNextRemoving", "Removing…")
                                  : t("dnaTryNextRemove", "Remove")}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Share buttons */}
          <div className="labs-fade-in" style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleSaveImage}
              className="labs-btn-secondary"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 12px" }}
              data-testid="button-save-image"
            >
              <Download className="w-4 h-4" /> {t("dnaShareImage", "Save as image")}
            </button>
            <button
              onClick={handleCopy}
              className="labs-btn-secondary"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 12px" }}
              data-testid="button-copy-summary"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {t("dnaCopy", "Copy summary")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
