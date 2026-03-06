import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { v, alpha } from "@/lib/themeVars";
import { getSession } from "@/lib/session";
import { pairingsApi, tastingApi } from "@/lib/api";
import M2BackButton from "@/components/m2/M2BackButton";
import { Wine, MapPin, Flame, Package, Utensils, ChevronDown } from "lucide-react";

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
  const color = score >= 80 ? v.success : score >= 60 ? v.accent : v.error;

  return (
    <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
      <svg width={48} height={48} style={{ transform: "rotate(-90deg)" }} viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={radius} fill="none" stroke={v.border} strokeWidth="3" />
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
        fontSize: 12, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text,
      }}>{score}</span>
    </div>
  );
}

function TagChip({ icon: Icon, label, variant }: { icon: React.ElementType; label: string; variant: "accent" | "gold" | "red" }) {
  const bgMap = { accent: alpha(v.accent, "28"), gold: "rgba(212,162,86,0.12)", red: "rgba(196,68,68,0.12)" };
  const fgMap = { accent: v.accent, gold: "rgba(212,162,86,0.8)", red: "rgba(196,68,68,0.8)" };
  return (
    <span style={{
      fontSize: 10, padding: "2px 8px", borderRadius: 20, background: bgMap[variant], color: fgMap[variant],
      fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4,
    }}>
      <Icon style={{ width: 10, height: 10 }} />{label}
    </span>
  );
}

const card: React.CSSProperties = {
  background: v.card,
  borderRadius: 14,
  border: `1px solid ${v.border}`,
  padding: 20,
};

export default function M2TastePairings() {
  const { t } = useTranslation();
  const session = getSession();
  const pid = session.participantId;
  const [selectedTastingId, setSelectedTastingId] = useState<string>("");

  const { data: tastings, isLoading: tastingsLoading } = useQuery({
    queryKey: ["tastings", pid],
    queryFn: () => tastingApi.getAll(pid!),
    enabled: !!pid,
  });

  const { data: pairingData, isLoading: pairingsLoading } = useQuery<PairingData>({
    queryKey: ["pairings", selectedTastingId],
    queryFn: () => pairingsApi.get(selectedTastingId),
    enabled: !!selectedTastingId,
  });

  const lineup = pairingData?.lineup;
  const suggestions = pairingData?.suggestions || [];

  return (
    <div style={{ padding: "16px 16px 32px", maxWidth: 600, margin: "0 auto" }}>
      <M2BackButton />

      <div style={{ textAlign: "center", margin: "16px 0 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 6 }}>
          <Utensils style={{ width: 22, height: 22, color: v.accent }} strokeWidth={1.8} />
          <h1
            style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: v.text, margin: 0 }}
            data-testid="text-pairings-title"
          >
            {t("m2.pairings.title", "Food Pairings")}
          </h1>
        </div>
        <p style={{ fontSize: 13, color: v.muted, margin: 0 }}>
          {t("m2.pairings.subtitle", "AI-driven food pairing suggestions for your tastings")}
        </p>
      </div>

      {!pid && (
        <div style={{ ...card, textAlign: "center", padding: 40 }}>
          <Wine style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.4 }} />
          <p style={{ fontSize: 14, color: v.muted, margin: 0 }} data-testid="text-pairings-signin">
            {t("m2.pairings.signIn", "Sign in to see your food pairing suggestions.")}
          </p>
        </div>
      )}

      {pid && (
        <div style={{ ...card, marginBottom: 16 }} data-testid="select-tasting">
          <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: v.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.2 }}>
            {t("m2.pairings.selectTasting", "Select Tasting")}
          </label>
          <div style={{ position: "relative" }}>
            <select
              value={selectedTastingId}
              onChange={(e) => setSelectedTastingId(e.target.value)}
              style={{
                width: "100%",
                background: v.inputBg,
                border: `1px solid ${v.inputBorder}`,
                borderRadius: 10,
                color: v.text,
                padding: "12px 36px 12px 14px",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box" as const,
                fontFamily: "system-ui, sans-serif",
                appearance: "none" as const,
                WebkitAppearance: "none" as const,
                cursor: "pointer",
              }}
              data-testid="select-tasting-trigger"
            >
              <option value="" disabled>{t("m2.pairings.chooseTasting", "Choose a tasting…")}</option>
              {tastingsLoading && <option value="" disabled>{t("common.loading", "Loading…")}</option>}
              {!tastingsLoading && tastings && tastings.map((tasting: any) => (
                <option key={tasting.id} value={tasting.id} data-testid={`select-tasting-${tasting.id}`}>
                  {tasting.title || tasting.name || tasting.id}
                </option>
              ))}
            </select>
            <ChevronDown style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: v.muted, pointerEvents: "none" }} />
          </div>
        </div>
      )}

      {selectedTastingId && pairingsLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 80, background: v.elevated, borderRadius: 14, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      )}

      {selectedTastingId && !pairingsLoading && lineup && (
        <div style={{ ...card, marginBottom: 16 }} data-testid="lineup-summary">
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.muted, margin: "0 0 14px" }}>
            {t("m2.pairings.lineupSummary", "Lineup Summary")}
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
            {lineup.regions.length > 0 && (
              <div data-testid="lineup-regions">
                <div style={{ fontSize: 11, color: v.mutedLight, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <MapPin style={{ width: 12, height: 12 }} /> {t("m2.pairings.regions", "Regions")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {lineup.regions.map((r) => (
                    <TagChip key={r} icon={MapPin} label={r} variant="accent" />
                  ))}
                </div>
              </div>
            )}
            {lineup.caskTypes.length > 0 && (
              <div data-testid="lineup-casks">
                <div style={{ fontSize: 11, color: v.mutedLight, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Package style={{ width: 12, height: 12 }} /> {t("m2.pairings.caskTypes", "Cask Types")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {lineup.caskTypes.map((ct) => (
                    <TagChip key={ct} icon={Package} label={ct} variant="gold" />
                  ))}
                </div>
              </div>
            )}
            {lineup.peatLevels.length > 0 && (
              <div data-testid="lineup-peat">
                <div style={{ fontSize: 11, color: v.mutedLight, marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                  <Flame style={{ width: 12, height: 12 }} /> {t("m2.pairings.peatLevels", "Peat Levels")}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {lineup.peatLevels.map((p) => (
                    <TagChip key={p} icon={Flame} label={p} variant="red" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedTastingId && !pairingsLoading && suggestions.length === 0 && (
        <div style={{ textAlign: "center", padding: "48px 0" }} data-testid="pairings-empty">
          <Utensils style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, color: v.muted, fontFamily: "'Playfair Display', serif" }}>
            {t("m2.pairings.empty", "No pairing suggestions available for this tasting.")}
          </p>
        </div>
      )}

      {!selectedTastingId && pid && !tastingsLoading && (!tastings || tastings.length === 0) && (
        <div style={{ textAlign: "center", padding: "48px 0" }} data-testid="pairings-no-tastings">
          <Wine style={{ width: 40, height: 40, color: v.mutedLight, margin: "0 auto 12px", opacity: 0.3 }} />
          <p style={{ fontSize: 14, color: v.muted, fontFamily: "'Playfair Display', serif" }}>
            {t("m2.pairings.noTastings", "No tastings found. Join or host a tasting first.")}
          </p>
        </div>
      )}

      {suggestions.length > 0 && (
        <div>
          <h2 style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.2, color: v.accent, margin: "0 0 12px" }} data-testid="text-suggestions-heading">
            {t("m2.pairings.suggestions", "Suggestions")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {suggestions.map((suggestion, index) => (
              <div
                key={`${suggestion.name}-${index}`}
                style={{ ...card, padding: "16px 20px" }}
                data-testid={`card-suggestion-${index}`}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <ScoreRing score={suggestion.score} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'Playfair Display', serif", color: v.text }} data-testid={`text-suggestion-name-${index}`}>
                      {suggestion.name}
                    </div>
                    <div style={{ fontSize: 12, color: v.muted, marginTop: 2 }} data-testid={`text-suggestion-distillery-${index}`}>
                      {suggestion.distillery}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      {suggestion.region && <TagChip icon={MapPin} label={suggestion.region} variant="accent" />}
                      {suggestion.caskInfluence && <TagChip icon={Package} label={suggestion.caskInfluence} variant="gold" />}
                      {suggestion.peatLevel && <TagChip icon={Flame} label={suggestion.peatLevel} variant="red" />}
                    </div>
                    <div style={{ marginTop: 10, fontSize: 12, color: v.muted, borderLeft: `2px solid ${alpha(v.accent, "48")}`, paddingLeft: 10 }} data-testid={`text-suggestion-reason-${index}`}>
                      <span style={{ fontWeight: 600, color: v.mutedLight }}>{t("m2.pairings.why", "Why")}: </span>{suggestion.reason}
                    </div>
                    <div style={{ marginTop: 8, width: "100%", height: 4, background: v.border, borderRadius: 2, overflow: "hidden" }} data-testid={`bar-suggestion-score-${index}`}>
                      <div style={{
                        height: "100%", borderRadius: 2, width: `${suggestion.score}%`,
                        background: suggestion.score >= 80 ? v.success : suggestion.score >= 60 ? v.accent : v.error,
                        transition: "width 0.6s ease",
                      }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 11, color: v.mutedLight, textAlign: "center", marginTop: 20, fontStyle: "italic" }}>
            {t("m2.pairings.disclaimer", "AI-generated suggestions — results may vary.")}
          </p>
        </div>
      )}
    </div>
  );
}
