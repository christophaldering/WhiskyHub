import OpenAI from "openai";
import { isAIDisabled, checkAIQuota, recordAIUsage } from "./ai-settings";
import { db } from "./db";
import { profiles, participants } from "@shared/schema";
import { eq } from "drizzle-orm";

interface AIClientResult {
  client: OpenAI | null;
  source: "platform" | "user" | "none";
  error?: "AI_LIMIT_EXCEEDED" | "AI_DISABLED";
  quotaInfo?: { used: number; limit: number };
}

async function getUserOpenAIKey(participantId: string): Promise<string | null> {
  try {
    const rows = await db.select({ openaiApiKey: profiles.openaiApiKey })
      .from(profiles)
      .where(eq(profiles.participantId, participantId))
      .limit(1);
    return rows[0]?.openaiApiKey || null;
  } catch {
    return null;
  }
}

async function isAdmin(participantId: string): Promise<boolean> {
  try {
    const rows = await db.select({ role: participants.role })
      .from(participants)
      .where(eq(participants.id, participantId))
      .limit(1);
    return rows[0]?.role === "admin";
  } catch {
    return false;
  }
}

export async function getAIClient(participantId?: string | null, featureId?: string): Promise<AIClientResult> {
  const isAdminUser = participantId ? await isAdmin(participantId) : false;

  if (featureId) {
    const featureDisabled = await isAIDisabled(featureId);
    if (featureDisabled) {
      if (isAdminUser) {
        const platformKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
        const platformBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
        if (platformKey) {
          if (participantId) {
            recordAIUsage(participantId, featureId).catch(() => {});
          }
          return {
            client: new OpenAI({ apiKey: platformKey, baseURL: platformBaseUrl }),
            source: "platform",
          };
        }
      }

      if (participantId) {
        const userKey = await getUserOpenAIKey(participantId);
        if (userKey) {
          return {
            client: new OpenAI({ apiKey: userKey }),
            source: "user",
          };
        }
      }
      return { client: null, source: "none", error: "AI_DISABLED" };
    }
  }

  if (participantId) {
    const userKey = await getUserOpenAIKey(participantId);
    if (userKey) {
      return {
        client: new OpenAI({ apiKey: userKey }),
        source: "user",
      };
    }
  }

  const platformKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  const platformBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  if (platformKey) {
    if (!participantId) {
      return { client: null, source: "none" };
    }

    if (!isAdminUser) {
      const quota = await checkAIQuota(participantId);
      if (!quota.allowed) {
        return {
          client: null,
          source: "none",
          error: "AI_LIMIT_EXCEEDED",
          quotaInfo: { used: quota.used, limit: quota.limit },
        };
      }
    }

    recordAIUsage(participantId, featureId || "unknown").catch(() => {});

    return {
      client: new OpenAI({ apiKey: platformKey, baseURL: platformBaseUrl }),
      source: "platform",
    };
  }

  return { client: null, source: "none" };
}

export async function getAIStatus(participantId?: string | null): Promise<{ available: boolean; source: "platform" | "user" | "none" }> {
  if (participantId) {
    const userKey = await getUserOpenAIKey(participantId);
    if (userKey) {
      return { available: true, source: "user" };
    }
  }

  const platformKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (platformKey) {
    return { available: true, source: "platform" };
  }

  return { available: false, source: "none" };
}
