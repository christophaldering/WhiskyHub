import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSession } from "@/lib/session";
import { pairingsApi, tastingApi } from "@/lib/api";
import {
  ChevronLeft, Wine, Sparkles, MapPin, Flame, Package,
  ChevronDown, Utensils,
} from "lucide-react";

interface Suggestion {
  name: string;
  distillery: string;
  region: string;
  caskInfluence: string;
  peatLevel: string;
  score: number;
  reason: string;
}

interface PairingData {
  lineup: { regions: string[]; caskTypes: string[]; peatLevels: string[] };
  suggestions: Suggestion[];
}

function ScoreRing({ score }: { score: number }) {
  const r = 18, c = 2 * Math.PI * r, o = c - (score / 100) * c;
  const color = score >= 80 ? "var(--labs-success)" : score >= 60 ? "var(--labs-accent)" : "var(--labs-text-muted)";
  return (
    <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
      <svg width={44} height={44} style={{ transform: "rotate(-90deg)" }} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--labs-border)" strokeWidth="3" />
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="3" stroke={color} strokeDasharray={c} strokeDashoffset={o} strokeLinecap="round" />
      </svg>
      <span className="labs-serif" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "var(--labs-text)" }}>
        {score}
      </span>
    </div>
  );
}

function Tag({ icon: Icon, label, variant }: { icon: React.ElementType; label: string; variant: "accent" | "gold" | "red" }) {
  const bgMap = { accent: "color-mix(in srgb, var(--labs-accent) 12%, transparent)", gold: "color-mix(in srgb, var(--labs-accent) 10%, transparent)", red: "color-mix(in srgb, var(--labs-danger) 10%, transparent)" };
  const fgMap = { accent: "var(--labs-accent)", gold: "var(--labs-text-secondary)", red: "var(--labs-danger)" };
  return (
    <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: bgMap[variant], color: fgMap[variant], fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 3 }}>
      <Icon style={{ width: 10, height: 10 }} />{label}
    </span>
  );
}

interface TastingItem {
  id: string;
  title?: string;
  name?: string;
}

export default function LabsPairings() {
  const session = useSession();
  const pid = session.pid;
  const [selectedId, setSelectedId] = useState("");

  const { data: tastings, isLoading: tL } = useQuery<TastingItem[]>({
    queryKey: ["tastings", pid],
    queryFn: () => tastingApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: pData, isLoading: pL } = useQuery<PairingData>({
    queryKey: ["pairings", selectedId],
    queryFn: () => pairingsApi.get(selectedId),
    enabled: !!selectedId,
  });

  const lineup = pData?.lineup;
  const suggestions = pData?.suggestions || [];

  if (!session.signedIn || !pid) {
    return (
      <div className="labs-empty" style={{ minHeight: "60vh" }}>
        <Utensils className="w-12 h-12 mb-4" style={{ color: "var(--labs-accent)" }} />
        <p style={{ color: "var(--labs-text)", fontSize: 16, fontWeight: 600 }}>Pairings</p>
        <p style={{ color: "var(--labs-text-muted)", fontSize: 13 }}>Sign in to get AI pairing suggestions</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-pairings">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-pairings">
          <ChevronLeft className="w-4 h-4" /> Taste
        </button>
      </Link>

      <div className="flex items-center gap-3 mb-1 labs-fade-in">
        <Utensils className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-pairings-title">
          Pairings
        </h1>
      </div>
      <p className="text-sm mb-5 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        AI-powered whisky lineup recommendations based on your tastings
      </p>

      <div className="labs-card p-4 mb-4 labs-fade-in">
        <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--labs-text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>
          Select Tasting
        </label>
        <div style={{ position: "relative" }}>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            data-testid="select-pairing-tasting"
            style={{
              width: "100%", background: "var(--labs-bg)", border: "1px solid var(--labs-border)",
              borderRadius: 8, color: "var(--labs-text)", padding: "10px 36px 10px 14px", fontSize: 13,
              outline: "none", appearance: "none", WebkitAppearance: "none", cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <option value="" disabled>Choose a tasting...</option>
            {tL && <option value="" disabled>Loading...</option>}
            {!tL && tastings?.map(t => <option key={t.id} value={t.id}>{t.title || t.name || t.id}</option>)}
          </select>
          <ChevronDown style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "var(--labs-text-muted)", pointerEvents: "none" }} />
        </div>
      </div>

      {selectedId && pL && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} style={{ height: 70, background: "var(--labs-surface)", borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {selectedId && !pL && lineup && (
        <div className="labs-card p-4 mb-4 labs-fade-in" data-testid="card-lineup-summary">
          <p className="labs-section-label mb-3">Lineup</p>
          <div className="flex flex-wrap gap-2">
            {lineup.regions.map(r => <Tag key={r} icon={MapPin} label={r} variant="accent" />)}
            {lineup.caskTypes.map(c => <Tag key={c} icon={Package} label={c} variant="gold" />)}
            {lineup.peatLevels.map(p => <Tag key={p} icon={Flame} label={p} variant="red" />)}
          </div>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="labs-fade-in">
          <p className="labs-section-label mb-2">Suggestions</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {suggestions.map((s, i) => (
              <div key={`${s.name}-${i}`} className="labs-card" style={{ padding: "14px 16px" }} data-testid={`card-suggestion-${i}`}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <ScoreRing score={s.score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="labs-serif" style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 2 }}>{s.distillery}</div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.region && <Tag icon={MapPin} label={s.region} variant="accent" />}
                      {s.caskInfluence && <Tag icon={Package} label={s.caskInfluence} variant="gold" />}
                      {s.peatLevel && <Tag icon={Flame} label={s.peatLevel} variant="red" />}
                    </div>
                    {s.reason && (
                      <div style={{ marginTop: 6, fontSize: 11, color: "var(--labs-text-muted)", borderLeft: "2px solid color-mix(in srgb, var(--labs-accent) 40%, transparent)", paddingLeft: 8, lineHeight: 1.5 }}>
                        <span style={{ fontWeight: 600, color: "var(--labs-text-secondary)" }}>Why: </span>{s.reason}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!selectedId && pid && !tL && (
        <div className="labs-empty labs-fade-in" style={{ paddingTop: 40 }}>
          <Sparkles className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)", opacity: 0.4 }} />
          <p className="labs-serif" style={{ color: "var(--labs-text-muted)", fontSize: 14 }}>Select a tasting to get AI suggestions</p>
        </div>
      )}
    </div>
  );
}
