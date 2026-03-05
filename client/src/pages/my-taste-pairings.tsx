import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { pairingsApi, tastingApi } from "@/lib/api";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import { c, cardStyle, pageTitleStyle, pageSubtitleStyle } from "@/lib/theme";
import { Wine, MapPin, Flame, Package } from "lucide-react";

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
  lineup: {
    regions: string[];
    caskTypes: string[];
    peatLevels: string[];
  };
  suggestions: Suggestion[];
}

function ScoreRing({ score }: { score: number }) {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? c.success : score >= 60 ? c.accent : c.error;

  return (
    <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
      <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke={c.border} strokeWidth="3" />
        <circle
          cx="22" cy="22" r={radius} fill="none" strokeWidth="3"
          stroke={color}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span style={{
        position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 12, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: c.text,
      }}>{score}</span>
    </div>
  );
}

function TagChip({ icon: Icon, label, bg, fg }: { icon: React.ElementType; label: string; bg: string; fg: string }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 20, background: bg, color: fg,
      fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <Icon style={{ width: 10, height: 10 }} />{label}
    </span>
  );
}

export default function MyTastePairings() {
  const { currentParticipant } = useAppStore();
  const pid = currentParticipant?.id;
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");

  const { data: tastings, isLoading: tastingsLoading } = useQuery({
    queryKey: ["tastings", pid],
    queryFn: () => tastingApi.getAll(pid),
    enabled: !!pid,
  });

  const { data: pairingData, isLoading: pairingsLoading } = useQuery<PairingData>({
    queryKey: ["pairings", selectedTastingId],
    queryFn: () => pairingsApi.get(selectedTastingId),
    enabled: !!selectedTastingId,
  });

  const lineup = pairingData?.lineup;
  const suggestions = pairingData?.suggestions || [];

  const selectStyle: React.CSSProperties = {
    width: "100%",
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: 10,
    color: c.text,
    padding: "12px 14px",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "system-ui, sans-serif",
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
  };

  return (
    <SimpleShell>
      <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 16 }}>
        <BackButton />
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 4 }}>
            <Wine style={{ width: 22, height: 22, color: c.accent }} strokeWidth={1.8} />
            <h1 style={pageTitleStyle} data-testid="text-pairings-title">
              Food Pairings
            </h1>
          </div>
          <p style={{ ...pageSubtitleStyle, textAlign: "center" }}>
            AI-driven food pairing suggestions for your tastings
          </p>
        </div>

        {!pid && (
          <div style={{ ...cardStyle, textAlign: "center", padding: 32 }}>
            <Wine style={{ width: 40, height: 40, color: c.mutedLight, margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: 14, color: c.muted, margin: 0 }} data-testid="text-pairings-signin">
              Sign in to see your food pairing suggestions.
            </p>
          </div>
        )}

        {pid && (
          <div style={cardStyle} data-testid="select-tasting">
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: c.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>
              Select Tasting
            </label>
            <div style={{ position: "relative" }}>
              <select
                value={selectedTastingId}
                onChange={(e) => setSelectedTastingId(e.target.value)}
                style={selectStyle}
                data-testid="select-tasting-trigger"
              >
                <option value="" disabled>Choose a tasting…</option>
                {tastingsLoading && <option value="" disabled>Loading…</option>}
                {!tastingsLoading && tastings && tastings.map((tasting: any) => (
                  <option key={tasting.id} value={tasting.id} data-testid={`select-tasting-${tasting.id}`}>
                    {tasting.title || tasting.name || tasting.id}
                  </option>
                ))}
              </select>
              <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: c.muted, fontSize: 12 }}>▾</div>
            </div>
          </div>
        )}

        {selectedTastingId && pairingsLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ height: 80, background: `${c.card}80`, borderRadius: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
            ))}
          </div>
        )}

        {selectedTastingId && !pairingsLoading && lineup && (
          <div style={cardStyle} data-testid="lineup-summary">
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.muted, margin: "0 0 12px" }}>
              Lineup Summary
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {lineup.regions.length > 0 && (
                <div data-testid="lineup-regions">
                  <div style={{ fontSize: 11, color: c.mutedLight, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <MapPin style={{ width: 12, height: 12 }} /> Regions
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {lineup.regions.map((r) => (
                      <span key={r} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: `${c.accent}18`, color: `${c.accent}cc`, fontWeight: 500 }}>{r}</span>
                    ))}
                  </div>
                </div>
              )}
              {lineup.caskTypes.length > 0 && (
                <div data-testid="lineup-casks">
                  <div style={{ fontSize: 11, color: c.mutedLight, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <Package style={{ width: 12, height: 12 }} /> Cask Types
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {lineup.caskTypes.map((ct) => (
                      <span key={ct} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(212,162,86,0.12)", color: "rgba(212,162,86,0.8)", fontWeight: 500 }}>{ct}</span>
                    ))}
                  </div>
                </div>
              )}
              {lineup.peatLevels.length > 0 && (
                <div data-testid="lineup-peat">
                  <div style={{ fontSize: 11, color: c.mutedLight, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <Flame style={{ width: 12, height: 12 }} /> Peat Levels
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {lineup.peatLevels.map((p) => (
                      <span key={p} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(196,68,68,0.12)", color: "rgba(196,68,68,0.8)", fontWeight: 500 }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {selectedTastingId && !pairingsLoading && suggestions.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0" }} data-testid="pairings-empty">
            <Wine style={{ width: 40, height: 40, color: c.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, color: c.muted, fontFamily: "'Playfair Display', serif" }}>No pairing suggestions available for this tasting.</p>
          </div>
        )}

        {!selectedTastingId && pid && !tastingsLoading && (!tastings || tastings.length === 0) && (
          <div style={{ textAlign: "center", padding: "48px 0" }} data-testid="pairings-no-tastings">
            <Wine style={{ width: 40, height: 40, color: c.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
            <p style={{ fontSize: 14, color: c.muted, fontFamily: "'Playfair Display', serif" }}>No tastings found. Join or host a tasting first.</p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div>
            <h2 style={{ fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: c.accent, margin: "0 0 12px" }} data-testid="text-suggestions-heading">
              Suggestions
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.name}-${index}`}
                  style={{ ...cardStyle, padding: "16px 20px" }}
                  data-testid={`card-suggestion-${index}`}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    <ScoreRing score={suggestion.score} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: c.text }} data-testid={`text-suggestion-name-${index}`}>
                        {suggestion.name}
                      </div>
                      <div style={{ fontSize: 12, color: c.muted, marginTop: 2 }} data-testid={`text-suggestion-distillery-${index}`}>
                        {suggestion.distillery}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                        {suggestion.region && <TagChip icon={MapPin} label={suggestion.region} bg={`${c.accent}18`} fg={`${c.accent}cc`} />}
                        {suggestion.caskInfluence && <TagChip icon={Package} label={suggestion.caskInfluence} bg="rgba(212,162,86,0.12)" fg="rgba(212,162,86,0.8)" />}
                        {suggestion.peatLevel && <TagChip icon={Flame} label={suggestion.peatLevel} bg="rgba(196,68,68,0.12)" fg="rgba(196,68,68,0.8)" />}
                      </div>
                      <div style={{ marginTop: 10, fontSize: 12, color: c.muted, borderLeft: `2px solid ${c.accent}30`, paddingLeft: 10 }} data-testid={`text-suggestion-reason-${index}`}>
                        <span style={{ fontWeight: 600, color: c.mutedLight }}>Why: </span>{suggestion.reason}
                      </div>
                      <div style={{ marginTop: 8, width: "100%", height: 4, background: c.border, borderRadius: 2, overflow: "hidden" }} data-testid={`bar-suggestion-score-${index}`}>
                        <div style={{
                          height: "100%", borderRadius: 2, width: `${suggestion.score}%`,
                          background: suggestion.score >= 80 ? c.success : suggestion.score >= 60 ? c.accent : c.error,
                          transition: "width 0.6s ease",
                        }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: c.mutedLight, textAlign: "center", marginTop: 20, fontStyle: "italic" }}>
              AI-generated suggestions — results may vary.
            </p>
          </div>
        )}
      </div>
    </SimpleShell>
  );
}
