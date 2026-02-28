// RECOVERY-STAMP: 2026-02-28 | v2.0.0-stable | commit: 0eed61d2
// Sidebar 6-section nav, Naked Tasting (Standard+Ultra), Blind-Mode getDramDisplay,
// 3 UI modes (Flow/Focus/Journal), AI Kill Switch, Context Levels, all redirects live.
export const APP_VERSION = "2.0.0";
export const APP_NAME = "CaskSense";
export const APP_RELEASE_DATE = "2026-02-21";

export function getVersionInfo() {
  const gitSha = typeof process !== "undefined" && process.env?.GIT_SHA
    ? process.env.GIT_SHA
    : "dev";
  const buildTime = typeof process !== "undefined" && process.env?.BUILD_TIME
    ? process.env.BUILD_TIME
    : new Date().toISOString();
  const env = typeof process !== "undefined" && process.env?.NODE_ENV === "production"
    ? "prod"
    : "dev";

  return { version: APP_VERSION, releaseDate: APP_RELEASE_DATE, gitSha, buildTime, env };
}
