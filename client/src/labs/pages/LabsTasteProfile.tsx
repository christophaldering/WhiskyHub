import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useSession } from "@/lib/session";
import { flavorProfileApi } from "@/lib/api";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Activity, ChevronDown, ChevronUp, ChevronLeft,
  MapPin, Cog, Flame, Globe, BarChart3, Users, Wine,
} from "lucide-react";

interface BreakdownEntry { count: number; avgScore: number }
interface FlavorProfileData {
  avgScores: { nose: number; taste: number; finish: number; overall: number };
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
    meanScore: number; stdDev: number;
    scaleRange: { min: number; max: number };
    systematicDeviation: { avgDelta: number; nWhiskiesCompared: number } | null;
    nRatings: number;
  } | null;
  tasteStructure: Record<string, number> | null;
  whiskyComparison: Array<{
    whiskyId: string; whiskyName: string; distillery: string | null;
    userScore: number; platformMedian: number; delta: number; platformN: number;
  }>;
  confidence: Record<string, { level: string; percent: number; n: number }>;
  comparisonData: {
    mode: string; medians: Record<string, number>;
    nFriends?: number; nParticipants?: number; nRatings: number;
  } | null;
}

type CompareMode = "none" | "friends" | "platform";

function getStabilityInfo(n: number) {
  if (n >= 15) return { level: "stable", label: "High", color: "var(--labs-success)" };
  if (n >= 5) return { level: "tendency", label: "Medium", color: "var(--labs-accent)" };
  return { level: "preliminary", label: "Low", color: "var(--labs-text-muted)" };
}

function deriveStyle(region: Record<string, BreakdownEntry>, peat: Record<string, BreakdownEntry>): string | null {
  const topR = Object.entries(region).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  const topP = Object.entries(peat).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  if (!topR && !topP) return null;
  const parts: string[] = [];
  if (topP && topP[0].toLowerCase().includes("peat")) parts.push(topP[0]);
  if (topR) parts.push(topR[0]);
  return parts.length > 0 ? parts.join(" & ") : null;
}

function deriveSweetSpot(region: Record<string, BreakdownEntry>, cask: Record<string, BreakdownEntry>): string | null {
  const topR = Object.entries(region).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  const topC = Object.entries(cask).sort((a, b) => b[1].avgScore - a[1].avgScore)[0];
  if (!topR && !topC) return null;
  return [topR?.[0], topC?.[0]].filter(Boolean).join(" · ");
}

function BreakdownSection({ title, icon: Icon, entries, testId }: {
  title: string; icon: React.ElementType; entries: [string, BreakdownEntry][]; testId: string;
}) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  return (
    <div className="labs-card" style={{ padding: 0, overflow: "hidden" }} data-testid={testId}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", background: "none", border: "none", cursor: "pointer",
          color: "var(--labs-text)", fontFamily: "inherit",
        }}
        data-testid={`button-toggle-${testId}`}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon style={{ width: 16, height: 16, color: "var(--labs-accent)" }} />
          <span className="labs-serif" style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
          <span className="labs-badge labs-badge-accent" style={{ fontSize: 11, padding: "2px 8px" }}>{entries.length}</span>
        </div>
        {open
          ? <ChevronUp style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />
          : <ChevronDown style={{ width: 14, height: 14, color: "var(--labs-text-muted)" }} />}
      </button>
      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          {entries.map(([name, data], idx) => {
            const maxScore = entries[0]?.[1]?.avgScore || 1;
            const pct = maxScore > 0 ? (data.avgScore / maxScore) * 100 : 0;
            return (
              <div key={name} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "8px 0",
                borderBottom: idx < entries.length - 1 ? "1px solid var(--labs-border)" : "none",
              }} data-testid={`row-${testId}-${idx}`}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text)", marginBottom: 4 }}>{String(name ?? "")}</div>
                  <div style={{ height: 4, borderRadius: 2, background: "var(--labs-border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.min(pct, 100)}%`, background: "var(--labs-accent)", borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", minWidth: 50 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>{Number(data.avgScore).toFixed(1)}</div>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{String(data.count ?? 0)} rated</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function LabsTasteProfile() {
  const session = useSession();
  const pid = session.pid;
  const [compareMode, setCompareMode] = useState<CompareMode>("none");

  const { data: profile, isLoading } = useQuery<FlavorProfileData>({
    queryKey: ["flavor-profile", pid],
    queryFn: () => flavorProfileApi.get(pid!),
    enabled: !!pid,
  });

  const { data: globalAvg } = useQuery<Record<string, number>>({
    queryKey: ["global-averages"],
    queryFn: () => flavorProfileApi.getGlobal(),
    enabled: !!pid,
  });

  const { data: whiskyProfile } = useQuery<WhiskyProfileData>({
    queryKey: ["whisky-profile", pid, "all", compareMode],
    queryFn: () => flavorProfileApi.getWhiskyProfile(pid!, "all", compareMode),
    enabled: !!pid,
  });

  if (!session.signedIn || !pid) {
    return (
      <AuthGateMessage
        icon={<Activity className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        message="Sign in to see your flavor fingerprint"
      />
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto">
        <Link href="/labs/taste" style={{ textDecoration: "none" }}>
          <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back">
            <ChevronLeft className="w-4 h-4" /> Taste
          </button>
        </Link>
        <div className="labs-card p-8 text-center">
          <div className="labs-spinner mx-auto" />
        </div>
      </div>
    );
  }

  const totalRatings = profile?.ratedWhiskies?.length || 0;
  const hasData = totalRatings > 0 || (profile?.sources?.journalEntries || 0) > 0;
  const nRatings = whiskyProfile?.ratingStyle?.nRatings || totalRatings;
  const stabilityInfo = getStabilityInfo(nRatings);
  const styleLabel = profile ? deriveStyle(profile.regionBreakdown || {}, profile.peatBreakdown || {}) : null;
  const sweetSpotLabel = profile ? deriveSweetSpot(profile.regionBreakdown || {}, profile.caskBreakdown || {}) : null;

  const dims = ["nose", "taste", "finish", "overall"];
  const dimLabels: Record<string, string> = { nose: "Nose", taste: "Taste", finish: "Finish", overall: "Overall" };

  const radarData = whiskyProfile?.tasteStructure
    ? dims.map(d => ({
        dimension: dimLabels[d],
        value: whiskyProfile.tasteStructure![d] || 0,
        ...(whiskyProfile.comparisonData ? { comparison: whiskyProfile.comparisonData.medians[d] || 0 } : {}),
        ...(globalAvg && compareMode === "none" ? { global: globalAvg[d] ?? 0 } : {}),
        fullMark: 100,
      }))
    : profile?.avgScores
      ? dims.map(d => ({
          dimension: dimLabels[d],
          value: profile.avgScores[d as keyof typeof profile.avgScores],
          ...(globalAvg ? { global: globalAvg[d] ?? 0 } : {}),
          fullMark: 100,
        }))
      : [];

  const regionEntries = profile?.regionBreakdown ? Object.entries(profile.regionBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore) : [];
  const caskEntries = profile?.caskBreakdown ? Object.entries(profile.caskBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore) : [];
  const peatEntries = profile?.peatBreakdown ? Object.entries(profile.peatBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore) : [];

  const compareModes = [
    { key: "none", label: "Just Me" },
    { key: "friends", label: "Friends" },
    { key: "platform", label: "Global" },
  ];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-taste-profile">
      <Link href="/labs/taste" style={{ textDecoration: "none" }}>
        <button className="labs-btn-ghost mb-4" style={{ display: "flex", alignItems: "center", gap: 4 }} data-testid="button-back-profile">
          <ChevronLeft className="w-4 h-4" /> Taste
        </button>
      </Link>

      <div className="flex items-center gap-3 mb-1 labs-fade-in">
        <Activity className="w-5 h-5" style={{ color: "var(--labs-accent)" }} />
        <h1 className="labs-h2" style={{ color: "var(--labs-text)" }} data-testid="text-profile-title">
          CaskSense Profile
        </h1>
      </div>
      <p className="text-sm mb-6 labs-fade-in" style={{ color: "var(--labs-text-muted)" }}>
        Your flavor fingerprint based on {nRatings} ratings
      </p>

      {!hasData ? (
        <div className="labs-empty labs-fade-in">
          <Wine className="w-10 h-10 mb-3" style={{ color: "var(--labs-text-muted)" }} />
          <p style={{ color: "var(--labs-text-secondary)", fontSize: 14 }}>Rate some whiskies to build your profile</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="grid grid-cols-3 gap-3 labs-fade-in labs-stagger-1" data-testid="section-snapshot">
            <div className="labs-card p-4 text-center" data-testid="card-your-style">
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>Your Style</p>
              <p className="text-sm font-semibold" style={{ color: styleLabel ? "var(--labs-accent)" : "var(--labs-text-muted)" }}>
                {styleLabel || "Building..."}
              </p>
            </div>
            <div className="labs-card p-4 text-center" data-testid="card-sweet-spot">
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>Sweet Spot</p>
              <p className="text-sm font-semibold" style={{ color: sweetSpotLabel ? "var(--labs-text)" : "var(--labs-text-muted)" }}>
                {sweetSpotLabel || "Building..."}
              </p>
            </div>
            <div className="labs-card p-4 text-center" data-testid="card-stability">
              <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--labs-text-muted)" }}>Stability</p>
              <span style={{
                display: "inline-block", padding: "2px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 500,
                border: `1px solid ${stabilityInfo.color}`, color: stabilityInfo.color,
              }} data-testid={`badge-stability-${stabilityInfo.level}`}>
                {stabilityInfo.label}
              </span>
            </div>
          </div>

          <div className="labs-fade-in labs-stagger-2" data-testid="section-benchmark-controls">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)" }}>Benchmark against</span>
            </div>
            <div style={{ display: "inline-flex", borderRadius: 8, border: "1px solid var(--labs-border)", overflow: "hidden" }}>
              {compareModes.map((opt, i) => (
                <button
                  key={opt.key}
                  onClick={() => setCompareMode(opt.key as CompareMode)}
                  style={{
                    padding: "6px 14px", fontSize: 12, fontWeight: compareMode === opt.key ? 600 : 400,
                    background: compareMode === opt.key ? "var(--labs-surface-elevated)" : "var(--labs-surface)",
                    color: compareMode === opt.key ? "var(--labs-accent)" : "var(--labs-text-muted)",
                    border: "none", borderRight: i < 2 ? "1px solid var(--labs-border)" : "none",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                  data-testid={`button-segment-${opt.key}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {radarData.length > 0 && (
            <div className="labs-card p-5 labs-fade-in labs-stagger-3" data-testid="section-radar">
              <h2 className="labs-h3 mb-1" style={{ color: "var(--labs-text)" }}>Taste Radar</h2>
              <p className="text-xs mb-4" style={{ color: "var(--labs-text-muted)" }}>
                Your flavor profile across all dimensions
              </p>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                    <PolarGrid stroke="var(--labs-border)" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "var(--labs-text-muted)", fontSize: 11 }} />
                    {(whiskyProfile?.comparisonData || (compareMode === "none" && globalAvg)) && (
                      <Radar
                        name={whiskyProfile?.comparisonData?.mode === "friends" ? "Friends" : "Global"}
                        dataKey={whiskyProfile?.comparisonData ? "comparison" : "global"}
                        stroke="var(--labs-text-muted)" fill="var(--labs-text-muted)" fillOpacity={0.08} strokeDasharray="4 4"
                      />
                    )}
                    <Radar name="You" dataKey="value" stroke="var(--labs-accent)" fill="var(--labs-accent)" fillOpacity={0.25} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {whiskyProfile?.comparisonData && (
                <p className="text-xs text-center mt-2" style={{ color: "var(--labs-text-muted)" }} data-testid="text-comparison-basis">
                  {whiskyProfile.comparisonData.mode === "friends"
                    ? `Based on ${whiskyProfile.comparisonData.nFriends || 0} friends, ${whiskyProfile.comparisonData.nRatings} ratings`
                    : `Based on ${whiskyProfile.comparisonData.nParticipants || 0} tasters, ${whiskyProfile.comparisonData.nRatings} ratings`}
                </p>
              )}
              {whiskyProfile?.confidence && Object.keys(whiskyProfile.confidence).length > 0 && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }} data-testid="section-confidence">
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--labs-text-muted)" }}>Confidence per Dimension</p>
                  <div className="flex flex-wrap gap-2">
                    {dims.map(dim => {
                      const conf = whiskyProfile.confidence[dim];
                      if (!conf) return null;
                      const confColor = conf.level === "high" ? "var(--labs-success)" : conf.level === "medium" ? "var(--labs-accent)" : "var(--labs-text-muted)";
                      return (
                        <span key={dim} style={{
                          display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 6,
                          fontSize: 12, background: "var(--labs-surface)", border: "1px solid var(--labs-border)", color: "var(--labs-text)",
                        }} data-testid={`badge-confidence-${dim}`}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: confColor }} />
                          {dimLabels[dim]}
                          <span style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{String(conf.percent ?? 0)}%</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {whiskyProfile?.ratingStyle && (
            <div className="labs-card p-5 labs-fade-in labs-stagger-3" data-testid="section-rating-style">
              <h2 className="labs-h3 mb-3 flex items-center gap-2" style={{ color: "var(--labs-text)" }}>
                <BarChart3 className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                Rating Style
              </h2>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Mean", value: Number(whiskyProfile.ratingStyle.meanScore).toFixed(1) },
                  { label: "StdDev", value: Number(whiskyProfile.ratingStyle.stdDev).toFixed(2) },
                  { label: "Range", value: `${String(whiskyProfile.ratingStyle.scaleRange?.min ?? "?")}–${String(whiskyProfile.ratingStyle.scaleRange?.max ?? "?")}` },
                  { label: "Count", value: String(whiskyProfile.ratingStyle.nRatings || 0) },
                ].map(s => (
                  <div key={s.label} style={{ background: "var(--labs-bg)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--labs-text)", fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              {whiskyProfile.ratingStyle.systematicDeviation && (
                <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--labs-border)" }}>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginBottom: 4 }}>Avg Delta vs Platform</div>
                  <div style={{
                    fontSize: 18, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                    color: whiskyProfile.ratingStyle.systematicDeviation.avgDelta >= 0 ? "var(--labs-success)" : "var(--labs-danger)",
                  }}>
                    {Number(whiskyProfile.ratingStyle.systematicDeviation.avgDelta) >= 0 ? "+" : ""}
                    {Number(whiskyProfile.ratingStyle.systematicDeviation.avgDelta).toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--labs-text-muted)" }}>
                    Compared across {String(whiskyProfile.ratingStyle.systematicDeviation.nWhiskiesCompared ?? 0)} whiskies
                  </div>
                </div>
              )}
            </div>
          )}

          <BreakdownSection title="By Region" icon={MapPin} entries={regionEntries} testId="section-region-breakdown" />
          <BreakdownSection title="By Cask Type" icon={Cog} entries={caskEntries} testId="section-cask-breakdown" />
          <BreakdownSection title="By Peat Level" icon={Flame} entries={peatEntries} testId="section-peat-breakdown" />

          {whiskyProfile?.whiskyComparison && whiskyProfile.whiskyComparison.length > 0 && (
            <div className="labs-card p-5 labs-fade-in" data-testid="section-whisky-comparison">
              <h2 className="labs-h3 mb-1 flex items-center gap-2" style={{ color: "var(--labs-text)" }}>
                <Globe className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                Your Scores vs Platform
              </h2>
              <p className="text-xs mb-3" style={{ color: "var(--labs-text-muted)" }}>How your scores compare to the platform average</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr>
                      {["Whisky", "You", "Platform", "Delta"].map(h => (
                        <th key={h} style={{
                          textAlign: h === "Whisky" ? "left" : "right", padding: "6px 4px",
                          color: "var(--labs-text-muted)", fontWeight: 600, borderBottom: "1px solid var(--labs-border)",
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {whiskyProfile.whiskyComparison.slice(0, 10).map((w, idx) => (
                      <tr key={w.whiskyId} data-testid={`row-comparison-${idx}`}>
                        <td style={{ padding: "6px 4px", color: "var(--labs-text)", borderBottom: "1px solid var(--labs-border)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {String(w.whiskyName ?? "") || "—"}
                        </td>
                        <td style={{ padding: "6px 4px", textAlign: "right", color: "var(--labs-text)", fontWeight: 600, borderBottom: "1px solid var(--labs-border)", fontVariantNumeric: "tabular-nums" }}>
                          {w.userScore != null ? Number(w.userScore).toFixed(1) : "—"}
                        </td>
                        <td style={{ padding: "6px 4px", textAlign: "right", color: "var(--labs-text-muted)", borderBottom: "1px solid var(--labs-border)", fontVariantNumeric: "tabular-nums" }}>
                          {w.platformMedian != null ? Number(w.platformMedian).toFixed(1) : "—"}
                        </td>
                        <td style={{
                          padding: "6px 4px", textAlign: "right", fontWeight: 600, borderBottom: "1px solid var(--labs-border)",
                          color: (Number(w.delta) || 0) >= 0 ? "var(--labs-success)" : "var(--labs-danger)", fontVariantNumeric: "tabular-nums",
                        }}>
                          {w.delta != null ? `${Number(w.delta) >= 0 ? "+" : ""}${Number(w.delta).toFixed(1)}` : "—"}
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
