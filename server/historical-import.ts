import ExcelJS from "exceljs";
import { db } from "./db";
import {
  historicalTastings,
  historicalTastingEntries,
  historicalImportRuns,
  type InsertHistoricalTasting,
  type InsertHistoricalTastingEntry,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";

interface TastingDateInfo {
  tastingNumber: number;
  date: string | null;
  motto: string | null;
}

interface ParsedWhiskyRow {
  tastingNumber: number;
  distillery: string | null;
  whiskyName: string | null;
  age: string | null;
  alcohol: string | null;
  price: string | null;
  country: string | null;
  region: string | null;
  type: string | null;
  smoky: string | null;
  ppm: string | null;
  cask: string | null;
  noseScore: number | null;
  noseRank: number | null;
  tasteScore: number | null;
  tasteRank: number | null;
  finishScore: number | null;
  finishRank: number | null;
  totalScore: number | null;
  totalRank: number | null;
}

interface ImportWarning {
  row: number;
  field: string;
  value: string;
  message: string;
}

interface ImportResult {
  dryRun: boolean;
  rowsRead: number;
  rowsImported: number;
  rowsSkipped: number;
  tastingsCreated: number;
  entriesCreated: number;
  warnings: ImportWarning[];
  errors: string[];
  importRunId?: string;
}

const HEADER_MAP: Record<string, string> = {
  "Tasting Nr": "tastingNumber",
  "Distillery/\nAbfüller": "distillery",
  "Distillery/Abfüller": "distillery",
  "Whisky": "whiskyName",
  "Alter": "age",
  "Alkohol": "alcohol",
  "Preis": "price",
  "Land": "country",
  "Region": "region",
  "SingleMalt / Blend": "type",
  "Rauchig Ja / Nein": "smoky",
  "ppm": "ppm",
  "Fass": "cask",
  "Nase\nBenotung": "noseScore",
  "Nase Benotung": "noseScore",
  "Nase\nRang": "noseRank",
  "Nase Rang": "noseRank",
  "Geschmack\nBenotung": "tasteScore",
  "Geschmack Benotung": "tasteScore",
  "Geschmack\nRang": "tasteRank",
  "Geschmack Rang": "tasteRank",
  "Abgang\nBenotung": "finishScore",
  "Abgang Benotung": "finishScore",
  "Abgang\nRang": "finishRank",
  "Abgang Rang": "finishRank",
  "Gesamt Benotung": "totalScore",
  "Gesamt\nRang": "totalRank",
  "Gesamt Rang": "totalRank",
};

function cellToString(val: any): string | null {
  if (val == null) return null;
  if (typeof val === "object" && "result" in val) return String(val.result);
  return String(val).trim() || null;
}

function cellToNumber(val: any): number | null {
  if (val == null) return null;
  if (typeof val === "object" && "result" in val) val = val.result;
  if (typeof val === "number") return val;
  const s = String(val).trim().replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function cellToInt(val: any): number | null {
  const n = cellToNumber(val);
  return n != null ? Math.round(n) : null;
}

export function normalizeText(s: string | null): string | null {
  if (!s) return null;
  return s.trim().replace(/\s+/g, " ");
}

export function normalizeKey(s: string | null): string {
  if (!s) return "";
  return s.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

export function parseAge(raw: string | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

export function parseAbv(raw: string | null | number): number | null {
  if (raw == null) return null;
  let n: number;
  if (typeof raw === "number") {
    n = raw;
  } else {
    const s = String(raw).trim().replace(",", ".").replace("%", "");
    n = parseFloat(s);
    if (isNaN(n)) return null;
  }
  if (n > 0 && n < 1) return Math.round(n * 1000) / 10;
  return n;
}

export function parsePrice(raw: string | null | number): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim().replace(",", ".").replace(/[€$£]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

export function parseSmoky(raw: string | null): boolean | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (s === "ja" || s === "yes" || s === "j") return true;
  if (s === "nein" || s === "no" || s === "n") return false;
  return null;
}

function parsePpm(raw: string | null | number): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const s = String(raw).trim().replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function formatDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const s = String(val);
  if (s.includes("T")) return s.split("T")[0];
  return s;
}

async function parseExcelFile(filePath: string): Promise<{
  whiskyRows: ParsedWhiskyRow[];
  dateMap: Map<number, TastingDateInfo>;
  warnings: ImportWarning[];
}> {
  const buf = fs.readFileSync(filePath);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buf);

  const warnings: ImportWarning[] = [];

  const dateMap = new Map<number, TastingDateInfo>();
  const dtSheet = workbook.worksheets.find((s) => s.name.includes("Datum"));
  if (dtSheet) {
    dtSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const nr = cellToInt(row.getCell(1).value);
      if (nr == null) return;
      dateMap.set(nr, {
        tastingNumber: nr,
        date: formatDate(row.getCell(2).value),
        motto: cellToString(row.getCell(3).value),
      });
    });
  }

  const gsSheet =
    workbook.getWorksheet("Gesamtübersicht") || workbook.worksheets[0];
  if (!gsSheet) throw new Error("Gesamtübersicht sheet not found");

  const headerRow = gsSheet.getRow(1);
  const colMap: Record<string, number> = {};
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const raw = String(cell.value || "").trim();
    for (const [excelHeader, fieldName] of Object.entries(HEADER_MAP)) {
      const normalizedExcel = excelHeader.replace(/\n/g, "\n");
      if (raw === normalizedExcel || raw.replace(/\n/g, " ") === normalizedExcel.replace(/\n/g, " ")) {
        colMap[fieldName] = colNumber;
      }
    }
  });

  const whiskyRows: ParsedWhiskyRow[] = [];
  gsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;

    const rawTastingVal = row.getCell(colMap["tastingNumber"] || 1).value;
    let tastingNr = cellToInt(rawTastingVal);
    if (tastingNr == null) {
      const rawStr = cellToString(rawTastingVal);
      if (rawStr && rawStr.toLowerCase().includes("dekadenten")) {
        const dekMatch = rawStr.match(/(\d+)/);
        const dekNum = dekMatch ? parseInt(dekMatch[1], 10) : 1;
        tastingNr = 1000 + dekNum;
      } else {
        warnings.push({
          row: rowNumber,
          field: "tastingNumber",
          value: String(rawTastingVal),
          message: "Could not parse tasting number, skipping row",
        });
        return;
      }
    }

    const getVal = (field: string) => {
      const col = colMap[field];
      return col ? row.getCell(col).value : null;
    };

    whiskyRows.push({
      tastingNumber: tastingNr,
      distillery: cellToString(getVal("distillery")),
      whiskyName: cellToString(getVal("whiskyName")),
      age: cellToString(getVal("age")),
      alcohol: cellToString(getVal("alcohol")),
      price: cellToString(getVal("price")),
      country: cellToString(getVal("country")),
      region: cellToString(getVal("region")),
      type: cellToString(getVal("type")),
      smoky: cellToString(getVal("smoky")),
      ppm: cellToString(getVal("ppm")),
      cask: cellToString(getVal("cask")),
      noseScore: cellToNumber(getVal("noseScore")),
      noseRank: cellToInt(getVal("noseRank")),
      tasteScore: cellToNumber(getVal("tasteScore")),
      tasteRank: cellToInt(getVal("tasteRank")),
      finishScore: cellToNumber(getVal("finishScore")),
      finishRank: cellToInt(getVal("finishRank")),
      totalScore: cellToNumber(getVal("totalScore")),
      totalRank: cellToInt(getVal("totalRank")),
    });
  });

  return { whiskyRows, dateMap, warnings };
}

export async function importHistoricalTastings(options: {
  filePath?: string;
  dryRun?: boolean;
}): Promise<ImportResult> {
  let filePath = options.filePath;
  if (!filePath) {
    const assetsDir = path.resolve(process.cwd(), "attached_assets");
    const files = fs.readdirSync(assetsDir);
    const match = files.find((f) => f.includes("Whiskytasting_1-30") && f.endsWith(".xlsx"));
    if (!match) throw new Error("Historical tasting Excel file not found in attached_assets/");
    filePath = path.join(assetsDir, match);
  }

  const dryRun = options.dryRun ?? false;
  const sourceFileName = path.basename(filePath);

  const result: ImportResult = {
    dryRun,
    rowsRead: 0,
    rowsImported: 0,
    rowsSkipped: 0,
    tastingsCreated: 0,
    entriesCreated: 0,
    warnings: [],
    errors: [],
  };

  let importRunId: string | undefined;

  if (!dryRun) {
    const [run] = await db
      .insert(historicalImportRuns)
      .values({ sourceFileName, status: "running" })
      .returning();
    importRunId = run.id;
    result.importRunId = importRunId;
  }

  try {
    const { whiskyRows, dateMap, warnings } = await parseExcelFile(filePath);
    result.warnings.push(...warnings);
    result.rowsRead = whiskyRows.length;

    const grouped = new Map<number, ParsedWhiskyRow[]>();
    for (const row of whiskyRows) {
      const arr = grouped.get(row.tastingNumber) || [];
      arr.push(row);
      grouped.set(row.tastingNumber, arr);
    }

    for (const [tastingNumber, rows] of grouped) {
      const sourceKey = `hist-tasting-${tastingNumber}`;
      const dateInfo = dateMap.get(tastingNumber);

      const tastingData: InsertHistoricalTasting = {
        sourceKey,
        tastingNumber,
        titleDe: dateInfo?.motto || `Tasting #${tastingNumber}`,
        titleEn: dateInfo?.motto || `Tasting #${tastingNumber}`,
        tastingDate: dateInfo?.date || null,
        sourceFileName,
        importBatchId: importRunId || null,
        whiskyCount: rows.length,
      };

      if (dryRun) {
        result.tastingsCreated++;
      } else {
        const [existing] = await db
          .select()
          .from(historicalTastings)
          .where(eq(historicalTastings.sourceKey, sourceKey))
          .limit(1);

        let tastingId: string;
        if (existing) {
          await db
            .update(historicalTastings)
            .set({ ...tastingData, updatedAt: new Date() })
            .where(eq(historicalTastings.id, existing.id));
          tastingId = existing.id;
        } else {
          const [created] = await db
            .insert(historicalTastings)
            .values(tastingData)
            .returning();
          tastingId = created.id;
          result.tastingsCreated++;
        }

        for (const row of rows) {
          const distKey = normalizeKey(row.distillery);
          const whiskyKey = normalizeKey(row.whiskyName);
          const sourceWhiskyKey = `hist-${tastingNumber}-${distKey}-${whiskyKey}`;

          const entryData: InsertHistoricalTastingEntry = {
            historicalTastingId: tastingId,
            sourceWhiskyKey,
            distilleryRaw: row.distillery,
            whiskyNameRaw: row.whiskyName,
            ageRaw: row.age,
            alcoholRaw: row.alcohol,
            priceRaw: row.price,
            countryRaw: row.country,
            regionRaw: row.region,
            typeRaw: row.type,
            smokyRaw: row.smoky,
            ppmRaw: row.ppm,
            caskRaw: row.cask,
            noseScore: row.noseScore,
            noseRank: row.noseRank,
            tasteScore: row.tasteScore,
            tasteRank: row.tasteRank,
            finishScore: row.finishScore,
            finishRank: row.finishRank,
            totalScore: row.totalScore,
            totalRank: row.totalRank,
            normalizedAge: parseAge(row.age),
            normalizedAbv: parseAbv(row.alcohol),
            normalizedPrice: parsePrice(row.price),
            normalizedCountry: normalizeText(row.country),
            normalizedRegion: normalizeText(row.region),
            normalizedType: normalizeText(row.type),
            normalizedIsSmoky: parseSmoky(row.smoky),
            normalizedPpm: parsePpm(row.ppm),
            normalizedCask: normalizeText(row.cask),
          };

          const [existingEntry] = await db
            .select()
            .from(historicalTastingEntries)
            .where(
              eq(historicalTastingEntries.sourceWhiskyKey, sourceWhiskyKey)
            )
            .limit(1);

          if (existingEntry) {
            await db
              .update(historicalTastingEntries)
              .set({ ...entryData, updatedAt: new Date() })
              .where(eq(historicalTastingEntries.id, existingEntry.id));
            result.rowsSkipped++;
          } else {
            await db
              .insert(historicalTastingEntries)
              .values(entryData)
              .returning();
            result.entriesCreated++;
            result.rowsImported++;
          }
        }
      }

      if (dryRun) {
        result.entriesCreated += rows.length;
        result.rowsImported += rows.length;
      }
    }

    if (!dryRun && importRunId) {
      await db
        .update(historicalImportRuns)
        .set({
          status: "completed",
          rowsRead: result.rowsRead,
          rowsImported: result.rowsImported,
          rowsSkipped: result.rowsSkipped,
          tastingsCreated: result.tastingsCreated,
          entriesCreated: result.entriesCreated,
          warningsCount: result.warnings.length,
          errorsCount: result.errors.length,
          summaryJson: JSON.stringify({
            warnings: result.warnings,
            errors: result.errors,
          }),
          completedAt: new Date(),
        })
        .where(eq(historicalImportRuns.id, importRunId));
    }
  } catch (error: any) {
    result.errors.push(error.message || String(error));
    if (!dryRun && importRunId) {
      await db
        .update(historicalImportRuns)
        .set({
          status: "failed",
          errorsCount: 1,
          summaryJson: JSON.stringify({
            warnings: result.warnings,
            errors: result.errors,
          }),
          completedAt: new Date(),
        })
        .where(eq(historicalImportRuns.id, importRunId));
    }
  }

  return result;
}
