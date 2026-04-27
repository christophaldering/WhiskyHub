import { pidHeaders } from "@/lib/api";
import type { StoryBlock } from "@/storybuilder/core/types";

export type CmsPageStatus = "draft" | "live" | "live-changes";

export type CmsPageListItem = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  status: CmsPageStatus;
  blockCount: number;
};

export type CmsPageFull = {
  id: string;
  slug: string;
  title: string;
  theme: string;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  status: CmsPageStatus;
  blocksJson: StoryBlock[];
  draftBlocksJson: StoryBlock[];
};

export type CmsPublicPage = {
  slug: string;
  title: string;
  theme: string;
  publishedAt: string;
  blocksJson: StoryBlock[];
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (!res.ok) {
    let msg = fallback;
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export async function listCmsPages(): Promise<CmsPageListItem[]> {
  const res = await fetch("/api/admin/cms/pages", { credentials: "include", headers: pidHeaders() });
  const data = await readJson<{ pages: CmsPageListItem[] }>(res, "Seiten konnten nicht geladen werden");
  return data.pages;
}

export async function getCmsPage(id: string): Promise<CmsPageFull> {
  const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}`, {
    credentials: "include",
    headers: pidHeaders(),
  });
  return readJson<CmsPageFull>(res, "Seite konnte nicht geladen werden");
}

export async function createCmsPage(input: { slug: string; title: string; theme?: string }): Promise<CmsPageFull> {
  const res = await fetch("/api/admin/cms/pages", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify(input),
  });
  return readJson<CmsPageFull>(res, "Seite konnte nicht erstellt werden");
}

export async function updateCmsPage(
  id: string,
  patch: { title?: string; slug?: string; theme?: string; draftBlocksJson?: StoryBlock[] },
): Promise<CmsPageFull> {
  const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify(patch),
  });
  return readJson<CmsPageFull>(res, "Seite konnte nicht gespeichert werden");
}

export async function publishCmsPage(id: string): Promise<CmsPageFull> {
  const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}/publish`, {
    method: "POST",
    credentials: "include",
    headers: pidHeaders(),
  });
  return readJson<CmsPageFull>(res, "Seite konnte nicht veröffentlicht werden");
}

export async function duplicateCmsPage(id: string, slug: string, title: string): Promise<CmsPageFull> {
  const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}/duplicate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ slug, title }),
  });
  return readJson<CmsPageFull>(res, "Seite konnte nicht dupliziert werden");
}

export async function deleteCmsPage(id: string): Promise<void> {
  const res = await fetch(`/api/admin/cms/pages/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    headers: pidHeaders(),
  });
  if (!res.ok) {
    let msg = "Seite konnte nicht gelöscht werden";
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

export async function seedCmsHome(): Promise<CmsPageFull> {
  const res = await fetch("/api/admin/cms/seed-home", {
    method: "POST",
    credentials: "include",
    headers: pidHeaders(),
  });
  return readJson<CmsPageFull>(res, "Startseite konnte nicht angelegt werden");
}

export async function fetchPublicCmsPage(slug: string): Promise<CmsPublicPage | null> {
  const res = await fetch(`/api/cms/pages/${encodeURIComponent(slug)}`, {
    credentials: "include",
  });
  if (res.status === 404) return null;
  return readJson<CmsPublicPage>(res, "Seite konnte nicht geladen werden");
}

const PUBLIC_CMS_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_CMS_CACHE_PREFIX = "cms:public:";

type CachedPublicCmsPage = {
  cachedAt: number;
  page: CmsPublicPage;
};

function getSessionStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function readCachedPublicCmsPage(slug: string): CmsPublicPage | null {
  const storage = getSessionStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${PUBLIC_CMS_CACHE_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPublicCmsPage | null;
    if (!parsed || typeof parsed.cachedAt !== "number" || !parsed.page) return null;
    if (Date.now() - parsed.cachedAt > PUBLIC_CMS_CACHE_TTL_MS) {
      storage.removeItem(`${PUBLIC_CMS_CACHE_PREFIX}${slug}`);
      return null;
    }
    const page = parsed.page;
    if (!page || !Array.isArray(page.blocksJson) || page.blocksJson.length === 0) return null;
    return page;
  } catch {
    return null;
  }
}

export function writeCachedPublicCmsPage(slug: string, page: CmsPublicPage): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    const payload: CachedPublicCmsPage = { cachedAt: Date.now(), page };
    storage.setItem(`${PUBLIC_CMS_CACHE_PREFIX}${slug}`, JSON.stringify(payload));
  } catch {
    // ignore quota / serialization errors
  }
}

export function clearCachedPublicCmsPage(slug: string): void {
  const storage = getSessionStorage();
  if (!storage) return;
  try {
    storage.removeItem(`${PUBLIC_CMS_CACHE_PREFIX}${slug}`);
  } catch {
    // ignore
  }
}
