import { pidHeaders } from "@/lib/api";
import type { StoryBlock } from "./core/types";

export type StoryAiAction = "shorten" | "inspire" | "translate" | "correct";

export type StoryVersionMeta = {
  id: string;
  isAuto: boolean;
  name: string | null;
  createdAt: string;
  createdById: string | null;
  blockCount: number;
};

export type StoryVersionFull = StoryVersionMeta & {
  blocksJson: StoryBlock[];
};

export type StoryTemplateMeta = {
  id: string;
  name: string;
  description: string | null;
  scope: "user" | "global";
  ownerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type StoryTemplateFull = StoryTemplateMeta & {
  blocksJson: StoryBlock[];
};

async function readJson<T>(res: Response, fallbackMessage: string): Promise<T> {
  if (!res.ok) {
    let msg = fallbackMessage;
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

export async function listStoryVersions(
  sourceType: string,
  sourceId: string,
  filter: "all" | "auto" | "manual" = "all",
): Promise<StoryVersionMeta[]> {
  const url = `/api/admin/storybuilder/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}/versions?filter=${filter}`;
  const res = await fetch(url, { credentials: "include", headers: pidHeaders() });
  const data = await readJson<{ versions: StoryVersionMeta[] }>(res, "Versionen konnten nicht geladen werden");
  return data.versions;
}

export async function getStoryVersion(
  sourceType: string,
  sourceId: string,
  versionId: string,
): Promise<StoryVersionFull> {
  const url = `/api/admin/storybuilder/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}/versions/${encodeURIComponent(versionId)}`;
  const res = await fetch(url, { credentials: "include", headers: pidHeaders() });
  const data = await readJson<{
    id: string;
    isAuto: boolean;
    name: string | null;
    createdAt: string;
    blocksJson: unknown;
  }>(res, "Version konnte nicht geladen werden");
  return {
    id: data.id,
    isAuto: data.isAuto,
    name: data.name,
    createdAt: data.createdAt,
    createdById: null,
    blocksJson: Array.isArray(data.blocksJson) ? (data.blocksJson as StoryBlock[]) : [],
  };
}

export async function restoreStoryVersion(
  sourceType: string,
  sourceId: string,
  versionId: string,
): Promise<{ id: string; createdAt: string; isAuto: boolean; blocksJson: StoryBlock[] }> {
  const url = `/api/admin/storybuilder/${encodeURIComponent(sourceType)}/${encodeURIComponent(sourceId)}/versions/${encodeURIComponent(versionId)}/restore`;
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
  });
  const data = await readJson<{
    id: string;
    createdAt: string;
    isAuto: boolean;
    blocksJson: unknown;
  }>(res, "Wiederherstellen fehlgeschlagen");
  return {
    id: data.id,
    createdAt: data.createdAt,
    isAuto: data.isAuto,
    blocksJson: Array.isArray(data.blocksJson) ? (data.blocksJson as StoryBlock[]) : [],
  };
}

export async function listStoryTemplates(): Promise<StoryTemplateMeta[]> {
  const res = await fetch("/api/admin/storybuilder-templates", { credentials: "include", headers: pidHeaders() });
  const data = await readJson<{ templates: StoryTemplateMeta[] }>(res, "Vorlagen konnten nicht geladen werden");
  return data.templates;
}

export async function getStoryTemplate(id: string): Promise<StoryTemplateFull> {
  const res = await fetch(`/api/admin/storybuilder-templates/${encodeURIComponent(id)}`, {
    credentials: "include",
    headers: pidHeaders(),
  });
  const data = await readJson<{
    id: string;
    name: string;
    description: string | null;
    scope: "user" | "global";
    ownerId: string | null;
    createdAt: string;
    updatedAt: string;
    blocksJson: unknown;
  }>(res, "Vorlage konnte nicht geladen werden");
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    scope: data.scope,
    ownerId: data.ownerId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    blocksJson: Array.isArray(data.blocksJson) ? (data.blocksJson as StoryBlock[]) : [],
  };
}

export async function createStoryTemplate(input: {
  name: string;
  description?: string;
  scope: "user" | "global";
  blocksJson: StoryBlock[];
}): Promise<StoryTemplateMeta> {
  const res = await fetch("/api/admin/storybuilder-templates", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify(input),
  });
  return readJson<StoryTemplateMeta>(res, "Vorlage konnte nicht gespeichert werden");
}

export async function deleteStoryTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/admin/storybuilder-templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
    headers: pidHeaders(),
  });
  if (!res.ok) {
    let msg = "Vorlage konnte nicht gelöscht werden";
    try {
      const data = await res.json();
      if (data && typeof data.message === "string") msg = data.message;
    } catch {
      // ignore
    }
    throw new Error(msg);
  }
}

export async function runStoryAiAction(action: StoryAiAction, html: string): Promise<string> {
  const res = await fetch("/api/admin/storybuilder/ai-action", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...pidHeaders() },
    body: JSON.stringify({ action, html }),
  });
  const data = await readJson<{ result: string; cached?: boolean }>(res, "KI-Aktion fehlgeschlagen");
  return data.result;
}
