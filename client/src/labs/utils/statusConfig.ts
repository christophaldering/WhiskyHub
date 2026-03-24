export interface StatusConfig {
  labelKey: string;
  fallbackLabel: string;
  cssClass: string;
  color: string;
  bg: string;
}

export const TASTING_STATUS_CONFIG: Record<string, StatusConfig> = {
  draft: {
    labelKey: "tastingStatus.draft",
    fallbackLabel: "Draft",
    cssClass: "labs-status-chip labs-status-chip--draft",
    color: "var(--labs-info)",
    bg: "var(--labs-info-muted)",
  },
  open: {
    labelKey: "tastingStatus.open",
    fallbackLabel: "Live",
    cssClass: "labs-status-chip labs-status-chip--live",
    color: "var(--labs-success)",
    bg: "var(--labs-success-muted)",
  },
  closed: {
    labelKey: "tastingStatus.closed",
    fallbackLabel: "Evaluation Complete",
    cssClass: "labs-status-chip labs-status-chip--closed",
    color: "var(--labs-accent)",
    bg: "var(--labs-accent-muted)",
  },
  reveal: {
    labelKey: "tastingStatus.reveal",
    fallbackLabel: "Reveal",
    cssClass: "labs-status-chip labs-status-chip--reveal",
    color: "var(--labs-accent)",
    bg: "var(--labs-accent-muted)",
  },
  archived: {
    labelKey: "tastingStatus.archived",
    fallbackLabel: "Completed",
    cssClass: "labs-status-chip labs-status-chip--archived",
    color: "var(--labs-text-muted)",
    bg: "var(--labs-surface)",
  },
};

export function getStatusConfig(status: string | undefined | null): StatusConfig {
  return TASTING_STATUS_CONFIG[status || "draft"] || TASTING_STATUS_CONFIG.draft;
}
