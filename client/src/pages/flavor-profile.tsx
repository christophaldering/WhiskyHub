import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import { Activity, ChevronDown, ChevronUp, Users, Globe, User, BookOpen, Info, Wine, GlassWater, Download, Flame, MapPin, Cog, BarChart3, Trophy, Target, ArrowUpDown } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";
import SimpleShell from "@/components/simple/simple-shell";
import BackButton from "@/components/back-button";
import { Link } from "wouter";
import { c, cardStyle } from "@/lib/theme";

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

type SourceMode = "all" | "journal" | "all_incl_imported";
type CompareMode = "none" | "friends" | "platform";

const sCard: React.CSSProperties = {
  background: c.card,
  borderRadius: 12,
  border: `1px solid ${c.border}40`,
  padding: 20,
};

const sLabel: React.CSSProperties = {
  fontSize: 11,
  color: `${c.muted}cc`,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  fontWeight: 600,
  margin: 0,
};

const sValue: React.CSSProperties = {
  fontSize: 18,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700,
  color: c.text,
  margin: 0,
  marginTop: 4,
};

const stabilityColors: Record<string, { color: string; bg: string; border: string }> = {
  stable: { color: "#4ade80", bg: "rgba(74,222,128,0.1)", border: "rgba(74,222,128,0.3)" },
  tendency: { color: "#fbbf24", bg: "rgba(251,191,36,0.1)", border: "rgba(251,191,36,0.3)" },
  preliminary: { color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" },
};

function StabilityBadge({ level, t }: { level: string; t: any }) {
  const colors = stabilityColors[level] || stabilityColors.preliminary;
  const label = level === "stable" ? t("caskProfile.stabilityHigh") :
    level === "tendency" ? t("caskProfile.stabilityMedium") : t("caskProfile.stabilityLow");
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "3px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
        border: `1px solid ${colors.border}`, background: colors.bg, color: colors.color,
      }}
      data-testid={`badge-stability-${level}`}
    >
      {label}
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={() => setShow(!show)}
        style={{
          background: "none", border: "none", cursor: "pointer", padding: 0,
          color: `${c.muted}99`, display: "inline-flex", alignItems: "center",
        }}
        data-testid="button-info-tooltip"
      >
        <Info style={{ width: 14, height: 14 }} />
      </button>
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            style={{
              position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
              background: c.inputBg, border: `1px solid ${c.border}`, borderRadius: 8,
              padding: "8px 12px", fontSize: 12, color: c.muted, whiteSpace: "nowrap",
              zIndex: 10, marginBottom: 4, maxWidth: 260, lineHeight: 1.4,
            }}
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

function SegmentedControl({ options, value, onChange }: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{
      display: "inline-flex", borderRadius: 10, border: `1px solid ${c.border}`,
      overflow: "hidden", fontSize: 13,
    }}>
      {options.map((opt, i) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            padding: "7px 14px",
            background: value === opt.key ? c.accent : c.inputBg,
            color: value === opt.key ? c.bg : c.muted,
            border: "none",
            borderRight: i < options.length - 1 ? `1px solid ${c.border}` : "none",
            cursor: "pointer",
            fontWeight: value === opt.key ? 600 : 400,
            fontFamily: "system-ui, sans-serif",
            transition: "all 0.15s",
            whiteSpace: "nowrap",
          }}
          data-testid={`button-segment-${opt.key}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Accordion({ title, icon: Icon, children, testId }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...sCard, padding: 0 }} data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", textAlign: "left", background: "none", border: "none", cursor: "pointer",
          color: c.text, fontFamily: "system-ui, sans-serif",
        }}
        data-testid={`button-toggle-${testId}`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 18, height: 18, color: c.accent }} />
          <span style={{ fontSize: 15, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600 }}>
            {title}
          </span>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: c.muted }} /> : <ChevronDown style={{ width: 16, height: 16, color: c.muted }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 20px 20px", fontSize: 14, color: c.muted, lineHeight: 1.6 }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function deriveStyle(regionBreakdown: Record<string, BreakdownEntry>, peatBreakdown: Record<string, BreakdownEntry>): string | null {
  const topRegion = Object.entries(regionBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  const topPeat = Object.entries(peatBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  if (!topRegion && !topPeat) return null;
  const parts: string[] = [];
  if (topPeat && topPeat[0].toLowerCase().includes("peat")) parts.push(topPeat[0]);
  if (topRegion) parts.push(topRegion[0]);
  return parts.length > 0 ? parts.join(" & ") : null;
}

function deriveSweetSpot(regionBreakdown: Record<string, BreakdownEntry>, caskBreakdown: Record<string, BreakdownEntry>): string | null {
  const topRegion = Object.entries(regionBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  const topCask = Object.entries(caskBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  if (!topRegion && !topCask) return null;
  const parts: string[] = [];
  if (topRegion) parts.push(topRegion[0]);
  if (topCask) parts.push(topCask[0]);
  return parts.join(" · ");
}

function getStabilityInfo(nRatings: number) {
  if (nRatings >= 15) return { level: "stable" as const, key: "dataQualityStable" };
  if (nRatings >= 5) return { level: "tendency" as const, key: "dataQualityTendency" };
  return { level: "preliminary" as const, key: "dataQualityPreliminary" };
}

export default function FlavorProfile() {
  const { t } = useTranslation();
  const { currentParticipant } = useAppStore();

  const [source, setSource] = useState<SourceMode>("all");
  const [compareMode, setCompareMode] = useState<CompareMode>("none");

  const sourceApiMap: Record<SourceMode, string> = {
    all: "all",
    journal: "journal",
    all_incl_imported: "all_incl_imported",
  };

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

  const { data: whiskyProfile } = useQuery<WhiskyProfileData>({
    queryKey: ["whisky-profile", currentParticipant?.id, sourceApiMap[source], compareMode],
    queryFn: () => flavorProfileApi.getWhiskyProfile(currentParticipant!.id, sourceApiMap[source], compareMode),
    enabled: !!currentParticipant,
  });

  if (!currentParticipant) {
    return (
      <SimpleShell maxWidth={1100}>
        <GuestPreview featureTitle={t("flavorProfile.title")} featureDescription={t("guestPreview.flavorProfile")}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <h1 style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text, margin: 0 }}>{t("flavorProfile.title")}</h1>
            <div style={{ ...sCard, display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, fontSize: 14 }}>
                  {[{label: t("flavorProfile.previewFruity"), val: "8.4"}, {label: t("flavorProfile.previewSmoky"), val: "6.2"}, {label: t("flavorProfile.previewSweet"), val: "7.8"}, {label: t("flavorProfile.previewSpicy"), val: "5.5"}, {label: t("flavorProfile.previewFloral"), val: "4.1"}, {label: t("flavorProfile.previewMaritime"), val: "7.0"}].map(f => (
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
      <SimpleShell maxWidth={1100}>
        <div style={{ padding: "32px 0" }}>
          <div style={{ height: 32, width: 192, background: `${c.card}80`, borderRadius: 8, marginBottom: 16 }} />
          <div style={{ height: 256, background: `${c.card}80`, borderRadius: 12 }} />
        </div>
      </SimpleShell>
    );
  }

  const totalRatings = profile?.ratedWhiskies?.length || 0;
  const hasData = totalRatings > 0 || (profile?.sources?.journalEntries || 0) > 0;
  const stabilityInfo = getStabilityInfo(whiskyProfile?.ratingStyle?.nRatings || totalRatings);
  const styleLabel = profile ? deriveStyle(profile.regionBreakdown, profile.peatBreakdown) : null;
  const sweetSpotLabel = profile ? deriveSweetSpot(profile.regionBreakdown, profile.caskBreakdown) : null;

  const dims = ["nose", "taste", "finish", "balance", "overall"];
  const dimLabels: Record<string, string> = {
    nose: t("flavorProfile.dimNose"), taste: t("flavorProfile.dimTaste"),
    finish: t("flavorProfile.dimFinish"), balance: t("flavorProfile.dimBalance"), overall: t("flavorProfile.dimOverall"),
  };

  const radarData = whiskyProfile?.tasteStructure ? dims.map(d => ({
    dimension: dimLabels[d],
    value: whiskyProfile.tasteStructure![d] || 0,
    ...(whiskyProfile.comparisonData ? { comparison: whiskyProfile.comparisonData.medians[d] || 0 } : {}),
    ...(globalAvg && compareMode === "none" ? { global: (globalAvg as any)[d] ?? 0 } : {}),
    fullMark: 100,
  })) : profile?.avgScores ? dims.map(d => ({
    dimension: dimLabels[d],
    value: (profile.avgScores as any)[d],
    ...(globalAvg ? { global: (globalAvg as any)[d] ?? 0 } : {}),
    fullMark: 100,
  })) : [];

  const regionEntries = profile?.regionBreakdown ? Object.entries(profile.regionBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore) : [];
  const caskEntries = profile?.caskBreakdown ? Object.entries(profile.caskBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore) : [];
  const peatEntries = profile?.peatBreakdown ? Object.entries(profile.peatBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore) : [];

  const topDrivers = [
    ...regionEntries.slice(0, 2).map(([name, d]) => ({ name, score: d.avgScore, type: t("caskProfile.preferredRegion"), icon: MapPin })),
    ...caskEntries.slice(0, 2).map(([name, d]) => ({ name, score: d.avgScore, type: t("caskProfile.preferredCask"), icon: Cog })),
    ...peatEntries.slice(0, 1).map(([name, d]) => ({ name, score: d.avgScore, type: t("caskProfile.preferredPeat"), icon: Flame })),
  ].sort((a, b) => b.score - a.score).slice(0, 5);

  const lowDrivers = [
    ...regionEntries.slice(-1).map(([name, d]) => ({ name, score: d.avgScore })),
    ...caskEntries.slice(-1).map(([name, d]) => ({ name, score: d.avgScore })),
  ].sort((a, b) => a.score - b.score).slice(0, 2);

  return (
    <SimpleShell maxWidth={1100}>
      <div style={{ minWidth: 0, overflowX: "hidden" }} data-testid="flavor-profile-page">
        <BackButton fallback="/my-taste" />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          {/* SECTION 1: Header */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
              <Activity style={{ width: 28, height: 28, color: c.accent }} />
              <h1 style={{ fontSize: 24, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent, margin: 0 }} data-testid="text-profile-title">
                {t("flavorProfile.title")}
              </h1>
            </div>
            <p style={{ fontSize: 14, color: `${c.muted}e6`, margin: 0 }}>{t("flavorProfile.subtitle")}</p>
          </div>

          {!hasData ? (
            <div style={{ textAlign: "center", padding: "64px 0", color: c.muted }}>
              <Activity style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }} />
              <p style={{ fontFamily: "'Playfair Display', Georgia, serif", margin: 0 }}>{t("flavorProfile.empty")}</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

              {/* SECTION 2: Profil-Snapshot (3 small cards) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }} data-testid="section-snapshot">
                <div style={sCard} data-testid="card-your-style">
                  <p style={sLabel}>{t("caskProfile.yourStyle")}</p>
                  <p style={{ ...sValue, color: styleLabel ? c.accent : c.muted }}>
                    {styleLabel || t("caskProfile.buildingUp")}
                  </p>
                </div>
                <div style={sCard} data-testid="card-sweet-spot">
                  <p style={sLabel}>{t("caskProfile.sweetSpot")}</p>
                  <p style={{ ...sValue, color: sweetSpotLabel ? c.text : c.muted }}>
                    {sweetSpotLabel || t("caskProfile.buildingUp")}
                  </p>
                </div>
                <div style={sCard} data-testid="card-stability">
                  <p style={{ ...sLabel, display: "flex", alignItems: "center", gap: 4 }}>
                    {t("caskProfile.profileStability")}
                    <InfoTooltip text={t("caskProfile.stabilityTooltip")} />
                  </p>
                  <div style={{ marginTop: 6 }}>
                    <StabilityBadge level={stabilityInfo.level} t={t} />
                    <span style={{ fontSize: 12, color: `${c.muted}99`, marginLeft: 8 }}>
                      N = {whiskyProfile?.ratingStyle?.nRatings || totalRatings}
                    </span>
                  </div>
                </div>
              </div>

              {/* FILTER CONTROLS: Datenbasis + Vergleich */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }} data-testid="section-filters">
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{t("caskProfile.datenbasis")}</span>
                    <InfoTooltip text={t("caskProfile.datenbasisHelper")} />
                  </div>
                  <SegmentedControl
                    options={[
                      { key: "all", label: t("caskProfile.sourceRatings") },
                      { key: "journal", label: t("caskProfile.sourceRatingsNotes") },
                      { key: "all_incl_imported", label: t("caskProfile.sourceAll") },
                    ]}
                    value={source}
                    onChange={(k) => setSource(k as SourceMode)}
                  />
                  <p style={{ fontSize: 12, color: `${c.muted}99`, margin: "4px 0 0" }}>{t("caskProfile.datenbasisHelper")}</p>
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c.text }}>{t("caskProfile.comparison")}</span>
                    <InfoTooltip text={t("caskProfile.comparisonHelper")} />
                  </div>
                  <SegmentedControl
                    options={[
                      { key: "none", label: t("caskProfile.compareMe") },
                      { key: "friends", label: t("caskProfile.compareFriends") },
                      { key: "platform", label: t("caskProfile.comparePlatform") },
                    ]}
                    value={compareMode}
                    onChange={(k) => setCompareMode(k as CompareMode)}
                  />
                  <p style={{ fontSize: 12, color: `${c.muted}99`, margin: "4px 0 0" }}>{t("caskProfile.comparisonHelper")}</p>
                </div>
              </div>

              {/* SECTION 3: Radar / Verkostungsdimensionen */}
              {radarData.length > 0 && (
                <div style={sCard} data-testid="section-radar">
                  <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 4 }}>{t("flavorProfile.radarTitle")}</h2>
                  <p style={{ fontSize: 14, color: c.muted, margin: 0, marginBottom: 16 }}>{t("flavorProfile.radarSubtitle", { count: whiskyProfile?.ratingStyle?.nRatings || totalRatings })}</p>
                  <div style={{ height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke={`${c.border}80`} />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: c.muted, fontSize: 12, fontFamily: "'Playfair Display', Georgia, serif" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: `${c.muted}80`, fontSize: 10 }} />
                        {(whiskyProfile?.comparisonData || (compareMode === "none" && globalAvg)) && (
                          <Radar
                            name={whiskyProfile?.comparisonData ? (whiskyProfile.comparisonData.mode === "friends" ? t("caskProfile.compareFriends") : t("caskProfile.comparePlatform")) : t("flavorProfile.everyone")}
                            dataKey={whiskyProfile?.comparisonData ? "comparison" : "global"}
                            stroke="#9ca3af"
                            fill="#9ca3af"
                            fillOpacity={0.08}
                            strokeDasharray="4 4"
                          />
                        )}
                        <Radar name={t("caskProfile.radarYou")} dataKey="value" stroke={c.accent} fill={c.accent} fillOpacity={0.25} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {whiskyProfile?.comparisonData && (
                    <p style={{ fontSize: 13, color: `${c.muted}cc`, marginTop: 8, textAlign: "center" }} data-testid="text-comparison-basis">
                      {whiskyProfile.comparisonData.mode === "friends"
                        ? t("flavorProfile.friendsBasis", { n: whiskyProfile.comparisonData.nFriends, r: whiskyProfile.comparisonData.nRatings })
                        : t("flavorProfile.platformBasisFull", { n: whiskyProfile.comparisonData.nParticipants, r: whiskyProfile.comparisonData.nRatings })}
                    </p>
                  )}

                  <RadarExplainer t={t} />

                  {whiskyProfile?.confidence && Object.keys(whiskyProfile.confidence).length > 0 && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}40` }} data-testid="section-confidence">
                      <p style={{ fontSize: 13, fontWeight: 600, color: c.muted, margin: "0 0 8px" }}>{t("caskProfile.confidenceTitle")}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        {dims.map(dim => {
                          const conf = whiskyProfile.confidence[dim];
                          if (!conf) return null;
                          const confColor = conf.level === "high" ? "#4ade80" : conf.level === "medium" ? "#fbbf24" : "#94a3b8";
                          return (
                            <span key={dim} style={{
                              display: "inline-flex", alignItems: "center", gap: 6,
                              padding: "4px 10px", borderRadius: 8, fontSize: 12,
                              background: `${confColor}15`, border: `1px solid ${confColor}30`, color: confColor,
                            }} data-testid={`badge-confidence-${dim}`}>
                              <span style={{ fontWeight: 600 }}>{dimLabels[dim]}</span>
                              <span style={{ opacity: 0.8 }}>{conf.percent}% (n={conf.n})</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 4: Treiber (Top Influences) */}
              <DriversSection
                topDrivers={topDrivers}
                lowDrivers={lowDrivers}
                t={t}
              />

              {/* SECTION 5: Vergleich (only when comparison active) */}
              {compareMode !== "none" && whiskyProfile?.comparisonData && whiskyProfile.tasteStructure && (
                <div style={sCard} data-testid="section-comparison-detail">
                  <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 12 }}>
                    {t("flavorProfile.personalVsGlobal")}
                  </h2>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {dims.map(dim => {
                      const userVal = whiskyProfile.tasteStructure![dim] || 0;
                      const compVal = whiskyProfile.comparisonData!.medians[dim] || 0;
                      const diff = Math.round((userVal - compVal) * 10) / 10;
                      return (
                        <div key={dim} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 14 }}>
                          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", color: c.muted, width: 80 }}>{dimLabels[dim]}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, justifyContent: "flex-end" }}>
                            <span style={{ fontFamily: "monospace", color: c.text, fontWeight: 500 }}>{userVal.toFixed(1)}</span>
                            <span style={{ color: `${c.muted}80` }}>vs</span>
                            <span style={{ fontFamily: "monospace", color: c.muted }}>{compVal.toFixed(1)}</span>
                            <span style={{
                              fontFamily: "monospace", fontSize: 12, width: 56, textAlign: "right",
                              color: diff > 0 ? "#4ade80" : diff < 0 ? "#ef4444" : c.muted,
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

              {/* Rating Style summary (compact) */}
              {whiskyProfile?.ratingStyle && (
                <div style={sCard} data-testid="section-rating-style">
                  <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 12 }}>{t("flavorProfile.ratingStyleTitle")}</h2>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 12 }}>
                    <div style={{ textAlign: "center", padding: 14, background: c.inputBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.accent }} data-testid="text-mean-score">{whiskyProfile.ratingStyle.meanScore}</div>
                      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{t("flavorProfile.meanScore")}</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: c.inputBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text }} data-testid="text-std-dev">{whiskyProfile.ratingStyle.stdDev}</div>
                      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{t("flavorProfile.stdDev")}</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: c.inputBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text }} data-testid="text-scale-range">{whiskyProfile.ratingStyle.scaleRange.min}–{whiskyProfile.ratingStyle.scaleRange.max}</div>
                      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>{t("flavorProfile.scaleRange")}</div>
                    </div>
                    <div style={{ textAlign: "center", padding: 14, background: c.inputBg, borderRadius: 8 }}>
                      <div style={{ fontSize: 22, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, color: c.text }} data-testid="text-n-ratings">{whiskyProfile.ratingStyle.nRatings}</div>
                      <div style={{ fontSize: 11, color: c.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 4 }}>N</div>
                    </div>
                  </div>

                  {whiskyProfile.ratingStyle.systematicDeviation && (
                    <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${c.border}40` }} data-testid="section-systematic-deviation">
                      <p style={{ fontSize: 13, fontWeight: 600, color: c.muted, margin: "0 0 8px" }}>{t("caskProfile.systematicDeviation")}</p>
                      <p style={{ fontSize: 12, color: `${c.muted}99`, margin: "0 0 10px" }}>{t("caskProfile.systematicDeviationDesc")}</p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 13 }}>
                        <div>
                          <span style={{ color: c.muted }}>{t("caskProfile.avgDelta")}: </span>
                          <span style={{
                            fontFamily: "monospace", fontWeight: 600,
                            color: whiskyProfile.ratingStyle.systematicDeviation.avgDelta > 0 ? "#4ade80" : whiskyProfile.ratingStyle.systematicDeviation.avgDelta < 0 ? "#ef4444" : c.text,
                          }}>
                            {whiskyProfile.ratingStyle.systematicDeviation.avgDelta > 0 ? "+" : ""}{whiskyProfile.ratingStyle.systematicDeviation.avgDelta.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: c.muted }}>{t("caskProfile.whiskiesCompared")}: </span>
                          <span style={{ fontFamily: "monospace", color: c.text }}>{whiskyProfile.ratingStyle.systematicDeviation.nWhiskiesCompared}</span>
                        </div>
                        <div>
                          <span style={{ color: c.muted }}>{t("caskProfile.platformRatings")}: </span>
                          <span style={{ fontFamily: "monospace", color: c.text }}>{whiskyProfile.ratingStyle.systematicDeviation.nPlatformRatings}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 6: Deep Dive (Accordion) */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }} data-testid="section-deep-dive">
                <h2 style={{ fontSize: 16, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, color: c.muted, margin: 0, marginBottom: 4 }}>
                  {t("caskProfile.deepDive")}
                </h2>

                <Accordion title={t("caskProfile.breakdowns")} icon={BarChart3} testId="accordion-breakdowns">
                  <p style={{ margin: "0 0 12px", fontSize: 13 }}>{t("caskProfile.breakdownsDesc")}</p>
                  <BreakdownBars label={t("caskProfile.regionBreakdown")} entries={regionEntries} t={t} />
                  <BreakdownBars label={t("caskProfile.caskBreakdown")} entries={caskEntries} t={t} />
                  <BreakdownBars label={t("caskProfile.peatBreakdown")} entries={peatEntries} t={t} />
                </Accordion>

                <Accordion title={t("caskProfile.topWhiskies")} icon={Trophy} testId="accordion-top-whiskies">
                  <p style={{ margin: "0 0 12px", fontSize: 13 }}>{t("caskProfile.topWhiskiesDesc")}</p>
                  <TopWhiskiesList whiskies={profile?.ratedWhiskies || []} t={t} />
                </Accordion>

                {whiskyProfile?.whiskyComparison && whiskyProfile.whiskyComparison.length > 0 && (
                  <Accordion title={t("caskProfile.whiskyComparison")} icon={ArrowUpDown} testId="accordion-whisky-comparison">
                    <p style={{ margin: "0 0 12px", fontSize: 13 }}>{t("caskProfile.whiskyComparisonDesc")}</p>
                    <WhiskyComparisonTable comparisons={whiskyProfile.whiskyComparison} t={t} />
                  </Accordion>
                )}

                <Accordion title={t("caskProfile.methodology")} icon={BookOpen} testId="accordion-methodology">
                  <p style={{ margin: 0 }}>{t("flavorProfile.methodology.transparencyIntro")}</p>
                  <p style={{ margin: "12px 0 0", fontWeight: 500, color: c.text }}>{t("flavorProfile.methodology.whatItShows")}</p>
                  <ul style={{ paddingLeft: 20, margin: "8px 0 0", display: "flex", flexDirection: "column", gap: 4 }}>
                    <li>{t("flavorProfile.methodology.bullet1")}</li>
                    <li>{t("flavorProfile.methodology.bullet2")}</li>
                    <li>{t("flavorProfile.methodology.bullet3")}</li>
                    <li>{t("flavorProfile.methodology.bullet4")}</li>
                    <li>{t("flavorProfile.methodology.bullet5")}</li>
                  </ul>
                  <p style={{ margin: "12px 0 0" }}>{t("flavorProfile.methodology.evolution")}</p>
                </Accordion>

                <Accordion title={t("caskProfile.dataQuality")} icon={Activity} testId="accordion-data-quality">
                  <p style={{ margin: 0 }}>
                    {t("caskProfile.dataQualityDesc", {
                      n: whiskyProfile?.ratingStyle?.nRatings || totalRatings,
                      level: t(`caskProfile.${stabilityInfo.key}`),
                    })}
                  </p>
                  <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4, fontFamily: "monospace", fontSize: 12 }}>
                    <span>{t("flavorProfile.formulaStability")}</span>
                    <span>{t("flavorProfile.stabilityFormulaText")}</span>
                  </div>
                </Accordion>

                <Accordion title={t("caskProfile.exportsDownloads")} icon={Download} testId="accordion-exports">
                  <p style={{ margin: "0 0 12px" }}>{t("caskProfile.exportsDownloadsDesc")}</p>
                  <Link href="/my-taste/downloads">
                    <button
                      style={{
                        padding: "10px 20px", borderRadius: 10, border: `1px solid ${c.accent}`,
                        background: "transparent", color: c.accent, fontSize: 14, fontWeight: 500,
                        cursor: "pointer", fontFamily: "system-ui, sans-serif",
                      }}
                      data-testid="button-go-downloads"
                    >
                      {t("caskProfile.goToDownloads")}
                    </button>
                  </Link>
                </Accordion>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </SimpleShell>
  );
}

function BreakdownBars({ label, entries, t }: {
  label: string;
  entries: [string, BreakdownEntry][];
  t: any;
}) {
  if (entries.length === 0) return null;
  const maxCount = Math.max(...entries.map(([, e]) => e.count), 1);
  return (
    <div style={{ marginBottom: 16 }} data-testid={`breakdown-${label.toLowerCase()}`}>
      <p style={{ fontSize: 13, fontWeight: 600, color: c.text, margin: "0 0 6px" }}>{label}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {entries.map(([name, entry]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 100, color: c.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flexShrink: 0 }}>{name}</span>
            <div style={{ flex: 1, height: 14, background: `${c.border}30`, borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(entry.count / maxCount) * 100}%`, background: `${c.accent}80`, borderRadius: 4, transition: "width 0.3s" }} />
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: c.muted, width: 28, textAlign: "right", flexShrink: 0 }}>{entry.count}{t("caskProfile.count")}</span>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: c.accent, width: 32, textAlign: "right", flexShrink: 0 }}>{t("caskProfile.avg")} {(entry.avgScore || 0).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopWhiskiesList({ whiskies, t }: { whiskies: RatedWhisky[]; t: any }) {
  if (whiskies.length === 0) {
    return <p style={{ fontSize: 13, color: c.muted, margin: 0 }}>{t("caskProfile.noTopWhiskies")}</p>;
  }
  const sorted = [...whiskies].sort((a, b) => (b.rating.overall || 0) - (a.rating.overall || 0)).slice(0, 10);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }} data-testid="top-whiskies-list">
      {sorted.map((w, i) => (
        <div key={w.whisky.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
          <span style={{ fontFamily: "monospace", color: `${c.muted}80`, width: 20, textAlign: "right", flexShrink: 0 }}>#{i + 1}</span>
          {w.whisky.imageUrl && (
            <img src={w.whisky.imageUrl} alt="" style={{ width: 24, height: 32, objectFit: "contain", borderRadius: 4, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: c.text, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w.whisky.name}</div>
            {w.whisky.distillery && <div style={{ fontSize: 11, color: `${c.muted}99` }}>{w.whisky.distillery}</div>}
          </div>
          <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 700, fontSize: 16, color: c.accent, flexShrink: 0 }}>{w.rating.overall}</span>
        </div>
      ))}
    </div>
  );
}

function WhiskyComparisonTable({ comparisons, t }: {
  comparisons: WhiskyProfileData["whiskyComparison"];
  t: any;
}) {
  return (
    <div style={{ overflowX: "auto" }} data-testid="whisky-comparison-table">
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${c.border}40` }}>
            <th style={{ textAlign: "left", padding: "6px 8px", color: c.muted, fontWeight: 600 }}>Whisky</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: c.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{t("caskProfile.yourScore")}</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: c.muted, fontWeight: 600, whiteSpace: "nowrap" }}>{t("caskProfile.platformMedian")}</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: c.muted, fontWeight: 600 }}>{t("caskProfile.delta")}</th>
            <th style={{ textAlign: "right", padding: "6px 8px", color: c.muted, fontWeight: 600 }}>N</th>
          </tr>
        </thead>
        <tbody>
          {comparisons.map((row) => (
            <tr key={row.whiskyId} style={{ borderBottom: `1px solid ${c.border}20` }}>
              <td style={{ padding: "6px 8px", color: c.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {row.whiskyName}
                {row.distillery && <span style={{ color: `${c.muted}80`, marginLeft: 4, fontSize: 11 }}>({row.distillery})</span>}
              </td>
              <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace", color: c.accent }}>{row.userScore.toFixed(1)}</td>
              <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace", color: c.muted }}>{row.platformMedian.toFixed(1)}</td>
              <td style={{
                textAlign: "right", padding: "6px 8px", fontFamily: "monospace",
                color: row.delta > 0 ? "#4ade80" : row.delta < 0 ? "#ef4444" : c.muted,
              }}>
                {row.delta > 0 ? "+" : ""}{row.delta.toFixed(1)}
              </td>
              <td style={{ textAlign: "right", padding: "6px 8px", fontFamily: "monospace", color: `${c.muted}80` }}>{row.platformN}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RadarExplainer({ t }: { t: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, color: c.accent, display: "flex", alignItems: "center", gap: 6,
          padding: 0, fontFamily: "system-ui, sans-serif",
        }}
        data-testid="button-radar-explain"
      >
        {open ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
        {t("caskProfile.whatDoesThisMean")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
            <ul style={{
              margin: "8px 0 0", paddingLeft: 16,
              fontSize: 13, color: c.muted, lineHeight: 1.6,
              display: "flex", flexDirection: "column", gap: 4,
            }}>
              <li>{t("caskProfile.radarExplain1")}</li>
              <li>{t("caskProfile.radarExplain2")}</li>
              <li>{t("caskProfile.radarExplain3")}</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DriversSection({ topDrivers, lowDrivers, t }: {
  topDrivers: Array<{ name: string; score: number; type: string; icon: React.ElementType }>;
  lowDrivers: Array<{ name: string; score: number }>;
  t: any;
}) {
  if (topDrivers.length === 0) {
    return (
      <div style={{ ...sCard, textAlign: "center", padding: "40px 20px" }} data-testid="section-drivers-empty">
        <Wine style={{ width: 40, height: 40, color: `${c.muted}40`, margin: "0 auto 12px" }} />
        <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 16, color: c.muted, margin: 0, marginBottom: 16 }}>
          {t("caskProfile.emptyDrivers")}
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/log-simple">
            <button style={{
              padding: "10px 20px", borderRadius: 10, background: c.accent, color: c.bg,
              border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "system-ui, sans-serif",
            }} data-testid="button-log-solo">
              <GlassWater style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />
              {t("caskProfile.logSoloDram")}
            </button>
          </Link>
          <Link href="/enter">
            <button style={{
              padding: "10px 20px", borderRadius: 10, background: "transparent", color: c.accent,
              border: `1px solid ${c.accent}`, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "system-ui, sans-serif",
            }} data-testid="button-join-tasting">
              {t("caskProfile.joinTasting")}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={sCard} data-testid="section-drivers">
      <h2 style={{ fontSize: 18, fontFamily: "'Playfair Display', Georgia, serif", fontWeight: 600, margin: 0, marginBottom: 16 }}>
        {t("caskProfile.topDrivers")}
      </h2>

      <div style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: c.accent, fontWeight: 600, margin: "0 0 8px" }}>{t("caskProfile.youOftenLike")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {topDrivers.map((d, i) => {
            const Icon = d.icon;
            return (
              <div key={`${d.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <Icon style={{ width: 14, height: 14, color: c.accent, flexShrink: 0 }} />
                <span style={{ color: c.text, fontWeight: 500 }}>{d.name}</span>
                <span style={{ fontSize: 12, color: `${c.muted}99` }}>({d.type})</span>
                <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 13, color: c.accent }}>{d.score.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {lowDrivers.length > 0 && (
        <div>
          <p style={{ fontSize: 13, color: `${c.muted}cc`, fontWeight: 600, margin: "0 0 8px" }}>{t("caskProfile.youOftenAvoid")}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {lowDrivers.map((d, i) => (
              <div key={`low-${d.name}-${i}`} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14 }}>
                <span style={{ color: c.muted }}>{d.name}</span>
                <span style={{ marginLeft: "auto", fontFamily: "monospace", fontSize: 13, color: c.muted }}>{d.score.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
