import { db } from "./db";
import { historicalTastings, historicalTastingEntries, historicalImportRuns } from "@shared/schema";
import { sql, count, eq, isNull, isNotNull } from "drizzle-orm";

export interface ReconciliationReport {
  generatedAt: string;
  summary: {
    totalTastings: number;
    totalEntries: number;
    totalImportRuns: number;
    lastImportRun: {
      id: string;
      status: string;
      createdAt: string | null;
      completedAt: string | null;
      rowsRead: number;
      rowsImported: number;
      rowsSkipped: number;
    } | null;
  };
  nullFieldRates: Record<string, { nullCount: number; totalCount: number; rate: number }>;
  parseSuccessRates: {
    age: { parsed: number; total: number; rate: number };
    abv: { parsed: number; total: number; rate: number };
    price: { parsed: number; total: number; rate: number };
    smoky: { parsed: number; total: number; rate: number };
    ppm: { parsed: number; total: number; rate: number };
  };
  duplicates: {
    duplicateSourceKeys: number;
    duplicateWhiskyKeys: number;
    details: Array<{ key: string; count: number }>;
  };
  outliers: {
    scoresOutOfRange: Array<{ id: string; field: string; value: number; distillery: string | null; whiskyName: string | null }>;
    extremeAbv: Array<{ id: string; value: number; distillery: string | null; whiskyName: string | null }>;
    extremeAge: Array<{ id: string; value: number; distillery: string | null; whiskyName: string | null }>;
    extremePrice: Array<{ id: string; value: number; distillery: string | null; whiskyName: string | null }>;
  };
  malformedRows: Array<{ id: string; issues: string[]; distillery: string | null; whiskyName: string | null }>;
  warnings: string[];
}

export async function runReconciliation(): Promise<ReconciliationReport> {
  const report: ReconciliationReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalTastings: 0,
      totalEntries: 0,
      totalImportRuns: 0,
      lastImportRun: null,
    },
    nullFieldRates: {},
    parseSuccessRates: {
      age: { parsed: 0, total: 0, rate: 0 },
      abv: { parsed: 0, total: 0, rate: 0 },
      price: { parsed: 0, total: 0, rate: 0 },
      smoky: { parsed: 0, total: 0, rate: 0 },
      ppm: { parsed: 0, total: 0, rate: 0 },
    },
    duplicates: {
      duplicateSourceKeys: 0,
      duplicateWhiskyKeys: 0,
      details: [],
    },
    outliers: {
      scoresOutOfRange: [],
      extremeAbv: [],
      extremeAge: [],
      extremePrice: [],
    },
    malformedRows: [],
    warnings: [],
  };

  const [tastingCountResult] = await db.select({ c: count() }).from(historicalTastings);
  report.summary.totalTastings = tastingCountResult.c;

  const [entryCountResult] = await db.select({ c: count() }).from(historicalTastingEntries);
  report.summary.totalEntries = entryCountResult.c;

  const [importRunCountResult] = await db.select({ c: count() }).from(historicalImportRuns);
  report.summary.totalImportRuns = importRunCountResult.c;

  const lastRuns = await db
    .select()
    .from(historicalImportRuns)
    .orderBy(sql`${historicalImportRuns.createdAt} DESC NULLS LAST`)
    .limit(1);

  if (lastRuns.length > 0) {
    const r = lastRuns[0];
    report.summary.lastImportRun = {
      id: r.id,
      status: r.status,
      createdAt: r.createdAt?.toISOString() ?? null,
      completedAt: r.completedAt?.toISOString() ?? null,
      rowsRead: r.rowsRead ?? 0,
      rowsImported: r.rowsImported ?? 0,
      rowsSkipped: r.rowsSkipped ?? 0,
    };
  }

  const rawFields: Array<{ column: string; dbCol: any }> = [
    { column: "distilleryRaw", dbCol: historicalTastingEntries.distilleryRaw },
    { column: "whiskyNameRaw", dbCol: historicalTastingEntries.whiskyNameRaw },
    { column: "ageRaw", dbCol: historicalTastingEntries.ageRaw },
    { column: "alcoholRaw", dbCol: historicalTastingEntries.alcoholRaw },
    { column: "priceRaw", dbCol: historicalTastingEntries.priceRaw },
    { column: "countryRaw", dbCol: historicalTastingEntries.countryRaw },
    { column: "regionRaw", dbCol: historicalTastingEntries.regionRaw },
    { column: "typeRaw", dbCol: historicalTastingEntries.typeRaw },
    { column: "smokyRaw", dbCol: historicalTastingEntries.smokyRaw },
    { column: "ppmRaw", dbCol: historicalTastingEntries.ppmRaw },
    { column: "caskRaw", dbCol: historicalTastingEntries.caskRaw },
    { column: "noseScore", dbCol: historicalTastingEntries.noseScore },
    { column: "tasteScore", dbCol: historicalTastingEntries.tasteScore },
    { column: "finishScore", dbCol: historicalTastingEntries.finishScore },
    { column: "totalScore", dbCol: historicalTastingEntries.totalScore },
  ];

  const totalEntries = report.summary.totalEntries;
  for (const f of rawFields) {
    const [nullResult] = await db
      .select({ c: count() })
      .from(historicalTastingEntries)
      .where(isNull(f.dbCol));
    report.nullFieldRates[f.column] = {
      nullCount: nullResult.c,
      totalCount: totalEntries,
      rate: totalEntries > 0 ? Math.round((nullResult.c / totalEntries) * 10000) / 100 : 0,
    };
  }

  const parseFields: Array<{ name: keyof typeof report.parseSuccessRates; rawCol: any; parsedCol: any }> = [
    { name: "age", rawCol: historicalTastingEntries.ageRaw, parsedCol: historicalTastingEntries.normalizedAge },
    { name: "abv", rawCol: historicalTastingEntries.alcoholRaw, parsedCol: historicalTastingEntries.normalizedAbv },
    { name: "price", rawCol: historicalTastingEntries.priceRaw, parsedCol: historicalTastingEntries.normalizedPrice },
    { name: "smoky", rawCol: historicalTastingEntries.smokyRaw, parsedCol: historicalTastingEntries.normalizedIsSmoky },
    { name: "ppm", rawCol: historicalTastingEntries.ppmRaw, parsedCol: historicalTastingEntries.normalizedPpm },
  ];

  for (const pf of parseFields) {
    const [hasRawResult] = await db
      .select({ c: count() })
      .from(historicalTastingEntries)
      .where(isNotNull(pf.rawCol));
    const [parsedResult] = await db
      .select({ c: count() })
      .from(historicalTastingEntries)
      .where(isNotNull(pf.parsedCol));
    const hasRaw = hasRawResult.c;
    report.parseSuccessRates[pf.name] = {
      parsed: parsedResult.c,
      total: hasRaw,
      rate: hasRaw > 0 ? Math.round((parsedResult.c / hasRaw) * 10000) / 100 : 100,
    };
  }

  const dupSourceKeys = await db
    .select({
      key: historicalTastings.sourceKey,
      cnt: count(),
    })
    .from(historicalTastings)
    .groupBy(historicalTastings.sourceKey)
    .having(sql`count(*) > 1`);

  report.duplicates.duplicateSourceKeys = dupSourceKeys.length;

  const dupWhiskyKeys = await db
    .select({
      key: historicalTastingEntries.sourceWhiskyKey,
      cnt: count(),
    })
    .from(historicalTastingEntries)
    .groupBy(historicalTastingEntries.sourceWhiskyKey)
    .having(sql`count(*) > 1`);

  report.duplicates.duplicateWhiskyKeys = dupWhiskyKeys.length;
  report.duplicates.details = [
    ...dupSourceKeys.map(d => ({ key: d.key, count: d.cnt })),
    ...dupWhiskyKeys.map(d => ({ key: d.key, count: d.cnt })),
  ];

  if (dupSourceKeys.length > 0) {
    report.warnings.push(`Found ${dupSourceKeys.length} duplicate tasting source keys`);
  }
  if (dupWhiskyKeys.length > 0) {
    report.warnings.push(`Found ${dupWhiskyKeys.length} duplicate whisky source keys`);
  }

  const allEntries = await db.select().from(historicalTastingEntries);

  for (const entry of allEntries) {
    const issues: string[] = [];

    const scoreFields: Array<{ name: string; value: number | null }> = [
      { name: "noseScore", value: entry.noseScore },
      { name: "tasteScore", value: entry.tasteScore },
      { name: "finishScore", value: entry.finishScore },
      { name: "totalScore", value: entry.totalScore },
    ];

    for (const sf of scoreFields) {
      if (sf.value !== null && (sf.value < 0 || sf.value > 10)) {
        report.outliers.scoresOutOfRange.push({
          id: entry.id,
          field: sf.name,
          value: sf.value,
          distillery: entry.distilleryRaw,
          whiskyName: entry.whiskyNameRaw,
        });
        issues.push(`${sf.name} = ${sf.value} (outside 0-10)`);
      }
    }

    if (entry.normalizedAbv !== null && (entry.normalizedAbv < 30 || entry.normalizedAbv > 80)) {
      report.outliers.extremeAbv.push({
        id: entry.id,
        value: entry.normalizedAbv,
        distillery: entry.distilleryRaw,
        whiskyName: entry.whiskyNameRaw,
      });
      issues.push(`ABV = ${entry.normalizedAbv}% (outside 30-80)`);
    }

    if (entry.normalizedAge !== null && (entry.normalizedAge < 0 || entry.normalizedAge > 100)) {
      report.outliers.extremeAge.push({
        id: entry.id,
        value: entry.normalizedAge,
        distillery: entry.distilleryRaw,
        whiskyName: entry.whiskyNameRaw,
      });
      issues.push(`Age = ${entry.normalizedAge} (outside 0-100)`);
    }

    if (entry.normalizedPrice !== null && (entry.normalizedPrice < 0 || entry.normalizedPrice > 50000)) {
      report.outliers.extremePrice.push({
        id: entry.id,
        value: entry.normalizedPrice,
        distillery: entry.distilleryRaw,
        whiskyName: entry.whiskyNameRaw,
      });
      issues.push(`Price = ${entry.normalizedPrice} (outside 0-50000)`);
    }

    if (!entry.distilleryRaw && !entry.whiskyNameRaw) {
      issues.push("Both distillery and whisky name are empty");
    }

    if (issues.length > 0) {
      report.malformedRows.push({
        id: entry.id,
        issues,
        distillery: entry.distilleryRaw,
        whiskyName: entry.whiskyNameRaw,
      });
    }
  }

  const orphanedEntries = await db
    .select({ c: count() })
    .from(historicalTastingEntries)
    .where(
      sql`${historicalTastingEntries.historicalTastingId} NOT IN (SELECT ${historicalTastings.id} FROM ${historicalTastings})`
    );

  if (orphanedEntries[0].c > 0) {
    report.warnings.push(`Found ${orphanedEntries[0].c} orphaned entries (no matching tasting)`);
  }

  const tastingsWithZeroEntries = await db
    .select({
      id: historicalTastings.id,
      tastingNumber: historicalTastings.tastingNumber,
    })
    .from(historicalTastings)
    .where(
      sql`${historicalTastings.id} NOT IN (SELECT DISTINCT ${historicalTastingEntries.historicalTastingId} FROM ${historicalTastingEntries})`
    );

  if (tastingsWithZeroEntries.length > 0) {
    report.warnings.push(
      `Found ${tastingsWithZeroEntries.length} tastings with zero entries: ${tastingsWithZeroEntries.map(t => `#${t.tastingNumber}`).join(", ")}`
    );
  }

  if (report.summary.totalEntries === 0 && report.summary.totalTastings === 0) {
    report.warnings.push("No historical data found. Run the import first.");
  }

  return report;
}
