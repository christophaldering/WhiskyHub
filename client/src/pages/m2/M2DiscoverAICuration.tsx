import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { pairingsApi, tastingApi } from "@/lib/api";
import M2BackButton from "@/components/m2/M2BackButton";
import { Wine, Sparkles, MapPin, Flame, Package, ChevronDown } from "lucide-react";

interface Suggestion { name: string; distillery: string; region: string; caskInfluence: string; peatLevel: string; score: number; reason: string; }
interface PairingData { lineup: { regions: string[]; caskTypes: string[]; peatLevels: string[] }; suggestions: Suggestion[]; }

function ScoreRing({ score }: { score: number }) {
  const r = 18, c = 2 * Math.PI * r, o = c - (score / 100) * c;
  const color = score >= 80 ? v.success : score >= 60 ? v.accent : v.error;
  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      <svg width={44} height={44} style={{ transform: "rotate(-90deg)" }} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke={v.border} strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" stroke={color} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
      </svg>
      <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: v.text }}>{score}</span>
    </div>
  );
}

function Tag({ icon: Icon, label, variant }: { icon: React.ElementType; label: string; variant: "accent" | "gold" | "red" }) {
  const bg = { accent: alpha(v.accent, "28"), gold: "rgba(212,162,86,0.12)", red: "rgba(196,68,68,0.12)" };
  const fg = { accent: v.accent, gold: "rgba(212,162,86,0.8)", red: "rgba(196,68,68,0.8)" };
  return <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: bg[variant], color: fg[variant], fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}><Icon style={{ width: 10, height: 10 }} />{label}</span>;
}

const card: React.CSSProperties = { background: v.card, borderRadius: 14, border: `1px solid ${v.border}`, padding: 18 };

export default function M2DiscoverAICuration() {
  const { t, i18n } = useTranslation();
  const session = getSession();
  const pid = session.participantId;
  const [selectedId, setSelectedId] = useState("");

  const { data: tastings, isLoading: tL } = useQuery({ queryKey: ["tastings", pid], queryFn: () => tastingApi.getAll(pid!), enabled: !!pid });
  const { data: pData, isLoading: pL } = useQuery<PairingData>({ queryKey: ["pairings", selectedId], queryFn: () => pairingsApi.get(selectedId), enabled: !!selectedId });

  const lineup = pData?.lineup;
  const suggestions = pData?.suggestions || [];

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }} data-testid="m2-discover-ai-curation-page">
      <M2BackButton />
      <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "12px 0 4px" }}>
        <Sparkles style={{ width: 22, height: 22, color: v.accent }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }} data-testid="text-m2-ai-curation-title">
          {t("m2.discover.aiCuration", "AI Curation")}
        </h1>
      </div>
      <p style={{ fontSize: 13, color: v.muted, margin: "0 0 20px" }}>{t("aiCuration.description", "AI-powered whisky lineup recommendations based on your tastings")}</p>

      {!pid ? (
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <Wine style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, color: v.muted }} data-testid="m2-ai-curation-login">{t("aiCuration.loginRequired", "Sign in to use AI Curation")}</p>
        </div>
      ) : (
        <>
          <div style={{ ...card, marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: v.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{t("aiCuration.selectTasting", "Select Tasting")}</label>
            <div style={{ position: "relative" }}>
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} style={{ width: "100%", background: v.inputBg, border: `1px solid ${v.inputBorder}`, borderRadius: 10, color: v.text, padding: "12px 36px 12px 14px", fontSize: 14, outline: "none", boxSizing: "border-box" as const, appearance: "none" as const, WebkitAppearance: "none" as const, cursor: "pointer" }} data-testid="m2-select-ai-tasting">
                <option value="" disabled>{t("aiCuration.selectPlaceholder", "Choose a tasting…")}</option>
                {tL && <option value="" disabled>Loading…</option>}
                {!tL && tastings?.map((t: any) => <option key={t.id} value={t.id}>{t.title || t.name || t.id}</option>)}
              </select>
              <ChevronDown style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted, pointerEvents: "none" }} />
            </div>
          </div>

          {selectedId && pL && <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{Array.from({ length: 3 }).map((_, i) => <div key={i} style={{ height: 70, background: v.elevated, borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />)}</div>}

          {selectedId && !pL && lineup && (
            <div style={{ ...card, marginBottom: 16 }} data-testid="m2-lineup-summary">
              <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.muted, margin: "0 0 12px" }}>Lineup</h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {lineup.regions.length > 0 && <div>{lineup.regions.map((r) => <Tag key={r} icon={MapPin} label={r} variant="accent" />)}</div>}
                {lineup.caskTypes.length > 0 && <div>{lineup.caskTypes.map((c) => <Tag key={c} icon={Package} label={c} variant="gold" />)}</div>}
                {lineup.peatLevels.length > 0 && <div>{lineup.peatLevels.map((p) => <Tag key={p} icon={Flame} label={p} variant="red" />)}</div>}
              </div>
            </div>
          )}

          {suggestions.length > 0 && (
            <div>
              <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, color: v.accent, margin: "0 0 10px" }} data-testid="m2-suggestions-heading">{t("aiCuration.suggestedWhiskies", "Suggestions")}</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {suggestions.map((s, i) => (
                  <div key={`${s.name}-${i}`} style={{ ...card, padding: "14px 16px" }} data-testid={`m2-suggestion-${i}`}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <ScoreRing score={s.score} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: v.text }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }}>{s.distillery}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                          {s.region && <Tag icon={MapPin} label={s.region} variant="accent" />}
                          {s.caskInfluence && <Tag icon={Package} label={s.caskInfluence} variant="gold" />}
                          {s.peatLevel && <Tag icon={Flame} label={s.peatLevel} variant="red" />}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: v.muted, borderLeft: `2px solid ${alpha(v.accent, "40")}`, paddingLeft: 8, lineHeight: 1.5 }}>
                          <span style={{ fontWeight: 600, color: v.mutedLight }}>Why: </span>{s.reason}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!selectedId && pid && !tL && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Sparkles style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.25 }} />
              <p style={{ fontSize: 14, color: v.muted, fontFamily: "'Playfair Display', serif" }}>{t("aiCuration.getStartedPrompt", "Select a tasting to get AI suggestions")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
