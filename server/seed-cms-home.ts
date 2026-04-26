import { storage } from "./storage";
import { buildHomeSeedBlocks } from "./cms-home-blocks";

export async function seedCmsHomePage(log: (msg: string, src?: string) => void): Promise<void> {
  try {
    const existing = await storage.getCmsPageBySlug("home");
    const blocks = buildHomeSeedBlocks();

    if (!existing) {
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
      return;
    }

    const publishedBlocks = Array.isArray(existing.blocksJson) ? existing.blocksJson : [];
    const draftBlocks = Array.isArray(existing.draftBlocksJson) ? existing.draftBlocksJson : [];
    const isUnpublishedAndEmpty = !existing.publishedAt && publishedBlocks.length === 0 && draftBlocks.length === 0;

    if (isUnpublishedAndEmpty) {
      const healed = await storage.updateCmsPage(existing.id, {
        blocksJson: blocks,
        draftBlocksJson: blocks,
        publishedAt: new Date(),
      });
      log(`CMS home page healed from empty state (id=${existing.id}, blocks=${blocks.length}, healed=${healed ? "yes" : "no"})`, "seed");
      return;
    }

    log(`CMS home page already populated (id=${existing.id}, published=${existing.publishedAt ? "yes" : "no"}); skipping seed`, "seed");
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`CMS home seed error: ${msg}`, "seed");
  }
}
