import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { formatScore } from "@/lib/utils";
import {
  Wine, Calendar, ChevronRight, BookOpen,
  BarChart3, Target, Compass,
  Activity, PieChart, Sparkles, GitCompareArrows, Lock,
  Download, Library, Info, Star,
  Archive, Heart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/lib/store";
import { useSession } from "@/lib/session";
import { tastingApi, journalApi, flavorProfileApi, ratingApi, statsApi, participantApi, pidHeaders } from "@/lib/api";
import type { JournalEntry, Tasting } from "@shared/schema";

const ANALYTICS_THRESHOLD = 10;

function getPalateBandColor(score: number): string {
  if (score >= 90) return 'var(--labs-phase-palate)';
  if (score >= 85) return 'var(--labs-phase-palate)';
  if (score >= 80) return 'var(--labs-phase-overall)';
  if (score >= 70) return 'var(--labs-phase-nose)';
  return 'var(--labs-text-muted)';
}

function getPalateBandLabel(score: number, lang: string): string {
  const isDe = lang.startsWith('de');
  if (isDe) {
    if (score >= 90) return 'Außergewöhnlich';
    if (score >= 85) return 'Exzellent';
    if (score >= 80) return 'Hervorragend';
    if (score >= 75) return 'Sehr gut';
    if (score >= 70) return 'Gut';
    return 'Okay';
  }
  if (score >= 90) return 'Extraordinary';
  if (score >= 85) return 'Excellent';
  if (score >= 80) return 'Outstanding';
  if (score >= 75) return 'Very good';
  if (score >= 70) return 'Good';
  return 'Okay';
}

interface LoggedDram {
  id: string;
  name: string;
  distillery: string | null;
  score: number | null;
  date: string | null;
  source: "solo" | "tasting";
  count?: number;
}

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
          <span className="labs-badge labs-badge-accent">{badge}</span>
        )}
        <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
      </div>
    </Link>
  );
}

interface NavTileProps {
  icon: React.ElementType;
  label: string;
  href: string;
  testId: string;
  locked?: boolean;
  color: string;
  bgColor: string;
}

function NavTile({ icon: Icon, label, href, testId, locked, color, bgColor }: NavTileProps) {
  return (
    <Link href={locked ? "#" : href} style={{ textDecoration: "none" }}>
      <div
        className="labs-card labs-card-interactive"
        style={{
          padding: "14px 12px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          opacity: locked ? 0.5 : 1,
          cursor: locked ? "default" : "pointer",
          minHeight: 88,
          justifyContent: "center",
        }}
        data-testid={testId}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          background: bgColor,
        }}>
          {locked ? <Lock className="w-[18px] h-[18px]" style={{ color: "var(--labs-text-muted)" }} /> : <Icon className="w-[18px] h-[18px]" style={{ color }} />}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text)", textAlign: "center", lineHeight: 1.3 }}>{label}</div>
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
  const { t, i18n } = useTranslation();

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

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["participant-stats", pid],
    queryFn: () => statsApi.get(pid!),
    enabled: !!pid,
  });

  const { data: participant } = useQuery({
    queryKey: ["participant-detail", pid],
    queryFn: () => participantApi.get(pid!),
    enabled: !!pid,
  });

  const insightLang = (i18n.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
  const { data: insightData } = useQuery({
    queryKey: ["participant-insights", pid, insightLang],
    queryFn: () => fetch(`/api/participants/${pid}/insights?lang=${insightLang}`, { headers: { "x-participant-id": pid!, "Accept-Language": insightLang } }).then(r => r.ok ? r.json() : null),
    enabled: !!pid,
  });

  const [statInfoOpen, setStatInfoOpen] = useState<{ avg: boolean; consistency: boolean; exploration: boolean }>({
    avg: false,
    consistency: false,
    exploration: false,
  });
  const [activeTopSection, setActiveTopSection] = useState<"ai" | "profile">("ai");
  const toggleStatInfo = (key: "avg" | "consistency" | "exploration") =>
    setStatInfoOpen(prev => ({ ...prev, [key]: !prev[key] }));

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

  const { data: timelineData } = useQuery({
    queryKey: ["palate-timeline", pid],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${pid}/palate-timeline`, { headers: { "x-participant-id": pid! } });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!pid,
  });

  const { data: monthlyReviewData } = useQuery({
    queryKey: ["monthly-review", pid],
    queryFn: async () => {
      const res = await fetch(`/api/participants/${pid}/monthly-review`, { headers: { "x-participant-id": pid! } });
      if (!res.ok) return null;
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

  const loggedDrams = useMemo((): LoggedDram[] => {
    if (!currentParticipant) return [];
    const items: LoggedDram[] = [];
    const journalEntries = (journal || []) as JournalEntry[];
    const tastingList = (tastings || []) as Tasting[];

    for (const entry of journalEntries) {
      if (entry.status === "draft") continue;
      items.push({
        id: `j-${entry.id}`,
        name: entry.name || entry.title || "—",
        distillery: entry.distillery || null,
        score: entry.personalScore ?? null,
        date: entry.createdAt ? String(entry.createdAt) : null,
        source: "solo",
      });
    }

    if (allRatingsMap) {
      const tastingMap = new Map<string, Tasting>();
      for (const t of tastingList) {
        tastingMap.set(t.id, t);
      }
      for (const [tid, ratings] of Object.entries(allRatingsMap)) {
        const myTastingRatings = ratings.filter((r) => r.participantId === currentParticipant.id);
        if (myTastingRatings.length === 0) continue;
        const tasting = tastingMap.get(tid);
        if (!tasting) continue;
        const avgScore = myTastingRatings.reduce((sum, r) => sum + (r.overall || 0), 0) / myTastingRatings.length;
        items.push({
          id: `t-${tid}`,
          name: tasting.title || "Tasting",
          distillery: null,
          score: Math.round(avgScore * 10) / 10,
          date: tasting.date || null,
          source: "tasting",
          count: myTastingRatings.length,
        });
      }
    }

    items.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return db - da;
    });

    return items;
  }, [journal, tastings, allRatingsMap, currentParticipant]);

  if (!currentParticipant) {
    return (
      <AuthGateMessage
        icon={<Compass className="w-12 h-12" style={{ color: "var(--labs-accent)" }} />}
        title={t("authGate.taste.title")}
        bullets={[t("authGate.taste.bullet1"), t("authGate.taste.bullet2"), t("authGate.taste.bullet3")]}
      />
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

  const draftsCount = ((journal || []) as JournalEntry[]).filter((e) => e.status === "draft").length;

  const totalTastings = tastings?.length || 0;
  const totalRatings = myRatings.length;
  const statsObj = stats as { totalRatings?: number; totalTastingWhiskies?: number; totalJournalEntries?: number } | null;
  const whiskyCount = (statsObj?.totalRatings ?? 0) + (statsObj?.totalJournalEntries ?? 0);
  const analyticsLocked = whiskyCount < ANALYTICS_THRESHOLD;

  const statsObjExt = stats as { ratingStabilityScore?: number | null; explorationIndex?: number | null } | null;
  const stability = statsObjExt?.ratingStabilityScore ?? null;
  const exploration = statsObjExt?.explorationIndex ?? null;
  const insight = insightData?.insight ?? null;

  const avgScores = flavorProfile?.avgScores || { nose: 0, taste: 0, finish: 0, overall: 0 };
  const defaultStats = { stdDev: 0, min: 0, max: 0 };
  const dimStats = flavorProfile?.dimensionStats || { nose: defaultStats, taste: defaultStats, finish: defaultStats, overall: defaultStats };
  const dimensions = [
    { label: "Nose", key: "nose", value: avgScores.nose, stats: dimStats.nose, color: "var(--labs-phase-nose)", dimColor: "var(--labs-phase-nose-dim)" },
    { label: "Palate", key: "palate", value: avgScores.taste, stats: dimStats.taste, color: "var(--labs-phase-palate)", dimColor: "var(--labs-phase-palate-dim)" },
    { label: "Finish", key: "finish", value: avgScores.finish, stats: dimStats.finish, color: "var(--labs-phase-finish)", dimColor: "var(--labs-phase-finish-dim)" },
    { label: "Overall", key: "overall", value: avgScores.overall, stats: dimStats.overall, color: "var(--labs-phase-overall)", dimColor: "var(--labs-phase-overall-dim)" },
  ];

  const recentTastings = tastings
    ?.filter((t: any) => t.status === "archived" || t.status === "reveal")
    ?.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
    ?.slice(0, 3) || [];

  return (
    <div className="labs-page">
      <h1 className="labs-h2 mb-1 labs-fade-in" style={{ color: "var(--labs-text)" }} data-testid="labs-taste-title">
        {t("myTastePage.title", "My World")}
      </h1>
      <p className="text-sm mb-4 labs-fade-in labs-stagger-1" style={{ color: "var(--labs-text-muted)" }}>
        {t("myTastePage.subtitle", "Your personal whisky collection & insights")}
      </p>
      <div className="labs-fade-in labs-stagger-1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
        {(() => {
          const isAiActive = activeTopSection === "ai";
          return (
            <button
              type="button"
              onClick={() => setActiveTopSection("ai")}
              data-testid="tile-meine-welt-ai-insights"
              style={{
                minHeight: 80,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
                borderRadius: 12,
                border: isAiActive ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                background: isAiActive ? "color-mix(in srgb, var(--labs-accent) 10%, var(--labs-surface))" : "var(--labs-surface)",
                color: isAiActive ? "var(--labs-accent)" : "var(--labs-text)",
                fontFamily: "inherit",
                transition: "all 150ms",
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Sparkles className="w-[18px] h-[18px]" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: isAiActive ? "var(--labs-accent)" : "var(--labs-text)" }}>
                  {t("myTastePage.aiInsights", "AI & Insights")}
                </div>
                <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 1 }}>
                  {t("myTastePage.aiInsightsDesc", "Connoisseur, Recommendations & more")}
                </div>
              </div>
            </button>
          );
        })()}
        {(() => {
          const isProfileActive = activeTopSection === "profile";
          return (
            <button
              type="button"
              onClick={() => setActiveTopSection("profile")}
              data-testid="tile-meine-welt-profile-analytics"
              style={{
                minHeight: 80,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
                borderRadius: 12,
                border: isProfileActive ? "2px solid var(--labs-accent)" : "1px solid var(--labs-border)",
                background: isProfileActive ? "color-mix(in srgb, var(--labs-accent) 10%, var(--labs-surface))" : "var(--labs-surface)",
                color: isProfileActive ? "var(--labs-accent)" : "var(--labs-text)",
                fontFamily: "inherit",
                transition: "all 150ms",
              }}
            >
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "var(--labs-surface-elevated)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Activity className="w-[18px] h-[18px]" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: isProfileActive ? "var(--labs-accent)" : "var(--labs-text)" }}>
                  {t("myTastePage.profileAnalytics", "Profile & Analytics")}
                </div>
                <div style={{ fontSize: 13, color: "var(--labs-text-muted)", marginTop: 1 }}>
                  {t("myTastePage.profileAnalyticsDesc", "CaskSense, Analytics, Flavor Wheel & more")}
                </div>
              </div>
            </button>
          );
        })()}
      </div>

      {activeTopSection === "ai" && (
        <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <NavTile icon={Sparkles} label="Connoisseur" href="/labs/taste/connoisseur" testId="labs-taste-link-connoisseur" locked={analyticsLocked} color="var(--labs-phase-palate)" bgColor="color-mix(in srgb, var(--labs-phase-palate) 15%, transparent)" />
            <NavTile icon={Sparkles} label="Recommendations" href="/labs/taste/recommendations" testId="labs-taste-link-recommendations" locked={analyticsLocked} color="var(--labs-phase-palate)" bgColor="color-mix(in srgb, var(--labs-phase-palate) 15%, transparent)" />
            <NavTile icon={Library} label="Collection Analysis" href="/labs/taste/collection-analysis" testId="labs-taste-link-collection-analysis" color="var(--labs-phase-palate)" bgColor="color-mix(in srgb, var(--labs-phase-palate) 15%, transparent)" />
            <NavTile icon={Compass} label="AI Curation" href="/labs/taste/ai-curation" testId="labs-taste-link-ai-curation" color="var(--labs-phase-palate)" bgColor="color-mix(in srgb, var(--labs-phase-palate) 15%, transparent)" />
          </div>
        </div>
      )}

      {activeTopSection === "profile" && (
        <div className="labs-fade-in labs-stagger-2" style={{ marginBottom: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <NavTile icon={Activity} label="CaskSense Profile" href="/labs/taste/profile" testId="labs-taste-link-profile" locked={analyticsLocked} color="var(--labs-phase-nose)" bgColor="color-mix(in srgb, var(--labs-phase-nose) 15%, transparent)" />
            <NavTile icon={BarChart3} label="Analytics" href="/labs/taste/analytics" testId="labs-taste-link-analytics" color="var(--labs-phase-nose)" bgColor="color-mix(in srgb, var(--labs-phase-nose) 15%, transparent)" />
            <NavTile icon={PieChart} label="Flavor Wheel" href="/labs/taste/wheel" testId="labs-taste-link-wheel" color="var(--labs-phase-nose)" bgColor="color-mix(in srgb, var(--labs-phase-nose) 15%, transparent)" />
            <NavTile icon={Activity} label={t("myTastePage.whiskyDna", "Whisky DNA")} href="/labs/taste/dna" testId="labs-taste-link-dna" locked={analyticsLocked} color="var(--labs-phase-nose)" bgColor="color-mix(in srgb, var(--labs-phase-nose) 15%, transparent)" />
            <NavTile icon={GitCompareArrows} label="Compare" href="/labs/taste/compare" testId="labs-taste-link-compare" locked={analyticsLocked} color="var(--labs-phase-nose)" bgColor="color-mix(in srgb, var(--labs-phase-nose) 15%, transparent)" />
            <NavTile icon={Download} label="Downloads" href="/labs/taste/downloads" testId="labs-taste-link-downloads" color="var(--labs-phase-nose)" bgColor="color-mix(in srgb, var(--labs-phase-nose) 15%, transparent)" />
          </div>
        </div>
      )}

      {!analyticsLocked && flavorProfile?.hasMultipleScales && (
        <p className="text-xs flex items-center gap-1 mb-6 labs-fade-in labs-stagger-1" style={{ color: "var(--labs-text-muted)", opacity: 0.7 }} data-testid="taste-normalized-hint">
          <Info className="w-3 h-3 flex-shrink-0" />
          {t("labs.scoresNormalizedMultiScale", "Contains ratings from different scales, normalized to 100 points")}
        </p>
      )}

      {statsLoading ? (
        <div className="labs-fade-in" style={{ display: "flex", flexDirection: "column", gap: 16, padding: "2rem 0" }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: 48, borderRadius: 12, background: "var(--labs-border)", opacity: 0.4, animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      ) : analyticsLocked ? (
        <>
          <div className="labs-card labs-fade-in labs-stagger-1" style={{ padding: 24, marginBottom: 24, position: "relative", overflow: "hidden" }} data-testid="card-taste-welcome">
            <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, background: "radial-gradient(circle, var(--labs-accent-glow), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--labs-accent-muted)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target className="w-4 h-4" style={{ color: "var(--labs-accent)" }} />
              </div>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--labs-text)", margin: 0, fontFamily: "var(--font-display)" }}>
                  {whiskyCount > 0 ? t("myTastePage.unlockTitle", "Building Your Profile") : t("myTastePage.startTitle", "Your Whisky Journey")}
                </h2>
                <p style={{ fontSize: 11, color: "var(--labs-text-muted)", margin: 0, marginTop: 2 }}>
                  {whiskyCount > 0
                    ? t("myTastePage.unlockSubtitle", "{{remaining}} more drams until your reliable profile", { remaining: Math.max(0, ANALYTICS_THRESHOLD - whiskyCount) })
                    : t("myTastePage.startSubtitle", "Your first dram is just a moment away")}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)" }}>
                  {t("myTastePage.progress", "{{count}} of 10 drams logged", { count: whiskyCount })}
                </span>
                <span style={{ fontSize: 28, fontWeight: 600, color: "var(--labs-accent)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                  {whiskyCount}<span style={{ fontSize: 13, fontWeight: 400, color: "var(--labs-text-muted)" }}> / {ANALYTICS_THRESHOLD}</span>
                </span>
              </div>
              <div style={{ height: 6, background: "var(--labs-border)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (whiskyCount / ANALYTICS_THRESHOLD) * 100)}%`, background: "var(--labs-accent)", borderRadius: 3, transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)" }} />
              </div>
              {whiskyCount > 0 && (
                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start", gap: 12, fontSize: 11, color: "var(--labs-text-muted)" }}>
                  {(statsObj?.totalRatings ?? 0) > 0 && (
                    <span data-testid="text-count-tasting-ratings">{statsObj?.totalRatings} from tastings</span>
                  )}
                  {(statsObj?.totalJournalEntries ?? 0) > 0 && (
                    <span data-testid="text-count-solo-drams">{statsObj?.totalJournalEntries} solo</span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 20, opacity: 0.4, pointerEvents: "none" }}>
              {[
                { label: t("labs.statAvgLabel", "Average"), icon: <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} /> },
                { label: t("labs.statConsistencyLabel", "Consistency"), icon: <Target className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} /> },
                { label: t("labs.statExplorationLabel", "Exploration"), icon: <Compass className="w-3.5 h-3.5" style={{ color: "var(--labs-text-muted)", opacity: 0.5 }} /> },
              ].map(s => (
                <div key={s.label} style={{ background: "var(--labs-surface-hover)", borderRadius: 10, padding: "12px 8px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {s.icon}
                  <div style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)" }}>{s.label}</div>
                  <div style={{ height: 3, width: "60%", borderRadius: 2, background: "var(--labs-border)", marginTop: 2 }} />
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/labs/solo")}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12, border: "none",
                background: "var(--labs-accent)", color: "var(--labs-on-accent)",
                fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                transition: "opacity 0.2s, transform 0.15s",
              }}
              data-testid="button-taste-log-dram"
            >
              {whiskyCount > 0 ? t("myTastePage.logNext", "Log next dram") : t("myTastePage.logFirst", "Log your first dram")}
            </button>
          </div>

          {loggedDrams.length > 0 && (
            <div className="labs-card labs-fade-in labs-stagger-2" style={{ padding: "16px", marginBottom: "1rem" }} data-testid="card-logged-drams">
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    {t("m2.taste.yourDrams", "Your Drams")}
                  </span>
                </div>
                <span style={{ fontSize: 11, color: analyticsLocked ? "var(--labs-accent)" : "var(--labs-text-muted)", opacity: analyticsLocked ? 0.8 : 0.6, fontWeight: analyticsLocked ? 600 : 400 }}>
                  {whiskyCount} / {ANALYTICS_THRESHOLD} {t("m2.taste.countedLabel", "counted")}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {loggedDrams.slice(0, 5).map((dram, idx) => (
                  <div
                    key={dram.id}
                    style={{
                      display: "flex", alignItems: "center", gap: 10, padding: "10px 0",
                      borderTop: idx === 0 ? "none" : "1px solid var(--labs-border)",
                    }}
                    data-testid={`row-logged-dram-${idx}`}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      background: dram.source === "tasting" ? "color-mix(in srgb, var(--labs-accent) 10%, transparent)" : "var(--labs-accent-muted)",
                    }}>
                      {dram.source === "tasting"
                        ? <Wine className="w-3 h-3" style={{ color: "var(--labs-accent)", opacity: 0.7 }} />
                        : <BookOpen className="w-3 h-3" style={{ color: "var(--labs-accent)", opacity: 0.7 }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {String(dram.name ?? "")}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 6, marginTop: 1 }}>
                        {dram.distillery && <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 120 }}>{String(dram.distillery)}</span>}
                        {dram.source === "tasting" && dram.count && (
                          <span style={{ whiteSpace: "nowrap" }}>{dram.count} {dram.count === 1 ? "Whisky" : "Whiskys"}</span>
                        )}
                        {dram.date && (
                          <>
                            {(dram.distillery || (dram.source === "tasting" && dram.count)) && <span style={{ opacity: 0.4 }}>·</span>}
                            <span style={{ whiteSpace: "nowrap" }}>{new Date(dram.date).toLocaleDateString("de-DE", { day: "2-digit", month: "short" })}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {dram.score != null && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}>
                        <Star className="w-3 h-3" style={{ color: "var(--labs-accent)", opacity: 0.6 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-accent)" }}>{formatScore(Number(dram.score))}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {loggedDrams.length > 5 && (
                <Link href="/labs/taste/drams" style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                      marginTop: 8, padding: "8px 0", fontSize: 12, fontWeight: 500,
                      color: "var(--labs-accent)", cursor: "pointer",
                      borderTop: "1px solid var(--labs-border)",
                    }}
                    data-testid="link-show-all-drams"
                  >
                    Alle anzeigen
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              )}
            </div>
          )}

          <div className="mt-6 labs-fade-in labs-stagger-2">
            <p className="labs-section-label flex items-center gap-2">
              <Archive className="w-3.5 h-3.5" />
              {t("myTastePage.sectionMyCollection", "My Collection")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <NavItem icon={BookOpen} label={t("myTastePage.myDrams", "My Drams")} description={t("myTastePage.myDramsNavDesc", "Your logged drams")} href="/labs/taste/drams" testId="labs-taste-link-my-drams" />
              {draftsCount > 0 && (
                <div style={{ fontSize: 11, color: "#c47a3a", marginTop: -4, marginLeft: 12 }} data-testid="text-open-drafts-hint">
                  {t("myTastePage.openDrafts", "{{count}} open Drafts", { count: draftsCount })}
                </div>
              )}
              <NavItem icon={Archive} label={t("myTastePage.myBottles", "My Bottles")} description={t("myTastePage.myBottlesNavDesc", "Your bottle collection with import")} href="/labs/taste/collection" testId="labs-taste-link-my-bottles" />
              <NavItem icon={Heart} label={t("myTastePage.myWishlist", "My Wishlist")} description={t("myTastePage.myWishlistNavDesc", "Whiskies you want to try")} href="/labs/taste/wishlist" testId="labs-taste-link-my-wishlist" />
            </div>
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
          {insight && (
          <div className="labs-card labs-fade-in labs-stagger-1" style={{ padding: 0, marginBottom: 24, position: "relative", overflow: "hidden" }} data-testid="card-hero-insight">
            <div style={{ position: "absolute", top: -50, right: -50, width: 140, height: 140, background: "radial-gradient(circle, var(--labs-accent-glow), transparent 70%)", pointerEvents: "none" }} />
            <div style={{ padding: "20px 20px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)" }} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--labs-text-muted)" }}>
                  {t("labs.heroInsightLabel", "Taste Insight")}
                </span>
              </div>
              <p style={{ fontSize: 15, fontWeight: 400, color: "var(--labs-text)", lineHeight: 1.6, margin: 0, fontFamily: "var(--font-display)", fontStyle: "italic" }} data-testid="text-insight-message">
                {String(insight.message ?? "")}
              </p>
            </div>
          </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24, alignItems: "start" }} className="labs-fade-in labs-stagger-1">
            <div>
            <div className="labs-card" style={{ padding: 16, position: "relative" }} data-testid="labs-taste-stat-average">
              <button
                type="button"
                onClick={() => toggleStatInfo("avg")}
                aria-label="info"
                aria-expanded={statInfoOpen.avg}
                data-testid="button-stat-info-average"
                style={{ position: "absolute", top: 6, right: 6, background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--labs-text-muted)", opacity: 0.7, lineHeight: 0 }}
              >
                <Info style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2, marginBottom: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 600, color: "var(--labs-text)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                  {avgScores.overall > 0 ? avgScores.overall.toFixed(1) : "—"}
                </span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--labs-border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%",
                  width: avgScores.overall > 0 ? `${Math.max(0, Math.min(100, ((avgScores.overall - 60) / 40) * 100))}%` : "0%",
                  borderRadius: 2,
                  background: avgScores.overall > 0 ? "var(--labs-accent)" : "var(--labs-border)",
                  transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text-muted)", margin: 0, textAlign: "center", marginBottom: 2, wordBreak: "normal", overflowWrap: "break-word", hyphens: "auto" }}>
                {t("labs.statAvgLabel", "Average")}
              </p>
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", opacity: 0.7, margin: 0, lineHeight: 1.3, textAlign: "center" }}>
                {t("labs.statAvgDesc", "Based on {{count}} ratings", { count: whiskyCount ?? 0 })}
              </p>
            </div>
            {statInfoOpen.avg && (
              <div className="labs-fade-in" data-testid="text-stat-info-average" style={{ marginTop: 8, padding: "10px 12px", border: "1px solid var(--labs-border)", borderRadius: 8, background: "var(--labs-surface-muted, rgba(255,255,255,0.03))", fontSize: 12, lineHeight: 1.45, color: "var(--labs-text-muted)" }}>
                {t("labs.statAvgInfo", "Average score across all whiskies you've rated, on a 100-point scale. The bar fills from 60 (lower bound) to 100 (top).")}
              </div>
            )}
            </div>

            <div>
            <div className="labs-card" style={{ padding: 16, position: "relative" }} data-testid="labs-taste-stat-consistency">
              <button
                type="button"
                onClick={() => toggleStatInfo("consistency")}
                aria-label="info"
                aria-expanded={statInfoOpen.consistency}
                data-testid="button-stat-info-consistency"
                style={{ position: "absolute", top: 6, right: 6, background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--labs-text-muted)", opacity: 0.7, lineHeight: 0 }}
              >
                <Info style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2, marginBottom: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 600, color: "var(--labs-text)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                  {stability != null ? stability.toFixed(1) : "—"}
                </span>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)", fontWeight: 400 }}>/10</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--labs-border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", width: stability != null ? `${(stability / 10) * 100}%` : "0%",
                  borderRadius: 2,
                  background: stability != null ? (stability >= 7.5 ? "var(--labs-success)" : stability >= 5 ? "var(--labs-accent)" : "var(--labs-danger)") : "var(--labs-border)",
                  transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text-muted)", margin: 0, textAlign: "center", marginBottom: 2 }}>
                {t("labs.statConsistencyLabel", "Consistency")}
              </p>
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", opacity: 0.7, margin: 0, lineHeight: 1.3, textAlign: "center" }}>
                {t("labs.statConsistencyDesc", "Rating consistency")}
              </p>
            </div>
            {statInfoOpen.consistency && (
              <div className="labs-fade-in" data-testid="text-stat-info-consistency" style={{ marginTop: 8, padding: "10px 12px", border: "1px solid var(--labs-border)", borderRadius: 8, background: "var(--labs-surface-muted, rgba(255,255,255,0.03))", fontSize: 12, lineHeight: 1.45, color: "var(--labs-text-muted)" }}>
                {t("labs.statConsistencyInfo", "How tightly your ratings cluster around your own average. 10/10 means very steady — low values mean your scores swing more between drams.")}
              </div>
            )}
            </div>

            <div>
            <div className="labs-card" style={{ padding: 16, position: "relative" }} data-testid="labs-taste-stat-exploration">
              <button
                type="button"
                onClick={() => toggleStatInfo("exploration")}
                aria-label="info"
                aria-expanded={statInfoOpen.exploration}
                data-testid="button-stat-info-exploration"
                style={{ position: "absolute", top: 6, right: 6, background: "transparent", border: "none", padding: 4, cursor: "pointer", color: "var(--labs-text-muted)", opacity: 0.7, lineHeight: 0 }}
              >
                <Info style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2, marginBottom: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 600, color: "var(--labs-text)", fontFamily: "var(--font-display)", lineHeight: 1 }}>
                  {exploration != null ? exploration.toFixed(1) : "—"}
                </span>
                <span style={{ fontSize: 13, color: "var(--labs-text-muted)", fontWeight: 400 }}>/10</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--labs-border)", overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", width: exploration != null ? `${(exploration / 10) * 100}%` : "0%",
                  borderRadius: 2,
                  background: exploration != null ? (exploration >= 7.5 ? "var(--labs-success)" : exploration >= 5 ? "var(--labs-accent)" : "var(--labs-danger)") : "var(--labs-border)",
                  transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }} />
              </div>
              <p style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text-muted)", margin: 0, textAlign: "center", marginBottom: 2 }}>
                {t("labs.statExplorationLabel", "Exploration")}
              </p>
              <p style={{ fontSize: 11, color: "var(--labs-text-muted)", opacity: 0.7, margin: 0, lineHeight: 1.3, textAlign: "center" }}>
                {t("labs.statExplorationDesc", "Variety of regions & styles")}
              </p>
            </div>
            {statInfoOpen.exploration && (
              <div className="labs-fade-in" data-testid="text-stat-info-exploration" style={{ marginTop: 8, padding: "10px 12px", border: "1px solid var(--labs-border)", borderRadius: 8, background: "var(--labs-surface-muted, rgba(255,255,255,0.03))", fontSize: 12, lineHeight: 1.45, color: "var(--labs-text-muted)" }}>
                {t("labs.statExplorationInfo", "How varied your tasted whiskies are across regions and styles. Higher values mean a broader range of flavor profiles.")}
              </div>
            )}
            </div>
          </div>

          {dimensions.some(d => d.value > 0) && (
            <div className="mb-6 labs-fade-in labs-stagger-2">
              <p className="labs-section-label flex items-center gap-2">
                <Target className="w-3.5 h-3.5" />
                Your Palate
              </p>
              <div className="labs-card" style={{ padding: "20px 20px 12px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {dimensions.map(dim => {
                    const score = dim.value;
                    const hasScore = score > 0;
                    const clampedScore = Math.max(60, Math.min(100, score));
                    const pct = hasScore ? ((clampedScore - 60) / 40) * 100 : 0;
                    return (
                      <div key={dim.key} data-testid={`palate-dim-${dim.key}`}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--labs-text-secondary)", letterSpacing: "0.02em" }}>
                            {dim.label}
                          </span>
                          {hasScore && (
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)", letterSpacing: "0.01em" }}>
                                σ {dim.stats.stdDev}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--labs-text-muted)", letterSpacing: "0.01em" }}>
                                {dim.stats.min}–{dim.stats.max}
                              </span>
                            </div>
                          )}
                        </div>
                        <div style={{ height: 6, borderRadius: 3, background: dim.dimColor, overflow: "hidden" }}>
                          <div
                            style={{
                              width: `${pct}%`,
                              height: "100%",
                              borderRadius: 3,
                              background: dim.color,
                              transition: "width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {monthlyReviewData?.hasData && (
            <LabsMonthlyReview data={monthlyReviewData} />
          )}

          {timelineData?.hasData && timelineData?.periods?.length > 0 && (
            <LabsPalateTimeline periods={timelineData.periods} />
          )}

          <div className="mt-6 labs-fade-in labs-stagger-2">
            <p className="labs-section-label flex items-center gap-2">
              <Archive className="w-3.5 h-3.5" />
              {t("myTastePage.sectionMyCollection", "My Collection")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <NavItem icon={BookOpen} label={t("myTastePage.myDrams", "My Drams")} description={t("myTastePage.myDramsNavDesc", "Your logged drams")} href="/labs/taste/drams" testId="labs-taste-link-my-drams" />
              {draftsCount > 0 && (
                <div style={{ fontSize: 11, color: "#c47a3a", marginTop: -4, marginLeft: 12 }} data-testid="text-open-drafts-hint">
                  {t("myTastePage.openDrafts", "{{count}} open Drafts", { count: draftsCount })}
                </div>
              )}
              <NavItem icon={Archive} label={t("myTastePage.myBottles", "My Bottles")} description={t("myTastePage.myBottlesNavDesc", "Your bottle collection with import")} href="/labs/taste/collection" testId="labs-taste-link-my-bottles" />
              <NavItem icon={Heart} label={t("myTastePage.myWishlist", "My Wishlist")} description={t("myTastePage.myWishlistNavDesc", "Whiskies you want to try")} href="/labs/taste/wishlist" testId="labs-taste-link-my-wishlist" />
            </div>
          </div>

          {recentTastings.length > 0 && (
            <div className="mt-6 labs-fade-in labs-stagger-2">
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
                      <p className="text-sm font-medium truncate" style={{ color: "var(--labs-text)" }}>{String(t.title ?? "")}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs flex items-center gap-1" style={{ color: "var(--labs-text-muted)" }}>
                          <Calendar className="w-3 h-3" />{typeof t.date === "string" ? t.date : t.date instanceof Date ? t.date.toLocaleDateString() : String(t.date ?? "")}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "var(--labs-text-muted)", flexShrink: 0 }} />
                  </div>
                ))}
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

    </div>
  );
}

interface TimelinePeriod {
  month: string;
  count: number;
  avgScores: { nose: number; taste: number; finish: number; overall: number };
  topRegion: string | null;
  topCask: string | null;
  regionCount: number;
  delta: { overall: number; finish: number } | null;
}

interface MonthlyReviewData {
  hasData: boolean;
  month: string;
  monthLabel?: { de: string; en: string };
  ratingsCount?: number;
  avgScore?: number;
  newRegions?: string[];
  scoreDelta?: number | null;
}

function MiniSparkline({ data, color, width, height }: { data: number[]; color: string; width: number; height: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LabsMonthlyReview({ data }: { data: MonthlyReviewData }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const monthName = data.monthLabel ? (lang.startsWith("de") ? data.monthLabel.de : data.monthLabel.en) : data.month;

  return (
    <div
      className="labs-card labs-fade-in labs-stagger-2"
      style={{
        padding: 20,
        marginBottom: 24,
        background: "linear-gradient(135deg, var(--labs-phase-palate-dim), var(--labs-phase-finish-dim))",
        border: "1px solid color-mix(in srgb, var(--labs-accent) 28%, transparent)",
      }}
      data-testid="labs-monthly-review"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--labs-accent)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {t("labs.monthlyReview", "Your Month")}
        </span>
        <span style={{ fontSize: 12, color: "var(--labs-text-muted)" }}>
          {monthName}
        </span>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-accent)", fontFamily: "var(--font-display)" }}>
            {data.ratingsCount}
          </div>
          <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase" }}>
            {t("labs.monthlyReviewRated", "Rated")}
          </div>
        </div>
        <div style={{ textAlign: "center", flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-phase-nose)", fontFamily: "var(--font-display)" }}>
            {data.avgScore?.toFixed(1) || "\u2013"}
          </div>
          <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase" }}>
            {t("labs.monthlyReviewAvg", "Avg Score")}
          </div>
        </div>
        {data.newRegions && data.newRegions.length > 0 && (
          <div style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--labs-success)", fontFamily: "var(--font-display)" }}>
              {data.newRegions.length}
            </div>
            <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase" }}>
              {t("labs.monthlyReviewNewRegions", "New Regions")}
            </div>
          </div>
        )}
      </div>

      {data.scoreDelta != null && (
        <div style={{ fontSize: 12, color: "var(--labs-text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{
            color: data.scoreDelta > 0 ? "var(--labs-success)" : data.scoreDelta < 0 ? "var(--labs-warning, #f59e0b)" : "var(--labs-text-muted)",
            fontWeight: 600,
          }}>
            {data.scoreDelta > 0 ? "\u25b2" : data.scoreDelta < 0 ? "\u25bc" : "\u25cf"}
            {" "}
            {data.scoreDelta > 0
              ? `${formatScore(data.scoreDelta)} ${t("labs.monthlyReviewUp", "up")}`
              : data.scoreDelta < 0
                ? `${formatScore(Math.abs(data.scoreDelta))} ${t("labs.monthlyReviewDown", "down")}`
                : t("labs.monthlyReviewSame", "steady")
            }
          </span>
          <span style={{ opacity: 0.6 }}>{t("labs.monthlyReviewVsPrev", "vs. previous month")}</span>
        </div>
      )}

      {data.newRegions && data.newRegions.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {data.newRegions.map(r => (
            <span
              key={r}
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 99,
                background: "color-mix(in srgb, var(--labs-success) 15%, transparent)",
                color: "var(--labs-success)",
                fontWeight: 600,
              }}
            >
              {r}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function LabsPalateTimeline({ periods }: { periods: TimelinePeriod[] }) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [periods]);

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun",
    "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  const overallScores = periods.map(p => p.avgScores.overall);
  const finishScores = periods.map(p => p.avgScores.finish);

  return (
    <div className="mb-6 labs-fade-in labs-stagger-2" data-testid="labs-palate-timeline">
      <p className="labs-section-label flex items-center gap-2">
        <Activity className="w-3.5 h-3.5" />
        {t("labs.palateTimeline", "Palate Timeline")}
      </p>
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 8,
          scrollBehavior: "smooth",
          WebkitOverflowScrolling: "touch",
          msOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        {periods.map((p, i) => {
          const [year, monthNum] = p.month.split("-");
          const monthLabel = monthNames[monthNum] || monthNum;
          const deltaText = p.delta
            ? p.delta.overall > 0
              ? `+${p.delta.overall.toFixed(0)}`
              : p.delta.overall < 0
                ? `${p.delta.overall.toFixed(0)}`
                : "\u00b10"
            : null;
          const deltaColor = p.delta
            ? p.delta.overall > 0 ? "var(--labs-success)" : p.delta.overall < 0 ? "var(--labs-warning, #f59e0b)" : "var(--labs-text-muted)"
            : "var(--labs-text-muted)";

          return (
            <div
              key={p.month}
              className="labs-card"
              style={{ minWidth: 200, maxWidth: 220, padding: 16, flexShrink: 0 }}
              data-testid={`labs-timeline-card-${i}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--labs-text)" }}>
                  {monthLabel} {year}
                </span>
                {deltaText && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: deltaColor }}>
                    {deltaText}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--labs-text-muted)", textTransform: "uppercase" }}>
                    {t("labs.timelineAvgScore", "Avg")}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--labs-accent)" }}>
                    {p.avgScores.overall.toFixed(0)}
                  </div>
                </div>
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                  <MiniSparkline
                    data={overallScores.slice(0, i + 1)}
                    color="var(--labs-accent)"
                    width={80}
                    height={28}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                    {t("labs.timelineFinish", "Finish")}
                  </div>
                  <MiniSparkline
                    data={finishScores.slice(0, i + 1)}
                    color="var(--labs-phase-finish)"
                    width={60}
                    height={20}
                  />
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--labs-text-muted)" }}>
                    {t("labs.timelineRatings", "Ratings")}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--labs-text)" }}>
                    {p.count}
                  </div>
                </div>
              </div>

              {p.topRegion && (
                <p style={{ fontSize: 11, color: "var(--labs-text-muted)", lineHeight: 1.4, margin: 0 }}>
                  {p.topRegion} — {p.regionCount} {t("labs.timelineRatings", "Ratings")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

