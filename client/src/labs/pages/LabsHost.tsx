import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus, X, Trash2, Copy, Check, EyeOff, Eye, Play, Square,
  Users, Calendar, MapPin, ArrowLeft, Loader2,
  Wine, BarChart3, CheckCircle2, Clock, CircleDashed,
  ChevronDown, ChevronUp, Compass, SkipForward, StopCircle, AlertTriangle,
  QrCode, Mail, Send, Star, Monitor,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { useIsMobile } from "@/hooks/use-mobile";
import { tastingApi, whiskyApi, blindModeApi, ratingApi, guidedApi, inviteApi } from "@/lib/api";
import QRCode from "qrcode";

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

type DimKey = "nose" | "taste" | "finish" | "balance";

const FLAVOR_CHIPS: Record<DimKey, string[]> = {
  nose: ["Fruity", "Floral", "Spicy", "Smoky", "Woody", "Sweet", "Malty", "Sherry", "Citrus", "Peaty"],
  taste: ["Sweet", "Dry", "Oily", "Spicy", "Fruity", "Nutty", "Chocolate", "Vanilla", "Salty", "Peaty"],
  finish: ["Short", "Medium", "Long", "Warm", "Dry", "Spicy", "Smoky", "Sweet", "Bitter"],
  balance: ["Harmonious", "Complex", "Rough", "Elegant", "Powerful", "Thin"],
};

const DIM_LABELS: Record<DimKey, string> = { nose: "Nose", taste: "Taste", finish: "Finish", balance: "Balance" };
const DIM_COLORS: Record<DimKey, string> = { nose: "#D9A15B", taste: "#C97845", finish: "#9C6A5E", balance: "#7F8C5A" };
const DIM_KEYS: DimKey[] = ["nose", "taste", "finish", "balance"];

interface HostRatingState {
  nose: number;
  taste: number;
  finish: number;
  balance: number;
  overall: number;
  notes: string;
}

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
  const [activeIdx, setActiveIdx] = useState(0);
  const [ratings, setRatings] = useState<Record<string, HostRatingState>>({});
  const [chips, setChips] = useState<Record<string, Record<DimKey, string[]>>>({});
  const [texts, setTexts] = useState<Record<string, Record<DimKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scaleMax = ratingScale || 100;
  const scaleDefault = Math.round(scaleMax / 2);
  const emptyChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
  const emptyTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };

  const ratingUpsertMut = useMutation({
    mutationFn: (data: Record<string, unknown>) => ratingApi.upsert(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasting-ratings", tastingId] }),
  });

  const buildScoresBlock = useCallback((wId: string) => {
    const ch = chips[wId] || emptyChips;
    const tx = texts[wId] || emptyTexts;
    const hasDimData = DIM_KEYS.some((d) => ch[d].length > 0 || tx[d].trim());
    if (!hasDimData) return "";
    const parts: string[] = [];
    for (const d of DIM_KEYS) {
      const chipStr = ch[d].length > 0 ? ch[d].join(", ") : "";
      const textStr = tx[d].trim();
      if (chipStr || textStr) {
        parts.push(`[${d.toUpperCase()}] ${[chipStr, textStr].filter(Boolean).join(" — ")} [/${d.toUpperCase()}]`);
      }
    }
    return parts.length > 0 ? "\n" + parts.join("\n") : "";
  }, [chips, texts]);

  const parseSavedNotes = useCallback((rawNotes: string) => {
    const parsedChips: Record<DimKey, string[]> = { nose: [], taste: [], finish: [], balance: [] };
    const parsedTexts: Record<DimKey, string> = { nose: "", taste: "", finish: "", balance: "" };
    let cleanNotes = rawNotes;
    for (const d of DIM_KEYS) {
      const re = new RegExp(`\\[${d.toUpperCase()}\\]\\s*(.*?)\\s*\\[\\/${d.toUpperCase()}\\]`, "s");
      const m = rawNotes.match(re);
      if (m) {
        cleanNotes = cleanNotes.replace(m[0], "");
        const content = m[1].trim();
        const dimParts = content.split(" — ");
        if (dimParts.length >= 2) {
          parsedChips[d] = dimParts[0].split(",").map(s => s.trim()).filter(Boolean);
          parsedTexts[d] = dimParts.slice(1).join(" — ");
        } else if (dimParts.length === 1) {
          const maybeChips = dimParts[0].split(",").map(s => s.trim()).filter(Boolean);
          if (maybeChips.every(c => c.length < 20)) parsedChips[d] = maybeChips;
          else parsedTexts[d] = dimParts[0];
        }
      }
    }
    cleanNotes = cleanNotes.replace(/\[SCORES\].*?\[\/SCORES\]/s, "");
    return { chips: parsedChips, texts: parsedTexts, cleanNotes: cleanNotes.trim() };
  }, []);

  useEffect(() => {
    if (whiskies.length === 0) return;
    const loadExisting = async () => {
      for (const w of whiskies) {
        if (ratings[w.id]) continue;
        try {
          const existing = await ratingApi.getMyRating(participantId, w.id);
          if (existing) {
            const parsed = parseSavedNotes(existing.notes || "");
            setRatings(prev => ({
              ...prev,
              [w.id]: {
                nose: existing.nose ?? scaleDefault,
                taste: existing.taste ?? scaleDefault,
                finish: existing.finish ?? scaleDefault,
                balance: existing.balance ?? scaleDefault,
                overall: existing.overall ?? scaleDefault,
                notes: parsed.cleanNotes,
              },
            }));
            setChips(prev => ({ ...prev, [w.id]: parsed.chips }));
            setTexts(prev => ({ ...prev, [w.id]: parsed.texts }));
          }
        } catch {
          // Rating doesn't exist yet
        }
      }
    };
    loadExisting();
  }, [whiskies.length, participantId]);

  const debouncedSave = useCallback((whiskyId: string, vals: HostRatingState) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const scoresBlock = buildScoresBlock(whiskyId);
      const combinedNotes = ((vals.notes || "") + scoresBlock).trim();
      setSaving(true);
      ratingUpsertMut.mutate({
        participantId,
        whiskyId,
        tastingId,
        nose: vals.nose,
        taste: vals.taste,
        finish: vals.finish,
        balance: vals.balance,
        overall: vals.overall,
        notes: combinedNotes,
      }, {
        onSettled: () => setSaving(false),
      });
    }, 800);
  }, [participantId, tastingId, buildScoresBlock]);

  const chipSaveRef = useRef(0);
  useEffect(() => {
    if (!whiskies.length) return;
    const wId = whiskies[activeIdx]?.id;
    if (!wId) return;
    const currentRating = getRating(wId);
    if (!ratings[wId]) {
      setRatings(prev => ({ ...prev, [wId]: currentRating }));
    }
    chipSaveRef.current++;
    const gen = chipSaveRef.current;
    const timer = setTimeout(() => {
      if (gen !== chipSaveRef.current) return;
      debouncedSave(wId, currentRating);
    }, 100);
    return () => clearTimeout(timer);
  }, [chips, texts]);

  const getRating = (whiskyId: string): HostRatingState => {
    return ratings[whiskyId] || {
      nose: scaleDefault, taste: scaleDefault, finish: scaleDefault,
      balance: scaleDefault, overall: scaleDefault, notes: "",
    };
  };

  const updateRating = (whiskyId: string, field: string, value: number | string) => {
    const current = getRating(whiskyId);
    const updated = { ...current, [field]: value };
    if (field !== "overall" && field !== "notes") {
      updated.overall = Math.round(((updated.nose + updated.taste + updated.finish + updated.balance) / 4) * 10) / 10;
    }
    setRatings(prev => ({ ...prev, [whiskyId]: updated }));
    debouncedSave(whiskyId, updated);
  };

  const toggleChip = (whiskyId: string, dim: DimKey, chip: string) => {
    setChips(prev => {
      const current = prev[whiskyId] || emptyChips;
      const dimChips = current[dim];
      const next = dimChips.includes(chip) ? dimChips.filter(c => c !== chip) : [...dimChips, chip];
      return { ...prev, [whiskyId]: { ...current, [dim]: next } };
    });
  };

  const updateText = (whiskyId: string, dim: DimKey, text: string) => {
    setTexts(prev => {
      const current = prev[whiskyId] || emptyTexts;
      return { ...prev, [whiskyId]: { ...current, [dim]: text } };
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

  const rating = getRating(currentWhisky.id);
  const currentChips = chips[currentWhisky.id] || emptyChips;
  const currentTexts = texts[currentWhisky.id] || emptyTexts;

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
        {saving && (
          <span style={{ fontSize: 10, color: "var(--labs-accent)", display: "flex", alignItems: "center", gap: 4 }}>
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </span>
        )}
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
        <div style={{ marginBottom: 16 }}>
          <p className="text-sm font-semibold" style={{ color: "var(--labs-text)" }}>
            {currentWhisky.name || `Whisky ${activeIdx + 1}`}
          </p>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)", marginTop: 2 }}>
            {[currentWhisky.distillery, currentWhisky.age ? `${currentWhisky.age}y` : null, currentWhisky.abv ? `${currentWhisky.abv}%` : null].filter(Boolean).join(" · ") || "—"}
          </p>
        </div>

        {DIM_KEYS.map(dim => {
          const dimColor = DIM_COLORS[dim];
          const value = rating[dim];
          return (
            <div key={dim} style={{ marginBottom: 16 }} data-testid={`host-rating-dim-${dim}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: dimColor }}>{DIM_LABELS[dim]}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: dimColor, fontVariantNumeric: "tabular-nums" }}>
                  {value}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={scaleMax}
                step={1}
                value={value}
                onChange={e => updateRating(currentWhisky.id, dim, Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: dimColor,
                  height: 4,
                }}
                data-testid={`host-rating-slider-${dim}`}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                {FLAVOR_CHIPS[dim].map(chip => {
                  const selected = currentChips[dim].includes(chip);
                  return (
                    <button
                      key={chip}
                      onClick={() => toggleChip(currentWhisky.id, dim, chip)}
                      style={{
                        padding: "4px 10px",
                        fontSize: 11,
                        fontWeight: 500,
                        borderRadius: 16,
                        border: `1px solid ${selected ? dimColor : "var(--labs-border)"}`,
                        background: selected ? `${dimColor}20` : "transparent",
                        color: selected ? dimColor : "var(--labs-text-muted)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                      }}
                      data-testid={`chip-${dim}-${chip.toLowerCase()}`}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder={`${DIM_LABELS[dim]} notes...`}
                value={currentTexts[dim]}
                onChange={e => updateText(currentWhisky.id, dim, e.target.value)}
                style={{
                  width: "100%",
                  marginTop: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid var(--labs-border)",
                  background: "var(--labs-surface)",
                  color: "var(--labs-text)",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                data-testid={`host-text-${dim}`}
              />
            </div>
          );
        })}

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-accent)" }}>Overall</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>
              {rating.overall}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={scaleMax}
            step={1}
            value={rating.overall}
            onChange={e => updateRating(currentWhisky.id, "overall", Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--labs-accent)", height: 4 }}
            data-testid="host-rating-slider-overall"
          />
        </div>

        <textarea
          value={rating.notes}
          onChange={e => updateRating(currentWhisky.id, "notes", e.target.value)}
          placeholder="Your tasting notes..."
          rows={3}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid var(--labs-border)",
            background: "var(--labs-surface)",
            color: "var(--labs-text)",
            fontSize: 13,
            fontFamily: "inherit",
            resize: "vertical",
            outline: "none",
          }}
          data-testid="host-rating-notes"
        />
      </div>
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
  const statusCfg = STATUS_CONFIG[(tasting.status as string)] || STATUS_CONFIG.draft;
  const whiskyCount = whiskies.length;
  const participantCount = participants.length;
  const ratingCount = ratings.length;
  const isLive = tasting.status === "open";
  const isDraft = tasting.status === "draft";
  const isEnded = tasting.status === "closed" || tasting.status === "archived" || tasting.status === "reveal";
  const pid = currentParticipant?.id as string;

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

  return (
    <div className="px-4 py-5 labs-fade-in" style={{ paddingBottom: 120 }} data-testid="labs-mobile-companion">
      <button
        onClick={() => navigate("/labs/tastings")}
        className="flex items-center gap-1.5 mb-4 text-sm labs-btn-ghost px-0"
        data-testid="labs-mobile-back"
      >
        <ArrowLeft className="w-4 h-4" />
        Tastings
      </button>

      <div className="labs-card p-4 mb-4" style={{
        borderBottom: "1px solid var(--labs-border-subtle)",
        background: `color-mix(in srgb, var(--labs-accent) 5%, var(--labs-surface))`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Monitor className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
          <span className="text-xs" style={{ color: "var(--labs-text-secondary)" }}>
            Full dashboard optimized for desktop
          </span>
        </div>
      </div>

      <div className="labs-card p-4 mb-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h1 className="labs-serif text-lg font-semibold" style={{ color: "var(--labs-text)", margin: 0 }}>
            {(tasting.title as string) || "Untitled Tasting"}
          </h1>
          <span className="labs-badge" style={{ background: statusCfg.bg, color: statusCfg.color }}>
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
              <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

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

        {isLive && tasting.blindMode && (
          <button
            className="labs-btn-secondary flex items-center justify-center gap-2 w-full"
            onClick={() => revealMutation.mutate()}
            disabled={revealMutation.isPending}
            data-testid="mobile-reveal"
          >
            <Eye className="w-4 h-4" />
            Reveal Next
          </button>
        )}

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
            className="labs-btn-secondary flex items-center justify-center gap-2 w-full"
            onClick={() => navigate(`/labs/live/${tastingId}`)}
            style={{ background: `color-mix(in srgb, var(--labs-accent) 15%, transparent)`, color: "var(--labs-accent)" }}
            data-testid="mobile-rate-btn"
          >
            <Star className="w-4 h-4" />
            Rate Whiskies
          </button>
        )}
      </div>

      {pid && whiskies.length > 0 && (
        <div style={{ marginTop: 16 }}>
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

function CreateTastingForm() {
  const [, navigate] = useLocation();
  const { currentParticipant } = useAppStore();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [location, setLocation] = useState("");
  const [blindMode, setBlindMode] = useState(false);
  const [guidedMode, setGuidedMode] = useState(false);
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
        guidedMode,
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

        <div
          className="labs-card p-4 flex items-center justify-between cursor-pointer"
          onClick={() => setGuidedMode(!guidedMode)}
          data-testid="labs-host-toggle-guided"
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: guidedMode ? "var(--labs-accent-muted)" : "var(--labs-surface)" }}
            >
              <Compass className="w-5 h-5" style={{ color: guidedMode ? "var(--labs-accent)" : "var(--labs-text-muted)" }} />
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: "var(--labs-text)" }}>Guided Tasting</p>
              <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
                Host controls the pace — participants rate one dram at a time
              </p>
            </div>
          </div>
          <div
            className="w-12 h-7 rounded-full transition-all flex items-center px-0.5"
            style={{
              background: guidedMode ? "var(--labs-accent)" : "var(--labs-border)",
              justifyContent: guidedMode ? "flex-end" : "flex-start",
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
                        {(p.name || "?").charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-medium truncate flex-1 min-w-0">{p.name || "Anonymous"}</p>
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
                              {p.name || "Anonymous"}
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
              <span key={label} className="text-[10px]" style={{ color: idx <= revealStep ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
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
                    {hasRated ? <Check className="w-3.5 h-3.5" /> : (p.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--labs-text)" }}>
                      {p.name || "Anonymous"}
                    </p>
                    <p className="text-[10px]" style={{ color: hasRated ? "var(--labs-success)" : "var(--labs-text-muted)" }}>
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

function ManageTasting({ tastingId }: { tastingId: string }) {
  const { currentParticipant } = useAppStore();
  const [, navigate] = useLocation();
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
      setTimeout(() => setInviteSent(false), 3000);
    } catch (err) {
      console.error("Failed to send invites:", err);
    } finally {
      setSendingInvites(false);
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

  return (
    <div className="px-5 py-6 max-w-5xl mx-auto labs-fade-in">
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

        {tasting.blindMode && (tasting.status === "open" || tasting.status === "closed" || tasting.status === "reveal") && (
          <div>
            <h2 className="labs-section-label">Reveal Controls</h2>
            <div className="labs-card p-4">
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
                {tasting.status === "reveal" && (
                  <button
                    className="labs-btn-primary flex items-center gap-2"
                    onClick={() => revealMutation.mutate()}
                    disabled={revealMutation.isPending}
                    data-testid="labs-host-reveal-next"
                  >
                    <Eye className="w-4 h-4" />
                    Reveal Next
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      )}

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

      {participantCount > 0 && !tasting.guidedMode && (
        <ParticipantStatusSection
          participants={participants}
          ratings={ratings}
          whiskies={whiskies}
          whiskyCount={whiskyCount}
        />
      )}

      {currentParticipant && whiskyCount > 0 && (
        <div className="mb-6">
          <h2 className="labs-section-label">Host Rating</h2>
          <HostRatingPanel
            whiskies={whiskies}
            tastingId={tastingId}
            participantId={currentParticipant.id}
            ratingScale={tasting.ratingScale || 100}
          />
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
