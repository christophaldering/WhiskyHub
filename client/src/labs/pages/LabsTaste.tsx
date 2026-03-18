import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  Wine, Calendar, ChevronRight, BookOpen,
  BarChart3, Target, Compass,
  Activity, PieChart, Sparkles, GitCompareArrows, Lock,
  Download, Brain, Utensils, Library, Info,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { tastingApi, journalApi, flavorProfileApi, ratingApi, statsApi, participantApi, pidHeaders } from "@/lib/api";

const ANALYTICS_THRESHOLD = 10;

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  description: string;
  href: string;
  testId: string;
  badge?: string | number | null;
  locked?: boolean;
}

function NavItem({ icon: Icon, label, description, href, testId, badge, locked }: NavItemProps) {
  return (
    <Link href={locked ? "#" : href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card labs-card-interactive"
        style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: locked ? 0.5 : 1, cursor: locked ? "default" : "pointer" }}
        data-testid={testId}
      >
        <div style={{
          width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: "var(--labs-accent-muted)",
        }}>
          {locked ? <Lock className="w-4 h-4" style={{ color: "var(--labs-text-muted)" }} /> : <Icon className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>{label}</div>
          <div style={{ fontSize: 11, color: "var(--labs-text-muted)", marginTop: 1 }}>{description}</div>
        </div>
        {badge != null && (
          <span className="labs-badge labs-badge-accent" style={{ fontSize: 11, padding: "2px 8px" }}>{badge}</span>
        )}
        <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
      </div>
    </Link>
  );
}

interface ConnoisseurReport {
  id: string;
  participantId: string;
  generatedAt: string;
  reportContent: string;
  summary: string;
  language: string;
}

function extractTeaser(reportContent: string): string {
  const plain = reportContent
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .replace(/\n/g, " ")
    .trim();
  const firstSentence = plain.split(/[.!?]/)[0];
  if (firstSentence && firstSentence.length <= 120) return firstSentence + ".";
  return plain.substring(0, 120) + "...";
}

function PalateLetterCard({
  reports,
  whiskyCount,
  isGenerating,
  navigate,
  t,
}: {
  reports: ConnoisseurReport[];
  whiskyCount: number;
  isGenerating: boolean;
  navigate: (path: string) => void;
  t: (key: string, fallback?: string, opts?: Record<string, unknown>) => string;
}) {
  const [hovered, setHovered] = useState(false);
  const sorted = [...reports].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  const latestReport = sorted.length > 0 ? sorted[0] : null;
  const hasReport = !!latestReport;
  const isLocked = !hasReport && whiskyCount < ANALYTICS_THRESHOLD && !isGenerating;
  const canGenerate = !hasReport && whiskyCount >= ANALYTICS_THRESHOLD && !isGenerating;
  const isClickable = hasReport || canGenerate;

  const formatTimestamp = (date: string): string => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return t("palateLetter.card.updatedToday", "Updated today");
    if (days === 1) return t("palateLetter.card.updatedYesterday", "Updated yesterday");
    return t("palateLetter.card.updatedDays", "Updated {{days}} days ago", { days });
  };

  const showGold = !isLocked;
  const cardStyle: React.CSSProperties = {
    background: showGold
      ? "linear-gradient(135deg, rgba(201,151,43,0.10) 0%, rgba(232,184,75,0.05) 100%)"
      : "rgba(255,255,255,0.025)",
    border: `1px solid rgba(201,151,43,${showGold ? 0.28 : 0.14})`,
    borderRadius: 20,
    padding: 24,
    margin: "20px 0",
    position: "relative",
    overflow: "hidden",
    cursor: isClickable ? "pointer" : "default",
    transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
    opacity: isLocked ? 0.7 : 1,
    ...(isClickable && hovered
      ? {
          borderColor: "rgba(201,151,43,0.45)",
          transform: "translateY(-2px)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 0 40px rgba(201,151,43,0.06)",
        }
      : {}),
    ...(isGenerating
      ? { animation: "palateLetterPulse 2s ease-in-out infinite" }
      : { animation: "palateLetterFadeIn 0.5s cubic-bezier(0.16,1,0.3,1) 0.2s both" }),
  };

  return (
    <>
      <style>{`
        @keyframes palateLetterFadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: ${isLocked ? 0.7 : 1}; transform: none; }
        }
        @keyframes palateLetterSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes palateLetterPulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
      <div
        style={cardStyle}
        onClick={isClickable ? () => navigate("/labs/taste/connoisseur") : undefined}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        data-testid="card-palate-letter-teaser"
      >
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 160,
            height: 160,
            background: "radial-gradient(circle, rgba(201,151,43,0.12), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Sparkles
              style={{
                width: 14,
                height: 14,
                color: "#E8B84B",
                ...(isGenerating ? { animation: "palateLetterSpin 4s linear infinite" } : {}),
              }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#E8B84B",
              }}
            >
              {t("palateLetter.card.eyebrow", "YOUR PALATE LETTER")}
            </span>
          </div>
          {hasReport && !isGenerating && (
            <span style={{ fontSize: 11, color: "var(--labs-text-muted)", fontWeight: 300 }}>
              {formatTimestamp(latestReport.generatedAt)}
            </span>
          )}
        </div>

        {isGenerating ? (
          <p
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: "italic",
              fontSize: 16,
              lineHeight: 1.65,
              color: "rgba(240,230,211,0.5)",
              margin: "14px 0 0",
            }}
            data-testid="text-palate-letter-generating"
          >
            {t("palateLetter.card.generating", "Writing your palate profile...")}
          </p>
        ) : hasReport ? (
          <>
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: 16,
                lineHeight: 1.65,
                color: "rgba(240,230,211,0.85)",
                margin: "14px 0 18px",
              }}
              data-testid="text-palate-letter-teaser"
            >
              {extractTeaser(latestReport.summary || latestReport.reportContent)}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#E8B84B" }}>
              <span>{t("palateLetter.card.cta", "Read your full profile")}</span>
              <ChevronRight
                style={{
                  width: 14,
                  height: 14,
                  transition: "transform 0.2s",
                  transform: hovered ? "translateX(4px)" : "none",
                }}
              />
            </div>
          </>
        ) : canGenerate ? (
          <>
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: 16,
                lineHeight: 1.65,
                color: "rgba(240,230,211,0.85)",
                margin: "14px 0 18px",
              }}
              data-testid="text-palate-letter-ready"
            >
              {t(
                "palateLetter.card.locked",
                "After ten drams, CaskSense will write you a personal tasting profile — the patterns in your behaviour you haven't named yet."
              )}
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: "#E8B84B" }}>
              <span>{t("palateLetter.card.cta", "Read your full profile")}</span>
              <ChevronRight
                style={{
                  width: 14,
                  height: 14,
                  transition: "transform 0.2s",
                  transform: hovered ? "translateX(4px)" : "none",
                }}
              />
            </div>
          </>
        ) : (
          <>
            <p
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: "italic",
                fontSize: 16,
                lineHeight: 1.65,
                color: "rgba(240,230,211,0.5)",
                margin: "14px 0 18px",
              }}
              data-testid="text-palate-letter-locked"
            >
              {t(
                "palateLetter.card.locked",
                "After ten drams, CaskSense will write you a personal tasting profile — the patterns in your behaviour you haven't named yet."
              )}
            </p>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
                {t("palateLetter.card.count", "{{count}} of 10 drams", { count: whiskyCount })}
              </span>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default function LabsTaste() {
  const { currentParticipant } = useAppStore();
  const session = useSession();
  const pid = currentParticipant?.id || session.pid;
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const { data: tastings } = useQuery({
    queryKey: ["tastings", currentParticipant?.id],
    queryFn: () => tastingApi.getAll(currentParticipant?.id),
    enabled: !!currentParticipant,
  });

  const { data: journal } = useQuery({
    queryKey: ["journal", currentParticipant?.id],
    queryFn: () => journalApi.getAll(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: flavorProfile } = useQuery({
    queryKey: ["flavorProfile", currentParticipant?.id],
    queryFn: () => flavorProfileApi.get(currentParticipant!.id),
    enabled: !!currentParticipant,
  });

  const { data: stats } = useQuery({
    queryKey: ["participant-stats", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid],
    queryFn: () => fetch(`/api/participants/${pid}/insights`, { headers: { "x-participant-id": pid! } }).then(r => r.ok ? r.json() : null),
    enabled: !!pid,
  });

  const { data: connoisseurReports = [], isFetching: isConnoisseurFetching } = useQuery<ConnoisseurReport[]>({
    queryKey: ["connoisseur-reports", pid],
    queryFn: async () => {
      if (!pid) return [];
      const res = await fetch(`/api/participants/${pid}/connoisseur-reports`, { headers: pidHeaders() });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!pid,
  });

  const tastingIds = tastings?.map((t: { id: string }) => t.id) || [];
  const { data: allRatingsMap } = useQuery({
    queryKey: ["allTastingRatings", currentParticipant?.id, tastingIds],
    queryFn: async () => {
      const results: Record<string, { participantId: string; overall: number }[]> = {};
      for (const tid of tastingIds) {
        try { const ratings = await ratingApi.getForTasting(tid); results[tid] = ratings || []; } catch { results[tid] = []; }
      }
      return results;
    },
    enabled: !!currentParticipant && tastingIds.length > 0,
  });

  if (!currentParticipant) {
    return (
      <div className="labs-empty labs-fade-in" style={{ minHeight: "60vh" }}>
        <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
          <circle cx="20" cy="20" r="12" fill="currentColor" opacity="0.1" />
          <circle cx="20" cy="20" r="6"  fill="currentColor" opacity="0.15"/>
          <circle cx="20" cy="20" r="2"  fill="currentColor" opacity="0.3"/>
        </svg>
        <h2 className="labs-empty-title">Your Taste Profile</h2>
        <p className="labs-empty-sub">Sign in to discover your personal tasting patterns.</p>
        <button className="labs-empty-action" onClick={() => navigate("/labs")} data-testid="labs-taste-goto-home">Go to Home</button>
      </div>
    );
  }

  const myRatings: { participantId: string; overall: number; _tastingId: string }[] = [];
  if (allRatingsMap) {
    for (const [tid, ratings] of Object.entries(allRatingsMap)) {
      for (const r of ratings) {
        if (r.participantId === currentParticipant.id) myRatings.push({ ...r, _tastingId: tid });
      }
    }
  }

  const totalTastings = tastings?.length || 0;
  const totalRatings = myRatings.length;
  const statsObj = stats as { totalRatings?: number; totalJournalEntries?: number } | null;
  const whiskyCount = (statsObj?.totalRatings ?? 0) + (statsObj?.totalJournalEntries ?? 0);
  const analyticsLocked = whiskyCount < ANALYTICS_THRESHOLD;

  const participantObj = participant as { ratingStabilityScore?: number; explorationIndex?: number; smokeAffinityIndex?: number } | null;
  const stability = participantObj?.ratingStabilityScore ?? null;
  const exploration = participantObj?.explorationIndex ?? null;
  const smoke = participantObj?.smokeAffinityIndex ?? null;
  const insight = insightData?.insight ?? null;

  const avgScores = flavorProfile?.avgScores || { nose: 0, taste: 0, finish: 0, overall: 0 };
  const dimensionMax = Math.max(avgScores.nose, avgScores.taste, avgScores.finish, 1);
  const dimensions = [
    { label: "Nose", value: avgScores.nose, color: "var(--labs-dim-nose)" },
    { label: "Taste", value: avgScores.taste, color: "var(--labs-dim-taste)" },
    { label: "Finish", value: avgScores.finish, color: "var(--labs-dim-finish)" },
  ];

  const recentTastings = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 3) || [];

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto">
      <h1 className="labs-h2 mb-1 labs-fade-in" style={{ color: "var(--labs-text)" }} data-testid="labs-taste-title">
        My Taste
      </h1>
      <p className="text-sm mb-4 labs-fade-in labs-stagger-1" style={{ color: "var(--labs-text-muted)" }}>
        Your personal whisky world
      </p>
      {!analyticsLocked && flavorProfile?.hasMultipleScales && (
        <p className="text-xs flex items-center gap-1 mb-6 labs-fade-in labs-stagger-1" style={{ color: "var(--labs-text-muted)", opacity: 0.7 }} data-testid="taste-normalized-hint">
          <Info className="w-3 h-3 flex-shrink-0" />
          {t("labs.scoresNormalizedMultiScale", "Contains ratings from different scales, normalized to 100 points")}
        </p>
      )}

      {analyticsLocked ? (
        <>
          <div className="labs-empty labs-fade-in labs-stagger-1" data-testid="card-taste-welcome">
            <svg className="labs-empty-icon" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="12" fill="currentColor" opacity="0.1" />
              <circle cx="20" cy="20" r="6"  fill="currentColor" opacity="0.15"/>
              <circle cx="20" cy="20" r="2"  fill="currentColor" opacity="0.3"/>
            </svg>
            <h2 className="labs-empty-title">Not enough data yet</h2>
            <p className="labs-empty-sub" style={{ marginBottom: '1rem' }}>
              {whiskyCount > 0
                ? `${Math.max(0, ANALYTICS_THRESHOLD - whiskyCount)} more drams to unlock your profile.`
                : 'Your first dram is one breath away.'}
            </p>
            <div style={{ maxWidth: 180, margin: "0 auto 1.5rem", width: '100%' }}>
              <div style={{ height: 3, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (whiskyCount / ANALYTICS_THRESHOLD) * 100)}%`, background: "var(--labs-accent)", borderRadius: 3, transition: "width 0.5s", opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: 10, color: "var(--labs-text-muted)", opacity: 0.5, marginTop: 6, textAlign: "center" }}>
                {whiskyCount} / {ANALYTICS_THRESHOLD}
              </p>
            </div>
            <button className="labs-empty-action" onClick={() => navigate("/labs/solo")} data-testid="button-taste-log-dram">
              {whiskyCount > 0 ? "Log next dram" : "Log your first dram"}
            </button>
          </div>

          <PalateLetterCard
            reports={connoisseurReports}
            whiskyCount={whiskyCount}
            isGenerating={isConnoisseurFetching && connoisseurReports.length === 0}
            navigate={navigate}
            t={t}
          />
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 labs-fade-in labs-stagger-1">
            {[
              { label: "Stability", value: stability, id: "stability", desc: t("labs.statStabilityDesc", "Rating consistency") },
              { label: "Exploration", value: exploration, id: "exploration", desc: t("labs.statExplorationDesc", "Variety of regions & styles") },
              { label: "Smoke", value: smoke, id: "smoke", desc: t("labs.statSmokeDesc", "Peat & smoke affinity") },
              { label: "Tastings", value: totalTastings, id: "tastings", desc: t("labs.statTastingsDesc", "Sessions joined") },
            ].map(s => (
              <div key={s.id} className="labs-card p-4 text-center" data-testid={`labs-taste-stat-${s.id}`}>
                <p className="text-xl font-bold" style={{ color: "var(--labs-accent)" }}>
                  {s.value != null ? (typeof s.value === "number" ? (Number.isInteger(s.value) ? s.value : s.value.toFixed(1)) : s.value) : "—"}
                </p>
                <p className="text-[11px] mt-1" style={{ color: "var(--labs-text-muted)" }}>{s.label}</p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--labs-text-muted)", opacity: 0.7, lineHeight: 1.3 }}>{s.desc}</p>
              </div>
            ))}
          </div>

          {insight && (
            <div className="labs-card p-4 mb-6 labs-fade-in labs-stagger-2" data-testid="card-taste-insight">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--labs-text-muted)" }}>Taste Insight</span>
              </div>
              <p className="text-sm" style={{ color: "var(--labs-text)", lineHeight: 1.6 }} data-testid="text-insight-message">
                {insight.message}
              </p>
            </div>
          )}

          {dimensions.some(d => d.value > 0) && (
            <div className="mb-6 labs-fade-in labs-stagger-2">
              <p className="labs-section-label flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                Your Palate
              </p>
              <div className="labs-card p-4">
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {dimensions.map(dim => (
                    <div key={dim.label} className="flex items-center gap-3">
                      <span className="text-xs font-medium w-14 text-right" style={{ color: "var(--labs-text-secondary)" }}>{dim.label}</span>
                      <div className="flex-1 h-2 rounded-full" style={{ background: "var(--labs-border)" }}>
                        <div className="h-full rounded-full" style={{ width: `${dimensionMax > 0 ? (dim.value / dimensionMax) * 100 : 0}%`, background: dim.color || "var(--labs-accent)", transition: "width 0.5s" }} />
                      </div>
                      <span className="text-xs font-semibold w-10" style={{ color: "var(--labs-accent)" }}>
                        {dim.value > 0 ? dim.value.toFixed(1) : "–"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <PalateLetterCard
            reports={connoisseurReports}
            whiskyCount={whiskyCount}
            isGenerating={isConnoisseurFetching && connoisseurReports.length === 0}
            navigate={navigate}
            t={t}
          />
        </>
      )}

      <div className="labs-fade-in labs-stagger-3">
        <p className="labs-section-label flex items-center gap-2">
          <Activity className="w-3.5 h-3.5" />
          Profile & Analysis
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavItem icon={Activity} label="CaskSense Profile" description="Flavor radar, style & sweet spot" href="/labs/taste/profile" testId="labs-taste-link-profile" locked={analyticsLocked} />
          <NavItem icon={BarChart3} label="Analytics" description="Evolution, consistency & stats" href="/labs/taste/analytics" testId="labs-taste-link-analytics" />
          <NavItem icon={PieChart} label="Flavor Wheel" description="Aroma categories from your notes" href="/labs/taste/wheel" testId="labs-taste-link-wheel" />
          <NavItem icon={GitCompareArrows} label="Compare" description="Your scores vs. community" href="/labs/taste/compare" testId="labs-taste-link-compare" locked={analyticsLocked} />
        </div>
      </div>

      <div className="mt-8 labs-fade-in labs-stagger-3">
        <p className="labs-section-label flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          AI & Insights
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavItem icon={Sparkles} label="Recommendations" description="AI-powered whisky suggestions" href="/labs/taste/recommendations" testId="labs-taste-link-recommendations" locked={analyticsLocked} />
          <NavItem icon={Utensils} label="Pairings" description="Lineup-based pairing suggestions" href="/labs/taste/pairings" testId="labs-taste-link-pairings" />
          <NavItem icon={Brain} label="Benchmark" description="AI text extraction & library" href="/labs/taste/benchmark" testId="labs-taste-link-benchmark" />
          <NavItem icon={Library} label="Collection Analysis" description="Deep stats on your bottles" href="/labs/taste/collection-analysis" testId="labs-taste-link-collection-analysis" />
          <NavItem icon={Compass} label="AI Curation" description="Curated whisky discovery" href="/labs/taste/ai-curation" testId="labs-taste-link-ai-curation" />
        </div>
      </div>

      <div className="mt-8 labs-fade-in labs-stagger-4">
        <p className="labs-section-label flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5" />
          Data & Tools
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <NavItem icon={Download} label="Downloads" description="Export data & templates" href="/labs/taste/downloads" testId="labs-taste-link-downloads" />
        </div>
      </div>

      {recentTastings.length > 0 && (
        <div className="mt-8 labs-fade-in labs-stagger-4">
          <p className="labs-section-label flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" />
            Recent Tastings
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentTastings.map((t: any) => (
              <div
                key={t.id}
                className="labs-card labs-card-interactive flex items-center gap-3 p-3"
                onClick={() => navigate(`/labs/tastings/${t.id}`)}
                data-testid={`labs-taste-tasting-${t.id}`}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Wine className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                      <Calendar className="w-3 h-3" />{t.date}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
