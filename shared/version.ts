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
