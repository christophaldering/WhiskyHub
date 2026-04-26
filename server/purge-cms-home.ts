import { db } from "./db";
import { storage } from "./storage";
import { cmsPages } from "@shared/schema";
import { eq, and, or } from "drizzle-orm";

const TARGET_ID = "2d29f3e0-dabc-47a9-9ac5-af4120742d23";
const TARGET_SLUG = "home";
const MARKER_KEY = "cms_purge_home_2d29f3e0_done";

export async function purgeCmsHomeIfRequested(log: (msg: string, source?: string) => void): Promise<void> {
  try {
    if (process.env.NODE_ENV !== "production") return;
    const marker = await storage.getAppSetting(MARKER_KEY);
    if (marker) return;

    const existing = await db
      .select({ id: cmsPages.id, slug: cmsPages.slug, title: cmsPages.title })
      .from(cmsPages)
      .where(or(eq(cmsPages.id, TARGET_ID), eq(cmsPages.slug, TARGET_SLUG)));

    if (existing.length === 0) {
      await storage.setAppSetting(MARKER_KEY, new Date().toISOString());
      log("CMS home purge: no row matched (id 2d29f3e0 / slug home); marker set, future runs will no-op", "cms-purge");
      return;
    }

    const result = await db
      .delete(cmsPages)
      .where(
        and(
          or(eq(cmsPages.id, TARGET_ID), eq(cmsPages.slug, TARGET_SLUG)),
        ),
      )
      .returning({ id: cmsPages.id, slug: cmsPages.slug, title: cmsPages.title });

    await storage.setAppSetting(MARKER_KEY, new Date().toISOString());

    const summary = result.map((row) => `${row.id} slug=${row.slug} title=${row.title}`).join(", ");
    log(`CMS home purge: deleted ${result.length} cms_pages row(s): ${summary}`, "cms-purge");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`CMS home purge failed: ${msg}`, "cms-purge");
  }
}
