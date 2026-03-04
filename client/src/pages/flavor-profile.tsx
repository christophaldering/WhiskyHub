import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Activity, ChevronDown, ChevronUp, Users, Globe, User, BookOpen, Info } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";
import { FlavorWheelContent } from "./flavor-wheel";
import SimpleShell from "@/components/simple/simple-shell";
import { c, cardStyle } from "@/lib/theme";

const COLORS = ["#c8a864", "#a8845c", "#8b6f47", "#d4a853", "#b8934a", "#9e7d3f", "#c4956c", "#d9b87c"];

interface BreakdownEntry { count: number; avgScore: number }
interface RatedWhisky {
  whisky: { id: string; name: string; distillery: string | null; region: string | null; age: string | null; abv: number | null; imageUrl: string | null; caskInfluence: string | null; peatLevel: string | null };
  rating: { overall: number; nose: number; taste: number; finish: number; balance: number; notes: string | null };
}
interface FlavorProfileData {
  avgScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  regionBreakdown: Record<string, BreakdownEntry>;
  caskBreakdown: Record<string, BreakdownEntry>;
  peatBreakdown: Record<string, BreakdownEntry>;
  categoryBreakdown: Record<string, BreakdownEntry>;
  ratedWhiskies: RatedWhisky[];
  allWhiskies: any[];
  sources?: { tastingRatings: number; journalEntries: number };
}

interface WhiskyProfileData {
  ratingStyle: {
    meanScore: number; stdDev: number;
    scaleRange: { min: number; max: number };
    systematicDeviation: {
      avgDelta: number; deltaStdDev: number | null;
      nWhiskiesCompared: number; nPlatformRatings: number;
      nPlatformParticipants: number; platformMedian: number;
    } | null;
    nRatings: number;
  } | null;
  tasteStructure: Record<string, number> | null;
  whiskyComparison: Array<{
    whiskyId: string; whiskyName: string; distillery: string | null; region: string | null;
    userScore: number; platformMedian: number; delta: number;
    iqr: { q1: number; q3: number; iqr: number } | null;
    platformN: number;
  }>;
  confidence: Record<string, { level: string; percent: number; n: number }>;
  comparisonData: {
    mode: string;
    medians: Record<string, number>;
    iqrs?: Record<string, { q1: number; q3: number; iqr: number } | null>;
    nFriends?: number; nParticipants?: number; nRatings: number;
  } | null;
}

const stabilityColors: Record<string, { color: string; bg: string; border: string }> = {
  stable: { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)" },
  tendency: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  preliminary: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" },
};

function StabilityBadge({ level, percent, t }: { level: string; percent: number; t: any }) {
  const colors = stabilityColors[level] || stabilityColors.preliminary;
  const label = level === "stable" ? t("flavorProfile.stable") :
    level === "tendency" ? t("flavorProfile.tendency") : t("flavorProfile.preliminary");
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "4px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
        border: `1px solid ${colors.border}`, background: colors.bg, color: colors.color,
      }}
      data-testid={`badge-stability-${level}`}
    >
      {label} {percent < 100 && <span style={{ opacity: 0.6 }}>{percent}%</span>}
    </span>
  );
}

function DetailsPanel({ children, label, t }: { children: React.ReactNode; label?: string; t: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 14, color: c.accent, display: "flex", alignItems: "center", gap: 6,
          padding: 0, fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-toggle-details"
      >
        {open ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
        {open ? t("flavorProfile.hideDetails") : t("flavorProfile.showDetails")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{
              marginTop: 8, padding: 12, background: `${c.inputBg}`, borderRadius: 8,
              fontSize: 12, color: c.muted, fontFamily: "monospace",
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MethodologySection({ t }: { t: any }) {
  const [open, setOpen] = useState(false);
  const [expertOpen, setExpertOpen] = useState(false);

  return (
    <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, overflow: "hidden" }} data-testid="section-methodology">
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: 20, textAlign: "left", background: "none", border: "none", cursor: "pointer",
          color: c.text, fontFamily: "system-ui, sans-serif", transition: "background 0.15s",
        }}
        data-testid="button-toggle-methodology"
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <BookOpen style={{ width: 20, height: 20, color: c.accent }} />
          <h2 style={{ fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0 }}>
            {t("flavorProfile.methodology.title")}
          </h2>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: c.muted }} /> : <ChevronDown style={{ width: 16, height: 16, color: c.muted }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
              <p style={{ fontSize: 14, color: c.muted, margin: 0 }}>
                {t("flavorProfile.methodology.transparencyIntro")}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 14, color: c.muted }}>
                <p style={{ margin: 0 }}>
                  {t("flavorProfile.methodology.behaviorBased")}
                </p>
                <p style={{ margin: 0, fontWeight: 500, color: c.text }}>
                  {t("flavorProfile.methodology.whatItShows")}
                </p>
                <ul style={{ paddingLeft: 20, margin: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <li>{t("flavorProfile.methodology.bullet1")}</li>
                  <li>{t("flavorProfile.methodology.bullet2")}</li>
                  <li>{t("flavorProfile.methodology.bullet3")}</li>
                  <li>{t("flavorProfile.methodology.bullet4")}</li>
                  <li>{t("flavorProfile.methodology.bullet5")}</li>
                </ul>
                <p style={{ margin: 0 }}>
                  {t("flavorProfile.methodology.evolution")}
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${c.border}20`, paddingTop: 16 }}>
                <button
                  onClick={() => setExpertOpen(!expertOpen)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                    textAlign: "left", background: "none", border: "none", cursor: "pointer",
                    color: c.text, fontFamily: "system-ui, sans-serif", padding: 0,
                  }}
                  data-testid="button-toggle-expert"
                >
                  <h3 style={{ fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0 }}>
                    {t("flavorProfile.methodology.forExperts")}
                  </h3>
                  {expertOpen ? <ChevronUp style={{ width: 16, height: 16, color: c.muted }} /> : <ChevronDown style={{ width: 16, height: 16, color: c.muted }} />}
                </button>
                <AnimatePresence>
                  {expertOpen && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
                      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: c.muted }}>
                        <div>
                          <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, marginBottom: 4 }}>{t("flavorProfile.methodology.dimensionalModel")}</h4>
                          <p style={{ margin: 0 }}>{t("flavorProfile.methodology.dimensionalModelDesc")}</p>
                        </div>
                        <div>
                          <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, marginBottom: 4 }}>{t("flavorProfile.methodology.platformMedianTitle")}</h4>
                          <p style={{ margin: 0 }}>{t("flavorProfile.methodology.platformMedianDesc")}</p>
                        </div>
                        <div>
                          <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, marginBottom: 4 }}>{t("flavorProfile.methodology.systematicDeviationTitle")}</h4>
                          <p style={{ fontFamily: "monospace", fontSize: 12, background: c.inputBg, padding: 8, borderRadius: 4, margin: 0, marginBottom: 8 }}>avg_delta = mean(UserScore_i - PlatformMedian_i)</p>
                          <p style={{ margin: 0 }}>{t("flavorProfile.methodology.systematicDeviationDesc")}</p>
                        </div>
                        <div>
                          <h4 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, marginBottom: 4 }}>{t("flavorProfile.methodology.stabilityLogic")}</h4>
                          <ul style={{ paddingLeft: 20, margin: 0, fontFamily: "monospace", fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                            <li>{t("flavorProfile.methodology.stabilityPreliminary")}: N &lt; 5</li>
                            <li>{t("flavorProfile.methodology.stabilityTendency")}: 5 ≤ N &lt; 15</li>
                            <li>{t("flavorProfile.methodology.stabilityStable")}: N ≥ 15</li>
                          </ul>
                          <p style={{ fontFamily: "monospace", fontSize: 12, background: c.inputBg, padding: 8, borderRadius: 4, margin: 0, marginTop: 8 }}>{t("flavorProfile.methodology.stabilityFormula")} = min(100, N × 6.67)</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhiskyProfileTab({ participantId, t }: { participantId: string; t: any }) {
  const [source, setSource] = useState<"all" | "journal" | "imported" | "all_incl_imported">("all");
  const [compareMode, setCompareMode] = useState<"none" | "friends" | "platform">("none");
  const [showWhiskyComparison, setShowWhiskyComparison] = useState(false);

  const { data: profile, isLoading } = useQuery<WhiskyProfileData>({
    queryKey: ["whisky-profile", participantId, source, compareMode],
    queryFn: () => flavorProfileApi.getWhiskyProfile(participantId, source, compareMode),
    enabled: !!participantId,
  });

  if (isLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ height: 128, background: `${c.card}80`, borderRadius: 12, animation: "pulse 2s infinite" }} />
        <div style={{ height: 192, background: `${c.card}80`, borderRadius: 12, animation: "pulse 2s infinite" }} />
      </div>
    );
  }

  if (!profile?.ratingStyle) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", color: c.muted }}>
        <User style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>{t("flavorProfile.empty")}</p>
      </div>
    );
  }

  const { ratingStyle, tasteStructure, whiskyComparison, confidence, comparisonData } = profile;
  const dims = ["nose", "taste", "finish", "balance", "overall"];
  const dimLabels: Record<string, string> = {
    nose: t("flavorProfile.dimNose"), taste: t("flavorProfile.dimTaste"),
    finish: t("flavorProfile.dimFinish"), balance: t("flavorProfile.dimBalance"), overall: t("flavorProfile.dimOverall"),
  };

  const radarData = tasteStructure ? dims.map(d => ({
    dimension: dimLabels[d],
    value: tasteStructure[d] || 0,
    ...(comparisonData ? { comparison: comparisonData.medians[d] || 0 } : {}),
    fullMark: 100,
  })) : [];

  const dev = ratingStyle.systematicDeviation;
  const deltaDir = dev ? (dev.avgDelta > 1 ? "positive" : dev.avgDelta < -1 ? "negative" : null) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }} data-testid="profile-controls">
        <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${c.border}`, overflow: "hidden", fontSize: 12 }}>
          {(["all", "journal", "imported", "all_incl_imported"] as const).map((key) => (
            <button
              key={key}
              onClick={() => setSource(key)}
              style={{
                padding: "6px 12px",
                background: source === key ? c.accent : c.inputBg,
                color: source === key ? c.bg : c.muted,
                border: "none",
                borderRight: key !== "all_incl_imported" ? `1px solid ${c.border}` : "none",
                cursor: "pointer",
                fontWeight: source === key ? 600 : 400,
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
              data-testid={`button-source-${key.replace(/_/g, "-")}`}
            >
              {t(`flavorProfile.source${key === "all" ? "All" : key === "journal" ? "Journal" : key === "imported" ? "Imported" : "AllInclImported"}`)}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", borderRadius: 8, border: `1px solid ${c.border}`, overflow: "hidden", fontSize: 12, marginLeft: "auto" }}>
          {([
            { key: "none" as const, icon: <User style={{ width: 12, height: 12 }} />, label: t("flavorProfile.compareNone") },
            { key: "friends" as const, icon: <Users style={{ width: 12, height: 12 }} />, label: t("flavorProfile.compareFriends") },
            { key: "platform" as const, icon: <Globe style={{ width: 12, height: 12 }} />, label: t("flavorProfile.comparePlatform") },
          ]).map(({ key, icon, label }, i) => (
            <button
              key={key}
              onClick={() => setCompareMode(key)}
              style={{
                padding: "6px 12px",
                display: "flex",
                alignItems: "center",
                gap: 4,
                background: compareMode === key ? c.accent : c.inputBg,
                color: compareMode === key ? c.bg : c.muted,
                border: "none",
                borderRight: i < 2 ? `1px solid ${c.border}` : "none",
                cursor: "pointer",
                fontWeight: compareMode === key ? 600 : 400,
                fontFamily: "system-ui, sans-serif",
                transition: "all 0.15s",
              }}
              data-testid={`button-compare-${key}`}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {tasteStructure && source !== "journal" && (
        <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }}>
          <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.radarTitle")}</h2>
          <p style={{ fontSize: 14, color: c.muted, margin: 0, marginBottom: 16 }}>{t("flavorProfile.radarSubtitle", { count: ratingStyle.nRatings })}</p>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke={c.border} />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: c.muted, fontSize: 12, fontFamily: "serif" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: c.muted, fontSize: 10 }} />
                {comparisonData && (
                  <Radar name={comparisonData.mode === "friends" ? t("flavorProfile.compareFriends") : t("flavorProfile.comparePlatform")} dataKey="comparison" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeDasharray="4 4" />
                )}
                <Radar name="Profile" dataKey="value" stroke="#c8a864" fill="#c8a864" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {comparisonData && (
            <p style={{ fontSize: 14, color: c.muted, marginTop: 8, textAlign: "center" }} data-testid="text-comparison-basis">
              {comparisonData.mode === "friends"
                ? t("flavorProfile.friendsBasis", { n: comparisonData.nFriends, r: comparisonData.nRatings })
                : t("flavorProfile.platformBasisFull", { n: comparisonData.nParticipants, r: comparisonData.nRatings })}
            </p>
          )}

          {comparisonData && (
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${c.border}20`, display: "flex", flexDirection: "column", gap: 8 }}>
              {dims.map(dim => {
                const userVal = tasteStructure[dim] || 0;
                const compVal = comparisonData.medians[dim] || 0;
                const diff = Math.round((userVal - compVal) * 10) / 10;
                const iqr = comparisonData.iqrs?.[dim];
                return (
                  <div key={dim} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ fontFamily: "'Playfair Display', Georgia, serif", color: c.muted, width: 80 }}>{dimLabels[dim]}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
                      <span style={{ fontFamily: "monospace", color: c.text, fontWeight: 500 }}>{userVal.toFixed(1)}</span>
                      <span style={{ color: `${c.muted}80` }}>vs</span>
                      <span style={{ fontFamily: "monospace", color: c.muted }}>{compVal.toFixed(1)}</span>
                      {iqr && <span style={{ fontSize: 12, color: `${c.muted}99` }}>(IQR {iqr.iqr.toFixed(1)})</span>}
                      <span style={{
                        fontFamily: "monospace", fontSize: 12, width: 56, textAlign: "right",
                        color: diff > 0 ? c.success : diff < 0 ? "#ef4444" : c.muted,
                      }}>
                        {diff > 0 ? `+${diff}` : diff.toString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }} data-testid="section-rating-style">
        <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.ratingStyleTitle")}</h2>
        <p style={{ fontSize: 14, color: c.muted, margin: 0, marginBottom: 16 }}>{t("flavorProfile.ratingStyleSubtitle")}</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }}>
          <div style={{ textAlign: "center", padding: 16, background: c.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent }} data-testid="text-mean-score">{ratingStyle.meanScore}</div>
            <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{t("flavorProfile.meanScore")}</div>
          </div>
          <div style={{ textAlign: "center", padding: 16, background: c.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text }} data-testid="text-std-dev">{ratingStyle.stdDev}</div>
            <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{t("flavorProfile.stdDev")}</div>
          </div>
          <div style={{ textAlign: "center", padding: 16, background: c.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text }} data-testid="text-scale-range">{ratingStyle.scaleRange.min}–{ratingStyle.scaleRange.max}</div>
            <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{t("flavorProfile.scaleRange")}</div>
          </div>
          <div style={{ textAlign: "center", padding: 16, background: c.inputBg, borderRadius: 8 }}>
            <div style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text }} data-testid="text-n-ratings">{ratingStyle.nRatings}</div>
            <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>N</div>
          </div>
        </div>

        {dev && (
          <div style={{ borderTop: `1px solid ${c.border}20`, paddingTop: 16 }}>
            <h3 style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, marginBottom: 8 }}>{t("flavorProfile.systematicDeviation")}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
              <div style={{
                fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700,
                color: dev.avgDelta > 0 ? "#4ade80" : dev.avgDelta < 0 ? "#f87171" : c.muted,
              }} data-testid="text-avg-delta">
                {dev.avgDelta > 0 ? "+" : ""}{dev.avgDelta}
              </div>
              <div style={{ fontSize: 12, color: c.muted }}>
                <StabilityBadge level={confidence.overall?.level || "preliminary"} percent={confidence.overall?.percent || 0} t={t} />
              </div>
            </div>
            <p style={{ fontSize: 14, color: c.muted, margin: 0, marginBottom: 4 }} data-testid="text-deviation-interpretation">
              {deltaDir
                ? t("flavorProfile.deviationDesc", { direction: t(`flavorProfile.deviation${deltaDir === "positive" ? "Positive" : "Negative"}`) })
                : t("flavorProfile.deviationNeutral")}
            </p>
            <p style={{ fontSize: 12, color: `${c.muted}cc`, margin: 0 }}>
              {t("flavorProfile.nWhiskiesCompared", { n: dev.nWhiskiesCompared })} · {t("flavorProfile.platformBasis", { n: dev.nPlatformRatings, p: dev.nPlatformParticipants })}
            </p>
            {dev.deltaStdDev !== null && (
              <p style={{ fontSize: 12, color: `${c.muted}cc`, margin: 0 }}>
                {t("flavorProfile.platformMedian")}: {dev.platformMedian} · {t("flavorProfile.stdDev")}: {dev.deltaStdDev}
              </p>
            )}
            <DetailsPanel t={t}>
              <p>{t("flavorProfile.formulaDeviation")}</p>
              <p>avg_delta = {dev.avgDelta} (N = {dev.nWhiskiesCompared})</p>
              <p>{t("flavorProfile.platformMedian")}: {dev.platformMedian}</p>
              <p>{t("flavorProfile.formulaStability")}</p>
            </DetailsPanel>
          </div>
        )}
      </div>

      <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }} data-testid="section-confidence">
        <h2 style={{ fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 12 }}>{t("flavorProfile.confidenceTitle")}</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
          {dims.map(dim => {
            const conf = confidence[dim];
            if (!conf) return null;
            return (
              <div key={dim} style={{ textAlign: "center", padding: 12, background: c.inputBg, borderRadius: 8 }} data-testid={`confidence-${dim}`}>
                <div style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", color: c.muted, marginBottom: 4 }}>{dimLabels[dim]}</div>
                <StabilityBadge level={conf.level} percent={conf.percent} t={t} />
                <div style={{ fontSize: 12, color: `${c.muted}b3`, marginTop: 4 }}>N = {conf.n}</div>
              </div>
            );
          })}
        </div>
        <DetailsPanel t={t}>
          <p>{t("flavorProfile.formulaStability")}</p>
          <p>{t("flavorProfile.stabilityFormulaText")}</p>
        </DetailsPanel>
      </div>

      {whiskyComparison.length > 0 && (
        <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }} data-testid="section-whisky-comparison">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0 }}>{t("flavorProfile.whiskyComparisonTitle")}</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, cursor: "pointer", color: c.muted }}>
              <input type="checkbox" checked={showWhiskyComparison} onChange={(e) => setShowWhiskyComparison(e.target.checked)} style={{ accentColor: c.accent }} data-testid="checkbox-show-comparison" />
              {t("flavorProfile.showComparison")}
            </label>
          </div>

          {showWhiskyComparison && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${c.border}4d` }}>
                      <th style={{ textAlign: "left", padding: "8px 0", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted }}>Whisky</th>
                      <th style={{ textAlign: "right", padding: "8px 0", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted }}>{t("flavorProfile.userScore")}</th>
                      <th style={{ textAlign: "right", padding: "8px 0", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted }}>{t("flavorProfile.platformMedian")}</th>
                      <th style={{ textAlign: "right", padding: "8px 0", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted }}>{t("flavorProfile.delta")}</th>
                      <th style={{ textAlign: "right", padding: "8px 0", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted }}>{t("flavorProfile.iqrLabel")}</th>
                      <th style={{ textAlign: "right", padding: "8px 0", fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted }}>{t("flavorProfile.platformN")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whiskyComparison.map(w => (
                      <tr key={w.whiskyId} style={{ borderBottom: `1px solid ${c.border}1a` }} data-testid={`row-whisky-${w.whiskyId}`}>
                        <td style={{ padding: "8px 0" }}>
                          <div style={{ fontWeight: 500, color: c.text }}>{w.whiskyName}</div>
                          {(w.distillery || w.region) && (
                            <div style={{ fontSize: 12, color: c.muted }}>{[w.distillery, w.region].filter(Boolean).join(" · ")}</div>
                          )}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 0", fontFamily: "monospace", fontWeight: 500, color: c.text }}>{w.userScore}</td>
                        <td style={{ textAlign: "right", padding: "8px 0", fontFamily: "monospace", color: c.muted }}>{w.platformMedian}</td>
                        <td style={{
                          textAlign: "right", padding: "8px 0", fontFamily: "monospace",
                          color: w.delta > 0 ? c.success : w.delta < 0 ? "#ef4444" : c.muted,
                        }}>
                          {w.delta > 0 ? "+" : ""}{w.delta}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 0", fontFamily: "monospace", color: `${c.muted}b3` }}>
                          {w.iqr ? w.iqr.iqr.toFixed(1) : "–"}
                        </td>
                        <td style={{ textAlign: "right", padding: "8px 0", fontFamily: "monospace", color: `${c.muted}b3` }}>{w.platformN}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DetailsPanel t={t}>
                <p>{t("flavorProfile.comparisonRowDesc")}</p>
                <p>{t("flavorProfile.comparisonIqrDesc")}</p>
                <p>{t("flavorProfile.comparisonNDesc")}</p>
              </DetailsPanel>
            </motion.div>
          )}
        </div>
      )}

      <MethodologySection t={t} />
    </div>
  );
}

export default function FlavorProfile() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();
  const { data: profile, isLoading } = useQuery<FlavorProfileData>({
    queryKey: ["flavor-profile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: globalAvg } = useQuery<{
    nose: number; taste: number; finish: number; balance: number; overall: number;
    totalRatings: number; totalParticipants: number;
  }>({
    queryKey: ["global-averages"],
    queryFn: () => flavorProfileApi.getGlobal(),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <SimpleShell maxWidth={900}>
        <GuestPreview featureTitle={t("flavorProfile.title")} featureDescription={t("guestPreview.flavorProfile")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h1 style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text, margin: 0 }}>{t("flavorProfile.title")}</h1>
            <div style={{ background: c.card, borderRadius: 16, border: `1px solid ${c.border}`, padding: 24, display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, fontSize: 14 }}>
                  {[{label: "Fruity", val: "8.4"}, {label: "Smoky", val: "6.2"}, {label: "Sweet", val: "7.8"}, {label: "Spicy", val: "5.5"}, {label: "Floral", val: "4.1"}, {label: "Maritime", val: "7.0"}].map(f => (
                    <div key={f.label} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent }}>{f.val}</div>
                      <div style={{ color: c.muted, fontSize: 12 }}>{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </GuestPreview>
      </SimpleShell>
    );
  }

  if (isLoading) {
    return (
      <SimpleShell maxWidth={900}>
        <div style={{ padding: "32px 0" }}>
          <div style={{ height: 32, width: 192, background: `${c.card}80`, borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 256, background: `${c.card}80`, borderRadius: 12 }} />
        </div>
      </SimpleShell>
    );
  }

  const radarData = profile?.avgScores ? [
    { dimension: t("flavorProfile.dimNose"), value: profile.avgScores.nose, global: globalAvg?.nose ?? 0, fullMark: 100 },
    { dimension: t("flavorProfile.dimTaste"), value: profile.avgScores.taste, global: globalAvg?.taste ?? 0, fullMark: 100 },
    { dimension: t("flavorProfile.dimFinish"), value: profile.avgScores.finish, global: globalAvg?.finish ?? 0, fullMark: 100 },
    { dimension: t("flavorProfile.dimBalance"), value: profile.avgScores.balance, global: globalAvg?.balance ?? 0, fullMark: 100 },
    { dimension: t("flavorProfile.dimOverall"), value: profile.avgScores.overall, global: globalAvg?.overall ?? 0, fullMark: 100 },
  ] : [];

  const regionData = profile?.regionBreakdown
    ? Object.entries(profile.regionBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    : [];

  const caskData = profile?.caskBreakdown
    ? Object.entries(profile.caskBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    : [];

  const peatData = profile?.peatBreakdown
    ? Object.entries(profile.peatBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([name, data]) => ({ name, count: data.count, avgScore: data.avgScore }))
    : [];

  const totalRatings = profile?.ratedWhiskies?.length || 0;
  const totalJournalScores = profile?.sources?.journalEntries || 0;
  const topWhiskies = profile?.ratedWhiskies
    ? [...profile.ratedWhiskies].sort((a, b) => b.rating.overall - a.rating.overall).slice(0, 5)
    : [];

  const hasData = totalRatings > 0 || totalJournalScores > 0;

  return (
    <SimpleShell maxWidth={900}>
    <div style={{ minWidth: 0, overflowX: "hidden" }} data-testid="flavor-profile-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <Activity style={{ width: 28, height: 28, color: c.accent }} />
          <h1 style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, margin: 0 }} data-testid="text-flavor-title">
            {t("flavorProfile.title")}
          </h1>
        </div>
        <p style={{ fontSize: 14, color: `${c.muted}e6`, margin: 0, marginBottom: 24 }}>{t("flavorProfile.subtitle")}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

        <FlavorWheelContent />

        {profile?.sources && (profile.sources.tastingRatings > 0 || profile.sources.journalEntries > 0) && (
              <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 32 }} data-testid="text-flavor-sources">
                {t("flavorProfile.sourcesBasedOn", {
                  ratings: t("flavorProfile.sourcesRatings", { count: profile.sources.tastingRatings }),
                  entries: t("flavorProfile.sourcesEntries", { count: profile.sources.journalEntries }),
                })}
              </p>
            )}

            {!hasData ? (
              <div style={{ textAlign: "center", padding: "64px 0", color: c.muted }}>
                <Activity style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
                <p style={{ fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>{t("flavorProfile.empty")}</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }}>
                  <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.text, margin: 0, marginBottom: 4 }}>{t("flavorProfile.radarTitle")}</h2>
                  <p style={{ fontSize: 14, color: c.muted, margin: 0, marginBottom: 4 }}>{t("flavorProfile.radarSubtitle", { count: totalRatings })}</p>
                  <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 16 }} data-testid="text-radar-desc">{t("flavorProfile.radarDesc")}</p>
                  <div style={{ height: 320 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke={c.border} />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: c.muted, fontSize: 12, fontFamily: "serif" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: c.muted, fontSize: 10 }} />
                        <Radar name={t("flavorProfile.everyone")} dataKey="global" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeDasharray="4 4" />
                        <Radar name="Profile" dataKey="value" stroke="#c8a864" fill="#c8a864" fillOpacity={0.3} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {profile?.avgScores && globalAvg && globalAvg.totalRatings > 0 && (
                    <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${c.border}20` }}>
                      <h3 style={{ fontSize: 14, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{t("flavorProfile.personalVsGlobal")}</h3>
                      <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 8 }} data-testid="text-personal-vs-global-desc">{t("flavorProfile.personalVsGlobalDesc")}</p>
                      <div style={{ fontSize: 14, color: c.muted, marginBottom: 12 }}>{t("flavorProfile.globalBasedOn", { ratings: globalAvg.totalRatings, participants: globalAvg.totalParticipants })}</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {[
                          { key: "nose", label: t("flavorProfile.dimNose"), personal: profile.avgScores.nose, global: globalAvg.nose },
                          { key: "taste", label: t("flavorProfile.dimTaste"), personal: profile.avgScores.taste, global: globalAvg.taste },
                          { key: "finish", label: t("flavorProfile.dimFinish"), personal: profile.avgScores.finish, global: globalAvg.finish },
                          { key: "balance", label: t("flavorProfile.dimBalance"), personal: profile.avgScores.balance, global: globalAvg.balance },
                          { key: "overall", label: t("flavorProfile.dimOverall"), personal: profile.avgScores.overall, global: globalAvg.overall },
                        ].map(({ key, label, personal, global }) => {
                          const diff = Math.round((personal - global) * 10) / 10;
                          return (
                            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                              <span style={{ fontFamily: "'Playfair Display', Georgia, serif", color: c.muted, width: 80 }}>{label}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 16, flex: 1, justifyContent: "flex-end" }}>
                                <span style={{ fontFamily: "monospace", color: c.text, fontWeight: 500 }}>{personal.toFixed(1)}</span>
                                <span style={{ color: `${c.muted}80` }}>vs</span>
                                <span style={{ fontFamily: "monospace", color: c.muted }}>{global.toFixed(1)}</span>
                                <span style={{
                                  fontFamily: "monospace", fontSize: 12, width: 56, textAlign: "right",
                                  color: diff > 0 ? c.success : diff < 0 ? "#ef4444" : c.muted,
                                }}>
                                  {diff > 0 ? `+${diff}` : diff.toString()}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {regionData.length > 0 && (
                  <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }}>
                    <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.regionTitle")}</h2>
                    <p style={{ fontSize: 14, color: c.muted, margin: 0, marginBottom: 4 }}>{t("flavorProfile.regionSubtitle")}</p>
                    <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 16 }} data-testid="text-region-desc">{t("flavorProfile.regionDesc")}</p>
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={regionData} layout="vertical" margin={{ left: 80 }}>
                          <XAxis type="number" domain={[0, 100]} tick={{ fill: c.muted, fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill: c.muted, fontSize: 12 }} width={75} />
                          <Tooltip
                            contentStyle={{ backgroundColor: c.card, border: `1px solid ${c.border}`, borderRadius: 8 }}
                            labelStyle={{ color: c.text }}
                            formatter={(value: number, name: string) => [value.toFixed(1), name === "avgScore" ? t("flavorProfile.tooltipAvgScore") : t("flavorProfile.tooltipCount")]}
                          />
                          <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                            {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 24 }}>
                  {peatData.length > 0 && (
                    <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }}>
                      <h2 style={{ fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.peatTitle")}</h2>
                      <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 12 }} data-testid="text-peat-desc">{t("flavorProfile.peatDesc")}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {(() => { const maxPeat = Math.max(...peatData.map(d => d.avgScore), 1); return peatData.map((d) => (
                          <div key={d.name}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 14, color: c.text }}>{d.name}</span>
                              <span style={{ fontSize: 12, color: c.muted }}>{d.avgScore} <span style={{ color: `${c.muted}99` }}>({d.count})</span></span>
                            </div>
                            <div style={{ width: "100%", height: 8, background: `${c.border}80`, borderRadius: 9999, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: `${c.accent}99`, borderRadius: 9999, width: `${(d.avgScore / maxPeat) * 100}%` }} />
                            </div>
                          </div>
                        )); })()}
                      </div>
                    </div>
                  )}

                  {caskData.length > 0 && (
                    <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }}>
                      <h2 style={{ fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.caskTitle")}</h2>
                      <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 12 }} data-testid="text-cask-desc">{t("flavorProfile.caskDesc")}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {(() => { const maxCask = Math.max(...caskData.map(d => d.avgScore), 1); return caskData.map((d) => (
                          <div key={d.name}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                              <span style={{ fontSize: 14, color: c.text }}>{d.name}</span>
                              <span style={{ fontSize: 12, color: c.muted }}>{d.avgScore} <span style={{ color: `${c.muted}99` }}>({d.count})</span></span>
                            </div>
                            <div style={{ width: "100%", height: 8, background: `${c.border}80`, borderRadius: 9999, overflow: "hidden" }}>
                              <div style={{ height: "100%", background: `${c.accent}99`, borderRadius: 9999, width: `${(d.avgScore / maxCask) * 100}%` }} />
                            </div>
                          </div>
                        )); })()}
                      </div>
                    </div>
                  )}
                </div>

                {topWhiskies.length > 0 && (
                  <div style={{ background: c.card, borderRadius: 12, border: `1px solid ${c.border}40`, padding: 24 }}>
                    <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.topTitle")}</h2>
                    <p style={{ fontSize: 14, color: `${c.muted}cc`, margin: 0, marginBottom: 16 }} data-testid="text-top-desc">{t("flavorProfile.topDesc")}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {topWhiskies.map((item, i) => (
                        <div key={item.whisky.id} style={{
                          display: "flex", alignItems: "center", gap: 16, padding: "8px 0",
                          borderBottom: i < topWhiskies.length - 1 ? `1px solid ${c.border}20` : "none",
                        }}>
                          <span style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: `${c.accent}99`, width: 32 }}>{i + 1}</span>
                          {item.whisky.imageUrl && (
                            <img src={item.whisky.imageUrl} alt={item.whisky.name} style={{ width: 40, height: 40, borderRadius: 4, objectFit: "cover" }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: c.text }}>{item.whisky.name}</p>
                            <p style={{ fontSize: 12, color: c.muted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {[item.whisky.distillery, item.whisky.region, item.whisky.age ? `${item.whisky.age}y` : null].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent }}>{item.rating.overall.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

        {currentParticipant && (
          <WhiskyProfileTab participantId={currentParticipant.id} t={t} />
        )}

        </div>
      </motion.div>
    </div>
    </SimpleShell>
  );
}
