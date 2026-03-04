import OpenAI from "openai";
import { isAIDisabled } from "./ai-settings";
import { db } from "./db";
import { profiles } from "@shared/schema";
import { eq } from "drizzle-orm";

interface AIClientResult {
  client: OpenAI | null;
  source: "platform" | "user" | "none";
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

export async function getAIClient(participantId?: string | null, featureId?: string): Promise<AIClientResult> {
  if (featureId) {
    const featureDisabled = await isAIDisabled(featureId);
    if (featureDisabled) {
      if (participantId) {
        const userKey = await getUserOpenAIKey(participantId);
        if (userKey) {
          return {
            client: new OpenAI({ apiKey: userKey }),
            source: "user",
          };
        }
      }
      return { client: null, source: "none" };
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
    return {
      client: new OpenAI({ apiKey: platformKey, baseURL: platformBaseUrl }),
      source: "platform",
    };
  }

  return { client: null, source: "none" };
}

export async function getAIStatus(participantId?: string | null): Promise<{ available: boolean; source: "platform" | "user" | "none" }> {
  const { client, source } = await getAIClient(participantId);
  return { available: !!client, source };
}
