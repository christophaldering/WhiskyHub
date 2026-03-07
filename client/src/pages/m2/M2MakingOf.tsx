import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { v, alpha } from "@/lib/themeVars";
import { useSession } from "@/lib/session";
import M2BackButton from "@/components/m2/M2BackButton";
import {
  Wine,
  GitCommit,
  Layers,
  Calendar,
  Code2,
  Languages,
  AlertTriangle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Lock,
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
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function StatCard({
  label,
  value,
  icon: Icon,
  testId,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  testId: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  return (
    <div
      ref={ref}
      style={{
        flex: "1 1 120px",
        background: `radial-gradient(ellipse at center, ${alpha(v.accent, "08")} 0%, ${v.card} 70%)`,
        border: `1px solid ${v.border}`,
        borderRadius: 16,
        padding: "20px 12px",
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: `all 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`,
      }}
      data-testid={testId}
    >
      <Icon
        style={{
          width: 18,
          height: 18,
          color: v.accent,
          margin: "0 auto 8px",
          display: "block",
          opacity: 0.7,
        }}
        strokeWidth={1.5}
      />
      <div
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: v.accent,
          fontVariantNumeric: "tabular-nums",
          fontFamily: "'Playfair Display', Georgia, serif",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: v.muted,
          marginTop: 4,
          fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function ChapterCard({
  chapter,
  index,
  totalChapters,
}: {
  chapter: ChapterData;
  index: number;
  totalChapters: number;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref as React.RefObject<HTMLElement>);
  const [expanded, setExpanded] = useState(false);

  const downColor = "#c0533a";

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        gap: 0,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(30px)",
        transition: `all 0.7s cubic-bezier(0.4, 0, 0.2, 1) ${index * 80}ms`,
      }}
      data-testid={`making-of-chapter-${chapter.id}`}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: 48,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: chapter.isDown
              ? alpha(downColor, "20")
              : alpha(chapter.color, "25"),
            border: `2px solid ${chapter.isDown ? downColor : chapter.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            zIndex: 1,
          }}
        >
          {chapter.isDown ? (
            <AlertTriangle
              style={{ width: 16, height: 16, color: downColor }}
              strokeWidth={2}
            />
          ) : (
            <Wine
              style={{ width: 16, height: 16, color: chapter.color }}
              strokeWidth={2}
            />
          )}
        </div>
        {index < totalChapters - 1 && (
          <div
            style={{
              width: 2,
              flex: 1,
              background: `linear-gradient(to bottom, ${chapter.color}, ${
                index + 1 < totalChapters
                  ? "#8B4513"
                  : chapter.color
              })`,
              opacity: 0.4,
              minHeight: 40,
            }}
          />
        )}
      </div>

      <div style={{ flex: 1, paddingBottom: 32, paddingLeft: 8 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 2,
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: chapter.isDown ? downColor : chapter.color,
              fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            }}
          >
            {t("makingOf.chapterLabel", "Chapter")} {chapter.chapter}
          </span>
          {chapter.isDown && (
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: downColor,
                background: alpha(downColor, "15"),
                padding: "2px 6px",
                borderRadius: 4,
              }}
            >
              {t("makingOf.roughPatch", "Rough Patch")}
            </span>
          )}
        </div>
        <h3
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 20,
            fontWeight: 700,
            color: v.text,
            margin: "4px 0 2px",
            letterSpacing: "-0.01em",
          }}
          data-testid={`text-chapter-title-${chapter.id}`}
        >
          {t(chapter.titleKey, chapter.titleFallback)}
        </h3>
        <span
          style={{
            fontSize: 12,
            color: v.muted,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
          data-testid={`text-chapter-date-${chapter.id}`}
        >
          {chapter.dateRange}
        </span>

        <p
          style={{
            fontSize: 14,
            lineHeight: 1.65,
            color: v.textSecondary,
            margin: "12px 0 16px",
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
          data-testid={`text-chapter-narrative-${chapter.id}`}
        >
          {t(chapter.narrativeKey, chapter.narrativeFallback)}
        </p>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: chapter.isDown ? downColor : chapter.color,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {chapter.stats.commits}
            </div>
            <div style={{ fontSize: 10, color: v.muted }}>
              {t("makingOf.commits", "Commits")}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: v.card,
              border: `1px solid ${v.border}`,
              borderRadius: 10,
              padding: "10px 12px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: v.accent,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {chapter.stats.features}
            </div>
            <div style={{ fontSize: 10, color: v.muted }}>
              {t("makingOf.features", "Features")}
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            background: alpha(chapter.color, "06"),
            border: `1px solid ${alpha(chapter.color, "15")}`,
            borderRadius: 10,
            cursor: "pointer",
            color: v.textSecondary,
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            marginBottom: expanded ? 8 : 0,
            transition: "all 0.2s",
          }}
          data-testid={`button-expand-milestones-${chapter.id}`}
        >
          <span>
            {t("makingOf.milestones", "Milestones")} ({chapter.milestones.length})
          </span>
          {expanded ? (
            <ChevronUp style={{ width: 14, height: 14 }} />
          ) : (
            <ChevronDown style={{ width: 14, height: 14 }} />
          )}
        </button>

        {expanded && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {chapter.milestones.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "6px 10px",
                  background: v.card,
                  border: `1px solid ${v.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                  color: v.textSecondary,
                  fontFamily:
                    "-apple-system, 'SF Pro Text', system-ui, sans-serif",
                  lineHeight: 1.4,
                }}
                data-testid={`text-milestone-${chapter.id}-${i}`}
              >
                <GitCommit
                  style={{
                    width: 12,
                    height: 12,
                    color: chapter.isDown ? downColor : chapter.color,
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                  strokeWidth={2}
                />
                {m}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
            padding: "10px 12px",
            background: alpha(v.accent, "06"),
            border: `1px solid ${alpha(v.accent, "12")}`,
            borderRadius: 10,
          }}
          data-testid={`text-lesson-${chapter.id}`}
        >
          <Lightbulb
            style={{
              width: 14,
              height: 14,
              color: v.accent,
              flexShrink: 0,
              marginTop: 1,
            }}
            strokeWidth={2}
          />
          <span
            style={{
              fontSize: 12,
              fontStyle: "italic",
              color: v.textSecondary,
              lineHeight: 1.5,
              fontFamily:
                "-apple-system, 'SF Pro Text', system-ui, sans-serif",
            }}
          >
            {chapter.lesson}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function M2MakingOf() {
  const { t } = useTranslation();
  const session = useSession();
  const headerRef = useRef<HTMLDivElement>(null);
  const headerVisible = useInView(headerRef as React.RefObject<HTMLElement>);

  const { data, isLoading, error } = useQuery<MakingOfData>({
    queryKey: ["making-of"],
    queryFn: async () => {
      const res = await fetch("/api/making-of", {
        headers: { "x-participant-id": session.pid || "" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Access denied");
      }
      return res.json();
    },
    enabled: !!session.pid,
    staleTime: 5 * 60 * 1000,
  });

  if (!session.signedIn || !session.pid) {
    return (
      <div style={{ padding: "32px 16px" }} data-testid="making-of-page">
        <M2BackButton />
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: v.muted,
          }}
        >
          <Lock
            style={{ width: 40, height: 40, opacity: 0.3, margin: "0 auto 16px", display: "block" }}
          />
          <p style={{ fontSize: 14 }}>
            {t("makingOf.signInRequired", "Sign in to view this page.")}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ padding: "32px 16px" }} data-testid="making-of-page">
        <M2BackButton />
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `3px solid ${v.border}`,
              borderTopColor: v.accent,
              borderRadius: "50%",
              animation: "moSpin 0.8s linear infinite",
              margin: "0 auto",
            }}
          />
          <style>{`@keyframes moSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: "32px 16px" }} data-testid="making-of-page">
        <M2BackButton />
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
          }}
        >
          <Lock
            style={{
              width: 40,
              height: 40,
              color: v.muted,
              opacity: 0.4,
              margin: "0 auto 16px",
              display: "block",
            }}
          />
          <h3
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              color: v.text,
              margin: "0 0 8px",
            }}
          >
            {t("makingOf.accessDeniedTitle", "Access Required")}
          </h3>
          <p
            style={{
              fontSize: 13,
              color: v.muted,
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            {t(
              "makingOf.accessDeniedDesc",
              "This page is available by invitation only. Ask the admin for access."
            )}
          </p>
        </div>
      </div>
    );
  }

  const { chapters, stats } = data;

  return (
    <div style={{ padding: "32px 16px 64px" }} data-testid="making-of-page">
      <M2BackButton />

      <div
        ref={headerRef}
        style={{
          textAlign: "center",
          marginTop: 16,
          marginBottom: 32,
          opacity: headerVisible ? 1 : 0,
          transform: headerVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: `linear-gradient(135deg, ${alpha("#F5DEB3", "20")} 0%, ${alpha("#8B4513", "20")} 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <Wine
            style={{ width: 28, height: 28, color: v.accent }}
            strokeWidth={1.5}
          />
        </div>
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 28,
            fontWeight: 700,
            color: v.text,
            margin: "0 0 8px",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
          data-testid="text-making-of-title"
        >
          {t("makingOf.title", "The Making of CaskSense")}
        </h1>
        <p
          style={{
            fontSize: 14,
            color: v.textSecondary,
            margin: "0 auto",
            maxWidth: 360,
            lineHeight: 1.5,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
          data-testid="text-making-of-subtitle"
        >
          {t(
            "makingOf.subtitle",
            "20 days. 1,625 commits. One obsession."
          )}
        </p>
        <div
          style={{
            width: 40,
            height: 2,
            background: `linear-gradient(to right, #F5DEB3, #8B4513)`,
            margin: "16px auto 0",
            borderRadius: 1,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 32,
        }}
        data-testid="making-of-stats-grid"
      >
        <StatCard
          label={t("makingOf.statDays", "Days")}
          value={stats.totalDays}
          icon={Calendar}
          testId="stat-total-days"
          delay={0}
        />
        <StatCard
          label={t("makingOf.statCommits", "Commits")}
          value={stats.totalCommits.toLocaleString()}
          icon={GitCommit}
          testId="stat-total-commits"
          delay={100}
        />
        <StatCard
          label={t("makingOf.statFeatures", "Features")}
          value={stats.featuresBuilt}
          icon={Layers}
          testId="stat-features-built"
          delay={200}
        />
        <StatCard
          label={t("makingOf.statRollbacks", "Rollbacks")}
          value={`${stats.rollbacksSurvived}+`}
          icon={AlertTriangle}
          testId="stat-rollbacks"
          delay={300}
        />
        <StatCard
          label={t("makingOf.statLines", "Lines of Code")}
          value={stats.linesOfCode}
          icon={Code2}
          testId="stat-lines"
          delay={400}
        />
        <StatCard
          label={t("makingOf.statLanguages", "Languages")}
          value={stats.languages}
          icon={Languages}
          testId="stat-languages"
          delay={500}
        />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            height: 1,
            flex: 1,
            background: `linear-gradient(to right, transparent, ${alpha(v.accent, "20")})`,
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: v.muted,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          {t("makingOf.timelineLabel", "Timeline")}
        </span>
        <div
          style={{
            height: 1,
            flex: 1,
            background: `linear-gradient(to left, transparent, ${alpha(v.accent, "20")})`,
          }}
        />
      </div>

      <div data-testid="making-of-timeline">
        {chapters.map((ch, i) => (
          <ChapterCard
            key={ch.id}
            chapter={ch}
            index={i}
            totalChapters={chapters.length}
          />
        ))}
      </div>

      <div
        style={{
          textAlign: "center",
          marginTop: 16,
          padding: "24px 16px",
          background: `radial-gradient(ellipse at center, ${alpha(v.accent, "06")} 0%, transparent 70%)`,
          borderRadius: 16,
        }}
        data-testid="making-of-footer"
      >
        <p
          style={{
            fontSize: 14,
            fontStyle: "italic",
            color: v.muted,
            margin: 0,
            lineHeight: 1.6,
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          {t(
            "makingOf.footer",
            "Built with curiosity, whisky, and an unreasonable number of commits."
          )}
        </p>
        <p
          style={{
            fontSize: 11,
            color: alpha(v.muted, "60"),
            margin: "8px 0 0",
            fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          {stats.firstCommit} — {stats.latestCommit}
        </p>
      </div>
    </div>
  );
}
