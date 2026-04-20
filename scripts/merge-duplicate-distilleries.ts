import { db } from "../server/db";
import {
  distilleries,
  distilleryAliases,
  distilleryProfiles,
  whiskies,
  whiskyHandoutLibrary,
  type Distillery,
  type DistilleryProfile,
} from "../shared/schema";
import { canonicalizeDistilleryName } from "../shared/distillery-normalizer";
import { distilleryNameKey } from "../server/auto-handout/index";
import { eq, inArray, sql } from "drizzle-orm";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Executor = typeof db | Tx;

const apply = process.argv.includes("--apply");
const verbose = process.argv.includes("--verbose");

function completenessScore(d: Distillery): number {
  let s = 0;
  if (d.description && d.description.trim()) s += 2;
  if (d.founded != null) s += 1;
  if (d.feature && d.feature.trim()) s += 1;
  if (d.region && d.region !== "Unknown") s += 1;
  if (d.country && d.country !== "Unknown") s += 1;
  if (d.lat != null) s += 1;
  if (d.lng != null) s += 1;
  return s;
}

function pickSurvivor(group: Distillery[]): Distillery {
  return [...group].sort((a, b) => {
    const ds = completenessScore(b) - completenessScore(a);
    if (ds !== 0) return ds;
    // Prefer the longer/more descriptive name (e.g. "The Macallan" over "Macallan")
    const dl = b.name.length - a.name.length;
    if (dl !== 0) return dl;
    return a.id.localeCompare(b.id);
  })[0];
}

function profileScore(p: DistilleryProfile): number {
  const chapters = Array.isArray(p.chapters) ? p.chapters.length : 0;
  const sources = Array.isArray(p.sources) ? p.sources.length : 0;
  const images = Array.isArray(p.images) ? p.images.length : 0;
  return chapters * 4 + sources + images;
}

function pickBestProfile(profiles: DistilleryProfile[]): DistilleryProfile {
  return [...profiles].sort((a, b) => {
    const ds = profileScore(b) - profileScore(a);
    if (ds !== 0) return ds;
    const ar = a.refreshedAt ? new Date(a.refreshedAt).getTime() : 0;
    const br = b.refreshedAt ? new Date(b.refreshedAt).getTime() : 0;
    return br - ar;
  })[0];
}

interface GroupCounts {
  whiskiesById: number;
  whiskiesByName: number;
  handoutsById: number;
  handoutsByName: number;
  profilesDeleted: number;
  profilesRepointed: number;
  profilesContentMerged: number;
  aliasesRepointed: number;
  aliasesAdded: number;
}

async function processGroup(exec: Executor, canonical: string, rows: Distillery[]): Promise<GroupCounts> {
  const counts: GroupCounts = {
    whiskiesById: 0,
    whiskiesByName: 0,
    handoutsById: 0,
    handoutsByName: 0,
    profilesDeleted: 0,
    profilesRepointed: 0,
    profilesContentMerged: 0,
    aliasesRepointed: 0,
    aliasesAdded: 0,
  };

  const survivor = pickSurvivor(rows);
  const losers = rows.filter((r) => r.id !== survivor.id);
  const loserIds = losers.map((l) => l.id);

  console.log(
    `\n[group] canonical="${canonical}" survivor="${survivor.name}" (${survivor.id}, score=${completenessScore(survivor)})`,
  );
  for (const l of losers) {
    console.log(`  loser="${l.name}" (${l.id}, score=${completenessScore(l)})`);
  }

  // 1) Patch survivor with any non-empty fields losers have that survivor lacks.
  const patch: Partial<Distillery> = {};
  for (const l of losers) {
    if (!survivor.description && l.description) patch.description = l.description;
    if (survivor.founded == null && l.founded != null) patch.founded = l.founded;
    if (!survivor.feature && l.feature) patch.feature = l.feature;
    if ((!survivor.region || survivor.region === "Unknown") && l.region && l.region !== "Unknown") patch.region = l.region;
    if ((!survivor.country || survivor.country === "Unknown") && l.country && l.country !== "Unknown") patch.country = l.country;
    if (survivor.lat == null && l.lat != null) patch.lat = l.lat;
    if (survivor.lng == null && l.lng != null) patch.lng = l.lng;
  }
  if (Object.keys(patch).length > 0) {
    console.log(`  patch survivor:`, patch);
    if (apply) {
      await exec.update(distilleries).set(patch).where(eq(distilleries.id, survivor.id));
      Object.assign(survivor, patch);
    }
  }

  // 2) Re-point whiskies by distilleryId.
  if (loserIds.length > 0) {
    const wById = await exec.select({ id: whiskies.id }).from(whiskies).where(inArray(whiskies.distilleryId, loserIds));
    counts.whiskiesById = wById.length;
    if (verbose) console.log(`  whiskies by id: ${wById.length}`);
    if (apply && wById.length > 0) {
      await exec.update(whiskies)
        .set({ distilleryId: survivor.id, distillery: survivor.name })
        .where(inArray(whiskies.distilleryId, loserIds));
    }
  }

  // 3) Re-point whiskies by free-text distillery name (canonical match, no/other id).
  const loserNamesLower = losers.map((l) => l.name.toLowerCase());
  if (loserNamesLower.length > 0) {
    const wByName = await exec
      .select({ id: whiskies.id, distillery: whiskies.distillery, distilleryId: whiskies.distilleryId })
      .from(whiskies)
      .where(sql`LOWER(${whiskies.distillery}) IN (${sql.join(loserNamesLower.map((n) => sql`${n}`), sql`, `)})`);
    const toFix = wByName.filter((w) => (w.distilleryId ?? null) !== survivor.id || w.distillery !== survivor.name);
    counts.whiskiesByName = toFix.length;
    if (verbose) console.log(`  whiskies by name: ${toFix.length}`);
    if (apply && toFix.length > 0) {
      await exec.update(whiskies)
        .set({ distilleryId: survivor.id, distillery: survivor.name })
        .where(inArray(whiskies.id, toFix.map((w) => w.id)));
    }
  }

  // 4) Re-point handout library by distilleryId.
  if (loserIds.length > 0) {
    const hById = await exec.select({ id: whiskyHandoutLibrary.id })
      .from(whiskyHandoutLibrary)
      .where(inArray(whiskyHandoutLibrary.distilleryId, loserIds));
    counts.handoutsById = hById.length;
    if (verbose) console.log(`  handouts by id: ${hById.length}`);
    if (apply && hById.length > 0) {
      await exec.update(whiskyHandoutLibrary)
        .set({ distilleryId: survivor.id, distillery: survivor.name })
        .where(inArray(whiskyHandoutLibrary.distilleryId, loserIds));
    }
  }

  // 5) Re-point handout library by free-text distillery name.
  if (loserNamesLower.length > 0) {
    const hByName = await exec
      .select({ id: whiskyHandoutLibrary.id, distillery: whiskyHandoutLibrary.distillery, distilleryId: whiskyHandoutLibrary.distilleryId })
      .from(whiskyHandoutLibrary)
      .where(sql`LOWER(${whiskyHandoutLibrary.distillery}) IN (${sql.join(loserNamesLower.map((n) => sql`${n}`), sql`, `)})`);
    const toFix = hByName.filter((h) => (h.distilleryId ?? null) !== survivor.id || h.distillery !== survivor.name);
    counts.handoutsByName = toFix.length;
    if (verbose) console.log(`  handouts by name: ${toFix.length}`);
    if (apply && toFix.length > 0) {
      await exec.update(whiskyHandoutLibrary)
        .set({ distilleryId: survivor.id, distillery: survivor.name })
        .where(inArray(whiskyHandoutLibrary.id, toFix.map((h) => h.id)));
    }
  }

  // 6) Merge distillery_profiles. Profiles are keyed by lowercased name, so each
  //    name variant in the group can have its own profile row. Pick the best
  //    profile by content (chapters/sources/images, then freshness), keep that
  //    row but rewrite its key/displayName to match the survivor, and delete
  //    the rest.
  const survivorKey = distilleryNameKey(survivor.name);
  const groupKeys = Array.from(new Set(rows.map((r) => distilleryNameKey(r.name))));
  const profileRows = await exec.select().from(distilleryProfiles).where(inArray(distilleryProfiles.nameKey, groupKeys));
  if (profileRows.length > 0) {
    const best = pickBestProfile(profileRows);
    const drop = profileRows.filter((p) => p.id !== best.id);
    counts.profilesDeleted = drop.length;
    if (best.nameKey !== survivorKey) {
      counts.profilesRepointed = 1;
      // If the best profile is keyed differently from the survivor, we will rewrite its key.
      // Note any survivor-keyed dropped rows so we can report content was replaced.
      const replaced = drop.find((p) => p.nameKey === survivorKey);
      if (replaced) counts.profilesContentMerged = 1;
    }
    if (verbose) {
      console.log(
        `  profiles: ${profileRows.length} found, keep ${best.id} (key=${best.nameKey}, score=${profileScore(best)}), delete ${drop.length}`,
      );
    }
    if (apply) {
      if (drop.length > 0) {
        await exec.delete(distilleryProfiles).where(inArray(distilleryProfiles.id, drop.map((p) => p.id)));
      }
      if (best.nameKey !== survivorKey || best.displayName !== survivor.name) {
        await exec.update(distilleryProfiles)
          .set({ nameKey: survivorKey, displayName: survivor.name })
          .where(eq(distilleryProfiles.id, best.id));
      }
    }
  }

  // 7) Re-point distillery_aliases.distilleryId for any rows pointing at losers.
  if (loserIds.length > 0) {
    const aRows = await exec.select({ id: distilleryAliases.id }).from(distilleryAliases).where(inArray(distilleryAliases.distilleryId, loserIds));
    counts.aliasesRepointed = aRows.length;
    if (verbose) console.log(`  aliases repoint: ${aRows.length}`);
    if (apply && aRows.length > 0) {
      await exec.update(distilleryAliases)
        .set({ distilleryId: survivor.id })
        .where(inArray(distilleryAliases.id, aRows.map((a) => a.id)));
    }
  }

  // 8) Insert an alias for each loser's canonical name so future lookups resolve to the survivor.
  for (const l of losers) {
    const aliasCanonical = canonicalizeDistilleryName(l.name);
    if (!aliasCanonical) continue;
    counts.aliasesAdded += 1;
    if (verbose) console.log(`  alias add: "${aliasCanonical}" -> ${survivor.id}`);
    if (apply) {
      await exec.insert(distilleryAliases)
        .values({ alias: aliasCanonical, distilleryId: survivor.id })
        .onConflictDoNothing();
    }
  }

  // 9) Delete loser distillery rows.
  if (apply && loserIds.length > 0) {
    await exec.delete(distilleries).where(inArray(distilleries.id, loserIds));
  }

  return counts;
}

async function main() {
  console.log(`[merge-distilleries] mode=${apply ? "APPLY" : "DRY-RUN"}`);

  const all = await db.select().from(distilleries);
  console.log(`[merge-distilleries] loaded ${all.length} distilleries`);

  const groups = new Map<string, Distillery[]>();
  for (const d of all) {
    const c = canonicalizeDistilleryName(d.name);
    if (!c) continue;
    const arr = groups.get(c) || [];
    arr.push(d);
    groups.set(c, arr);
  }

  const dupGroups = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  console.log(`[merge-distilleries] ${dupGroups.length} duplicate groups`);

  const totals = {
    mergedRows: 0,
    whiskiesById: 0,
    whiskiesByName: 0,
    handoutsById: 0,
    handoutsByName: 0,
    profilesDeleted: 0,
    profilesRepointed: 0,
    profilesContentMerged: 0,
    aliasesRepointed: 0,
    aliasesAdded: 0,
    distilleriesDeleted: 0,
  };

  for (const [canonical, rows] of dupGroups) {
    const losersInGroup = rows.length - 1;
    totals.mergedRows += losersInGroup;
    totals.distilleriesDeleted += losersInGroup;

    // Wrap each group's mutations in a transaction so a mid-group failure does not
    // leave whiskies/handouts re-pointed at a survivor that was never deleted (or
    // vice-versa). In dry-run mode no writes happen so we skip the transaction.
    const counts = apply
      ? await db.transaction(async (tx) => processGroup(tx, canonical, rows))
      : await processGroup(db, canonical, rows);

    totals.whiskiesById += counts.whiskiesById;
    totals.whiskiesByName += counts.whiskiesByName;
    totals.handoutsById += counts.handoutsById;
    totals.handoutsByName += counts.handoutsByName;
    totals.profilesDeleted += counts.profilesDeleted;
    totals.profilesRepointed += counts.profilesRepointed;
    totals.profilesContentMerged += counts.profilesContentMerged;
    totals.aliasesRepointed += counts.aliasesRepointed;
    totals.aliasesAdded += counts.aliasesAdded;
  }

  console.log("\n[merge-distilleries] summary");
  console.log(`  duplicate groups:               ${dupGroups.length}`);
  console.log(`  loser rows merged:              ${totals.mergedRows}`);
  console.log(`  whiskies repointed by id:       ${totals.whiskiesById}`);
  console.log(`  whiskies repointed by name:     ${totals.whiskiesByName}`);
  console.log(`  handouts repointed by id:       ${totals.handoutsById}`);
  console.log(`  handouts repointed by name:     ${totals.handoutsByName}`);
  console.log(`  profiles deleted:               ${totals.profilesDeleted}`);
  console.log(`  profiles repointed (key):       ${totals.profilesRepointed}`);
  console.log(`  profiles where richer content   `);
  console.log(`    replaced survivor-key row:    ${totals.profilesContentMerged}`);
  console.log(`  aliases repointed:              ${totals.aliasesRepointed}`);
  console.log(`  aliases added:                  ${totals.aliasesAdded}`);
  console.log(`  distilleries deleted:           ${totals.distilleriesDeleted}`);
  console.log(apply ? "[merge-distilleries] applied changes" : "[merge-distilleries] dry-run only — pass --apply to commit");
}

await main();
process.exit(0);
