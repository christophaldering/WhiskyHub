export const ACTIVE_STATUSES = ["open", "closed", "reveal"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];
