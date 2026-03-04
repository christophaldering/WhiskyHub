import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/lib/store";
import { pairingsApi, tastingApi } from "@/lib/api";
import { c, cardStyle } from "@/lib/theme";
import SimpleShell from "@/components/simple/simple-shell";
import { Wine, Sparkles, MapPin, Flame, Package, ChevronDown } from "lucide-react";

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
  const color = score >= 80 ? c.success : score >= 60 ? c.accent : "#c44";

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
        fontSize: 13, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: c.text,
      }}>{score}</span>
    </div>
  );
}

function TagPill({ icon: Icon, label, bg, fg }: { icon: React.ElementType; label: string; bg: string; fg: string }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, padding: "2px 10px",
      borderRadius: 20, background: bg, color: fg, fontWeight: 500,
    }}>
      <Icon style={{ width: 12, height: 12 }} />{label}
    </span>
  );
}

export default function AICurationDark() {
  const { i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");
  const [timeFilter, setTimeFilter] = useState<string>("all");

  const { data: tastings, isLoading: tastingsLoading } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const filteredTastings = useMemo(() => {
    if (!tastings) return [];
    if (timeFilter === "all") return tastings;
    const now = Date.now();
    const cutoffs: Record<string, number> = {
      "30": 30 * 86400000,
      "90": 90 * 86400000,
      "365": 365 * 86400000,
    };
    const ms = cutoffs[timeFilter];
    if (!ms) return tastings;
    return tastings.filter((t: any) => {
      const d = t.date ? new Date(t.date).getTime() : 0;
      return d >= now - ms;
    });
  }, [tastings, timeFilter]);

  const { data: pairingData, isLoading: pairingsLoading } = useQuery<PairingData>({
    queryKey: ["pairings", selectedTastingId],
    queryFn: () => pairingsApi.get(selectedTastingId),
    enabled: !!selectedTastingId,
  });

  const lineup = pairingData?.lineup;
  const suggestions = pairingData?.suggestions || [];

  const selectStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 400,
    background: c.inputBg,
    border: `1px solid ${c.inputBorder}`,
    borderRadius: 10,
    color: c.text,
    padding: "12px 14px",
    fontSize: 15,
    outline: "none",
    appearance: "none",
    WebkitAppearance: "none",
    cursor: "pointer",
    fontFamily: "system-ui, sans-serif",
  };

  return (
    <SimpleShell maxWidth={700}>
      <div data-testid="ai-curation-page">
        <div style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: c.bg,
          paddingTop: 4,
          paddingBottom: 16,
          marginLeft: -20,
          marginRight: -20,
          paddingLeft: 20,
          paddingRight: 20,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <Sparkles style={{ width: 28, height: 28, color: c.accent }} />
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, color: c.accent, margin: 0 }}
              data-testid="text-ai-curation-title">
              {isDE ? "KI-Kuratierung" : "AI Curation"}
            </h1>
          </div>
          <p style={{ fontSize: 13, color: c.muted, margin: 0, lineHeight: 1.5 }}>
            {isDE
              ? "Dieses Tool analysiert dein Tasting-Lineup und schlägt ergänzende Whiskys vor, die Lücken füllen oder neue Dimensionen hinzufügen."
              : "This tool analyzes your tasting lineup and suggests complementary whiskies that fill gaps or add new dimensions."}
          </p>
        </div>

        {!currentParticipant ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: c.muted }} data-testid="ai-curation-login-required">
            <Wine style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
            <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 16 }}>
              {isDE ? "Bitte anmelden, um KI-Vorschläge zu erhalten" : "Please sign in to get AI suggestions"}
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 32 }} data-testid="select-tasting">
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, marginBottom: 8, color: c.text }}>
                {isDE ? "Tasting auswählen" : "Select Tasting"}
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                {([
                  { value: "30", labelEn: "Last 30 days", labelDe: "Letzte 30 Tage" },
                  { value: "90", labelEn: "Last 3 months", labelDe: "Letzte 3 Monate" },
                  { value: "365", labelEn: "This year", labelDe: "Dieses Jahr" },
                  { value: "all", labelEn: "All", labelDe: "Alle" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTimeFilter(opt.value); setSelectedTastingId(""); }}
                    style={{
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 500,
                      borderRadius: 8,
                      border: `1px solid ${timeFilter === opt.value ? c.accent : c.border}`,
                      background: timeFilter === opt.value ? `${c.accent}20` : "transparent",
                      color: timeFilter === opt.value ? c.accent : c.muted,
                      cursor: "pointer",
                    }}
                    data-testid={`time-filter-${opt.value}`}
                  >
                    {isDE ? opt.labelDe : opt.labelEn}
                  </button>
                ))}
              </div>
              <div style={{ position: "relative", maxWidth: 400 }}>
                <select
                  value={selectedTastingId}
                  onChange={(e) => setSelectedTastingId(e.target.value)}
                  style={selectStyle}
                  data-testid="select-tasting-trigger"
                >
                  <option value="" disabled>{isDE ? "Wähle ein Tasting..." : "Choose a tasting session..."}</option>
                  {tastingsLoading ? (
                    <option value="" disabled>{isDE ? "Laden..." : "Loading..."}</option>
                  ) : filteredTastings.length === 0 ? (
                    <option value="" disabled>{isDE ? "Keine Tastings in diesem Zeitraum" : "No tastings in this period"}</option>
                  ) : (
                    filteredTastings.map((tasting: any) => {
                      const dateStr = tasting.date
                        ? new Date(tasting.date).toLocaleDateString(isDE ? "de-DE" : "en-US", { year: "numeric", month: "short", day: "numeric" })
                        : "";
                      const title = tasting.title || tasting.name || tasting.id;
                      return (
                        <option key={tasting.id} value={tasting.id} data-testid={`select-tasting-${tasting.id}`}>
                          {dateStr ? `${title} — ${dateStr}` : title}
                        </option>
                      );
                    })
                  )}
                </select>
                <ChevronDown style={{
                  position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                  width: 16, height: 16, color: c.muted, pointerEvents: "none",
                }} />
              </div>
            </div>

            {selectedTastingId && pairingsLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} style={{ height: 80, background: `${c.card}80`, borderRadius: 10, animation: "pulse 1.5s ease-in-out infinite" }} />
                ))}
              </div>
            )}

            {selectedTastingId && !pairingsLoading && lineup && (
              <div style={{ ...cardStyle, marginBottom: 24 }} data-testid="lineup-summary">
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: c.accent, marginBottom: 14 }}>
                  {isDE ? "Aktuelles Lineup" : "Current Lineup"}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
                  {lineup.regions.length > 0 && (
                    <div data-testid="lineup-regions">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.muted, marginBottom: 6 }}>
                        <MapPin style={{ width: 14, height: 14 }} />
                        <span>{isDE ? "Regionen" : "Regions"}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {lineup.regions.map((r) => (
                          <TagPill key={r} icon={MapPin} label={r} bg={`${c.accent}18`} fg={`${c.accent}cc`} />
                        ))}
                      </div>
                    </div>
                  )}
                  {lineup.caskTypes.length > 0 && (
                    <div data-testid="lineup-casks">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.muted, marginBottom: 6 }}>
                        <Package style={{ width: 14, height: 14 }} />
                        <span>{isDE ? "Fasstypen" : "Cask Types"}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {lineup.caskTypes.map((ct) => (
                          <TagPill key={ct} icon={Package} label={ct} bg="rgba(217, 160, 60, 0.12)" fg="rgba(217, 160, 60, 0.8)" />
                        ))}
                      </div>
                    </div>
                  )}
                  {lineup.peatLevels.length > 0 && (
                    <div data-testid="lineup-peat">
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: c.muted, marginBottom: 6 }}>
                        <Flame style={{ width: 14, height: 14 }} />
                        <span>{isDE ? "Torfstufen" : "Peat Levels"}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {lineup.peatLevels.map((p) => (
                          <TagPill key={p} icon={Flame} label={p} bg="rgba(234, 120, 40, 0.12)" fg="rgba(234, 120, 40, 0.8)" />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedTastingId && !pairingsLoading && suggestions.length === 0 && lineup && (
              <div style={{ textAlign: "center", padding: "48px 0", color: c.muted }} data-testid="pairings-empty">
                <Wine style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
                <p style={{ fontFamily: "'Playfair Display', serif" }}>
                  {isDE
                    ? "Dein Lineup ist bereits ausgewogen, oder es wurden keine passenden Whiskys gefunden."
                    : "Your lineup is already well-balanced, or no matching whiskies were found."}
                </p>
              </div>
            )}

            {!selectedTastingId && !tastingsLoading && currentParticipant && (
              <div style={{ textAlign: "center", padding: "48px 0", color: c.muted }} data-testid="ai-curation-prompt">
                <Sparkles style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.25 }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontSize: 15, marginBottom: 8 }}>
                  {isDE ? "Wähle ein Tasting aus, um loszulegen" : "Select a tasting to get started"}
                </p>
                <p style={{ fontSize: 12, color: c.mutedLight, maxWidth: 340, margin: "0 auto", lineHeight: 1.5 }}>
                  {isDE
                    ? "Die KI analysiert dein Lineup und schlägt Whiskys vor, die dein Tasting ergänzen."
                    : "The AI will analyze your lineup and suggest whiskies that complement your tasting."}
                </p>
              </div>
            )}

            {suggestions.length > 0 && (
              <div>
                <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: c.accent, marginBottom: 16 }}
                  data-testid="text-suggestions-heading">
                  {isDE ? "Vorgeschlagene Whiskys" : "Suggested Whiskies"}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={`${suggestion.name}-${index}`}
                      style={{
                        ...cardStyle,
                        transition: "border-color 0.2s",
                      }}
                      data-testid={`card-suggestion-${index}`}
                    >
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                        <ScoreRing score={suggestion.score} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 600, color: c.text, margin: 0 }}
                            data-testid={`text-suggestion-name-${index}`}>
                            {suggestion.name}
                          </h3>
                          <p style={{ fontSize: 12, color: c.muted, margin: "2px 0 0" }}
                            data-testid={`text-suggestion-distillery-${index}`}>
                            {suggestion.distillery}
                          </p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            {suggestion.region && (
                              <TagPill icon={MapPin} label={suggestion.region} bg={`${c.accent}18`} fg={`${c.accent}cc`} />
                            )}
                            {suggestion.caskInfluence && (
                              <TagPill icon={Package} label={suggestion.caskInfluence} bg="rgba(217, 160, 60, 0.12)" fg="rgba(217, 160, 60, 0.8)" />
                            )}
                            {suggestion.peatLevel && (
                              <TagPill icon={Flame} label={suggestion.peatLevel} bg="rgba(234, 120, 40, 0.12)" fg="rgba(234, 120, 40, 0.8)" />
                            )}
                          </div>
                          <div style={{
                            marginTop: 10, fontSize: 12, color: c.muted, borderLeft: `2px solid ${c.accent}30`,
                            paddingLeft: 12, lineHeight: 1.5,
                          }} data-testid={`text-suggestion-reason-${index}`}>
                            <span style={{ fontWeight: 500, color: `${c.text}b0` }}>{isDE ? "Warum" : "Why"}:</span> {suggestion.reason}
                          </div>
                          <div style={{
                            marginTop: 8, width: "100%", background: `${c.border}40`, borderRadius: 4, height: 5,
                          }} data-testid={`bar-suggestion-score-${index}`}>
                            <div style={{
                              height: 5, borderRadius: 4, width: `${suggestion.score}%`,
                              background: suggestion.score >= 80 ? c.success : suggestion.score >= 60 ? c.accent : "#c44",
                              transition: "width 0.6s ease",
                            }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 11, color: c.muted, textAlign: "center", marginTop: 20, fontStyle: "italic" }}>
                  {isDE
                    ? "Vorschläge basieren auf der Vielfalt deines aktuellen Lineups."
                    : "Suggestions are based on the diversity of your current lineup."}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </SimpleShell>
  );
}
