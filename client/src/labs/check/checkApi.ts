import { pidHeaders } from "@/lib/api";

export type CheckIdentifyCandidate = {
  whiskyId?: string;
  name?: string;
  distillery?: string;
  region?: string;
  caskType?: string;
  age?: string | number;
  abv?: string | number;
  confidence: number;
  source?: string;
};

export type CheckIdentifyResponse = {
  candidates: CheckIdentifyCandidate[];
  photoUrl?: string;
  debug?: { ocrText?: string; tookMs?: number; detectedMode?: string };
};

export type CheckLookupCommunity = {
  ratingCount: number;
  avgOverall: number | null;
  avgNose: number | null;
  avgTaste: number | null;
  avgFinish: number | null;
} | null;

export type CheckLookupPersonal = {
  inCollection: boolean;
  collectionSince: string | null;
  inWishlist: boolean;
  wishlistPriority: string | null;
  myRatingCount: number;
  myAvgOverall: number | null;
  lastRatedAt: string | null;
} | null;

export type CheckLookupResponse = {
  whisky: {
    id: string;
    name: string;
    distillery: string;
    region?: string | null;
    abv?: number | null;
    age?: number | null;
    imageUrl?: string | null;
    whiskybaseId?: string | null;
  };
  community: CheckLookupCommunity;
  personal: CheckLookupPersonal;
};

export class RateLimitError extends Error {
  readonly code = "rate_limited" as const;
  constructor(public readonly retryAfterSec: number) {
    super("rate_limited");
    this.name = "RateLimitError";
  }
}

export async function identifyByPhoto(file: File): Promise<CheckIdentifyResponse> {
  const form = new FormData();
  form.append("photo", file);

  const res = await fetch("/api/whisky/identify", {
    method: "POST",
    body: form,
    headers: pidHeaders(),
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const retryAfterSec = data.retryAfterSec ?? data.retryAfter ?? 60;
    throw new RateLimitError(retryAfterSec);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function identifyByText(query: string): Promise<CheckIdentifyResponse> {
  const res = await fetch("/api/whisky/identify-text", {
    method: "POST",
    body: JSON.stringify({ query }),
    headers: { "Content-Type": "application/json", ...pidHeaders() },
  });

  if (res.status === 429) {
    const data = await res.json().catch(() => ({}));
    const retryAfterSec = data.retryAfterSec ?? data.retryAfter ?? 60;
    throw new RateLimitError(retryAfterSec);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function lookupWhisky(whiskyId: string): Promise<CheckLookupResponse> {
  const res = await fetch(`/api/check/lookup/${encodeURIComponent(whiskyId)}`, {
    method: "GET",
    headers: pidHeaders(),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `HTTP ${res.status}`);
  }

  return res.json();
}
