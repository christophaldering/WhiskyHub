import { db } from "./db";
import { cmsPages } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function purgeCmsHomeIfRequested(log: (msg: string, source?: string) => void): Promise<void> {
  if (process.env.CMS_PURGE_HOME !== "1") return;
  try {
    const existing = await db
      .select({ id: cmsPages.id, title: cmsPages.title })
      .from(cmsPages)
      .where(eq(cmsPages.slug, "home"));
    if (existing.length === 0) {
      log("CMS_PURGE_HOME=1 but no cms_pages row with slug='home' present (idempotent no-op)", "cms-purge");
      return;
    }
    await db.delete(cmsPages).where(eq(cmsPages.slug, "home"));
    const ids = existing.map((row) => `${row.id} (${row.title})`).join(", ");
    log(`CMS_PURGE_HOME=1 deleted ${existing.length} cms_pages row(s) with slug='home': ${ids}`, "cms-purge");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`CMS_PURGE_HOME failed: ${msg}`, "cms-purge");
  }
}
