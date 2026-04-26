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
