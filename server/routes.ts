import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
// @ts-ignore
import multer from "multer";
import path from "path";
import fs from "fs";
// @ts-ignore
import * as XLSX from "xlsx";
// @ts-ignore
import AdmZip from "adm-zip";
import { storage } from "./storage";
import { insertTastingSchema, insertWhiskySchema, insertRatingSchema, insertParticipantSchema } from "@shared/schema";
import { z } from "zod";
import { APP_VERSION, getVersionInfo } from "@shared/version";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, uploadsDir),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WebP, and GIF images are allowed"));
  },
});

const importUpload = multer({
  storage: multer.diskStorage({
    destination: (_req: any, _file: any, cb: any) => cb(null, uploadsDir),
    filename: (_req: any, file: any, cb: any) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `import-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    },
  }),
  limits: { fileSize: 20 * 1024 * 1024 },
});

const COLUMN_MAP: Record<string, string> = {
  name: "name", whisky: "name", expression: "name", bezeichnung: "name", titel: "name",
  distillery: "distillery", brennerei: "distillery", destillerie: "distillery",
  age: "age", alter: "age",
  abv: "abv", alkohol: "abv", "abv%": "abv", "abv (%)": "abv",
  type: "type", typ: "type", kategorie: "type",
  category: "category",
  region: "region",
  cask: "caskInfluence", "cask influence": "caskInfluence", cask_influence: "caskInfluence",
  fass: "caskInfluence", fasseinfluss: "caskInfluence",
  peat: "peatLevel", "peat level": "peatLevel", peat_level: "peatLevel",
  torf: "peatLevel", torfgehalt: "peatLevel",
  ppm: "ppm", phenol: "ppm", "phenol ppm": "ppm",
  whiskybase: "whiskybaseId", whiskybase_id: "whiskybaseId", "whiskybase id": "whiskybaseId", wb: "whiskybaseId",
  notes: "notes", notizen: "notes", anmerkungen: "notes",
  order: "sortOrder", reihenfolge: "sortOrder", sort: "sortOrder", sort_order: "sortOrder",
  image: "imageRef", image_url: "imageRef", image_filename: "imageRef", bild: "imageRef", foto: "imageRef",
  abv_band: "abvBand", abvband: "abvBand",
  age_band: "ageBand", ageband: "ageBand", altersband: "ageBand",
};

function normalizeColumnName(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, " ");
  return COLUMN_MAP[key] || COLUMN_MAP[key.replace(/ /g, "_")] || COLUMN_MAP[key.replace(/ /g, "")] || null;
}

function parseSpreadsheetRows(buffer: Buffer, filename: string): { rows: Record<string, any>[]; errors: string[] } {
  const ext = path.extname(filename).toLowerCase();
  const errors: string[] = [];

  if (ext === ".xlsx" || ext === ".xls") {
    const wb = XLSX.read(buffer, { type: "buffer" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) { errors.push("No worksheet found in file"); return { rows: [], errors }; }
    const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    return parseArrayRows(raw, errors);
  }

  if (ext === ".csv" || ext === ".txt") {
    const text = buffer.toString("utf-8");
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) { errors.push("File must have a header row and at least one data row"); return { rows: [], errors }; }

    const delimiter = detectDelimiter(lines[0]);
    const raw = lines.map(line => parseLine(line, delimiter));
    return parseArrayRows(raw, errors);
  }

  errors.push(`Unsupported file type: ${ext}`);
  return { rows: [], errors };
}

function detectDelimiter(headerLine: string): string {
  const tab = (headerLine.match(/\t/g) || []).length;
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  if (tab >= semi && tab >= comma && tab > 0) return "\t";
  if (semi >= comma && semi > 0) return ";";
  return ",";
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseArrayRows(raw: any[][], errors: string[]): { rows: Record<string, any>[]; errors: string[] } {
  if (raw.length < 2) { errors.push("Need at least a header and one data row"); return { rows: [], errors }; }

  const headerRaw = raw[0].map((h: any) => String(h || "").trim());
  const colMapping: (string | null)[] = headerRaw.map(normalizeColumnName);

  if (!colMapping.includes("name")) {
    errors.push("Missing required 'name' column. Expected one of: name, whisky, expression, bezeichnung, titel");
    return { rows: [], errors };
  }

  const rows: Record<string, any>[] = [];
  for (let i = 1; i < raw.length; i++) {
    const dataRow = raw[i];
    if (!dataRow || dataRow.every((c: any) => !c && c !== 0)) continue;

    const obj: Record<string, any> = {};
    for (let j = 0; j < colMapping.length; j++) {
      const field = colMapping[j];
      if (!field) continue;
      const val = dataRow[j];
      if (val === undefined || val === null || val === "") continue;
      obj[field] = String(val).trim();
    }

    if (!obj.name) {
      errors.push(`Row ${i + 1}: missing name, skipped`);
      continue;
    }

    if (obj.abv) {
      const parsed = parseFloat(String(obj.abv).replace(",", ".").replace("%", ""));
      obj.abv = isNaN(parsed) ? null : parsed;
    }
    if (obj.ppm) {
      const parsed = parseFloat(String(obj.ppm).replace(",", "."));
      obj.ppm = isNaN(parsed) ? null : parsed;
    }
    if (obj.sortOrder) {
      const parsed = parseInt(String(obj.sortOrder), 10);
      obj.sortOrder = isNaN(parsed) ? i : parsed;
    } else {
      obj.sortOrder = i;
    }

    rows.push(obj);
  }

  return { rows, errors };
}

async function downloadImageFromUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.some(a => contentType.includes(a))) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 5 * 1024 * 1024) return null;

    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    else if (contentType.includes("gif")) ext = ".gif";

    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(uploadsDir, filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch {
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ===== HEALTH & VERSION =====

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/version", (_req, res) => {
    const info = getVersionInfo();
    res.json(info);
  });

  // ===== PARTICIPANTS =====
  
  app.post("/api/participants", async (req, res) => {
    try {
      const data = insertParticipantSchema.parse(req.body);
      const existing = await storage.getParticipantByName(data.name);
      if (existing) {
        if (data.pin && existing.pin && data.pin !== existing.pin) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
        return res.json(existing);
      }
      const participant = await storage.createParticipant(data);
      res.status(201).json(participant);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id", async (req, res) => {
    const participant = await storage.getParticipant(req.params.id);
    if (!participant) return res.status(404).json({ message: "Not found" });
    res.json(participant);
  });

  app.patch("/api/participants/:id/language", async (req, res) => {
    const { language } = req.body;
    const updated = await storage.updateParticipantLanguage(req.params.id, language);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // ===== TASTINGS =====

  app.get("/api/tastings", async (_req, res) => {
    const all = await storage.getAllTastings();
    res.json(all);
  });

  app.get("/api/tastings/:id", async (req, res) => {
    const tasting = await storage.getTasting(req.params.id);
    if (!tasting) return res.status(404).json({ message: "Not found" });
    res.json(tasting);
  });

  app.get("/api/tastings/code/:code", async (req, res) => {
    const tasting = await storage.getTastingByCode(req.params.code);
    if (!tasting) return res.status(404).json({ message: "Not found" });
    res.json(tasting);
  });

  app.post("/api/tastings", async (req, res) => {
    try {
      const data = insertTastingSchema.parse(req.body);
      const tasting = await storage.createTasting(data);
      res.status(201).json(tasting);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/tastings/:id/status", async (req, res) => {
    const { status, currentAct } = req.body;
    const validStatuses = ["draft", "open", "closed", "reveal", "archived"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const updated = await storage.updateTastingStatus(req.params.id, status, currentAct);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.patch("/api/tastings/:id/reflection", async (req, res) => {
    const { reflection } = req.body;
    const updated = await storage.updateTastingReflection(req.params.id, reflection);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  // ===== TASTING PARTICIPANTS =====

  app.get("/api/tastings/:id/participants", async (req, res) => {
    const list = await storage.getTastingParticipants(req.params.id);
    res.json(list);
  });

  app.post("/api/tastings/:id/join", async (req, res) => {
    try {
      const { participantId } = req.body;
      const tastingId = req.params.id;

      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const already = await storage.isParticipantInTasting(tastingId, participantId);
      if (already) return res.json({ message: "Already joined" });

      const tp = await storage.addParticipantToTasting({ tastingId, participantId });
      res.status(201).json(tp);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ===== WHISKIES =====

  app.get("/api/tastings/:id/whiskies", async (req, res) => {
    const list = await storage.getWhiskiesForTasting(req.params.id);
    res.json(list);
  });

  app.post("/api/whiskies", async (req, res) => {
    try {
      const data = insertWhiskySchema.parse(req.body);
      const whisky = await storage.createWhisky(data);
      res.status(201).json(whisky);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/whiskies/:id", async (req, res) => {
    const updated = await storage.updateWhisky(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.patch("/api/tastings/:id/reorder", async (req, res) => {
    try {
      const tastingId = req.params.id;
      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      
      const { order } = req.body;
      if (!Array.isArray(order)) return res.status(400).json({ message: "Invalid order data" });
      
      for (const item of order) {
        await storage.updateWhisky(item.id, { sortOrder: item.sortOrder });
      }
      
      const updated = await storage.getWhiskiesForTasting(tastingId);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/whiskies/:id", async (req, res) => {
    try {
      const whisky = await storage.getWhisky(req.params.id);
      if (!whisky) return res.status(404).json({ message: "Not found" });
      if (whisky.imageUrl) {
        const filePath = path.join(process.cwd(), whisky.imageUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await storage.deleteWhisky(req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/whiskies/:id/image", (req: any, res: any, next: any) => {
    upload.single("image")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: "Image must be under 2 MB / Bild muss kleiner als 2 MB sein" });
        }
        if (err.message) {
          return res.status(415).json({ message: err.message });
        }
        return res.status(400).json({ message: "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      const imageUrl = `/uploads/${req.file.filename}`;
      const updated = await storage.updateWhisky(req.params.id, { imageUrl });
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/whiskies/:id/image", async (req, res) => {
    const whisky = await storage.getWhisky(req.params.id);
    if (!whisky) return res.status(404).json({ message: "Not found" });
    if (whisky.imageUrl) {
      const filePath = path.join(process.cwd(), whisky.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const updated = await storage.updateWhisky(req.params.id, { imageUrl: null });
    res.json(updated);
  });

  app.use("/uploads", express.static(uploadsDir));

  // ===== FLIGHT IMPORT =====

  function sanitizeForMatch(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function matchImageToRow(
    row: { name?: string; distillery?: string; imageRef?: string },
    imageFileNames: string[]
  ): { matched: string | null; method: string | null } {
    if (row.imageRef && !/^https?:\/\//i.test(row.imageRef)) {
      const refLower = row.imageRef.toLowerCase();
      const exact = imageFileNames.find(f => f.toLowerCase() === refLower);
      if (exact) return { matched: exact, method: "filename" };
      const noExt = refLower.replace(/\.[^.]+$/, "");
      const byBasename = imageFileNames.find(f => f.toLowerCase().replace(/\.[^.]+$/, "") === noExt);
      if (byBasename) return { matched: byBasename, method: "filename" };
    }

    if (row.name) {
      const sanitized = sanitizeForMatch(row.name);
      const byName = imageFileNames.find(f => sanitizeForMatch(f.replace(/\.[^.]+$/, "")) === sanitized);
      if (byName) return { matched: byName, method: "name" };
    }

    if (row.distillery && row.name) {
      const combo = sanitizeForMatch(row.distillery + row.name);
      const byCombo = imageFileNames.find(f => sanitizeForMatch(f.replace(/\.[^.]+$/, "")) === combo);
      if (byCombo) return { matched: byCombo, method: "name" };
    }

    return { matched: null, method: null };
  }

  app.post("/api/tastings/:id/import/parse", importUpload.fields([
    { name: "spreadsheet", maxCount: 1 },
    { name: "images", maxCount: 50 },
  ]), async (req: any, res: any) => {
    try {
      const files = req.files as Record<string, any[]>;
      const spreadsheetFile = files?.spreadsheet?.[0];
      if (!spreadsheetFile) return res.status(400).json({ message: "No spreadsheet file provided" });

      const buffer = fs.readFileSync(spreadsheetFile.path);
      const { rows, errors } = parseSpreadsheetRows(buffer, spreadsheetFile.originalname);

      const imageFiles: string[] = [];
      if (files?.images) {
        for (const f of files.images) {
          if (/\.(jpe?g|png|webp|gif)$/i.test(f.originalname)) {
            imageFiles.push(f.originalname);
          }
        }
      }

      const preview = rows.map((row, idx) => {
        const rowErrors: string[] = [];
        if (!row.name) rowErrors.push("Missing name");

        let imageStatus: string | null = null;
        let matchedImage: string | null = null;

        if (row.imageRef && /^https?:\/\//i.test(row.imageRef)) {
          imageStatus = "url";
        } else if (imageFiles.length > 0) {
          const match = matchImageToRow(row, imageFiles);
          if (match.matched) {
            imageStatus = match.method === "filename" ? "file" : "auto";
            matchedImage = match.matched;
          } else if (row.imageRef) {
            imageStatus = "missing";
          }
        } else if (row.imageRef && !/^https?:\/\//i.test(row.imageRef)) {
          imageStatus = "missing";
        }

        return { ...row, _row: idx + 2, _errors: rowErrors, _imageStatus: imageStatus, _matchedImage: matchedImage };
      });

      fs.unlinkSync(spreadsheetFile.path);
      if (files?.images) {
        for (const f of files.images) {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
      }

      res.json({ preview, parseErrors: errors, uploadedImages: imageFiles });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Failed to parse file" });
    }
  });

  app.post("/api/tastings/:id/import/confirm", importUpload.fields([
    { name: "spreadsheet", maxCount: 1 },
    { name: "images", maxCount: 50 },
  ]), async (req: any, res: any) => {
    try {
      const tastingId = req.params.id;
      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const files = req.files as Record<string, any[]>;
      const spreadsheetFile = files?.spreadsheet?.[0];
      if (!spreadsheetFile) return res.status(400).json({ message: "No spreadsheet file provided" });

      const buffer = fs.readFileSync(spreadsheetFile.path);
      const { rows, errors: parseErrors } = parseSpreadsheetRows(buffer, spreadsheetFile.originalname);

      let imageMappingRaw: Record<string, string> = {};
      try {
        if (req.body?.imageMapping) {
          imageMappingRaw = JSON.parse(req.body.imageMapping);
        }
      } catch { /* ignore */ }

      const imageFileMap: Map<string, string> = new Map();
      if (files?.images) {
        for (const f of files.images) {
          if (/\.(jpe?g|png|webp|gif)$/i.test(f.originalname)) {
            imageFileMap.set(f.originalname.toLowerCase(), f.path);
          }
        }
      }

      const results: { row: number; name: string; success: boolean; error?: string; id?: string; imageAttached?: boolean }[] = [];
      const existingWhiskies = await storage.getWhiskiesForTasting(tastingId);
      const startOrder = existingWhiskies.length;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (!row.name) {
            results.push({ row: i + 2, name: "(empty)", success: false, error: "Missing name" });
            continue;
          }

          const imageRef = row.imageRef;
          delete row.imageRef;

          const whiskyData = {
            tastingId,
            name: row.name,
            distillery: row.distillery || null,
            age: row.age || null,
            abv: row.abv || null,
            type: row.type || null,
            notes: row.notes || null,
            sortOrder: row.sortOrder ?? (startOrder + i),
            category: row.category || null,
            region: row.region || null,
            abvBand: row.abvBand || null,
            ageBand: row.ageBand || null,
            caskInfluence: row.caskInfluence || null,
            peatLevel: row.peatLevel || null,
            ppm: row.ppm ? parseFloat(String(row.ppm).replace(",", ".")) : null,
            whiskybaseId: row.whiskybaseId || null,
          };

          const whisky = await storage.createWhisky(whiskyData);
          let imageAttached = false;

          const rowKey = String(i + 2);
          const mappedFilename = imageMappingRaw[rowKey];

          if (mappedFilename) {
            const filePath = imageFileMap.get(mappedFilename.toLowerCase());
            if (filePath && fs.existsSync(filePath)) {
              const ext = path.extname(mappedFilename).toLowerCase();
              const newFilename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
              const destPath = path.join(uploadsDir, newFilename);
              fs.copyFileSync(filePath, destPath);
              await storage.updateWhisky(whisky.id, { imageUrl: `/uploads/${newFilename}` });
              imageAttached = true;
            }
          }

          if (!imageAttached && imageRef && /^https?:\/\//i.test(imageRef)) {
            const imageUrl = await downloadImageFromUrl(imageRef);
            if (imageUrl) {
              await storage.updateWhisky(whisky.id, { imageUrl });
              imageAttached = true;
            }
          }

          results.push({ row: i + 2, name: row.name, success: true, id: whisky.id, imageAttached });
        } catch (e: any) {
          results.push({ row: i + 2, name: row.name || "(unknown)", success: false, error: e.message });
        }
      }

      fs.unlinkSync(spreadsheetFile.path);
      if (files?.images) {
        for (const f of files.images) {
          if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
        }
      }

      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      res.json({ results, successCount, errorCount, parseErrors });
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Import failed" });
    }
  });

  // ===== WHISKY OF THE DAY =====

  app.get("/api/whisky-of-the-day", async (_req, res) => {
    try {
      const allWhiskies = await storage.getAllWhiskies();
      if (allWhiskies.length === 0) return res.json(null);

      const today = new Date().toISOString().split("T")[0];
      let seed = 0;
      for (let i = 0; i < today.length; i++) seed = ((seed << 5) - seed + today.charCodeAt(i)) | 0;
      const idx = Math.abs(seed) % allWhiskies.length;
      const whisky = allWhiskies[idx];

      const whiskyRatings = await storage.getRatingsForWhisky(whisky.id);
      const count = whiskyRatings.length;

      let avgRating = 0;
      let categories = { nose: 0, taste: 0, finish: 0, balance: 0 };
      if (count > 0) {
        avgRating = Math.round((whiskyRatings.reduce((s, r) => s + r.overall, 0) / count) * 10) / 10;
        categories = {
          nose: Math.round((whiskyRatings.reduce((s, r) => s + r.nose, 0) / count) * 10) / 10,
          taste: Math.round((whiskyRatings.reduce((s, r) => s + r.taste, 0) / count) * 10) / 10,
          finish: Math.round((whiskyRatings.reduce((s, r) => s + r.finish, 0) / count) * 10) / 10,
          balance: Math.round((whiskyRatings.reduce((s, r) => s + r.balance, 0) / count) * 10) / 10,
        };
      }

      res.json({ whisky, avgRating, ratingCount: count, categories });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== RATINGS =====

  app.get("/api/whiskies/:id/ratings", async (req, res) => {
    const list = await storage.getRatingsForWhisky(req.params.id);
    res.json(list);
  });

  app.get("/api/tastings/:id/ratings", async (req, res) => {
    const list = await storage.getRatingsForTasting(req.params.id);
    res.json(list);
  });

  app.get("/api/ratings/:participantId/:whiskyId", async (req, res) => {
    const rating = await storage.getRatingByParticipantAndWhisky(req.params.participantId, req.params.whiskyId);
    if (!rating) return res.status(404).json({ message: "Not found" });
    res.json(rating);
  });

  app.post("/api/ratings", async (req, res) => {
    try {
      const data = insertRatingSchema.parse(req.body);

      // Check if the tasting is still open for ratings
      const tasting = await storage.getTasting(data.tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "open" && tasting.status !== "draft") {
        return res.status(403).json({ message: "Evaluation is locked" });
      }

      const rating = await storage.upsertRating(data);
      res.json(rating);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ===== ANALYTICS (for Reveal/Insight Mode) =====

  app.get("/api/tastings/:id/analytics", async (req, res) => {
    const tastingId = req.params.id;
    const tasting = await storage.getTasting(tastingId);
    if (!tasting) return res.status(404).json({ message: "Tasting not found" });

    // Only expose analytics when in reveal or archived
    if (tasting.status !== "reveal" && tasting.status !== "archived") {
      return res.status(403).json({ message: "Analytics not available in Ritual Mode" });
    }

    const allRatings = await storage.getRatingsForTasting(tastingId);
    const whiskyList = await storage.getWhiskiesForTasting(tastingId);

    const whiskyAnalytics = whiskyList.map(w => {
      const wr = allRatings.filter(r => r.whiskyId === w.id);
      const count = wr.length;
      if (count === 0) return { whisky: w, count: 0, avg: 0, median: 0, stdDev: 0, categories: {} };

      const overallScores = wr.map(r => r.overall).sort((a, b) => a - b);
      const avg = overallScores.reduce((a, b) => a + b, 0) / count;
      const median = count % 2 === 0 
        ? (overallScores[count / 2 - 1] + overallScores[count / 2]) / 2 
        : overallScores[Math.floor(count / 2)];
      const variance = overallScores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);

      const categoryAvg = (key: keyof typeof wr[0]) => {
        const vals = wr.map(r => r[key] as number);
        return vals.reduce((a, b) => a + b, 0) / count;
      };

      return {
        whisky: w,
        count,
        avg: Math.round(avg * 10) / 10,
        median: Math.round(median * 10) / 10,
        stdDev: Math.round(stdDev * 10) / 10,
        categories: {
          nose: Math.round(categoryAvg("nose") * 10) / 10,
          taste: Math.round(categoryAvg("taste") * 10) / 10,
          finish: Math.round(categoryAvg("finish") * 10) / 10,
          balance: Math.round(categoryAvg("balance") * 10) / 10,
        },
      };
    });

    // Sort by average for ranking
    const ranking = [...whiskyAnalytics].sort((a, b) => b.avg - a.avg);

    res.json({
      tasting,
      whiskyAnalytics,
      ranking,
      totalRatings: allRatings.length,
      participantCount: new Set(allRatings.map(r => r.participantId)).size,
    });
  });

  return httpServer;
}
