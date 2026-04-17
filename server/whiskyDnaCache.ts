type CacheEntry = {
  version: number;
  storedAt: number;
  data: unknown;
};

const cache = new Map<string, CacheEntry>();
const journalVersion = new Map<string, number>();

const TTL_MS = 5 * 60 * 1000;

export function getJournalVersion(participantId: string): number {
  return journalVersion.get(participantId) ?? 0;
}

export function markJournalUpdated(participantId: string | null | undefined): void {
  if (!participantId) return;
  const next = Math.max(getJournalVersion(participantId) + 1, Date.now());
  journalVersion.set(participantId, next);
  cache.delete(participantId);
}

export function getCachedWhiskyDna(
  participantId: string,
): { version: number; data: unknown } | { version: number; data: undefined } {
  const version = getJournalVersion(participantId);
  const entry = cache.get(participantId);
  if (!entry) return { version, data: undefined };
  if (entry.version !== version) {
    cache.delete(participantId);
    return { version, data: undefined };
  }
  if (Date.now() - entry.storedAt > TTL_MS) {
    cache.delete(participantId);
    return { version, data: undefined };
  }
  return { version, data: entry.data };
}

export function setCachedWhiskyDna(
  participantId: string,
  version: number,
  data: unknown,
): void {
  const current = getJournalVersion(participantId);
  if (version !== current) {
    return;
  }
  cache.set(participantId, { version, storedAt: Date.now(), data });
}

export function clearWhiskyDnaCache(): void {
  cache.clear();
  journalVersion.clear();
}
