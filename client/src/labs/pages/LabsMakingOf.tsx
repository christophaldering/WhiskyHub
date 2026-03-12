import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getSession } from "@/lib/session";
import {
  Wine, GitCommit, Layers, Calendar, Code2, Languages,
  AlertTriangle, Lightbulb, ChevronDown, ChevronUp, Lock, ChevronLeft,
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
}

interface MakingOfData {
  chapters: ChapterData[];
  stats: MakingOfStats;
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
      <div className="labs-serif text-2xl font-bold" style={{ color: "var(--labs-accent)", fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div className="text-[11px] mt-1" style={{ color: "var(--labs-text-muted)" }}>{label}</div>
    </div>
  );
}

function ChapterCard({ chapter, index }: { chapter: ChapterData; index: number }) {
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
            <p className="text-[10px] mt-0.5" style={{ color: "var(--labs-text-muted)" }}>{chapter.dateRange}</p>
          </div>
          <div className="flex gap-3 text-[10px]" style={{ color: "var(--labs-text-muted)" }}>
            <span>{chapter.stats.commits} commits</span>
            <span>{chapter.stats.features} features</span>
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
          {expanded ? "Less" : "Milestones"}
        </button>

        {expanded && (
          <div className="space-y-1.5 mb-3 labs-fade-in">
            {chapter.milestones.map((m, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: "var(--labs-accent)", opacity: 0.5 }} />
                <span className="text-[11px]" style={{ color: "var(--labs-text-muted)" }}>{m}</span>
              </div>
            ))}
          </div>
        )}

        {chapter.lesson && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "var(--labs-surface-elevated)" }}>
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "var(--labs-accent)", opacity: 0.6 }} />
            <span className="text-[11px] italic" style={{ color: "var(--labs-text-secondary)" }}>{chapter.lesson}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LabsMakingOf() {
  const session = getSession();

  const { data, isLoading, error } = useQuery<MakingOfData>({
    queryKey: ["making-of"],
    queryFn: async () => {
      const res = await fetch("/api/making-of", {
        headers: { "x-participant-id": session.pid || "" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || "Access denied");
      }
      return res.json();
    },
    enabled: !!session.pid,
    staleTime: 5 * 60 * 1000,
  });

  if (!session.signedIn || !session.pid) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-makingof-page">
        <BackBtn />
        <div className="text-center py-16">
          <Lock className="w-10 h-10 mx-auto mb-4 opacity-30" style={{ color: "var(--labs-text-muted)" }} />
          <p className="text-sm" style={{ color: "var(--labs-text-muted)" }}>Sign in to view this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto" data-testid="labs-makingof-page">
        <BackBtn />
        <div className="text-center py-16">
          <div className="w-8 h-8 mx-auto rounded-full border-[3px] animate-spin" style={{ borderColor: "var(--labs-border)", borderTopColor: "var(--labs-accent)" }} />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-5 py-6 max-w-2xl mx-auto labs-fade-in" data-testid="labs-makingof-page">
        <BackBtn />
        <div className="text-center py-16">
          <Lock className="w-10 h-10 mx-auto mb-4 opacity-40" style={{ color: "var(--labs-text-muted)" }} />
          <h3 className="labs-serif text-lg font-semibold mb-2" style={{ color: "var(--labs-text)" }}>Access Required</h3>
          <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
            This page is available by invitation only. Ask the admin for access.
          </p>
        </div>
      </div>
    );
  }

  const { chapters, stats } = data;

  return (
    <div className="px-5 py-6 pb-16 max-w-2xl mx-auto labs-fade-in" data-testid="labs-makingof-page">
      <BackBtn />

      <div className="text-center mt-4 mb-8">
        <h1 className="labs-serif text-2xl font-bold mb-2" style={{ color: "var(--labs-accent)" }} data-testid="labs-makingof-title">
          The Making of CaskSense
        </h1>
        <p className="text-xs" style={{ color: "var(--labs-text-muted)" }}>
          A journey in {stats.totalDays} days, {stats.totalCommits} commits
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-10">
        <StatCard label="Days" value={stats.totalDays} icon={Calendar} testId="labs-makingof-stat-days" delay={0} />
        <StatCard label="Commits" value={stats.totalCommits} icon={GitCommit} testId="labs-makingof-stat-commits" delay={100} />
        <StatCard label="Features" value={stats.featuresBuilt} icon={Layers} testId="labs-makingof-stat-features" delay={200} />
        <StatCard label="Rollbacks" value={stats.rollbacksSurvived} icon={AlertTriangle} testId="labs-makingof-stat-rollbacks" delay={300} />
        <StatCard label="Lines of Code" value={stats.linesOfCode} icon={Code2} testId="labs-makingof-stat-loc" delay={400} />
        <StatCard label="Languages" value={stats.languages} icon={Languages} testId="labs-makingof-stat-langs" delay={500} />
      </div>

      <h2 className="labs-serif text-lg font-bold mb-6" style={{ color: "var(--labs-text)" }}>The Journey</h2>

      <div>
        {chapters.map((chapter, i) => (
          <ChapterCard key={chapter.id} chapter={chapter} index={i} />
        ))}
      </div>
    </div>
  );
}

function BackBtn() {
  const [, navigate] = useLocation();
  return (
    <button
      onClick={() => navigate("/labs/home")}
      className="labs-btn-ghost flex items-center gap-1 -ml-2 mb-4"
      style={{ color: "var(--labs-text-muted)" }}
      data-testid="labs-makingof-back"
    >
      <ChevronLeft className="w-4 h-4" /> Home
    </button>
  );
}
