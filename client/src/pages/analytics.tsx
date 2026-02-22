import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { platformAnalyticsApi } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { motion } from "framer-motion";
import { useState } from "react";
import { BarChart3, TrendingUp, Brain, Users, Wine, Target, ArrowUpDown, Sparkles, Loader2, ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ScatterChart, Scatter, ZAxis, CartesianGrid, Legend, Cell,
} from "recharts";

type Tab = "quality" | "validity" | "ai";

const COLORS = ["#8b5e3c", "#c4956a", "#6b8f71", "#5a7d9a", "#9b6b8e", "#b8860b", "#708090", "#cd853f"];

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3.5 h-3.5 text-muted-foreground/60 cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-xs">{text}</TooltipContent>
    </Tooltip>
  );
}

function AgreementBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground italic">n/a</span>;
  const color = value >= 0.7 ? "text-green-600 bg-green-50" : value >= 0.4 ? "text-amber-600 bg-amber-50" : "text-red-600 bg-red-50";
  const label = value >= 0.7 ? "strong" : value >= 0.4 ? "moderate" : "weak";
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`} data-testid="badge-agreement">
      {value.toFixed(2)} ({label})
    </span>
  );
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-card border border-border/40 rounded-lg p-4 flex items-center gap-3" data-testid={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <div className="text-2xl font-serif font-bold text-primary">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="text-[10px] text-muted-foreground/70">{sub}</div>}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { t, i18n } = useTranslation();
  const { currentParticipant } = useAppStore();
  const isDE = i18n.language === "de";
  const [activeTab, setActiveTab] = useState<Tab>("quality");
  const [expandedProperty, setExpandedProperty] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-analytics", currentParticipant?.id],
    queryFn: () => platformAnalyticsApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const aiMutation = useMutation({
    mutationFn: () => platformAnalyticsApi.getAiAnalysis(currentParticipant!.id, data),
  });

  if (!currentParticipant) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">{isDE ? "Bitte melde dich an." : "Please sign in."}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const mq = data?.measurementQuality;
  const pv = data?.predictiveValidity;
  const summary = data?.summary;

  const tabs: { id: Tab; icon: any; label: string }[] = [
    { id: "quality", icon: Target, label: isDE ? "Messqualität" : "Measurement Quality" },
    { id: "validity", icon: TrendingUp, label: isDE ? "Prädiktive Validität" : "Predictive Validity" },
    { id: "ai", icon: Brain, label: isDE ? "KI-Auswertung" : "AI Analysis" },
  ];

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-serif font-bold text-primary flex items-center gap-2" data-testid="text-analytics-title">
          <BarChart3 className="w-7 h-7" />
          {isDE ? "Plattform-Analytics" : "Platform Analytics"}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {isDE
            ? "Statistische Analyse aller abgeschlossenen Tastings — Messqualität, Muster und KI-Erkenntnisse."
            : "Statistical analysis of all completed tastings — measurement quality, patterns, and AI insights."}
        </p>
      </motion.div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={Wine} label={isDE ? "Tastings" : "Tastings"} value={summary.totalTastings} />
          <StatCard icon={BarChart3} label={isDE ? "Bewertungen" : "Ratings"} value={summary.totalRatings} />
          <StatCard icon={Users} label={isDE ? "Teilnehmer" : "Participants"} value={summary.totalParticipants} />
          <StatCard icon={Wine} label={isDE ? "Whiskys" : "Whiskies"} value={summary.totalWhiskies} />
        </div>
      )}

      {summary?.totalTastings === 0 ? (
        <div className="bg-card border border-border/40 rounded-lg p-8 text-center">
          <Wine className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground font-serif">
            {isDE ? "Noch keine abgeschlossenen Tastings für die Analyse." : "No completed tastings available for analysis yet."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 border-b border-border/40">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
                data-testid={`tab-${tab.id}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "quality" && mq && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Inter-Rater Agreement */}
              <section className="bg-card border border-border/40 rounded-lg p-5">
                <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-1" data-testid="text-ira-title">
                  <Users className="w-5 h-5" />
                  {isDE ? "Inter-Rater-Übereinstimmung" : "Inter-Rater Agreement"}
                  <InfoTip text={isDE
                    ? "Kendalls W misst, wie einig sich die Teilnehmer in der Rangfolge der Whiskys sind. 1.0 = perfekte Übereinstimmung, 0.0 = zufällig."
                    : "Kendall's W measures how much raters agree on the ranking of whiskies. 1.0 = perfect agreement, 0.0 = random."
                  } />
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {isDE ? "Wie einig sind sich die Teilnehmer bei der Rangfolge?" : "How much do participants agree on whisky rankings?"}
                </p>
                <div className="space-y-2">
                  {mq.interRaterAgreement.map((ira: any) => (
                    <div key={ira.tastingId} className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded" data-testid={`ira-row-${ira.tastingId}`}>
                      <div>
                        <span className="font-medium text-sm">{ira.title}</span>
                        <span className="text-xs text-muted-foreground ml-2">{ira.date}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{ira.raterCount} {isDE ? "Bewerter" : "raters"} · {ira.whiskyCount} {isDE ? "Whiskys" : "whiskies"}</span>
                        <AgreementBadge value={ira.agreement} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Rater Consistency */}
              <section className="bg-card border border-border/40 rounded-lg p-5">
                <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-1" data-testid="text-consistency-title">
                  <ArrowUpDown className="w-5 h-5" />
                  {isDE ? "Bewerter-Konsistenz" : "Rater Consistency"}
                  <InfoTip text={isDE
                    ? "Standardabweichung: Wie stark schwanken die Bewertungen eines Teilnehmers? Niedriger = konsistenter. Bias = Abweichung vom Gesamtdurchschnitt."
                    : "Standard deviation: How much do a participant's ratings vary? Lower = more consistent. Bias = deviation from the global average."
                  } />
                </h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {isDE ? "Wie konsistent bewertet jeder Teilnehmer?" : "How consistently does each participant rate?"}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 text-muted-foreground text-xs">
                        <th className="text-left py-2 px-2">{isDE ? "Teilnehmer" : "Participant"}</th>
                        <th className="text-center py-2 px-2">{isDE ? "Bewertungen" : "Ratings"}</th>
                        <th className="text-center py-2 px-2">{isDE ? "Ø Wertung" : "Avg Score"}</th>
                        <th className="text-center py-2 px-2">{isDE ? "Streuung (σ)" : "Spread (σ)"}</th>
                        <th className="text-center py-2 px-2">Bias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mq.raterConsistency
                        .filter((rc: any) => rc.consistency !== null)
                        .sort((a: any, b: any) => a.consistency - b.consistency)
                        .map((rc: any) => (
                          <tr key={rc.participantId} className="border-b border-border/20 hover:bg-secondary/20" data-testid={`consistency-row-${rc.participantId}`}>
                            <td className="py-2 px-2 font-medium">{rc.name}</td>
                            <td className="py-2 px-2 text-center text-muted-foreground">{rc.ratingCount}</td>
                            <td className="py-2 px-2 text-center">{rc.avgScore}</td>
                            <td className="py-2 px-2 text-center">
                              <span className={rc.consistency < 10 ? "text-green-600" : rc.consistency < 20 ? "text-amber-600" : "text-red-600"}>
                                {rc.consistency}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={rc.bias > 0 ? "text-green-600" : rc.bias < 0 ? "text-red-600" : ""}>
                                {rc.bias > 0 ? "+" : ""}{rc.bias}
                              </span>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Distribution Analysis */}
              {mq.distributionAnalysis && (
                <section className="bg-card border border-border/40 rounded-lg p-5">
                  <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-1" data-testid="text-distribution-title">
                    <BarChart3 className="w-5 h-5" />
                    {isDE ? "Verteilungsanalyse" : "Distribution Analysis"}
                    <InfoTip text={isDE
                      ? "Verteilung aller normalisierten Gesamtbewertungen. Schiefe > 0 = rechtslastig (eher hohe Werte), < 0 = linkslastig."
                      : "Distribution of all normalized overall scores. Skewness > 0 = right-skewed (tendency toward high scores), < 0 = left-skewed."
                    } />
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{mq.distributionAnalysis.mean}</div>
                      <div className="text-xs text-muted-foreground">{isDE ? "Mittelwert" : "Mean"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{mq.distributionAnalysis.median}</div>
                      <div className="text-xs text-muted-foreground">{isDE ? "Median" : "Median"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{mq.distributionAnalysis.stdDev}</div>
                      <div className="text-xs text-muted-foreground">{isDE ? "Std.abw." : "Std Dev"}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-primary">{mq.distributionAnalysis.skewness}</div>
                      <div className="text-xs text-muted-foreground">{isDE ? "Schiefe" : "Skewness"}</div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={mq.distributionAnalysis.histogram}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={1} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <RechartsTooltip />
                      <Bar dataKey="count" fill="#8b5e3c" radius={[3, 3, 0, 0]} name={isDE ? "Anzahl" : "Count"} />
                    </BarChart>
                  </ResponsiveContainer>
                </section>
              )}
            </motion.div>
          )}

          {activeTab === "validity" && pv && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              {/* Category Correlations */}
              {pv.categoryCorrelations && (
                <section className="bg-card border border-border/40 rounded-lg p-5">
                  <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-1" data-testid="text-correlations-title">
                    <TrendingUp className="w-5 h-5" />
                    {isDE ? "Kategorie-Korrelationen" : "Category Correlations"}
                    <InfoTip text={isDE
                      ? "Pearson-Korrelation: Wie stark hängt jede Teilkategorie mit der Gesamtbewertung zusammen? 1.0 = perfekt, 0.0 = kein Zusammenhang."
                      : "Pearson correlation: How strongly does each sub-category relate to the overall score? 1.0 = perfect, 0.0 = no relationship."
                    } />
                  </h2>
                  <p className="text-xs text-muted-foreground mb-4">
                    {isDE ? "Welche Kategorie beeinflusst die Gesamtbewertung am stärksten?" : "Which category influences the overall score the most?"}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(["nose", "taste", "finish", "balance"] as const).map(cat => {
                      const val = pv.categoryCorrelations[cat];
                      const pct = Math.round(val * 100);
                      const color = val >= 0.8 ? "text-green-600" : val >= 0.5 ? "text-amber-600" : "text-red-600";
                      return (
                        <div key={cat} className="text-center bg-secondary/30 rounded-lg p-4" data-testid={`correlation-${cat}`}>
                          <div className={`text-2xl font-bold ${color}`}>{val.toFixed(2)}</div>
                          <div className="text-sm font-medium capitalize mt-1">
                            {isDE ? ({ nose: "Nase", taste: "Geschmack", finish: "Abgang", balance: "Balance" }[cat]) : cat}
                          </div>
                          <div className="w-full bg-border/30 rounded-full h-1.5 mt-2">
                            <div className={`h-1.5 rounded-full ${val >= 0.8 ? "bg-green-500" : val >= 0.5 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${Math.abs(pct)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Property Rankings */}
              {pv.propertyRankings?.length > 0 && (
                <section className="bg-card border border-border/40 rounded-lg p-5">
                  <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-1" data-testid="text-properties-title">
                    <Wine className="w-5 h-5" />
                    {isDE ? "Eigenschafts-Rankings" : "Property Rankings"}
                    <InfoTip text={isDE
                      ? "Durchschnittliche Bewertung nach Whisky-Eigenschaft. Zeigt, welche Regionen, Fasstypen etc. am besten abschneiden."
                      : "Average rating by whisky property. Shows which regions, cask types, etc. score highest."
                    } />
                  </h2>
                  <div className="space-y-3 mt-4">
                    {pv.propertyRankings.map((pg: any) => {
                      const propLabel: Record<string, { en: string; de: string }> = {
                        region: { en: "Region", de: "Region" },
                        category: { en: "Category", de: "Kategorie" },
                        caskInfluence: { en: "Cask Type", de: "Fasstyp" },
                        peatLevel: { en: "Peat Level", de: "Torfgehalt" },
                        ageBand: { en: "Age Band", de: "Altersgruppe" },
                      };
                      const label = propLabel[pg.property]?.[isDE ? "de" : "en"] ?? pg.property;
                      const isExpanded = expandedProperty === pg.property;
                      const displayValues = isExpanded ? pg.values : pg.values.slice(0, 5);
                      return (
                        <div key={pg.property} className="border border-border/20 rounded-lg overflow-hidden">
                          <button
                            className="w-full flex items-center justify-between p-3 hover:bg-secondary/30 transition-colors"
                            onClick={() => setExpandedProperty(isExpanded ? null : pg.property)}
                            data-testid={`property-toggle-${pg.property}`}
                          >
                            <span className="font-medium text-sm">{label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">{pg.values.length} {isDE ? "Werte" : "values"}</span>
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </div>
                          </button>
                          <div className="px-3 pb-3">
                            <ResponsiveContainer width="100%" height={displayValues.length * 28 + 20}>
                              <BarChart data={displayValues} layout="vertical" margin={{ left: 80, right: 20, top: 5, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                                <YAxis dataKey="value" type="category" tick={{ fontSize: 11 }} width={75} />
                                <RechartsTooltip formatter={(v: number) => [v.toFixed(1), isDE ? "Ø Wertung" : "Avg Score"]} />
                                <Bar dataKey="avgScore" radius={[0, 3, 3, 0]}>
                                  {displayValues.map((_: any, i: number) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Rater Clusters (Scatter) */}
              {pv.raterClusters?.length > 0 && (
                <section className="bg-card border border-border/40 rounded-lg p-5">
                  <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-1" data-testid="text-clusters-title">
                    <Users className="w-5 h-5" />
                    {isDE ? "Geschmacksprofile der Bewerter" : "Rater Taste Profiles"}
                    <InfoTip text={isDE
                      ? "Jeder Punkt zeigt die durchschnittlichen Bewertungen eines Teilnehmers. Die dominante Dimension zeigt, worauf der Bewerter am meisten achtet."
                      : "Each point shows a participant's average scores. The dominant dimension shows what the rater values most."
                    } />
                  </h2>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={[
                        { dim: isDE ? "Nase" : "Nose", ...Object.fromEntries(pv.raterClusters.map((rc: any) => [rc.name, rc.nose])) },
                        { dim: isDE ? "Geschmack" : "Taste", ...Object.fromEntries(pv.raterClusters.map((rc: any) => [rc.name, rc.taste])) },
                        { dim: isDE ? "Abgang" : "Finish", ...Object.fromEntries(pv.raterClusters.map((rc: any) => [rc.name, rc.finish])) },
                        { dim: "Balance", ...Object.fromEntries(pv.raterClusters.map((rc: any) => [rc.name, rc.balance])) },
                      ]}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="dim" tick={{ fontSize: 12 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        {pv.raterClusters.slice(0, 8).map((rc: any, i: number) => (
                          <Radar
                            key={rc.participantId}
                            dataKey={rc.name}
                            stroke={COLORS[i % COLORS.length]}
                            fill={COLORS[i % COLORS.length]}
                            fillOpacity={0.1}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pv.raterClusters.map((rc: any, i: number) => (
                      <div key={rc.participantId} className="flex items-center gap-2 text-sm p-2 bg-secondary/20 rounded" data-testid={`cluster-${rc.participantId}`}>
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium">{rc.name}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {isDE ? "Fokus:" : "Focus:"} {isDE ? ({ nose: "Nase", taste: "Geschmack", finish: "Abgang", balance: "Balance" }[rc.dominantDimension as string] ?? rc.dominantDimension) : rc.dominantDimension}
                        </span>
                        <span className="text-xs text-muted-foreground">({rc.ratingCount})</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {activeTab === "ai" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <section className="bg-card border border-border/40 rounded-lg p-5">
                <h2 className="text-lg font-serif font-bold text-primary flex items-center gap-2 mb-3" data-testid="text-ai-title">
                  <Brain className="w-5 h-5" />
                  {isDE ? "KI-gestützte Analyse" : "AI-Powered Analysis"}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {isDE
                    ? "Lass GPT-4o die Bewertungsdaten analysieren und Muster, Ausreißer und Empfehlungen erkennen."
                    : "Let GPT-4o analyze the rating data to identify patterns, outliers, and recommendations."}
                </p>

                {!aiMutation.data && (
                  <Button
                    onClick={() => aiMutation.mutate()}
                    disabled={aiMutation.isPending || !data || summary?.totalTastings === 0}
                    className="gap-2"
                    data-testid="button-ai-analyze"
                  >
                    {aiMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {aiMutation.isPending
                      ? (isDE ? "Analyse läuft…" : "Analyzing…")
                      : (isDE ? "Analyse starten" : "Start Analysis")}
                  </Button>
                )}

                {aiMutation.isError && (
                  <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive" data-testid="text-ai-error">
                    {isDE ? "Fehler bei der KI-Analyse. Bitte versuche es erneut." : "Error during AI analysis. Please try again."}
                  </div>
                )}

                {aiMutation.data?.analysis && (
                  <div className="mt-4 prose prose-sm max-w-none dark:prose-invert" data-testid="text-ai-result">
                    {aiMutation.data.analysis.split('\n').map((line: string, i: number) => {
                      const trimmed = line.trim();
                      if (trimmed.startsWith('## ')) {
                        return <h3 key={i} className="text-primary font-serif mt-4 mb-2">{trimmed.slice(3)}</h3>;
                      }
                      if (trimmed.startsWith('### ')) {
                        return <h4 key={i} className="text-primary/80 font-serif mt-3 mb-1">{trimmed.slice(4)}</h4>;
                      }
                      if (!trimmed) return <br key={i} />;
                      const parts = trimmed.split(/\*\*(.+?)\*\*/g);
                      return (
                        <p key={i} className="mb-1 text-sm leading-relaxed">
                          {parts.map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                        </p>
                      );
                    })}
                  </div>
                )}
              </section>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
