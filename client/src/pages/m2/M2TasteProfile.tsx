import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v } from "@/lib/themeVars";
import M2BackButton from "@/components/m2/M2BackButton";
import { M2Loading, M2Error } from "@/components/m2/M2Feedback";
import { getSession } from "@/lib/session";
import { flavorProfileApi } from "@/lib/api";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Users,
  Globe,
  MapPin,
  Cog,
  Flame,
  Info,
  BarChart3,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface BreakdownEntry {
  count: number;
  avgScore: number;
}

interface FlavorProfileData {
  avgScores: { nose: number; taste: number; finish: number; balance: number; overall: number };
  regionBreakdown: Record<string, BreakdownEntry>;
  caskBreakdown: Record<string, BreakdownEntry>;
  peatBreakdown: Record<string, BreakdownEntry>;
  categoryBreakdown: Record<string, BreakdownEntry>;
  ratedWhiskies: any[];
  allWhiskies: any[];
  sources?: { tastingRatings: number; journalEntries: number };
}

interface WhiskyProfileData {
  ratingStyle: {
    meanScore: number;
    stdDev: number;
    scaleRange: { min: number; max: number };
    systematicDeviation: {
      avgDelta: number;
      deltaStdDev: number | null;
      nWhiskiesCompared: number;
      nPlatformRatings: number;
      nPlatformParticipants: number;
      platformMedian: number;
    } | null;
    nRatings: number;
  } | null;
  tasteStructure: Record<string, number> | null;
  whiskyComparison: Array<{
    whiskyId: string;
    whiskyName: string;
    distillery: string | null;
    region: string | null;
    userScore: number;
    platformMedian: number;
    delta: number;
    iqr: { q1: number; q3: number; iqr: number } | null;
    platformN: number;
  }>;
  confidence: Record<string, { level: string; percent: number; n: number }>;
  comparisonData: {
    mode: string;
    medians: Record<string, number>;
    iqrs?: Record<string, { q1: number; q3: number; iqr: number } | null>;
    nFriends?: number;
    nParticipants?: number;
    nRatings: number;
  } | null;
}

type CompareMode = "none" | "friends" | "platform";

const sCard: React.CSSProperties = {
  background: v.elevated,
  borderRadius: 14,
  border: `1px solid ${v.border}`,
  padding: 20,
};

const sLabel: React.CSSProperties = {
  fontSize: 12,
  color: v.muted,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 600,
  margin: 0,
};

const sValue: React.CSSProperties = {
  fontSize: 18,
  fontFamily: "'Playfair Display', Georgia, serif",
  fontWeight: 700,
  color: v.text,
  margin: 0,
  marginTop: 4,
  fontVariantNumeric: "tabular-nums",
};

function getStabilityInfo(n: number) {
  if (n >= 15) return { level: "stable" as const, label: "High" };
  if (n >= 5) return { level: "tendency" as const, label: "Medium" };
  return { level: "preliminary" as const, label: "Low" };
}

function StabilityBadge({ level, t }: { level: string; t: any }) {
  const colorMap: Record<string, { color: string; bg: string }> = {
    stable: { color: v.deltaPositive, bg: v.pillBg },
    tendency: { color: v.accent, bg: v.pillBg },
    preliminary: { color: v.muted, bg: v.pillBg },
  };
  const colors = colorMap[level] || colorMap.preliminary;
  const label =
    level === "stable"
      ? t("m2.profile.stabilityHigh", "Stable")
      : level === "tendency"
        ? t("m2.profile.stabilityMedium", "Tendency")
        : t("m2.profile.stabilityLow", "Preliminary");
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 10px",
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 500,
        border: `1px solid ${colors.color}`,
        background: colors.bg,
        color: colors.color,
      }}
      data-testid={`badge-stability-${level}`}
    >
      {label}
    </span>
  );
}

function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        borderRadius: 10,
        border: `1px solid ${v.border}`,
        overflow: "hidden",
        fontSize: 13,
      }}
    >
      {options.map((opt, i) => (
        <button
          key={opt.key}
          onClick={() => onChange(opt.key)}
          style={{
            padding: "7px 14px",
            background: value === opt.key ? v.pillBg : v.inputBg,
            color: value === opt.key ? v.pillText : v.muted,
            border: "none",
            borderRight: i < options.length - 1 ? `1px solid ${v.border}` : "none",
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

function BreakdownSection({
  title,
  icon: Icon,
  entries,
  t,
  testId,
}: {
  title: string;
  icon: React.ElementType;
  entries: [string, BreakdownEntry][];
  t: any;
  testId: string;
}) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  return (
    <div style={{ ...sCard, padding: 0 }} data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          textAlign: "left",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: v.text,
          fontFamily: "system-ui, sans-serif",
        }}
        data-testid={`button-toggle-${testId}`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 18, height: 18, color: v.accent }} />
          <span
            style={{
              fontSize: 15,
              fontFamily: "'Playfair Display', Georgia, serif",
              fontWeight: 600,
            }}
          >
            {title}
          </span>
          <span
            style={{
              fontSize: 12,
              color: v.muted,
              background: v.pillBg,
              padding: "2px 8px",
              borderRadius: 8,
            }}
          >
            {entries.length}
          </span>
        </div>
        {open ? (
          <ChevronUp style={{ width: 16, height: 16, color: v.muted }} />
        ) : (
          <ChevronDown style={{ width: 16, height: 16, color: v.muted }} />
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 20px 20px" }}>
              {entries.map(([name, data], idx) => {
                const score = typeof data?.avgScore === "number" ? data.avgScore : 0;
                const count = typeof data?.count === "number" ? data.count : 0;
                const maxScore = typeof entries[0]?.[1]?.avgScore === "number" ? entries[0][1].avgScore : 100;
                const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
                return (
                  <div
                    key={name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 0",
                      borderBottom:
                        idx < entries.length - 1
                          ? `1px solid ${v.border}`
                          : "none",
                    }}
                    data-testid={`row-breakdown-${testId}-${idx}`}
                  >
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: v.text,
                          marginBottom: 4,
                        }}
                      >
                        {name}
                      </div>
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          background: v.inputBg,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(pct, 100)}%`,
                            background: v.accent,
                            borderRadius: 3,
                            transition: "width 0.3s",
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 60 }}>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          color: v.text,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {score.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 11, color: v.muted }}>
                        {count} {t("m2.profile.rated", "rated")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function deriveStyle(
  regionBreakdown: Record<string, BreakdownEntry>,
  peatBreakdown: Record<string, BreakdownEntry>
): string | null {
  const topRegion = Object.entries(regionBreakdown).sort(
    (a, b) => b[1].avgScore - a[1].avgScore
  )[0];
  const topPeat = Object.entries(peatBreakdown).sort(
    (a, b) => b[1].avgScore - a[1].avgScore
  )[0];
  if (!topRegion && !topPeat) return null;
  const parts: string[] = [];
  if (topPeat && topPeat[0].toLowerCase().includes("peat"))
    parts.push(topPeat[0]);
  if (topRegion) parts.push(topRegion[0]);
  return parts.length > 0 ? parts.join(" & ") : null;
}

function deriveSweetSpot(
  regionBreakdown: Record<string, BreakdownEntry>,
  caskBreakdown: Record<string, BreakdownEntry>
): string | null {
  const topRegion = Object.entries(regionBreakdown).sort(
    (a, b) => b[1].avgScore - a[1].avgScore
  )[0];
  const topCask = Object.entries(caskBreakdown).sort(
    (a, b) => b[1].avgScore - a[1].avgScore
  )[0];
  if (!topRegion && !topCask) return null;
  const parts: string[] = [];
  if (topRegion) parts.push(topRegion[0]);
  if (topCask) parts.push(topCask[0]);
  return parts.join(" · ");
}

export default function M2TasteProfile() {
  const { t } = useTranslation();
  const session = getSession();
  const [compareMode, setCompareMode] = useState<CompareMode>("none");

  const { data: profile, isLoading, isError, refetch } = useQuery<FlavorProfileData>({
    queryKey: ["flavor-profile", session.pid],
    queryFn: () => flavorProfileApi.get(session.pid!),
    enabled: !!session.pid,
  });

  const { data: globalAvg } = useQuery<{
    nose: number;
    taste: number;
    finish: number;
    balance: number;
    overall: number;
    totalRatings: number;
    totalParticipants: number;
  }>({
    queryKey: ["global-averages"],
    queryFn: () => flavorProfileApi.getGlobal(),
    enabled: !!session.pid,
  });

  const { data: whiskyProfile } = useQuery<WhiskyProfileData>({
    queryKey: ["whisky-profile", session.pid, "all", compareMode],
    queryFn: () =>
      flavorProfileApi.getWhiskyProfile(session.pid!, "all", compareMode),
    enabled: !!session.pid,
  });

  if (!session.signedIn || !session.pid) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-taste-profile">
        <M2BackButton />
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            margin: "16px 0 12px",
          }}
        >
          {t("m2.taste.profile", "CaskSense Profile")}
        </h1>
        <div
          style={{
            background: v.elevated,
            borderRadius: 12,
            padding: "24px 16px",
            textAlign: "center",
            color: v.textSecondary,
            fontSize: 14,
          }}
        >
          {t(
            "m2.taste.signInPrompt",
            "Sign in to access your taste profile"
          )}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-taste-profile">
        <M2BackButton />
        <M2Loading />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ padding: "16px" }} data-testid="m2-taste-profile">
        <M2BackButton />
        <M2Error onRetry={refetch} />
      </div>
    );
  }

  const totalRatings = profile?.ratedWhiskies?.length || 0;
  const hasData =
    totalRatings > 0 || (profile?.sources?.journalEntries || 0) > 0;
  const stabilityInfo = getStabilityInfo(
    typeof whiskyProfile?.ratingStyle?.nRatings === "number" ? whiskyProfile.ratingStyle.nRatings : totalRatings
  );
  const styleLabel = profile
    ? deriveStyle(profile.regionBreakdown || {}, profile.peatBreakdown || {})
    : null;
  const sweetSpotLabel = profile
    ? deriveSweetSpot(profile.regionBreakdown || {}, profile.caskBreakdown || {})
    : null;

  const dims = ["nose", "taste", "finish", "balance", "overall"];
  const dimLabels: Record<string, string> = {
    nose: t("m2.profile.dimNose", "Nose"),
    taste: t("m2.profile.dimTaste", "Taste"),
    finish: t("m2.profile.dimFinish", "Finish"),
    balance: t("m2.profile.dimBalance", "Balance"),
    overall: t("m2.profile.dimOverall", "Overall"),
  };

  const radarData = whiskyProfile?.tasteStructure
    ? dims.map((d) => ({
        dimension: dimLabels[d],
        value: whiskyProfile.tasteStructure![d] || 0,
        ...(whiskyProfile.comparisonData
          ? { comparison: whiskyProfile.comparisonData.medians[d] || 0 }
          : {}),
        ...(globalAvg && compareMode === "none"
          ? { global: (globalAvg as any)[d] ?? 0 }
          : {}),
        fullMark: 100,
      }))
    : profile?.avgScores
      ? dims.map((d) => ({
          dimension: dimLabels[d],
          value: (profile.avgScores as any)[d],
          ...(globalAvg
            ? { global: (globalAvg as any)[d] ?? 0 }
            : {}),
          fullMark: 100,
        }))
      : [];

  const regionEntries = profile?.regionBreakdown
    ? Object.entries(profile.regionBreakdown).sort(
        (a, b) => b[1].avgScore - a[1].avgScore
      )
    : [];
  const caskEntries = profile?.caskBreakdown
    ? Object.entries(profile.caskBreakdown).sort(
        (a, b) => b[1].avgScore - a[1].avgScore
      )
    : [];
  const peatEntries = profile?.peatBreakdown
    ? Object.entries(profile.peatBreakdown).sort(
        (a, b) => b[1].avgScore - a[1].avgScore
      )
    : [];

  return (
    <div style={{ padding: "16px" }} data-testid="m2-taste-profile">
      <M2BackButton />

      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 6px" }}>
        <Activity style={{ width: 24, height: 24, color: v.accent }} />
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 24,
            fontWeight: 700,
            color: v.text,
            margin: 0,
          }}
          data-testid="text-profile-title"
        >
          {t("m2.taste.profile", "CaskSense Profile")}
        </h1>
      </div>
      <p style={{ fontSize: 14, color: v.muted, margin: "0 0 24px" }}>
        {t("m2.profile.subtitle", "Your personal flavor fingerprint based on your ratings")}
      </p>

      {!hasData ? (
        <div
          style={{
            textAlign: "center",
            padding: "64px 0",
            color: v.muted,
          }}
        >
          <Activity
            style={{ width: 48, height: 48, margin: "0 auto 16px", opacity: 0.3 }}
          />
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              margin: 0,
            }}
          >
            {t("m2.profile.empty", "Rate some whiskies to build your profile")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: 12,
            }}
            data-testid="section-snapshot"
          >
            <div style={sCard} data-testid="card-your-style">
              <p style={sLabel}>{t("m2.profile.yourStyle", "Your Style")}</p>
              <p
                style={{
                  ...sValue,
                  color: styleLabel ? v.accent : v.muted,
                  fontSize: 16,
                }}
              >
                {styleLabel || t("m2.profile.buildingUp", "Building up...")}
              </p>
            </div>
            <div style={sCard} data-testid="card-sweet-spot">
              <p style={sLabel}>{t("m2.profile.sweetSpot", "Sweet Spot")}</p>
              <p
                style={{
                  ...sValue,
                  color: sweetSpotLabel ? v.text : v.muted,
                  fontSize: 16,
                }}
              >
                {sweetSpotLabel || t("m2.profile.buildingUp", "Building up...")}
              </p>
            </div>
            <div style={sCard} data-testid="card-stability">
              <p style={sLabel}>
                {t("m2.profile.stability", "Profile Stability")}
              </p>
              <div style={{ marginTop: 6 }}>
                <StabilityBadge level={stabilityInfo.level} t={t} />
                <span
                  style={{
                    fontSize: 12,
                    color: v.muted,
                    marginLeft: 8,
                  }}
                >
                  N = {Number(whiskyProfile?.ratingStyle?.nRatings) || totalRatings}
                </span>
              </div>
            </div>
          </div>

          <div data-testid="section-benchmark-controls">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Users style={{ width: 16, height: 16, color: v.accent }} />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: v.text,
                }}
              >
                {t("m2.profile.benchmarkAgainst", "Benchmark against")}
              </span>
            </div>
            <SegmentedControl
              options={[
                { key: "none", label: t("m2.profile.compareMe", "Just Me") },
                {
                  key: "friends",
                  label: t("m2.profile.compareFriends", "Friends"),
                },
                {
                  key: "platform",
                  label: t("m2.profile.compareGlobal", "Global"),
                },
              ]}
              value={compareMode}
              onChange={(k) => setCompareMode(k as CompareMode)}
            />
          </div>

          {radarData.length > 0 && (
            <div style={sCard} data-testid="section-radar">
              <h2
                style={{
                  fontSize: 18,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 600,
                  margin: "0 0 4px",
                }}
              >
                {t("m2.profile.radarTitle", "Taste Radar")}
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: v.muted,
                  margin: "0 0 16px",
                }}
              >
                {t("m2.profile.radarSubtitle", "Based on {{count}} ratings", {
                  count: Number(whiskyProfile?.ratingStyle?.nRatings) || totalRatings,
                })}
              </p>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart
                    data={radarData}
                    cx="50%"
                    cy="50%"
                    outerRadius="75%"
                  >
                    <PolarGrid stroke={v.border} />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{
                        fill: v.muted,
                        fontSize: 12,
                        fontFamily:
                          "'Playfair Display', Georgia, serif",
                      }}
                    />
                    <PolarRadiusAxis
                      angle={90}
                      domain={[0, 100]}
                      tick={{
                        fill: v.muted,
                        fontSize: 10,
                      }}
                    />
                    {(whiskyProfile?.comparisonData ||
                      (compareMode === "none" && globalAvg)) && (
                      <Radar
                        name={
                          whiskyProfile?.comparisonData
                            ? whiskyProfile.comparisonData.mode ===
                              "friends"
                              ? t(
                                  "m2.profile.compareFriends",
                                  "Friends"
                                )
                              : t(
                                  "m2.profile.compareGlobal",
                                  "Global"
                                )
                            : t(
                                "m2.profile.compareGlobal",
                                "Global"
                              )
                        }
                        dataKey={
                          whiskyProfile?.comparisonData
                            ? "comparison"
                            : "global"
                        }
                        stroke="#9ca3af"
                        fill="#9ca3af"
                        fillOpacity={0.08}
                        strokeDasharray="4 4"
                      />
                    )}
                    <Radar
                      name={t("m2.profile.radarYou", "You")}
                      dataKey="value"
                      stroke={v.accent}
                      fill={v.accent}
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {whiskyProfile?.comparisonData && (
                <p
                  style={{
                    fontSize: 12,
                    color: v.muted,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                  data-testid="text-comparison-basis"
                >
                  {whiskyProfile.comparisonData.mode === "friends"
                    ? t("m2.profile.friendsBasis", "Based on {{n}} friends, {{r}} ratings", {
                        n: Number(whiskyProfile.comparisonData.nFriends) || 0,
                        r: Number(whiskyProfile.comparisonData.nRatings) || 0,
                      })
                    : t("m2.profile.platformBasis", "Based on {{n}} tasters, {{r}} ratings", {
                        n: Number(whiskyProfile.comparisonData.nParticipants) || 0,
                        r: Number(whiskyProfile.comparisonData.nRatings) || 0,
                      })}
                </p>
              )}

              {whiskyProfile?.confidence &&
                Object.keys(whiskyProfile.confidence).length > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 12,
                      borderTop: `1px solid ${v.border}`,
                    }}
                    data-testid="section-confidence"
                  >
                    <p
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: v.muted,
                        margin: "0 0 8px",
                      }}
                    >
                      {t("m2.profile.confidenceTitle", "Confidence per Dimension")}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                      }}
                    >
                      {dims.map((dim) => {
                        const conf = whiskyProfile.confidence[dim];
                        if (!conf) return null;
                        const confColor =
                          conf.level === "high"
                            ? v.deltaPositive
                            : conf.level === "medium"
                              ? v.accent
                              : v.muted;
                        return (
                          <span
                            key={dim}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              padding: "4px 10px",
                              borderRadius: 8,
                              fontSize: 13,
                              background: v.inputBg,
                              border: `1px solid ${v.border}`,
                              color: v.text,
                            }}
                            data-testid={`badge-confidence-${dim}`}
                          >
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: confColor,
                              }}
                            />
                            {dimLabels[dim]}
                            <span
                              style={{
                                fontSize: 11,
                                color: v.muted,
                              }}
                            >
                              {conf.percent}%
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
            </div>
          )}

          {whiskyProfile?.ratingStyle && (
            <div style={sCard} data-testid="section-rating-style">
              <h2
                style={{
                  fontSize: 16,
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontWeight: 600,
                  margin: "0 0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <BarChart3
                  style={{ width: 18, height: 18, color: v.accent }}
                />
                {t("m2.profile.ratingStyle", "Rating Style")}
              </h2>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: v.muted }}>
                    {t("m2.profile.meanScore", "Mean")}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: v.text,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {whiskyProfile.ratingStyle.meanScore.toFixed(1)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: v.muted }}>
                    {t("m2.profile.stdDev", "StdDev")}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: v.text,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {whiskyProfile.ratingStyle.stdDev.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: v.muted }}>
                    {t("m2.profile.range", "Range")}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: v.text,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {whiskyProfile.ratingStyle.scaleRange.min}–
                    {whiskyProfile.ratingStyle.scaleRange.max}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: v.muted }}>
                    {t("m2.profile.count", "Count")}
                  </div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: v.text,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {Number(whiskyProfile.ratingStyle.nRatings) || 0}
                  </div>
                </div>
              </div>

              {whiskyProfile.ratingStyle.systematicDeviation && typeof whiskyProfile.ratingStyle.systematicDeviation.avgDelta === "number" && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 12,
                    borderTop: `1px solid ${v.border}`,
                  }}
                >
                  <div style={{ fontSize: 12, color: v.muted, marginBottom: 4 }}>
                    {t("m2.profile.deltaVsPlatform", "Avg Delta vs Platform")}
                  </div>
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      color:
                        whiskyProfile.ratingStyle.systematicDeviation.avgDelta >= 0
                          ? v.deltaPositive
                          : v.deltaNegative,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {whiskyProfile.ratingStyle.systematicDeviation.avgDelta >= 0
                      ? "+"
                      : ""}
                    {whiskyProfile.ratingStyle.systematicDeviation.avgDelta.toFixed(
                      1
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: v.muted }}>
                    {t("m2.profile.comparedWhiskies", "Compared across {{n}} whiskies", {
                      n: Number(whiskyProfile.ratingStyle.systematicDeviation
                        .nWhiskiesCompared) || 0,
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <BreakdownSection
            title={t("m2.profile.byRegion", "By Region")}
            icon={MapPin}
            entries={regionEntries}
            t={t}
            testId="section-region-breakdown"
          />

          <BreakdownSection
            title={t("m2.profile.byCask", "By Cask Type")}
            icon={Cog}
            entries={caskEntries}
            t={t}
            testId="section-cask-breakdown"
          />

          <BreakdownSection
            title={t("m2.profile.byPeat", "By Peat Level")}
            icon={Flame}
            entries={peatEntries}
            t={t}
            testId="section-peat-breakdown"
          />

          {whiskyProfile?.whiskyComparison &&
            whiskyProfile.whiskyComparison.length > 0 && (
              <div style={sCard} data-testid="section-whisky-comparison">
                <h2
                  style={{
                    fontSize: 16,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontWeight: 600,
                    margin: "0 0 12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Globe
                    style={{ width: 18, height: 18, color: v.accent }}
                  />
                  {t("m2.profile.whiskyComparison", "Your Scores vs Platform")}
                </h2>
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 13,
                    }}
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            textAlign: "left",
                            padding: "8px 4px",
                            color: v.muted,
                            fontWeight: 600,
                            borderBottom: `1px solid ${v.border}`,
                          }}
                        >
                          {t("m2.profile.whisky", "Whisky")}
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: "8px 4px",
                            color: v.muted,
                            fontWeight: 600,
                            borderBottom: `1px solid ${v.border}`,
                          }}
                        >
                          {t("m2.profile.you", "You")}
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: "8px 4px",
                            color: v.muted,
                            fontWeight: 600,
                            borderBottom: `1px solid ${v.border}`,
                          }}
                        >
                          {t("m2.profile.platform", "Platform")}
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            padding: "8px 4px",
                            color: v.muted,
                            fontWeight: 600,
                            borderBottom: `1px solid ${v.border}`,
                          }}
                        >
                          {t("m2.profile.delta", "Delta")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {whiskyProfile.whiskyComparison
                        .slice(0, 10)
                        .map((w, idx) => (
                          <tr
                            key={w.whiskyId}
                            data-testid={`row-comparison-${idx}`}
                          >
                            <td
                              style={{
                                padding: "8px 4px",
                                color: v.text,
                                borderBottom: `1px solid ${v.border}`,
                                maxWidth: 160,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {String(w.whiskyName || "—")}
                            </td>
                            <td
                              style={{
                                padding: "8px 4px",
                                textAlign: "right",
                                color: v.text,
                                fontWeight: 600,
                                borderBottom: `1px solid ${v.border}`,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {typeof w.userScore === "number" ? w.userScore.toFixed(1) : "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 4px",
                                textAlign: "right",
                                color: v.muted,
                                borderBottom: `1px solid ${v.border}`,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {typeof w.platformMedian === "number" ? w.platformMedian.toFixed(1) : "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 4px",
                                textAlign: "right",
                                fontWeight: 600,
                                borderBottom: `1px solid ${v.border}`,
                                color:
                                  (typeof w.delta === "number" ? w.delta : 0) >= 0
                                    ? v.deltaPositive
                                    : v.deltaNegative,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {typeof w.delta === "number" ? `${w.delta >= 0 ? "+" : ""}${w.delta.toFixed(1)}` : "—"}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
