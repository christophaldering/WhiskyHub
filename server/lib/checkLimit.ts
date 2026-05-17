const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;

const buckets = new Map<string, number[]>();

export function checkIdentifyLimit(ip: string): { allowed: true } | { allowed: false; retryAfterSec: number } {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const existing = (buckets.get(ip) || []).filter((t) => t > cutoff);

  if (existing.length >= MAX_PER_WINDOW) {
    const oldest = existing[0];
    const retryAfterSec = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    buckets.set(ip, existing);
    return { allowed: false, retryAfterSec };
  }

  existing.push(now);
  buckets.set(ip, existing);
  return { allowed: true };
}

const cleanupInterval = setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [ip, timestamps] of Array.from(buckets.entries())) {
    const filtered = timestamps.filter((t) => t > cutoff);
    if (filtered.length === 0) buckets.delete(ip);
    else buckets.set(ip, filtered);
  }
}, 10 * 60 * 1000);
cleanupInterval.unref?.();
