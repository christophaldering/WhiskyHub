export type InsightSize = "compact" | "standard" | "feature";

export type InsightTone = "accent" | "success" | "danger" | "neutral";

export interface InsightVisualSparkline {
  kind: "sparkline";
  values: number[];
  maxValue?: number;
}

export interface InsightVisualMiniRadar {
  kind: "miniRadar";
  axes: { label: string; value: number }[];
  highlightIndex?: number;
}

export interface InsightVisualScoreRing {
  kind: "scoreRing";
  value: number;
  max: number;
  delta?: number;
}

export interface InsightVisualDiffBar {
  kind: "diffBar";
  you: number;
  other: number;
  max: number;
  youLabel?: string;
  otherLabel?: string;
}

export interface InsightVisualIcon {
  kind: "icon";
  iconName: "flame" | "trophy" | "sparkles" | "target" | "trending-up" | "trending-down" | "wine" | "users" | "heart" | "star" | "compass" | "zap";
  badge?: string | number;
}

export type InsightVisual =
  | InsightVisualSparkline
  | InsightVisualMiniRadar
  | InsightVisualScoreRing
  | InsightVisualDiffBar
  | InsightVisualIcon;

export type InsightKind =
  | "solo.dna-highlight"
  | "solo.cluster-match"
  | "solo.outlier-for-age"
  | "solo.streak"
  | "solo.personal-best-region"
  | "solo.first-of-region"
  | "group.most-agreed"
  | "group.most-debated"
  | "group.closest-twin"
  | "group.biggest-outlier"
  | "group.spread-champion"
  | "group.personal-contrarian"
  | "group.personal-aligned"
  | "feed.weekly-recap"
  | "feed.streak"
  | "feed.aroma-unlock"
  | "feed.region-milestone";

export interface Insight {
  id: string;
  kind: InsightKind;
  headline: string;
  subline?: string;
  visual: InsightVisual;
  score: number;
  deepLink?: string;
  testId: string;
  tone?: InsightTone;
}
