import { storage } from "./storage";
import { buildHomeSeedBlocks } from "./cms-home-blocks";

export async function seedCmsHomePage(log: (msg: string, src?: string) => void): Promise<void> {
  try {
    const existing = await storage.getCmsPageBySlug("home");
    if (existing) {
      log(`CMS home page already exists (id=${existing.id}, published=${existing.publishedAt ? "yes" : "no"}); skipping seed`, "seed");
      return;
    }
    const blocks = buildHomeSeedBlocks();
    const created = await storage.createCmsPage({
      slug: "home",
      title: "Startseite",
      theme: "casksense-editorial",
      blocksJson: blocks,
      draftBlocksJson: blocks,
      publishedAt: new Date(),
      createdById: null,
    });
    log(`CMS home page seeded (id=${created.id}, blocks=${blocks.length})`, "seed");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`CMS home seed error: ${msg}`, "seed");
  }
}
