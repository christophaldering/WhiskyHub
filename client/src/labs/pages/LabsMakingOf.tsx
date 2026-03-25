import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBackNavigation } from "@/labs/hooks/useBackNavigation";
import { getSession } from "@/lib/session";
import AuthGateMessage from "@/labs/components/AuthGateMessage";
import { useTranslation } from "react-i18next";
import {
  Wine, GitCommit, Layers, Calendar, Code2, Languages,
  AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Lock, ChevronLeft,
  Users, Star, Trophy, Globe, BookOpen,
} from "lucide-react";

interface ChapterData {
  id: string;
  chapter: number;
  titleKey: string;
  titleFallback: string;
  dateRange: string;
  narrativeKey: string;
  narrativeFallback: string;
  stats: { commits: number; features: number };
  color: string;
  milestones: string[];
  isDown: boolean;
  lesson: string;
}

interface MakingOfStats {
  totalDays: number;
  totalCommits: number;
  featuresBuilt: number;
  rollbacksSurvived: number;
  linesOfCode: string;
  languages: number;
  firstCommit: string;
  latestCommit: string;
  registeredUsers: number;
  totalTastings: number;
  totalRatings: number;
  whiskiesTasted: number;
  activeCommunities: number;
}

interface CommunityMilestone {
  category: string;
  label: string;
  value: number;
  threshold: number;
  reached: boolean;
}

interface ChangelogFeedItem {
  id: string;
  title: string;
  description: string;
  category: string;
  date: string;
}

interface MakingOfData {
  chapters: ChapterData[];
  stats: MakingOfStats;
  communityMilestones: CommunityMilestone[];
  changelogFeed: ChangelogFeedItem[];
}

function useInView(ref: React.RefObject<HTMLElement | null>, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function StatCard({ label, value, icon: Icon, testId, delay }: { label: string; value: string | number; icon: React.ElementType; testId: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  return (
    <div
      ref={ref}
      className="flex-1 min-w-[120px] rounded-2xl text-center py-5 px-3 transition-all"
      style={{
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
      }}
      data-testid={testId}
    >
      <Icon className="w-[18px] h-[18px] mx-auto mb-2 opacity-70" style={{ color: "var(--labs-accent)" }} strokeWidth={1.5} />
      <div className="labs-h1" style={{ color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: "var(--labs-text-muted)" }}>{label}</div>
    </div>
  );
}

function ChapterCard({ chapter, index }: { chapter: ChapterData; index: number }) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  const [expanded, setExpanded] = useState(false);
  const downColor = "var(--labs-danger)";

  return (
    <div
      ref={ref}
      className="flex gap-4"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.5s cubic-bezier(0.4, 0, 0.2, 1) ${index * 100}ms`,
      }}
    >
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center labs-serif text-sm font-bold"
          style={{
            background: chapter.isDown ? "var(--labs-danger-muted)" : "var(--labs-accent-muted)",
            color: chapter.isDown ? downColor : "var(--labs-accent)",
          }}
        >
          {chapter.chapter}
        </div>
        <div className="w-px flex-1 mt-2" style={{ background: "var(--labs-border)" }} />
      </div>

      <div className="flex-1 pb-8">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="labs-serif text-sm font-bold" style={{ color: chapter.isDown ? downColor : "var(--labs-text)" }}>
              {chapter.isDown && <AlertTriangle className="inline w-3.5 h-3.5 mr-1.5" />}
              {chapter.titleFallback}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{chapter.dateRange}</p>
          </div>
          <div className="flex gap-3 text-[11px]" style={{ color: "var(--labs-text-muted)" }}>
            <span>{chapter.stats.commits} {t("makingOf.statCommits")}</span>
            <span>{chapter.stats.features} {t("makingOf.statFeatures")}</span>
          </div>
        </div>

        <p className="text-xs mb-3" style={{ color: "var(--labs-text-secondary)", lineHeight: 1.6 }}>
          {chapter.narrativeFallback}
        </p>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-[11px] font-medium mb-2"
          style={{ color: "var(--labs-accent)", background: "none", border: "none", cursor: "pointer" }}
          data-testid={`labs-makingof-chapter-toggle-${index}`}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? t("makingOf.less") : t("makingOf.milestones")}
        </button>

        {expanded && (
          <div className="space-y-1.5 mb-3 labs-fade-in">
            {chapter.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--labs-accent)", opacity: 0.75 }} />
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{m}</span>
              </div>
            ))}
          </div>
        )}

        {chapter.lesson && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--labs-surface-elevated)" }}>
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--labs-accent)", opacity: 0.75 }} />
            <span className="text-[11px] italic" style={{ color: "var(--labs-text-secondary)" }}>{chapter.lesson}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const MILESTONE_ICONS: Record<string, React.ElementType> = {
  registeredUsers: Users,
  totalTastings: Wine,
  totalRatings: Star,
  whiskiesTasted: Wine,
  activeCommunities: Globe,
};

const MILESTONE_COLORS: Record<string, string> = {
  registeredUsers: "#E8A87C",
  totalTastings: "#D4A256",
  totalRatings: "#C48B3F",
  whiskiesTasted: "#B07A35",
  activeCommunities: "#8B5E2F",
};

function MilestoneCard({ milestone, index }: { milestone: CommunityMilestone; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  const Icon = MILESTONE_ICONS[milestone.category] || Trophy;
  const color = MILESTONE_COLORS[milestone.category] || "var(--labs-accent)";

  return (
    <div
      ref={ref}
      className="flex items-center gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0.9)",
        transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 60}ms`,
      }}
      data-testid={`labs-makingof-milestone-${milestone.category}-${milestone.threshold}`}
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}22`, color }}
      >
        <Icon className="w-4 h-4" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-medium truncate" style={{ color: "var(--labs-text)" }}>
          {milestone.label}
        </div>
        <div className="text-[10px]" style={{ color: "var(--labs-text-muted)" }}>
          Current: {milestone.value}
        </div>
      </div>
      <Trophy className="w-3.5 h-3.5 flex-shrink-0" style={{ color, opacity: 0.6 }} />
    </div>
  );
}

const CATEGORY_COLORS: Record<string, string> = {
  feature: "#4CAF50",
  improvement: "#2196F3",
  fix: "#FF9800",
  milestone: "#9C27B0",
  community: "#E91E63",
};

function ChangelogCard({ entry, index }: { entry: ChangelogFeedItem; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  const badgeColor = CATEGORY_COLORS[entry.category] || "var(--labs-accent)";

  return (
    <div
      ref={ref}
      className="flex items-start gap-3 px-4 py-3 rounded-xl"
      style={{
        background: "var(--labs-surface)",
        border: "1px solid var(--labs-border)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(-12px)",
        transition: `all 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 80}ms`,
      }}
      data-testid={`labs-makingof-changelog-${entry.id}`}
    >
      <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
        <BookOpen className="w-3.5 h-3.5" style={{ color: "var(--labs-accent)", opacity: 0.6 }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] font-medium truncate" style={{ color: "var(--labs-text)" }}>
            {entry.title}
          </span>
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 uppercase font-semibold"
            style={{ background: `${badgeColor}22`, color: badgeColor }}
            data-testid={`labs-makingof-changelog-badge-${entry.id}`}
          >
            {entry.category}
          </span>
        </div>
        {entry.description && (
          <div className="text-[10px] mt-0.5 line-clamp-2" style={{ color: "var(--labs-text-secondary)" }}>
            {entry.description}
          </div>
        )}
        <div className="text-[10px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>
          {entry.date}
        </div>
      </div>
    </div>
  );
}

export default function LabsMakingOf() {
  const { t } = useTranslation();
  const session = getSession();

  const { data, isLoading, error } = useQuery<MakingOfData>({
    queryKey: ["making-of"],
    queryFn: async () => {
      const res = await fetch("/api/making-of", {
        headers: { "x-participant-id": session.pid || "" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || t("makingOf.failedToLoad"));
      }
      return res.json();
    },
    enabled: !!session.pid,
    staleTime: 5 * 60 * 1000,
  });

  if (!session.signedIn || !session.pid) {
    return (
      <div className="labs-page labs-fade-in" data-testid="labs-makingof-page">
        <BackBtn />
        <AuthGateMessage
          icon={<Lock className="w-10 h-10 opacity-30" style={{ color: "var(--labs-text-muted)" }} />}
          message="Sign in to view this page."
          className="text-center py-16"
          compact
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="labs-page" data-testid="labs-makingof-page">
        <BackBtn />
        <div className="text-center py-16">
          <div className="w-8 h-8 mx-auto rounded-full border-[3px] animate-spin" style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="labs-page labs-fade-in" data-testid="labs-makingof-page">
        <BackBtn />
        <div className="text-center py-16">
          <Wine className="w-10 h-10 mx-auto mb-4 opacity-40" style={{ color: "var(--labs-text-muted)" }} />
          <h3 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }}>{t("makingOf.error")}</h3>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            Could not load the Making-Of page. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  const { chapters, stats, communityMilestones, changelogFeed } = data;

  const highestMilestones = Object.values(
    communityMilestones.reduce((acc, m) => {
      if (!acc[m.category] || m.threshold > acc[m.category].threshold) {
        acc[m.category] = m;
      }
      return acc;
    }, {} as Record<string, CommunityMilestone>)
  );

  return (
    <div className="labs-page labs-fade-in" data-testid="labs-makingof-page">
      <BackBtn />

      <div className="text-center mt-4 mb-8">
        <h1 className="labs-h1 mb-2" style={{ color: "var(--labs-accent)" }} data-testid="labs-makingof-title">
          The Making of CaskSense
        </h1>
        <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
          A journey in {stats.totalDays} days, {stats.totalCommits} commits
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <StatCard label={t("makingOf.statDays")} value={stats.totalDays} icon={Calendar} testId="labs-makingof-stat-days" delay={0} />
        <StatCard label={t("makingOf.statCommits")} value={stats.totalCommits} icon={GitCommit} testId="labs-makingof-stat-commits" delay={100} />
        <StatCard label={t("makingOf.statFeatures")} value={stats.featuresBuilt} icon={Layers} testId="labs-makingof-stat-features" delay={200} />
        <StatCard label={t("makingOf.statRollbacks")} value={stats.rollbacksSurvived} icon={AlertTriangle} testId="labs-makingof-stat-rollbacks" delay={300} />
        <StatCard label={t("makingOf.statLines")} value={stats.linesOfCode} icon={Code2} testId="labs-makingof-stat-loc" delay={400} />
        <StatCard label={t("makingOf.statLanguages")} value={stats.languages} icon={Languages} testId="labs-makingof-stat-langs" delay={500} />
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <StatCard label={t("makingOf.statUsers")} value={stats.registeredUsers} icon={Users} testId="labs-makingof-stat-users" delay={0} />
        <StatCard label={t("makingOf.statTastings")} value={stats.totalTastings} icon={Wine} testId="labs-makingof-stat-tastings" delay={100} />
        <StatCard label={t("makingOf.statRatings")} value={stats.totalRatings} icon={Star} testId="labs-makingof-stat-ratings" delay={200} />
        <StatCard label={t("makingOf.statWhiskies")} value={stats.whiskiesTasted} icon={Wine} testId="labs-makingof-stat-whiskies" delay={300} />
        <StatCard label={t("makingOf.statCommunities")} value={stats.activeCommunities} icon={Globe} testId="labs-makingof-stat-communities" delay={400} />
      </div>

      {highestMilestones.length > 0 && (
        <>
          <h2 className="labs-h3 mb-4" style={{ color: "var(--labs-text)" }} data-testid="labs-makingof-milestones-heading">
            Community Milestones
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-10">
            {highestMilestones.map((m, i) => (
              <MilestoneCard key={`${m.category}-${m.threshold}`} milestone={m} index={i} />
            ))}
          </div>
        </>
      )}

      <h2 className="labs-h3 mb-6" style={{ color: "var(--labs-text)" }}>{t("makingOf.journey")}</h2>

      <div>
        {chapters.map((chapter, i) => (
          <ChapterCard key={chapter.id} chapter={chapter} index={i} />
        ))}
      </div>

      {changelogFeed.length > 0 && (
        <div className="mt-8">
          <h2 className="labs-h3 mb-2" style={{ color: "var(--labs-text)" }} data-testid="labs-makingof-changelog-heading">
            The Story Continues
          </h2>
          <p className="text-[11px] mb-4" style={{ color: "var(--labs-text-muted)" }}>
            Latest updates — this feed grows automatically with every new feature.
          </p>
          <div className="space-y-2">
            {changelogFeed.map((entry, i) => (
              <ChangelogCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BackBtn() {
  const goBackToHome = useBackNavigation("/labs/home");
  return (
    <button
      onClick={goBackToHome}
      className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
      style={{ color: "var(--labs-text-muted)" }}
      data-testid="labs-makingof-back"
    >
      <ChevronLeft className="w-4 h-4" /> Home
    </button>
  );
}
