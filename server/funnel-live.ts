interface LiveEvent {
  ts: number;
  type: string;
  page: string;
  detail?: string;
}

interface LiveSession {
  token: string;
  shortCode: string;
  firstSeen: number;
  lastSeen: number;
  currentPage: string;
  source: string;
  device: string;
  country: string;
  language: string;
  events: LiveEvent[];
}

const SESSIONS = new Map<string, LiveSession>();
const RECENT_FEED: { ts: number; page: string; type: string; source: string; device: string; country: string; shortCode: string }[] = [];
const FEED_MAX = 100;
const SESSION_TTL_MS = 5 * 60 * 1000;

function shortCodeFor(token: string): string {
  const hash = Array.from(token).reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const abs = Math.abs(hash).toString(36).toUpperCase().slice(0, 3).padStart(3, "X");
  return `S-${abs}`;
}

export interface LiveHeartbeatInput {
  token: string;
  page: string;
  type?: string;
  detail?: string;
  source?: string;
  device?: string;
  country?: string;
  language?: string;
}

export function recordHeartbeat(input: LiveHeartbeatInput): void {
  const now = Date.now();
  if (!input.token || typeof input.token !== "string" || input.token.length < 8) return;
  const token = input.token.slice(0, 64);
  let s = SESSIONS.get(token);
  if (!s) {
    s = {
      token,
      shortCode: shortCodeFor(token),
      firstSeen: now,
      lastSeen: now,
      currentPage: (input.page || "").slice(0, 128),
      source: (input.source || "").slice(0, 64),
      device: (input.device || "").slice(0, 16),
      country: (input.country || "").slice(0, 8),
      language: (input.language || "").slice(0, 8),
      events: [],
    };
    SESSIONS.set(token, s);
  }
  s.lastSeen = now;
  if (input.page) s.currentPage = input.page.slice(0, 128);
  if (input.source) s.source = input.source.slice(0, 64);
  if (input.device) s.device = input.device.slice(0, 16);
  if (input.country) s.country = input.country.slice(0, 8);
  if (input.language) s.language = input.language.slice(0, 8);
  const ev: LiveEvent = {
    ts: now,
    type: (input.type || "heartbeat").slice(0, 32),
    page: (input.page || s.currentPage || "").slice(0, 128),
    detail: input.detail ? input.detail.slice(0, 96) : undefined,
  };
  s.events.push(ev);
  if (s.events.length > 100) s.events.splice(0, s.events.length - 100);

  if (input.type && input.type !== "heartbeat") {
    RECENT_FEED.push({
      ts: now,
      page: s.currentPage,
      type: ev.type,
      source: s.source,
      device: s.device,
      country: s.country,
      shortCode: s.shortCode,
    });
    if (RECENT_FEED.length > FEED_MAX) RECENT_FEED.splice(0, RECENT_FEED.length - FEED_MAX);
  }
}

export function cleanupExpired(): void {
  const cutoff = Date.now() - SESSION_TTL_MS;
  for (const [k, v] of SESSIONS) {
    if (v.lastSeen < cutoff) SESSIONS.delete(k);
  }
}

setInterval(cleanupExpired, 30 * 1000);

export interface LiveSnapshot {
  generatedAt: number;
  activeCount: number;
  sessions: Array<{
    shortCode: string;
    firstSeen: number;
    lastSeen: number;
    currentPage: string;
    source: string;
    device: string;
    country: string;
    language: string;
    eventCount: number;
  }>;
  byPage: Record<string, number>;
  feed: typeof RECENT_FEED;
}

export function getSnapshot(): LiveSnapshot {
  cleanupExpired();
  const sessions: LiveSnapshot["sessions"] = [];
  const byPage: Record<string, number> = {};
  for (const s of SESSIONS.values()) {
    sessions.push({
      shortCode: s.shortCode,
      firstSeen: s.firstSeen,
      lastSeen: s.lastSeen,
      currentPage: s.currentPage,
      source: s.source,
      device: s.device,
      country: s.country,
      language: s.language,
      eventCount: s.events.length,
    });
    const key = s.currentPage || "(unknown)";
    byPage[key] = (byPage[key] || 0) + 1;
  }
  sessions.sort((a, b) => b.lastSeen - a.lastSeen);
  return {
    generatedAt: Date.now(),
    activeCount: sessions.length,
    sessions,
    byPage,
    feed: RECENT_FEED.slice().reverse(),
  };
}

export interface SessionTimelineEvent {
  ts: number;
  type: string;
  page: string;
  detail: string;
}

export interface SessionTimelineResult {
  found: boolean;
  shortCode: string;
  firstSeen: number;
  lastSeen: number;
  currentPage: string;
  source: string;
  device: string;
  country: string;
  events: SessionTimelineEvent[];
}

export function getSessionTimeline(shortCode: string): SessionTimelineResult {
  for (const s of SESSIONS.values()) {
    if (s.shortCode === shortCode) {
      return {
        found: true,
        shortCode: s.shortCode,
        firstSeen: s.firstSeen,
        lastSeen: s.lastSeen,
        currentPage: s.currentPage,
        source: s.source,
        device: s.device,
        country: s.country,
        events: s.events.map(e => ({
          ts: e.ts,
          type: e.type,
          page: e.page || s.currentPage,
          detail: e.detail || "",
        })),
      };
    }
  }
  return {
    found: false,
    shortCode,
    firstSeen: 0,
    lastSeen: 0,
    currentPage: "",
    source: "",
    device: "",
    country: "",
    events: [],
  };
}
