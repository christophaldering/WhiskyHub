import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { flavorProfileApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Activity, ChevronDown, ChevronUp, Users, Globe, User, BookOpen, Info } from "lucide-react";
import { GuestPreview } from "@/components/guest-preview";
import { Link } from "wouter";
import { FlavorWheelContent } from "./flavor-wheel";

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

function StabilityBadge({ level, percent, t }: { level: string; percent: number; t: any }) {
  const color = level === "stable" ? "text-green-600 bg-green-50 border-green-200" :
    level === "tendency" ? "text-amber-600 bg-amber-50 border-amber-200" :
    "text-slate-500 bg-slate-50 border-slate-200";
  const label = level === "stable" ? t("flavorProfile.stable") :
    level === "tendency" ? t("flavorProfile.tendency") : t("flavorProfile.preliminary");
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${color}`} data-testid={`badge-stability-${level}`}>
      {label} {percent < 100 && <span className="opacity-60">{percent}%</span>}
    </span>
  );
}

function DetailsPanel({ children, label, t }: { children: React.ReactNode; label?: string; t: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="text-xs text-primary/70 hover:text-primary flex items-center gap-1" data-testid="button-toggle-details">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? t("flavorProfile.hideDetails") : t("flavorProfile.showDetails")}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground space-y-1 font-mono">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhiskyProfileTab({ participantId, t, isDE }: { participantId: string; t: any; isDE: boolean }) {
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
      <div className="space-y-4">
        <div className="h-32 bg-card/50 rounded-lg animate-pulse" />
        <div className="h-48 bg-card/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!profile?.ratingStyle) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p className="font-serif">{t("flavorProfile.empty")}</p>
      </div>
    );
  }

  const { ratingStyle, tasteStructure, whiskyComparison, confidence, comparisonData } = profile;
  const dims = ["nose", "taste", "finish", "balance", "overall"];
  const dimLabels: Record<string, string> = {
    nose: isDE ? "Nase" : "Nose", taste: isDE ? "Geschmack" : "Taste",
    finish: isDE ? "Abgang" : "Finish", balance: "Balance", overall: isDE ? "Gesamt" : "Overall",
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
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center" data-testid="profile-controls">
        <div className="flex rounded-lg border border-border/40 overflow-hidden text-xs">
          <button onClick={() => setSource("all")} className={`px-3 py-1.5 transition-colors ${source === "all" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-source-all">
            {t("flavorProfile.sourceAll")}
          </button>
          <button onClick={() => setSource("journal")} className={`px-3 py-1.5 transition-colors ${source === "journal" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-source-journal">
            {t("flavorProfile.sourceJournal")}
          </button>
          <button onClick={() => setSource("imported")} className={`px-3 py-1.5 transition-colors ${source === "imported" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-source-imported">
            {t("flavorProfile.sourceImported")}
          </button>
          <button onClick={() => setSource("all_incl_imported")} className={`px-3 py-1.5 transition-colors ${source === "all_incl_imported" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-source-all-incl-imported">
            {t("flavorProfile.sourceAllInclImported")}
          </button>
        </div>
        <div className="flex rounded-lg border border-border/40 overflow-hidden text-xs ml-auto">
          <button onClick={() => setCompareMode("none")} className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${compareMode === "none" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-compare-none">
            <User className="w-3 h-3" /> {t("flavorProfile.compareNone")}
          </button>
          <button onClick={() => setCompareMode("friends")} className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${compareMode === "friends" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-compare-friends">
            <Users className="w-3 h-3" /> {t("flavorProfile.compareFriends")}
          </button>
          <button onClick={() => setCompareMode("platform")} className={`px-3 py-1.5 flex items-center gap-1 transition-colors ${compareMode === "platform" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`} data-testid="button-compare-platform">
            <Globe className="w-3 h-3" /> {t("flavorProfile.comparePlatform")}
          </button>
        </div>
      </div>

      {tasteStructure && source !== "journal" && (
        <div className="bg-card rounded-lg border border-border/40 p-6">
          <h2 className="text-lg font-serif font-semibold mb-1">{t("flavorProfile.radarTitle")}</h2>
          <p className="text-xs text-muted-foreground mb-4">{t("flavorProfile.radarSubtitle", { count: ratingStyle.nRatings })}</p>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "serif" }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                {comparisonData && (
                  <Radar name={comparisonData.mode === "friends" ? t("flavorProfile.compareFriends") : t("flavorProfile.comparePlatform")} dataKey="comparison" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeDasharray="4 4" />
                )}
                <Radar name="Profile" dataKey="value" stroke="#c8a864" fill="#c8a864" fillOpacity={0.3} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {comparisonData && (
            <p className="text-xs text-muted-foreground mt-2 text-center" data-testid="text-comparison-basis">
              {comparisonData.mode === "friends"
                ? t("flavorProfile.friendsBasis", { n: comparisonData.nFriends, r: comparisonData.nRatings })
                : t("flavorProfile.platformBasisFull", { n: comparisonData.nParticipants, r: comparisonData.nRatings })}
            </p>
          )}

          {comparisonData && (
            <div className="mt-4 pt-4 border-t border-border/20 space-y-2">
              {dims.map(dim => {
                const userVal = tasteStructure[dim] || 0;
                const compVal = comparisonData.medians[dim] || 0;
                const diff = Math.round((userVal - compVal) * 10) / 10;
                const iqr = comparisonData.iqrs?.[dim];
                return (
                  <div key={dim} className="flex items-center justify-between text-sm">
                    <span className="font-serif text-muted-foreground w-20">{dimLabels[dim]}</span>
                    <div className="flex items-center gap-3 flex-1 justify-end">
                      <span className="font-mono text-foreground font-medium">{userVal.toFixed(1)}</span>
                      <span className="text-muted-foreground/50">vs</span>
                      <span className="font-mono text-muted-foreground">{compVal.toFixed(1)}</span>
                      {iqr && <span className="text-[10px] text-muted-foreground/50">(IQR {iqr.iqr.toFixed(1)})</span>}
                      <span className={`font-mono text-xs w-14 text-right ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
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

      <div className="bg-card rounded-lg border border-border/40 p-6" data-testid="section-rating-style">
        <h2 className="text-lg font-serif font-semibold mb-1">{t("flavorProfile.ratingStyleTitle")}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t("flavorProfile.ratingStyleSubtitle")}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <div className="text-xl font-serif font-bold text-primary" data-testid="text-mean-score">{ratingStyle.meanScore}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t("flavorProfile.meanScore")}</div>
          </div>
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <div className="text-xl font-serif font-bold text-foreground" data-testid="text-std-dev">{ratingStyle.stdDev}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t("flavorProfile.stdDev")}</div>
          </div>
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <div className="text-xl font-serif font-bold text-foreground" data-testid="text-scale-range">{ratingStyle.scaleRange.min}–{ratingStyle.scaleRange.max}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t("flavorProfile.scaleRange")}</div>
          </div>
          <div className="text-center p-3 bg-muted/20 rounded-lg">
            <div className="text-xl font-serif font-bold text-foreground" data-testid="text-n-ratings">{ratingStyle.nRatings}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">N</div>
          </div>
        </div>

        {dev && (
          <div className="border-t border-border/20 pt-4">
            <h3 className="text-sm font-serif font-semibold mb-2">{t("flavorProfile.systematicDeviation")}</h3>
            <div className="flex items-center gap-4 mb-2">
              <div className={`text-2xl font-serif font-bold ${dev.avgDelta > 0 ? "text-green-600" : dev.avgDelta < 0 ? "text-red-500" : "text-muted-foreground"}`} data-testid="text-avg-delta">
                {dev.avgDelta > 0 ? "+" : ""}{dev.avgDelta}
              </div>
              <div className="text-xs text-muted-foreground">
                <StabilityBadge level={confidence.overall?.level || "preliminary"} percent={confidence.overall?.percent || 0} t={t} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mb-1" data-testid="text-deviation-interpretation">
              {deltaDir
                ? t("flavorProfile.deviationDesc", { direction: t(`flavorProfile.deviation${deltaDir === "positive" ? "Positive" : "Negative"}`) })
                : t("flavorProfile.deviationNeutral")}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {t("flavorProfile.nWhiskiesCompared", { n: dev.nWhiskiesCompared })} · {t("flavorProfile.platformBasis", { n: dev.nPlatformRatings, p: dev.nPlatformParticipants })}
            </p>
            {dev.deltaStdDev !== null && (
              <p className="text-[10px] text-muted-foreground/70">
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

      <div className="bg-card rounded-lg border border-border/40 p-6" data-testid="section-confidence">
        <h2 className="text-sm font-serif font-semibold mb-3">{t("flavorProfile.confidenceTitle")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {dims.map(dim => {
            const c = confidence[dim];
            if (!c) return null;
            return (
              <div key={dim} className="text-center p-2 bg-muted/20 rounded-lg" data-testid={`confidence-${dim}`}>
                <div className="text-xs font-serif text-muted-foreground mb-1">{dimLabels[dim]}</div>
                <StabilityBadge level={c.level} percent={c.percent} t={t} />
                <div className="text-[10px] text-muted-foreground/60 mt-1">N = {c.n}</div>
              </div>
            );
          })}
        </div>
        <DetailsPanel t={t}>
          <p>{t("flavorProfile.formulaStability")}</p>
          <p>{isDE ? "Stabilität % = min(100, N × 6.67)" : "Stability % = min(100, N × 6.67)"}</p>
        </DetailsPanel>
      </div>

      {whiskyComparison.length > 0 && (
        <div className="bg-card rounded-lg border border-border/40 p-6" data-testid="section-whisky-comparison">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-serif font-semibold">{t("flavorProfile.whiskyComparisonTitle")}</h2>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input type="checkbox" checked={showWhiskyComparison} onChange={(e) => setShowWhiskyComparison(e.target.checked)} className="rounded border-border" data-testid="checkbox-show-comparison" />
              {t("flavorProfile.showComparison")}
            </label>
          </div>

          {showWhiskyComparison && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30">
                      <th className="text-left py-2 font-serif font-semibold text-muted-foreground">Whisky</th>
                      <th className="text-right py-2 font-serif font-semibold text-muted-foreground">{t("flavorProfile.userScore")}</th>
                      <th className="text-right py-2 font-serif font-semibold text-muted-foreground">{t("flavorProfile.platformMedian")}</th>
                      <th className="text-right py-2 font-serif font-semibold text-muted-foreground">{t("flavorProfile.delta")}</th>
                      <th className="text-right py-2 font-serif font-semibold text-muted-foreground">{t("flavorProfile.iqrLabel")}</th>
                      <th className="text-right py-2 font-serif font-semibold text-muted-foreground">{t("flavorProfile.platformN")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whiskyComparison.map(w => (
                      <tr key={w.whiskyId} className="border-b border-border/10 hover:bg-muted/10" data-testid={`row-whisky-${w.whiskyId}`}>
                        <td className="py-2">
                          <div className="font-medium text-foreground">{w.whiskyName}</div>
                          {(w.distillery || w.region) && (
                            <div className="text-[10px] text-muted-foreground">{[w.distillery, w.region].filter(Boolean).join(" · ")}</div>
                          )}
                        </td>
                        <td className="text-right py-2 font-mono font-medium text-foreground">{w.userScore}</td>
                        <td className="text-right py-2 font-mono text-muted-foreground">{w.platformMedian}</td>
                        <td className={`text-right py-2 font-mono ${w.delta > 0 ? "text-green-500" : w.delta < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {w.delta > 0 ? "+" : ""}{w.delta}
                        </td>
                        <td className="text-right py-2 font-mono text-muted-foreground/60">
                          {w.iqr ? w.iqr.iqr.toFixed(1) : "–"}
                        </td>
                        <td className="text-right py-2 font-mono text-muted-foreground/60">{w.platformN}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <DetailsPanel t={t}>
                <p>{isDE ? "Jede Zeile vergleicht deine Bewertung mit dem Plattform-Median für denselben Whisky." : "Each row compares your score to the platform median for the same whisky."}</p>
                <p>{isDE ? "IQR = Interquartilsabstand (Q3 − Q1), zeigt die Streuung der Plattform-Bewertungen." : "IQR = Interquartile Range (Q3 − Q1), shows spread of platform ratings."}</p>
                <p>{isDE ? "N = Anzahl Plattform-Bewertungen für diesen Whisky." : "N = Number of platform ratings for this whisky."}</p>
              </DetailsPanel>
            </motion.div>
          )}
        </div>
      )}

      <div className="text-center">
        <Link href="/method" className="inline-flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors" data-testid="link-method">
          <BookOpen className="w-3.5 h-3.5" />
          {t("flavorProfile.methodLink")}
        </Link>
      </div>
    </div>
  );
}

export default function FlavorProfile() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const [activeTab, setActiveTab] = useState<"taste" | "profile" | "wheel">("taste");

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
      <GuestPreview featureTitle={t("flavorProfile.title")} featureDescription={t("guestPreview.flavorProfile")}>
        <div className="space-y-4">
          <h1 className="text-2xl font-serif font-bold">{t("flavorProfile.title")}</h1>
          <div className="bg-card rounded-xl border p-6 flex items-center justify-center" style={{height: 300}}>
            <div className="text-center space-y-3">
              <div className="grid grid-cols-3 gap-6 text-sm">
                {[{label: "Fruity", val: "8.4"}, {label: "Smoky", val: "6.2"}, {label: "Sweet", val: "7.8"}, {label: "Spicy", val: "5.5"}, {label: "Floral", val: "4.1"}, {label: "Maritime", val: "7.0"}].map(f => (
                  <div key={f.label} className="text-center"><div className="text-lg font-serif font-bold text-primary">{f.val}</div><div className="text-muted-foreground text-xs">{f.label}</div></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </GuestPreview>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-card/50 rounded animate-pulse mb-4" />
        <div className="h-64 bg-card/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const radarData = profile?.avgScores ? [
    { dimension: isDE ? "Nase" : "Nose", value: profile.avgScores.nose, global: globalAvg?.nose ?? 0, fullMark: 100 },
    { dimension: isDE ? "Geschmack" : "Taste", value: profile.avgScores.taste, global: globalAvg?.taste ?? 0, fullMark: 100 },
    { dimension: isDE ? "Abgang" : "Finish", value: profile.avgScores.finish, global: globalAvg?.finish ?? 0, fullMark: 100 },
    { dimension: isDE ? "Balance" : "Balance", value: profile.avgScores.balance, global: globalAvg?.balance ?? 0, fullMark: 100 },
    { dimension: isDE ? "Gesamt" : "Overall", value: profile.avgScores.overall, global: globalAvg?.overall ?? 0, fullMark: 100 },
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
    <div className="max-w-4xl mx-auto px-4 py-8 min-w-0 overflow-x-hidden" data-testid="flavor-profile-page">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="flex items-center gap-3 mb-2">
          <Activity className="w-7 h-7 text-primary" />
          <h1 className="text-2xl md:text-3xl font-serif font-bold text-primary" data-testid="text-flavor-title">
            {t("flavorProfile.title")}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t("flavorProfile.subtitle")}</p>

        <div className="flex border-b border-border/40 mb-6">
          <button
            onClick={() => setActiveTab("taste")}
            className={`px-4 py-2.5 text-sm font-serif font-medium transition-colors border-b-2 -mb-px ${activeTab === "taste" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid="tab-taste"
          >
            {t("flavorProfile.tabTaste")}
          </button>
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 text-sm font-serif font-medium transition-colors border-b-2 -mb-px ${activeTab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid="tab-profile"
          >
            {t("flavorProfile.tabProfile")}
          </button>
          <button
            onClick={() => setActiveTab("wheel")}
            className={`px-4 py-2.5 text-sm font-serif font-medium transition-colors border-b-2 -mb-px ${activeTab === "wheel" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            data-testid="tab-wheel"
          >
            {t("flavorProfile.tabWheel")}
          </button>
        </div>

        {activeTab === "taste" && (
          <>
            {profile?.sources && (profile.sources.tastingRatings > 0 || profile.sources.journalEntries > 0) && (
              <p className="text-xs text-muted-foreground/70 mb-8" data-testid="text-flavor-sources">
                {isDE
                  ? `Basierend auf ${profile.sources.tastingRatings} Tasting-Bewertung${profile.sources.tastingRatings !== 1 ? "en" : ""} und ${profile.sources.journalEntries} Journal-Eintr${profile.sources.journalEntries !== 1 ? "ägen" : "ag"}`
                  : `Based on ${profile.sources.tastingRatings} tasting rating${profile.sources.tastingRatings !== 1 ? "s" : ""} and ${profile.sources.journalEntries} journal entr${profile.sources.journalEntries !== 1 ? "ies" : "y"}`}
              </p>
            )}

            {!hasData ? (
              <div className="text-center py-16 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="font-serif">{t("flavorProfile.empty")}</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-card rounded-lg border border-border/40 p-6">
                  <h2 className="text-lg font-serif font-semibold mb-1 text-foreground">{t("flavorProfile.radarTitle")}</h2>
                  <p className="text-xs text-muted-foreground mb-4">{t("flavorProfile.radarSubtitle", { count: totalRatings })}</p>
                  <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontFamily: "serif" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                        <Radar name={isDE ? "Alle" : "Everyone"} dataKey="global" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.1} strokeDasharray="4 4" />
                        <Radar name="Profile" dataKey="value" stroke="#c8a864" fill="#c8a864" fillOpacity={0.3} strokeWidth={2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {profile?.avgScores && globalAvg && globalAvg.totalRatings > 0 && (
                    <div className="mt-6 pt-4 border-t border-border/20">
                      <h3 className="text-sm font-serif font-bold text-muted-foreground uppercase tracking-widest mb-3">{t("flavorProfile.personalVsGlobal")}</h3>
                      <div className="text-xs text-muted-foreground mb-3">{t("flavorProfile.globalBasedOn", { ratings: globalAvg.totalRatings, participants: globalAvg.totalParticipants })}</div>
                      <div className="space-y-2">
                        {[
                          { key: "nose", label: isDE ? "Nase" : "Nose", personal: profile.avgScores.nose, global: globalAvg.nose },
                          { key: "taste", label: isDE ? "Geschmack" : "Taste", personal: profile.avgScores.taste, global: globalAvg.taste },
                          { key: "finish", label: isDE ? "Abgang" : "Finish", personal: profile.avgScores.finish, global: globalAvg.finish },
                          { key: "balance", label: "Balance", personal: profile.avgScores.balance, global: globalAvg.balance },
                          { key: "overall", label: isDE ? "Gesamt" : "Overall", personal: profile.avgScores.overall, global: globalAvg.overall },
                        ].map(({ key, label, personal, global }) => {
                          const diff = Math.round((personal - global) * 10) / 10;
                          return (
                            <div key={key} className="flex items-center justify-between text-sm">
                              <span className="font-serif text-muted-foreground w-20">{label}</span>
                              <div className="flex items-center gap-4 flex-1 justify-end">
                                <span className="font-mono text-foreground font-medium">{personal.toFixed(1)}</span>
                                <span className="text-muted-foreground/50">vs</span>
                                <span className="font-mono text-muted-foreground">{global.toFixed(1)}</span>
                                <span className={`font-mono text-xs w-14 text-right ${diff > 0 ? "text-green-500" : diff < 0 ? "text-red-400" : "text-muted-foreground"}`}>
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
                  <div className="bg-card rounded-lg border border-border/40 p-6">
                    <h2 className="text-lg font-serif font-semibold mb-1">{t("flavorProfile.regionTitle")}</h2>
                    <p className="text-xs text-muted-foreground mb-4">{t("flavorProfile.regionSubtitle")}</p>
                    <div className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={regionData} layout="vertical" margin={{ left: 80 }}>
                          <XAxis type="number" domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                          <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} width={75} />
                          <Tooltip
                            contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                            labelStyle={{ color: "hsl(var(--foreground))" }}
                            formatter={(value: number, name: string) => [value.toFixed(1), name === "avgScore" ? (isDE ? "Ø Bewertung" : "Avg Score") : (isDE ? "Anzahl" : "Count")]}
                          />
                          <Bar dataKey="avgScore" radius={[0, 4, 4, 0]}>
                            {regionData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {peatData.length > 0 && (
                    <div className="bg-card rounded-lg border border-border/40 p-6">
                      <h2 className="text-base font-serif font-semibold mb-3">{t("flavorProfile.peatTitle")}</h2>
                      <div className="space-y-3">
                        {peatData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{d.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${d.avgScore}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">{d.avgScore}</span>
                              <span className="text-[10px] text-muted-foreground/60">({d.count})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {caskData.length > 0 && (
                    <div className="bg-card rounded-lg border border-border/40 p-6">
                      <h2 className="text-base font-serif font-semibold mb-3">{t("flavorProfile.caskTitle")}</h2>
                      <div className="space-y-3">
                        {caskData.map((d) => (
                          <div key={d.name} className="flex items-center justify-between">
                            <span className="text-sm text-foreground">{d.name}</span>
                            <div className="flex items-center gap-3">
                              <div className="w-24 h-2 bg-secondary/50 rounded-full overflow-hidden">
                                <div className="h-full bg-primary/60 rounded-full" style={{ width: `${d.avgScore}%` }} />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">{d.avgScore}</span>
                              <span className="text-[10px] text-muted-foreground/60">({d.count})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {topWhiskies.length > 0 && (
                  <div className="bg-card rounded-lg border border-border/40 p-6">
                    <h2 className="text-lg font-serif font-semibold mb-4">{t("flavorProfile.topTitle")}</h2>
                    <div className="space-y-3">
                      {topWhiskies.map((item, i) => (
                        <div key={item.whisky.id} className="flex items-center gap-4 py-2 border-b border-border/20 last:border-0">
                          <span className="text-lg font-serif font-bold text-primary/60 w-8">{i + 1}</span>
                          {item.whisky.imageUrl && (
                            <img src={item.whisky.imageUrl} alt={item.whisky.name} className="w-10 h-10 rounded object-cover" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{item.whisky.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {[item.whisky.distillery, item.whisky.region, item.whisky.age ? `${item.whisky.age}y` : null].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-serif font-bold text-primary">{item.rating.overall.toFixed(1)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "profile" && currentParticipant && (
          <WhiskyProfileTab participantId={currentParticipant.id} t={t} isDE={isDE} />
        )}

        {activeTab === "wheel" && currentParticipant && (
          <FlavorWheelContent />
        )}
      </motion.div>
    </div>
  );
}
