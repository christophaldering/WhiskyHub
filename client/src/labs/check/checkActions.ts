import { pidHeaders } from "@/lib/api";

export type CheckCandidateMeta = {
  whiskyId?: string;
  name: string;
  distillery?: string | null;
  region?: string | null;
  age?: string | null;
  abv?: number | null;
  caskType?: string | null;
  imageUrl?: string | null;
  whiskybaseId?: string | null;
};

export type SaveOk = { ok: true; id: string };
export type SaveFail = { ok: false; status: number; message: string };
export type SaveResult = SaveOk | SaveFail;

function jsonHeaders(): Record<string, string> {
  return { "Content-Type": "application/json", ...pidHeaders() };
}

async function postJson(url: string, body: unknown): Promise<SaveResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : `HTTP ${res.status}`;
      return { ok: false, status: res.status, message };
    }
    const data = await res.json().catch(() => ({}));
    const id = typeof data?.id === "string" ? data.id : "";
    if (!id) {
      return { ok: false, status: 500, message: "Missing id in response" };
    }
    return { ok: true, id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    return { ok: false, status: 0, message };
  }
}

async function deleteRequest(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "DELETE", headers: pidHeaders() });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveToWishlist(pid: string, meta: CheckCandidateMeta, notes?: string): Promise<SaveResult> {
  return postJson(`/api/wishlist/${encodeURIComponent(pid)}`, {
    name: meta.name,
    distillery: meta.distillery ?? null,
    region: meta.region ?? null,
    age: meta.age ?? null,
    abv: meta.abv ?? null,
    caskType: meta.caskType ?? null,
    notes: notes ?? null,
    priority: "medium",
    source: "check",
  });
}

export async function saveToCollection(pid: string, meta: CheckCandidateMeta): Promise<SaveResult> {
  return postJson(`/api/collection/${encodeURIComponent(pid)}/add`, {
    name: meta.name,
    distillery: meta.distillery ?? null,
    statedAge: meta.age ?? null,
    abv: meta.abv ?? null,
    caskType: meta.caskType ?? null,
    status: "open",
    imageUrl: meta.imageUrl ?? null,
    whiskybaseId: meta.whiskybaseId ?? undefined,
  });
}

export type JournalPayload = {
  noseNotes?: string;
  tasteNotes?: string;
  finishNotes?: string;
  personalScore?: number;
};

export async function saveToJournal(pid: string, meta: CheckCandidateMeta, payload: JournalPayload): Promise<SaveResult> {
  return postJson(`/api/journal/${encodeURIComponent(pid)}`, {
    title: meta.name,
    name: meta.name,
    distillery: meta.distillery ?? null,
    region: meta.region ?? null,
    age: meta.age ?? null,
    abv: meta.abv ?? null,
    caskType: meta.caskType ?? null,
    noseNotes: payload.noseNotes ?? null,
    tasteNotes: payload.tasteNotes ?? null,
    finishNotes: payload.finishNotes ?? null,
    personalScore: payload.personalScore ?? null,
    tastingContext: "check",
    source: "check",
    status: "final",
    imageUrl: meta.imageUrl ?? null,
    whiskybaseId: meta.whiskybaseId ?? null,
  });
}

export async function deleteWishlistEntry(pid: string, id: string): Promise<boolean> {
  return deleteRequest(`/api/wishlist/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`);
}

export async function deleteJournalEntry(pid: string, id: string): Promise<boolean> {
  return deleteRequest(`/api/journal/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`);
}

export async function deleteCollectionEntry(pid: string, id: string): Promise<boolean> {
  return deleteRequest(`/api/collection/${encodeURIComponent(pid)}/${encodeURIComponent(id)}`);
}
