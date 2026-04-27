import type { Insight, InsightVisual } from "./types";

type T = (k: string, fb: string, opts?: Record<string, unknown>) => string;

export interface SoloEngineWhisky {
  id: string;
  name: string;
  region?: string | null;
  age?: number | string | null;
  distillery?: string | null;
}

export interface SoloEngineDnaAxis {
  id: string;
  label: string;
  affinity: number;
  nDrams: number;
}

export interface SoloEngineDna {
  axes: SoloEngineDnaAxis[];
  n: number;
  phase?: string;
}

export interface SoloEngineJournalEntry {
  id: string;
  title?: string | null;
  region?: string | null;
  personalScore?: number | null;
  createdAt?: string | null;
}

export interface SoloEngineInput {
  whisky: SoloEngineWhisky;
  score: number;
  dna?: SoloEngineDna | null;
  journal?: SoloEngineJournalEntry[];
  t: T;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function makeId(parts: Array<string | number | undefined | null>): string {
  return parts.filter(Boolean).join("-").replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 80);
}

export function selectSoloInsights(input: SoloEngineInput): Insight[] {
  const { whisky, score, dna, journal, t } = input;
  const insights: Insight[] = [];

  if (dna && Array.isArray(dna.axes) && dna.axes.length > 0) {
    const sorted = [...dna.axes].filter(a => a.nDrams >= 2).sort((a, b) => b.affinity - a.affinity);
    const top = sorted[0];
    if (top && top.affinity >= 55) {
      const visual: InsightVisual = {
        kind: "miniRadar",
        axes: sorted.slice(0, 6).map(a => ({ label: a.label, value: a.affinity })),
        highlightIndex: 0,
      };
      insights.push({
        id: makeId(["solo", "dna", whisky.id, top.id]),
        kind: "solo.dna-highlight",
        headline: t("insights.solo.dnaHighlight.headline", "Strong affinity: {{label}}", { label: top.label }),
        subline: t("insights.solo.dnaHighlight.subline", "You consistently rate {{label}} drams above your baseline.", { label: top.label }),
        visual,
        score: clamp01((top.affinity - 50) / 50) * 0.95,
        deepLink: `/labs/taste?tab=ai&sub=labs-link-ai-insights-dna&highlight=${encodeURIComponent(top.id)}`,
        testId: `insight-solo-dna-${top.id}`,
        tone: "accent",
      });
    }
  }

  if (Array.isArray(journal) && journal.length > 0) {
    const region = (whisky.region || "").trim();
    if (region) {
      const wName = (whisky.name || "").trim().toLowerCase();
      const sameRegion = journal.filter(j => {
        if (j.id === whisky.id) return false;
        if (wName && (j.title || "").trim().toLowerCase() === wName) return false;
        return (j.region || "").toLowerCase() === region.toLowerCase() && typeof j.personalScore === "number";
      });
      if (sameRegion.length === 0) {
        insights.push({
          id: makeId(["solo", "first-region", whisky.id, region]),
          kind: "solo.first-of-region",
          headline: t("insights.solo.firstOfRegion.headline", "First {{region}} in your diary", { region }),
          subline: t("insights.solo.firstOfRegion.subline", "Open up a new region in your taste map."),
          visual: { kind: "icon", iconName: "compass", badge: "1" },
          score: 0.7,
          deepLink: `/labs/taste?tab=analytics&sub=labs-link-analytics-hub-compare&q=${encodeURIComponent(whisky.name)}`,
          testId: "insight-solo-first-region",
          tone: "accent",
        });
      } else if (sameRegion.length >= 2) {
        const avg = sameRegion.reduce((s, j) => s + (j.personalScore || 0), 0) / sameRegion.length;
        const delta = score - avg;
        if (delta >= 4) {
          const last = sameRegion.slice(-5).map(j => j.personalScore || 0);
          insights.push({
            id: makeId(["solo", "best-region", whisky.id, region]),
            kind: "solo.personal-best-region",
            headline: t("insights.solo.bestRegion.headline", "+{{delta}} above your {{region}} average", { delta: delta.toFixed(1), region }),
            subline: t("insights.solo.bestRegion.subline", "You usually rate {{region}} around {{avg}}.", { region, avg: Math.round(avg) }),
            visual: { kind: "sparkline", values: [...last, score], maxValue: 100 },
            score: clamp01(delta / 15) * 0.9,
            deepLink: `/labs/taste?tab=analytics&sub=labs-link-analytics-hub-compare&q=${encodeURIComponent(region)}`,
            testId: "insight-solo-best-region",
            tone: "success",
          });
        }
      }
    }

    const dramsToday = (() => {
      const today = new Date().toDateString();
      return journal.filter(j => j.createdAt && new Date(j.createdAt).toDateString() === today).length + 1;
    })();
    if (dramsToday >= 2) {
      insights.push({
        id: makeId(["solo", "streak-day", String(dramsToday)]),
        kind: "solo.streak",
        headline: t("insights.solo.streak.headline", "{{n}} drams logged today", { n: dramsToday }),
        subline: t("insights.solo.streak.subline", "Keep tasting — patterns sharpen with reps."),
        visual: { kind: "icon", iconName: "flame", badge: dramsToday },
        score: clamp01(dramsToday / 5) * 0.6,
        deepLink: "/labs/taste?tab=collection&sub=labs-link-collection-hub-drams",
        testId: "insight-solo-streak",
        tone: "accent",
      });
    }

    const sortedScores = journal.filter(j => typeof j.personalScore === "number").map(j => j.personalScore || 0).sort((a, b) => b - a);
    if (sortedScores.length >= 5) {
      const rank = sortedScores.findIndex(s => s <= score);
      const position = rank === -1 ? sortedScores.length + 1 : rank + 1;
      const total = sortedScores.length + 1;
      const percentile = 1 - position / total;
      if (percentile >= 0.7) {
        insights.push({
          id: makeId(["solo", "cluster-top", whisky.id]),
          kind: "solo.cluster-match",
          headline: t("insights.solo.clusterTop.headline", "Top {{p}}% of your drams", { p: Math.round((1 - percentile + 0.001) * 100) || 1 }),
          subline: t("insights.solo.clusterTop.subline", "This dram sits in your highest-rated band."),
          visual: { kind: "scoreRing", value: score, max: 100 },
          score: clamp01(percentile) * 0.85,
          deepLink: "/labs/taste?tab=ai&sub=labs-link-ai-insights-connoisseur",
          testId: "insight-solo-cluster-top",
          tone: "success",
        });
      }
    }
  }

  if (typeof whisky.age === "number" && whisky.age >= 18 && score < 80) {
    insights.push({
      id: makeId(["solo", "outlier-age", whisky.id]),
      kind: "solo.outlier-for-age",
      headline: t("insights.solo.outlierAge.headline", "Below average for {{age}}-year drams", { age: whisky.age }),
      subline: t("insights.solo.outlierAge.subline", "You're tougher on aged drams than most tasters."),
      visual: { kind: "diffBar", you: score, other: 86, max: 100, youLabel: t("insights.you", "You"), otherLabel: t("insights.cohort", "Cohort") },
      score: clamp01((86 - score) / 30) * 0.6,
      deepLink: "/labs/taste?tab=analytics&sub=labs-link-analytics-hub-analytics",
      testId: "insight-solo-outlier-age",
      tone: "neutral",
    });
  }

  insights.sort((a, b) => b.score - a.score);
  return insights.slice(0, 4);
}

export interface GroupEngineWhisky {
  id: string;
  name: string;
  region?: string | null;
  avgOverall: number | null;
  overallStdDev: number | null;
  ratingCount: number;
  myRating?: { overall: number | null } | null;
  myDelta?: number | null;
}

export interface GroupEngineParticipant {
  id: string;
  name: string;
  avgDeviation?: number;
}

export interface GroupEngineInput {
  tastingId: string;
  whiskies: GroupEngineWhisky[];
  participants?: GroupEngineParticipant[];
  myParticipantId?: string | null;
  closestTwinName?: string | null;
  biggestOutlierName?: string | null;
  spreadChampion?: { participantName: string; avgDeviation: number } | null;
  t: T;
}

export function selectGroupInsights(input: GroupEngineInput): Insight[] {
  const { tastingId, whiskies, t, closestTwinName, biggestOutlierName, spreadChampion } = input;
  const insights: Insight[] = [];

  const rated = whiskies.filter(w => w.overallStdDev != null && w.ratingCount >= 2);

  if (rated.length > 0) {
    const mostAgreed = rated.reduce((best, w) => (w.overallStdDev! < best.overallStdDev!) ? w : best);
    insights.push({
      id: makeId(["group", "agreed", mostAgreed.id]),
      kind: "group.most-agreed",
      headline: t("insights.groupRecap.mostAgreed.headline", "Group consensus: {{name}}", { name: mostAgreed.name }),
      subline: t("insights.groupRecap.mostAgreed.subline", "Std-dev {{sd}} across {{n}} tasters.", { sd: mostAgreed.overallStdDev!.toFixed(1), n: mostAgreed.ratingCount }),
      visual: { kind: "scoreRing", value: mostAgreed.avgOverall || 0, max: 100 },
      score: clamp01(1 - mostAgreed.overallStdDev! / 20) * 0.9,
      deepLink: `/labs/results/${tastingId}/report?highlight=${encodeURIComponent(mostAgreed.id)}`,
      testId: "insight-group-agreed",
      tone: "success",
    });

    const mostDebated = rated.reduce((best, w) => (w.overallStdDev! > best.overallStdDev!) ? w : best);
    if (mostDebated.id !== mostAgreed.id) {
      insights.push({
        id: makeId(["group", "debated", mostDebated.id]),
        kind: "group.most-debated",
        headline: t("insights.groupRecap.mostDebated.headline", "Most debated: {{name}}", { name: mostDebated.name }),
        subline: t("insights.groupRecap.mostDebated.subline", "Spread of {{sd}} points — tastes diverged.", { sd: mostDebated.overallStdDev!.toFixed(1) }),
        visual: { kind: "diffBar", you: 100 - mostDebated.overallStdDev! * 3, other: mostDebated.overallStdDev! * 3, max: 100, youLabel: t("insights.agreed", "Agreed"), otherLabel: t("insights.split", "Split") },
        score: clamp01(mostDebated.overallStdDev! / 20) * 0.85,
        deepLink: `/labs/results/${tastingId}/report?highlight=${encodeURIComponent(mostDebated.id)}`,
        testId: "insight-group-debated",
        tone: "danger",
      });
    }
  }

  if (closestTwinName) {
    insights.push({
      id: makeId(["group", "twin", closestTwinName]),
      kind: "group.closest-twin",
      headline: t("insights.groupRecap.twin.headline", "Closest taste twin: {{name}}", { name: closestTwinName }),
      subline: t("insights.groupRecap.twin.subline", "Their palate aligns most with yours tonight."),
      visual: { kind: "icon", iconName: "users" },
      score: 0.7,
      deepLink: `/labs/results/${tastingId}/report`,
      testId: "insight-group-twin",
      tone: "accent",
    });
  }

  if (biggestOutlierName) {
    insights.push({
      id: makeId(["group", "outlier", biggestOutlierName]),
      kind: "group.biggest-outlier",
      headline: t("insights.groupRecap.outlier.headline", "Biggest outlier: {{name}}", { name: biggestOutlierName }),
      subline: t("insights.groupRecap.outlier.subline", "Furthest from the group average."),
      visual: { kind: "icon", iconName: "trending-down" },
      score: 0.6,
      deepLink: `/labs/results/${tastingId}/report`,
      testId: "insight-group-outlier",
      tone: "neutral",
    });
  }

  if (spreadChampion) {
    insights.push({
      id: makeId(["group", "spread", spreadChampion.participantName]),
      kind: "group.spread-champion",
      headline: t("insights.groupRecap.spreadChampion.headline", "Most consistent: {{name}}", { name: spreadChampion.participantName }),
      subline: t("insights.groupRecap.spreadChampion.subline", "Avg deviation \u00b1{{d}} across all drams.", { d: spreadChampion.avgDeviation.toFixed(1) }),
      visual: { kind: "icon", iconName: "target" },
      score: 0.55,
      deepLink: `/labs/results/${tastingId}/report`,
      testId: "insight-group-spread",
      tone: "accent",
    });
  }

  const myContrarian = whiskies
    .filter(w => w.myDelta != null && Math.abs(w.myDelta) >= 8)
    .sort((a, b) => Math.abs(b.myDelta || 0) - Math.abs(a.myDelta || 0))[0];
  if (myContrarian) {
    const delta = myContrarian.myDelta || 0;
    const isAbove = delta > 0;
    insights.push({
      id: makeId(["group", "personal-contra", myContrarian.id]),
      kind: "group.personal-contrarian",
      headline: isAbove
        ? t("insights.groupRecap.personalAbove.headline", "You loved {{name}} more than the group", { name: myContrarian.name })
        : t("insights.groupRecap.personalBelow.headline", "Group liked {{name}} more than you", { name: myContrarian.name }),
      subline: t("insights.groupRecap.personalDelta.subline", "{{sign}}{{d}} pts vs. group average.", { sign: isAbove ? "+" : "", d: delta.toFixed(1) }),
      visual: {
        kind: "diffBar",
        you: myContrarian.myRating?.overall || 0,
        other: myContrarian.avgOverall || 0,
        max: 100,
        youLabel: t("insights.you", "You"),
        otherLabel: t("insights.group", "Group"),
      },
      score: clamp01(Math.abs(delta) / 20) * 0.95,
      deepLink: `/labs/taste?tab=analytics&sub=labs-link-analytics-hub-compare&q=${encodeURIComponent(myContrarian.name)}`,
      testId: "insight-group-personal-contra",
      tone: isAbove ? "success" : "danger",
    });
  }

  const myAligned = whiskies
    .filter(w => w.myDelta != null && Math.abs(w.myDelta) <= 2 && w.ratingCount >= 3)
    .sort((a, b) => Math.abs(a.myDelta || 0) - Math.abs(b.myDelta || 0))[0];
  if (myAligned && (!myContrarian || myAligned.id !== myContrarian.id)) {
    insights.push({
      id: makeId(["group", "personal-aligned", myAligned.id]),
      kind: "group.personal-aligned",
      headline: t("insights.groupRecap.personalAligned.headline", "Spot on with the group on {{name}}", { name: myAligned.name }),
      subline: t("insights.groupRecap.personalAligned.subline", "Your score matched the group within {{d}} pts.", { d: Math.abs(myAligned.myDelta || 0).toFixed(1) }),
      visual: { kind: "icon", iconName: "target" },
      score: 0.5,
      deepLink: `/labs/results/${tastingId}`,
      testId: "insight-group-personal-aligned",
      tone: "success",
    });
  }

  insights.sort((a, b) => b.score - a.score);
  return insights.slice(0, 5);
}

export interface FeedEngineDram {
  id: string;
  title?: string | null;
  region?: string | null;
  personalScore?: number | null;
  createdAt?: string | null;
}

export interface FeedEngineInput {
  drams: FeedEngineDram[];
  dnaAxes?: SoloEngineDnaAxis[];
  t: T;
}

export function selectFeedInsights(input: FeedEngineInput): Insight[] {
  const { drams, dnaAxes, t } = input;
  const insights: Insight[] = [];

  if (Array.isArray(drams) && drams.length > 0) {
    const now = Date.now();
    const week = 7 * 86400000;
    const lastWeek = drams.filter(d => d.createdAt && now - new Date(d.createdAt).getTime() < week);
    if (lastWeek.length >= 2) {
      const scores = lastWeek.filter(d => typeof d.personalScore === "number").map(d => d.personalScore || 0);
      const avg = scores.length > 0 ? scores.reduce((s, n) => s + n, 0) / scores.length : 0;
      insights.push({
        id: makeId(["feed", "weekly", String(Math.floor(now / week))]),
        kind: "feed.weekly-recap",
        headline: t("insights.feed.weekly.headline", "{{n}} drams this week", { n: lastWeek.length }),
        subline: scores.length > 0
          ? t("insights.feed.weekly.subline", "Average score {{avg}}.", { avg: Math.round(avg) })
          : t("insights.feed.weekly.sublineNoScore", "Keep the diary going."),
        visual: { kind: "sparkline", values: scores.length > 0 ? scores : [0, 0, 0, 0, 0], maxValue: 100 },
        score: clamp01(lastWeek.length / 7) * 0.85,
        deepLink: "/labs/taste?tab=collection&sub=labs-link-collection-hub-drams",
        testId: "insight-feed-weekly",
        tone: "accent",
      });
    }

    const days = new Set<string>();
    for (const d of drams) {
      if (d.createdAt) days.add(new Date(d.createdAt).toDateString());
    }
    let streak = 0;
    const cursor = new Date();
    for (let i = 0; i < 30; i += 1) {
      if (days.has(cursor.toDateString())) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    if (streak >= 3) {
      insights.push({
        id: makeId(["feed", "streak", String(streak)]),
        kind: "feed.streak",
        headline: t("insights.feed.streak.headline", "{{n}}-day tasting streak", { n: streak }),
        subline: t("insights.feed.streak.subline", "Don't break the chain."),
        visual: { kind: "icon", iconName: "flame", badge: streak },
        score: clamp01(streak / 14) * 0.8,
        deepLink: "/labs/taste?tab=collection&sub=labs-link-collection-hub-drams",
        testId: "insight-feed-streak",
        tone: "accent",
      });
    }

    const regionCounts: Record<string, number> = {};
    for (const d of drams) {
      const r = (d.region || "").trim();
      if (r) regionCounts[r] = (regionCounts[r] || 0) + 1;
    }
    const milestoneRegion = Object.entries(regionCounts).find(([, n]) => n === 5 || n === 10 || n === 25);
    if (milestoneRegion) {
      const [region, n] = milestoneRegion;
      insights.push({
        id: makeId(["feed", "region", region, String(n)]),
        kind: "feed.region-milestone",
        headline: t("insights.feed.regionMilestone.headline", "{{n}} drams from {{region}}", { n, region }),
        subline: t("insights.feed.regionMilestone.subline", "Your {{region}} chapter is taking shape.", { region }),
        visual: { kind: "icon", iconName: "compass", badge: n },
        score: 0.7,
        deepLink: `/labs/taste?tab=analytics&sub=labs-link-analytics-hub-compare&q=${encodeURIComponent(region)}`,
        testId: "insight-feed-region",
        tone: "accent",
      });
    }
  }

  if (Array.isArray(dnaAxes) && dnaAxes.length > 0) {
    const newest = dnaAxes.filter(a => a.nDrams >= 3 && a.affinity >= 60).sort((a, b) => b.affinity - a.affinity)[0];
    if (newest) {
      const slicedAxes = dnaAxes.slice(0, 6);
      const idx = slicedAxes.findIndex(a => a.id === newest.id);
      const radarVisual: InsightVisual = { kind: "miniRadar", axes: slicedAxes.map(a => ({ label: a.label, value: a.affinity })), highlightIndex: idx >= 0 ? idx : 0 };
      insights.push({
        id: makeId(["feed", "aroma", newest.id]),
        kind: "feed.aroma-unlock",
        headline: t("insights.feed.aromaUnlock.headline", "Aroma unlocked: {{label}}", { label: newest.label }),
        subline: t("insights.feed.aromaUnlock.subline", "Your DNA shows a clear preference."),
        visual: radarVisual,
        score: clamp01((newest.affinity - 50) / 50) * 0.75,
        deepLink: `/labs/taste?tab=ai&sub=labs-link-ai-insights-dna&highlight=${encodeURIComponent(newest.id)}`,
        testId: "insight-feed-aroma",
        tone: "accent",
      });
    }
  }

  insights.sort((a, b) => b.score - a.score);
  return insights;
}
