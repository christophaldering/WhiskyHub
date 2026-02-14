import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
// @ts-ignore
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
// @ts-ignore
import * as XLSX from "xlsx";
// @ts-ignore
import AdmZip from "adm-zip";
import { storage } from "./storage";
import { insertTastingSchema, insertWhiskySchema, insertRatingSchema, insertParticipantSchema, insertJournalEntrySchema, type Participant } from "@shared/schema";
import { z } from "zod";
import { APP_VERSION, getVersionInfo } from "@shared/version";
import { isSmtpConfigured, sendEmail, buildInviteEmail } from "./email";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";

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

const memUpload = multer({
  storage: multer.memoryStorage(),
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

async function uploadBufferToObjectStorage(
  objectStorage: ObjectStorageService,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const uploadURL = await objectStorage.getObjectEntityUploadURL();
  const resp = await fetch(uploadURL, {
    method: "PUT",
    body: buffer,
    headers: { "Content-Type": contentType },
  });
  if (!resp.ok) {
    throw new Error(`Object storage upload failed (${resp.status})`);
  }
  return objectStorage.normalizeObjectEntityPath(uploadURL);
}

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
  wb_score: "wbScore", "wb score": "wbScore", wbscore: "wbScore", whiskybase_score: "wbScore", "whiskybase score": "wbScore",
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

async function downloadImageFromUrl(url: string, objectStorage: ObjectStorageService): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") || "";
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.some(a => contentType.includes(a))) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 5 * 1024 * 1024) return null;

    const mimeType = contentType.split(";")[0].trim() || "image/jpeg";
    return await uploadBufferToObjectStorage(objectStorage, buffer, mimeType);
  } catch {
    return null;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const objectStorage = new ObjectStorageService();

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
        if (!data.pin) {
          return res.status(400).json({ message: "PIN is required" });
        }
        if (!existing.pin) {
          await storage.updateParticipantPin(existing.id, data.pin);
          const updated = await storage.getParticipant(existing.id);
          return res.json(updated);
        }
        if (data.pin !== existing.pin) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
        return res.json(existing);
      }
      if (!data.pin) {
        return res.status(400).json({ message: "PIN is required" });
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return res.status(400).json({ message: "A valid email is required" });
      }
      const participant = await storage.createParticipant(data);

      if (participant.email) {
        try {
          const friendEntries = await storage.getWhiskyFriendsByEmail(participant.email.toLowerCase());
          const existingPending = await storage.getPendingFriendRequests(participant.id);
          for (const entry of friendEntries) {
            if (entry.participantId === participant.id) continue;
            const owner = await storage.getParticipant(entry.participantId);
            if (owner) {
              const ownerEmail = (owner.email || "").toLowerCase();
              if (existingPending.some(p => p.email.toLowerCase() === ownerEmail)) continue;
              const nameParts = owner.name.trim().split(/\s+/);
              const firstName = nameParts[0] || owner.name;
              const lastName = nameParts.slice(1).join(" ") || "";
              await storage.createWhiskyFriend({
                participantId: participant.id,
                firstName,
                lastName,
                email: owner.email || "",
                status: "pending",
              });
            }
          }
        } catch (err) {
          console.error("Error creating reciprocal friends:", err);
        }
      }

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
    const { status, currentAct, hostId } = req.body;
    const validStatuses = ["draft", "open", "closed", "reveal", "archived", "deleted"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    if (status === "deleted" || status === "archived") {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Not found" });
      if (hostId && tasting.hostId !== hostId) {
        return res.status(403).json({ message: "Only the host can perform this action" });
      }
      if (status === "deleted" && tasting.status === "open") {
        return res.status(400).json({ message: "Cannot delete an active session. Close it first." });
      }
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

  app.patch("/api/tastings/:id/details", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId, ...details } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can edit tasting details" });
      const updated = await storage.updateTastingDetails(req.params.id, details);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/duplicate", async (req, res) => {
    try {
      const { hostId } = req.body;
      if (!hostId) return res.status(400).json({ message: "hostId required" });
      const participant = await storage.getParticipant(hostId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });
      const source = await storage.getTasting(req.params.id);
      if (!source) return res.status(404).json({ message: "Source tasting not found" });
      const newTasting = await storage.duplicateTasting(req.params.id, hostId);
      res.status(201).json(newTasting);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/tastings/:id", async (req, res) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const participant = await storage.getParticipant(participantId);
      if (!participant || participant.role !== "admin") {
        return res.status(403).json({ message: "Only admins can permanently delete sessions" });
      }
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "deleted") {
        return res.status(400).json({ message: "Only soft-deleted sessions can be permanently deleted" });
      }
      await storage.hardDeleteTasting(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
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
      if (whisky.imageUrl && whisky.imageUrl.startsWith("/uploads/")) {
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
    memUpload.single("image")(req, res, (err: any) => {
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
      const imageUrl = await uploadBufferToObjectStorage(objectStorage, req.file.buffer, req.file.mimetype);
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
    if (whisky.imageUrl && whisky.imageUrl.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), whisky.imageUrl);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    const updated = await storage.updateWhisky(req.params.id, { imageUrl: null });
    res.json(updated);
  });

  app.use("/uploads", express.static(uploadsDir));
  registerObjectStorageRoutes(app);

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
            wbScore: row.wbScore ? parseFloat(String(row.wbScore).replace(",", ".")) : null,
          };

          const whisky = await storage.createWhisky(whiskyData);
          let imageAttached = false;

          const rowKey = String(i + 2);
          const mappedFilename = imageMappingRaw[rowKey];

          if (mappedFilename) {
            const filePath = imageFileMap.get(mappedFilename.toLowerCase());
            if (filePath && fs.existsSync(filePath)) {
              const fileBuffer = fs.readFileSync(filePath);
              const ext = path.extname(mappedFilename).toLowerCase();
              let mimeType = "image/jpeg";
              if (ext === ".png") mimeType = "image/png";
              else if (ext === ".webp") mimeType = "image/webp";
              else if (ext === ".gif") mimeType = "image/gif";
              const imageUrl = await uploadBufferToObjectStorage(objectStorage, fileBuffer, mimeType);
              await storage.updateWhisky(whisky.id, { imageUrl });
              imageAttached = true;
            }
          }

          if (!imageAttached && imageRef && /^https?:\/\//i.test(imageRef)) {
            const imageUrl = await downloadImageFromUrl(imageRef, objectStorage);
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

  // ===== PROFILES =====

  app.get("/api/profiles/:participantId", async (req, res) => {
    try {
      const profile = await storage.getProfile(req.params.participantId);
      if (!profile) return res.json(null);
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/profiles/:participantId", async (req, res) => {
    try {
      const existing = await storage.getProfile(req.params.participantId);
      const data: any = {
        participantId: req.params.participantId,
        bio: req.body.bio || null,
        favoriteWhisky: req.body.favoriteWhisky || null,
        goToDram: req.body.goToDram || null,
        preferredRegions: req.body.preferredRegions || null,
        preferredPeatLevel: req.body.preferredPeatLevel || null,
        preferredCaskInfluence: req.body.preferredCaskInfluence || null,
      };
      if ("photoUrl" in req.body) {
        data.photoUrl = req.body.photoUrl || null;
      } else if (existing) {
        data.photoUrl = existing.photoUrl;
      }
      const profile = await storage.upsertProfile(data);
      res.json(profile);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/profiles/:participantId/photo", (req: any, res: any, next: any) => {
    memUpload.single("photo")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: "Image must be under 2 MB" });
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
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const photoUrl = await uploadBufferToObjectStorage(objectStorage, req.file.buffer, req.file.mimetype);
      const existing = await storage.getProfile(req.params.participantId);
      if (existing && existing.photoUrl && existing.photoUrl.startsWith("/uploads/")) {
        const oldPath = path.join(uploadsDir, path.basename(existing.photoUrl));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const profile = await storage.upsertProfile({
        participantId: req.params.participantId,
        photoUrl,
      });
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/profiles/:participantId/photo", async (req, res) => {
    try {
      const existing = await storage.getProfile(req.params.participantId);
      if (existing && existing.photoUrl && existing.photoUrl.startsWith("/uploads/")) {
        const oldPath = path.join(uploadsDir, path.basename(existing.photoUrl));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      const profile = await storage.upsertProfile({
        participantId: req.params.participantId,
        photoUrl: null,
      });
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PARTICIPANT UPDATE (email, name) =====

  app.patch("/api/participants/:id", async (req, res) => {
    try {
      const updates: any = {};
      if (req.body.name) updates.name = req.body.name;
      if (req.body.email !== undefined) updates.email = req.body.email;

      if (req.body.pin !== undefined) {
        if (!req.body.pin || req.body.pin.length < 4) {
          return res.status(400).json({ message: "PIN must be at least 4 characters" });
        }
        const existing = await storage.getParticipant(req.params.id);
        if (!existing) return res.status(404).json({ message: "Not found" });
        if (existing.pin) {
          if (!req.body.currentPin) {
            return res.status(400).json({ message: "Current PIN is required to change PIN" });
          }
          if (existing.pin !== req.body.currentPin) {
            return res.status(401).json({ message: "Current PIN is incorrect" });
          }
        }
        updates.pin = req.body.pin;
      }

      const participant = await storage.updateParticipant(req.params.id, updates);
      if (!participant) return res.status(404).json({ message: "Not found" });
      res.json(participant);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ===== WHISKY FRIENDS =====

  app.get("/api/participants/:id/friends", async (req, res) => {
    try {
      const friends = await storage.getWhiskyFriends(req.params.id);
      res.json(friends);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/:id/friends", async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      if (!firstName?.trim()) return res.status(400).json({ message: "First name is required" });
      if (!lastName?.trim()) return res.status(400).json({ message: "Last name is required" });
      if (!email?.trim()) return res.status(400).json({ message: "Email is required" });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });
      const normalizedEmail = email.trim().toLowerCase();

      const adder = await storage.getParticipant(req.params.id);
      if (adder && adder.email && adder.email.toLowerCase() === normalizedEmail) {
        return res.status(400).json({ message: "You cannot add yourself as a friend" });
      }

      const existingFriends = await storage.getWhiskyFriends(req.params.id);
      const pendingFriends = await storage.getPendingFriendRequests(req.params.id);
      const allEntries = [...existingFriends, ...pendingFriends];
      if (allEntries.some(f => f.email.toLowerCase() === normalizedEmail)) {
        return res.status(400).json({ message: "This person is already in your friends list" });
      }

      const friend = await storage.createWhiskyFriend({
        participantId: req.params.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        status: "accepted",
      });

      try {
        const targetUser = await storage.getParticipantByEmail(normalizedEmail);
        if (targetUser && targetUser.id !== req.params.id) {
          const targetFriends = await storage.getWhiskyFriends(targetUser.id);
          const targetPending = await storage.getPendingFriendRequests(targetUser.id);
          const targetAll = [...targetFriends, ...targetPending];
          const adderEmail = adder?.email?.toLowerCase() || "";
          if (!targetAll.some(f => f.email.toLowerCase() === adderEmail)) {
            const nameParts = (adder?.name || "").trim().split(/\s+/);
            await storage.createWhiskyFriend({
              participantId: targetUser.id,
              firstName: nameParts[0] || adder?.name || "",
              lastName: nameParts.slice(1).join(" ") || "",
              email: adder?.email || "",
              status: "pending",
            });
          }
        }
      } catch (err) {
        console.error("Error creating pending reciprocal friend:", err);
      }

      res.status(201).json(friend);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/participants/:participantId/friends/:friendId", async (req, res) => {
    try {
      const { firstName, lastName, email } = req.body;
      if (!firstName?.trim()) return res.status(400).json({ message: "First name is required" });
      if (!lastName?.trim()) return res.status(400).json({ message: "Last name is required" });
      if (!email?.trim()) return res.status(400).json({ message: "Email is required" });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) return res.status(400).json({ message: "Invalid email format" });
      const friend = await storage.updateWhiskyFriend(req.params.friendId, req.params.participantId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
      });
      if (!friend) return res.status(404).json({ message: "Friend not found" });
      res.json(friend);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/participants/:participantId/friends/:friendId", async (req, res) => {
    try {
      await storage.deleteWhiskyFriend(req.params.friendId, req.params.participantId);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id/friends/pending", async (req, res) => {
    try {
      const pending = await storage.getPendingFriendRequests(req.params.id);
      res.json(pending);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/:participantId/friends/:friendId/accept", async (req, res) => {
    try {
      const accepted = await storage.acceptFriendRequest(req.params.friendId, req.params.participantId);
      if (!accepted) return res.status(404).json({ message: "Pending request not found" });
      res.json(accepted);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/:participantId/friends/:friendId/decline", async (req, res) => {
    try {
      await storage.declineFriendRequest(req.params.friendId, req.params.participantId);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== SESSION INVITES =====

  app.get("/api/tastings/:id/invites", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const invites = await storage.getInvitesByTasting(req.params.id);
      res.json(invites);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/invites", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const { emails, personalNote } = req.body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "At least one email required" });
      }

      const host = await storage.getParticipant(tasting.hostId);
      const hostName = host?.name || "Your host";
      const smtpReady = isSmtpConfigured();
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      const results: { email: string; token: string; link: string; emailSent: boolean }[] = [];

      for (const email of emails) {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !trimmed.includes("@")) continue;

        const token = crypto.randomBytes(24).toString("hex");
        const invite = await storage.createInvite({
          tastingId: tasting.id,
          email: trimmed,
          token,
          personalNote: personalNote || null,
          status: "invited",
        });

        const link = `${baseUrl}/invite/${token}`;

        let emailSent = false;
        if (smtpReady) {
          const emailContent = buildInviteEmail({
            hostName,
            tastingTitle: tasting.title,
            tastingDate: tasting.date,
            tastingLocation: tasting.location,
            inviteLink: link,
            personalNote: personalNote || undefined,
          });
          emailSent = await sendEmail({
            to: trimmed,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        }

        results.push({ email: trimmed, token, link, emailSent });
      }

      res.json({ invites: results, smtpConfigured: smtpReady });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Invite not found or expired" });

      const tasting = await storage.getTasting(invite.tastingId);
      res.json({ invite, tasting });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      const invite = await storage.getInviteByToken(req.params.token);
      if (!invite) return res.status(404).json({ message: "Invite not found or expired" });

      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });

      await storage.updateInviteStatus(invite.id, "joined", new Date());

      const alreadyJoined = await storage.isParticipantInTasting(invite.tastingId, participantId);
      if (!alreadyJoined) {
        await storage.addParticipantToTasting({
          tastingId: invite.tastingId,
          participantId,
        });
      }

      const participant = await storage.getParticipant(participantId);
      if (participant && !participant.email) {
        await storage.updateParticipant(participantId, { email: invite.email });
      }

      res.json({ success: true, tastingId: invite.tastingId });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/smtp/status", async (_req, res) => {
    res.json({ configured: isSmtpConfigured() });
  });

  // ===== ATTENDEE ROSTER (participants + profiles) =====

  app.get("/api/tastings/:id/roster", async (req, res) => {
    try {
      const tps = await storage.getTastingParticipants(req.params.id);
      const roster = await Promise.all(
        tps.map(async (tp) => {
          const profile = await storage.getProfile(tp.participantId);
          return {
            id: tp.participantId,
            name: tp.participant.name,
            photoUrl: profile?.photoUrl || null,
            bio: profile?.bio || null,
            favoriteWhisky: profile?.favoriteWhisky || null,
            goToDram: profile?.goToDram || null,
            preferredRegions: profile?.preferredRegions || null,
            preferredPeatLevel: profile?.preferredPeatLevel || null,
            preferredCaskInfluence: profile?.preferredCaskInfluence || null,
            joinedAt: tp.joinedAt,
          };
        })
      );
      res.json(roster);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== BLIND MODE / REVEAL CONTROL =====

  app.patch("/api/tastings/:id/blind-mode", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can change blind mode settings" });
      const updates: any = {};
      if (req.body.blindMode !== undefined) updates.blindMode = req.body.blindMode;
      if (req.body.revealIndex !== undefined) updates.revealIndex = req.body.revealIndex;
      if (req.body.revealStep !== undefined) updates.revealStep = req.body.revealStep;
      if (req.body.reflectionEnabled !== undefined) updates.reflectionEnabled = req.body.reflectionEnabled;
      if (req.body.reflectionMode !== undefined) updates.reflectionMode = req.body.reflectionMode;
      if (req.body.reflectionVisibility !== undefined) updates.reflectionVisibility = req.body.reflectionVisibility;
      if (req.body.customPrompts !== undefined) updates.customPrompts = req.body.customPrompts;
      const updated = await storage.updateTastingBlindMode(req.params.id, updates);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/reveal-next", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can trigger reveals" });

      const whiskies = await storage.getWhiskiesForTasting(req.params.id);
      const totalExpressions = whiskies.length;
      if (totalExpressions === 0) return res.status(400).json({ message: "No expressions to reveal" });

      let revealIndex = tasting.revealIndex ?? 0;
      let revealStep = tasting.revealStep ?? 0;

      if (revealStep < 3) {
        revealStep++;
      } else {
        if (revealIndex < totalExpressions - 1) {
          revealIndex++;
          revealStep = 1;
        } else {
          return res.json({ ...tasting, revealIndex, revealStep, allRevealed: true });
        }
      }

      const updated = await storage.updateTastingBlindMode(req.params.id, { revealIndex, revealStep });
      const allRevealed = revealIndex >= totalExpressions - 1 && revealStep >= 3;
      res.json({ ...updated, allRevealed });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== DISCUSSION ENTRIES =====

  app.get("/api/tastings/:id/discussions", async (req, res) => {
    try {
      const entries = await storage.getDiscussionEntries(req.params.id);
      const participants = await storage.getTastingParticipants(req.params.id);
      const participantMap = new Map(participants.map(tp => [tp.participantId, tp.participant.name]));
      const enriched = entries.map(e => ({
        ...e,
        participantName: participantMap.get(e.participantId) || "Unknown",
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/discussions", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "open") return res.status(400).json({ message: "Discussion is only available during active sessions" });
      const { participantId, text } = req.body;
      if (!participantId || !text?.trim()) return res.status(400).json({ message: "participantId and text required" });
      const entry = await storage.createDiscussionEntry({ tastingId: req.params.id, participantId, text: text.trim() });
      const participant = await storage.getParticipant(participantId);
      res.json({ ...entry, participantName: participant?.name || "Unknown" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== REFLECTION ENTRIES =====

  app.get("/api/tastings/:id/reflections", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const entries = await storage.getReflectionEntries(req.params.id);
      const participants = await storage.getTastingParticipants(req.params.id);
      const participantMap = new Map(participants.map(tp => [tp.participantId, tp.participant.name]));
      const enriched = entries.map(e => ({
        ...e,
        participantName: e.isAnonymous ? null : (participantMap.get(e.participantId) || "Unknown"),
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/reflections", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "open") return res.status(400).json({ message: "Reflections only available during active sessions" });
      const { participantId, promptText, text, isAnonymous } = req.body;
      if (!participantId || !promptText || !text?.trim()) return res.status(400).json({ message: "participantId, promptText, and text required" });
      const entry = await storage.createReflectionEntry({
        tastingId: req.params.id,
        participantId,
        promptText,
        text: text.trim(),
        isAnonymous: isAnonymous || false,
      });
      const participant = await storage.getParticipant(participantId);
      res.json({ ...entry, participantName: isAnonymous ? null : (participant?.name || "Unknown") });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tastings/:id/reflections/mine/:participantId", async (req, res) => {
    try {
      const entries = await storage.getReflectionsByParticipant(req.params.id, req.params.participantId);
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== Journal Entries =====
  app.get("/api/journal/:participantId", async (req, res) => {
    try {
      const entries = await storage.getJournalEntries(req.params.participantId);
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/journal/:participantId/:id", async (req, res) => {
    try {
      const entry = await storage.getJournalEntry(req.params.id, req.params.participantId);
      if (!entry) return res.status(404).json({ message: "Journal entry not found" });
      res.json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/journal/:participantId", async (req, res) => {
    try {
      const parsed = insertJournalEntrySchema.parse({ ...req.body, participantId: req.params.participantId });
      const entry = await storage.createJournalEntry(parsed);
      res.status(201).json(entry);
    } catch (e: any) {
      if (e.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: e.errors });
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/journal/:participantId/:id", async (req, res) => {
    try {
      const allowed = ["title", "whiskyName", "distillery", "region", "age", "abv", "caskType", "noseNotes", "tasteNotes", "finishNotes", "personalScore", "mood", "occasion", "body"];
      const filtered: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) filtered[key] = req.body[key];
      }
      const entry = await storage.updateJournalEntry(req.params.id, req.params.participantId, filtered);
      if (!entry) return res.status(404).json({ message: "Journal entry not found" });
      res.json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/journal/:participantId/:id", async (req, res) => {
    try {
      await storage.deleteJournalEntry(req.params.id, req.params.participantId);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== FLAVOR PROFILE =====

  app.get("/api/participants/:id/flavor-profile", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const profile = await storage.getFlavorProfile(req.params.id);
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PARTICIPANT STATS (for badges) =====

  app.get("/api/participants/:id/stats", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const stats = await storage.getParticipantStats(req.params.id);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== FRIEND ACTIVITY FEED =====

  app.get("/api/participants/:id/friend-activity", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });

      const friends = await storage.getWhiskyFriends(req.params.id);
      const friendEmails = friends.map(f => f.email.toLowerCase());

      if (friendEmails.length === 0) {
        return res.json({ activities: [] });
      }

      const allParticipants = await Promise.all(
        friendEmails.map(email => storage.getParticipantByEmail(email))
      );
      const friendParticipants = allParticipants.filter(Boolean) as Participant[];
      const friendMap = new Map(friendParticipants.map(p => [p.id, p]));

      const activities: Array<{
        type: string;
        participantId: string;
        participantName: string;
        timestamp: string;
        details: Record<string, any>;
      }> = [];

      const allTastings = await storage.getAllTastings();

      for (const fp of friendParticipants) {
        const journalEntries = await storage.getJournalEntries(fp.id);
        for (const entry of journalEntries.slice(0, 5)) {
          activities.push({
            type: "journal",
            participantId: fp.id,
            participantName: fp.name,
            timestamp: entry.createdAt?.toISOString() || new Date().toISOString(),
            details: {
              title: entry.title,
              whiskyName: entry.whiskyName,
              distillery: entry.distillery,
              personalScore: entry.personalScore,
            },
          });
        }

        for (const tasting of allTastings) {
          const isIn = await storage.isParticipantInTasting(tasting.id, fp.id);
          if (isIn) {
            activities.push({
              type: "tasting",
              participantId: fp.id,
              participantName: fp.name,
              timestamp: tasting.createdAt?.toISOString() || tasting.date || new Date().toISOString(),
              details: {
                tastingId: tasting.id,
                title: tasting.title,
                date: tasting.date,
                location: tasting.location,
                status: tasting.status,
              },
            });
          }
        }
      }

      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      res.json({ activities: activities.slice(0, 30) });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTING CALENDAR =====

  app.get("/api/calendar", async (_req, res) => {
    try {
      const allTastings = await storage.getAllTastings();
      const calendarEvents = await Promise.all(
        allTastings.map(async (t) => {
          const host = await storage.getParticipant(t.hostId);
          const participants = await storage.getTastingParticipants(t.id);
          const whiskies = await storage.getWhiskiesForTasting(t.id);
          return {
            id: t.id,
            title: t.title,
            date: t.date,
            location: t.location,
            status: t.status,
            hostName: host?.name || "Unknown",
            participantCount: participants.length,
            whiskyCount: whiskies.length,
            code: t.code,
          };
        })
      );
      res.json(calendarEvents);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PARTICIPANT NOTES =====

  app.get("/api/tastings/:id/participant-notes", async (req, res) => {
    try {
      const tastingId = req.params.id;
      const participantId = req.query.participantId as string;
      if (!participantId) {
        return res.status(400).json({ message: "participantId query parameter is required" });
      }
      const [tasting, participant, whiskies, ratings] = await Promise.all([
        storage.getTasting(tastingId),
        storage.getParticipant(participantId),
        storage.getWhiskiesForTasting(tastingId),
        storage.getRatingsForTasting(tastingId),
      ]);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const participantRatings = ratings.filter(r => r.participantId === participantId);
      const whiskyMap = new Map(whiskies.map(w => [w.id, w]));
      const notes = participantRatings.map(r => {
        const whisky = whiskyMap.get(r.whiskyId);
        return {
          whisky: whisky ? { name: whisky.name, distillery: whisky.distillery, age: whisky.age, abv: whisky.abv, imageUrl: whisky.imageUrl, region: whisky.region } : null,
          rating: { nose: r.nose, taste: r.taste, finish: r.finish, balance: r.balance, overall: r.overall, notes: r.notes },
        };
      });
      res.json({
        tasting: { id: tasting.id, name: tasting.title, date: tasting.date },
        participant: { id: participant.id, name: participant.name },
        notes,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== HOST SUMMARY =====

  app.get("/api/hosts/:hostId/summary", async (req, res) => {
    try {
      const hostId = req.params.hostId;
      const allTastings = await storage.getAllTastings();
      const hostTastings = allTastings.filter(t => t.hostId === hostId);

      if (hostTastings.length === 0) {
        return res.json({
          totalTastings: 0,
          totalParticipants: 0,
          totalWhiskies: 0,
          averageScores: { nose: 0, taste: 0, finish: 0, balance: 0, overall: 0 },
          topWhiskies: [],
          recentTastings: [],
        });
      }

      const uniqueParticipantIds = new Set<string>();
      let totalWhiskies = 0;
      const allRatings: any[] = [];
      const whiskyTastingMap = new Map<string, { whisky: any; tastingTitle: string }>();

      const tastingData = await Promise.all(
        hostTastings.map(async (t) => {
          const [participants, whiskies, ratings] = await Promise.all([
            storage.getTastingParticipants(t.id),
            storage.getWhiskiesForTasting(t.id),
            storage.getRatingsForTasting(t.id),
          ]);
          participants.forEach(p => uniqueParticipantIds.add(p.participantId));
          totalWhiskies += whiskies.length;
          allRatings.push(...ratings);
          whiskies.forEach(w => whiskyTastingMap.set(w.id, { whisky: w, tastingTitle: t.title }));
          return { tasting: t, participantCount: participants.length };
        })
      );

      const scoreFields = ["nose", "taste", "finish", "balance", "overall"] as const;
      const averageScores: Record<string, number> = {};
      for (const field of scoreFields) {
        const vals = allRatings.map(r => r[field]).filter(v => v != null);
        averageScores[field] = vals.length > 0 ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : 0;
      }

      const whiskyScores = new Map<string, number[]>();
      for (const r of allRatings) {
        if (r.overall == null) continue;
        if (!whiskyScores.has(r.whiskyId)) whiskyScores.set(r.whiskyId, []);
        whiskyScores.get(r.whiskyId)!.push(r.overall);
      }
      const topWhiskies = Array.from(whiskyScores.entries())
        .map(([whiskyId, scores]) => {
          const info = whiskyTastingMap.get(whiskyId);
          const avgScore = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
          return {
            name: info?.whisky?.name || "Unknown",
            distillery: info?.whisky?.distillery || null,
            averageScore: avgScore,
            tastingTitle: info?.tastingTitle || "Unknown",
          };
        })
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 10);

      const recentTastings = tastingData
        .sort((a, b) => (b.tasting.date || "").localeCompare(a.tasting.date || ""))
        .slice(0, 10)
        .map(d => ({
          id: d.tasting.id,
          title: d.tasting.title,
          date: d.tasting.date,
          status: d.tasting.status,
          participantCount: d.participantCount,
        }));

      res.json({
        totalTastings: hostTastings.length,
        totalParticipants: uniqueParticipantIds.size,
        totalWhiskies,
        averageScores,
        topWhiskies,
        recentTastings,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTING RECAP =====

  app.get("/api/tastings/:id/recap", async (req, res) => {
    try {
      const tastingId = req.params.id;
      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const [host, participants, whiskies, ratings] = await Promise.all([
        storage.getParticipant(tasting.hostId),
        storage.getTastingParticipants(tastingId),
        storage.getWhiskiesForTasting(tastingId),
        storage.getRatingsForTasting(tastingId),
      ]);

      const whiskyMap = new Map(whiskies.map(w => [w.id, w]));
      const scoreFields = ["nose", "taste", "finish", "balance", "overall"] as const;

      const whiskyRatings = new Map<string, any[]>();
      for (const r of ratings) {
        if (!whiskyRatings.has(r.whiskyId)) whiskyRatings.set(r.whiskyId, []);
        whiskyRatings.get(r.whiskyId)!.push(r);
      }

      const whiskyStats = Array.from(whiskyRatings.entries()).map(([whiskyId, wRatings]) => {
        const whisky = whiskyMap.get(whiskyId);
        const overalls = wRatings.map(r => r.overall).filter((v: any) => v != null);
        const avgScore = overalls.length > 0 ? Math.round((overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length) * 10) / 10 : 0;
        const mean = overalls.length > 0 ? overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length : 0;
        const variance = overalls.length > 1 ? overalls.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) / overalls.length : 0;
        const stddev = Math.round(Math.sqrt(variance) * 10) / 10;
        return {
          whiskyId,
          name: whisky?.name || "Unknown",
          distillery: whisky?.distillery || null,
          imageUrl: whisky?.imageUrl || null,
          avgScore,
          stddev,
        };
      });

      const topRated = [...whiskyStats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 5).map(w => ({
        name: w.name,
        distillery: w.distillery,
        avgScore: w.avgScore,
        imageUrl: w.imageUrl,
      }));

      const mostDivisive = whiskyStats.length > 0
        ? [...whiskyStats].sort((a, b) => b.stddev - a.stddev)[0]
        : null;

      const overallAverages: Record<string, number> = {};
      for (const field of scoreFields) {
        const vals = ratings.map(r => r[field]).filter(v => v != null);
        overallAverages[field] = vals.length > 0 ? Math.round((vals.reduce((a: number, b: number) => a + b, 0) / vals.length) * 10) / 10 : 0;
      }

      const participantRatings = new Map<string, any[]>();
      for (const r of ratings) {
        if (!participantRatings.has(r.participantId)) participantRatings.set(r.participantId, []);
        participantRatings.get(r.participantId)!.push(r);
      }
      const participantHighlights = await Promise.all(
        Array.from(participantRatings.entries()).map(async ([pId, pRatings]) => {
          const participant = await storage.getParticipant(pId);
          const overalls = pRatings.map(r => r.overall).filter((v: any) => v != null);
          const avgScore = overalls.length > 0 ? Math.round((overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length) * 10) / 10 : 0;
          return {
            name: participant?.name || "Unknown",
            ratingsCount: pRatings.length,
            avgScore,
          };
        })
      );

      res.json({
        tasting: {
          id: tasting.id,
          title: tasting.title,
          date: tasting.date,
          location: tasting.location,
          status: tasting.status,
        },
        hostName: host?.name || "Unknown",
        participantCount: participants.length,
        whiskyCount: whiskies.length,
        topRated,
        mostDivisive: mostDivisive ? { name: mostDivisive.name, stddev: mostDivisive.stddev } : null,
        overallAverages,
        participantHighlights,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== SMART PAIRING SUGGESTIONS =====

  app.get("/api/tastings/:id/pairings", async (req, res) => {
    try {
      const tastingId = req.params.id;
      const lineupWhiskies = await storage.getWhiskiesForTasting(tastingId);

      const lineupRegions = new Set(lineupWhiskies.map(w => w.region).filter(Boolean));
      const lineupCasks = new Set(lineupWhiskies.map(w => w.caskInfluence).filter(Boolean));
      const lineupPeats = new Set(lineupWhiskies.map(w => w.peatLevel).filter(Boolean));
      const lineupIds = new Set(lineupWhiskies.map(w => w.id));

      const allWhiskies = await storage.getAllWhiskies();
      const candidates = allWhiskies.filter(w => !lineupIds.has(w.id));

      const scored = candidates.map(w => {
        let score = 0;
        const reasons: string[] = [];

        if (w.region && !lineupRegions.has(w.region)) {
          score += 3;
          reasons.push(`Adds ${w.region} region not yet in lineup`);
        }
        if (w.caskInfluence && !lineupCasks.has(w.caskInfluence)) {
          score += 2;
          reasons.push(`Brings ${w.caskInfluence} cask influence`);
        }
        if (w.peatLevel && !lineupPeats.has(w.peatLevel)) {
          score += 2;
          reasons.push(`Introduces ${w.peatLevel} peat level`);
        }

        if (w.region && lineupRegions.has(w.region) && w.caskInfluence && !lineupCasks.has(w.caskInfluence)) {
          score += 1;
          reasons.push(`Same region but different cask for comparison`);
        }

        if (reasons.length === 0) {
          reasons.push("Adds variety to the lineup");
        }

        return {
          id: w.id,
          name: w.name,
          distillery: w.distillery,
          region: w.region,
          caskInfluence: w.caskInfluence,
          peatLevel: w.peatLevel,
          abv: w.abv,
          age: w.age,
          imageUrl: w.imageUrl,
          score,
          reasons,
        };
      });

      const suggestions = scored.sort((a, b) => b.score - a.score).slice(0, 5);
      res.json(suggestions);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== GLOBAL LEADERBOARD =====

  app.get("/api/leaderboard", async (_req, res) => {
    try {
      const allTastings = await storage.getAllTastings();
      const allRatings: any[] = [];
      for (const t of allTastings) {
        const ratings = await storage.getRatingsForTasting(t.id);
        allRatings.push(...ratings);
      }

      const participantData = new Map<string, { ratings: any[] }>();
      for (const r of allRatings) {
        if (!participantData.has(r.participantId)) {
          participantData.set(r.participantId, { ratings: [] });
        }
        participantData.get(r.participantId)!.ratings.push(r);
      }

      const stats = await Promise.all(
        Array.from(participantData.entries()).map(async ([pId, data]) => {
          const participant = await storage.getParticipant(pId);
          const ratingsCount = data.ratings.length;
          const notesLengths = data.ratings.map(r => (r.notes || "").length);
          const avgNotesLength = Math.round(notesLengths.reduce((a: number, b: number) => a + b, 0) / ratingsCount);
          const overalls = data.ratings.map(r => r.overall).filter((v: any) => v != null);
          const avgScore = overalls.length > 0 ? Math.round((overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length) * 10) / 10 : 0;

          let consistency = 0;
          if (overalls.length > 1) {
            const mean = overalls.reduce((a: number, b: number) => a + b, 0) / overalls.length;
            const variance = overalls.reduce((sum: number, v: number) => sum + (v - mean) ** 2, 0) / overalls.length;
            const stddev = Math.sqrt(variance);
            const normalizedStddev = mean > 0 ? stddev / mean : 0;
            consistency = Math.round((1 - Math.min(normalizedStddev, 1)) * 100) / 100;
          } else if (overalls.length === 1) {
            consistency = 1;
          }

          return {
            id: pId,
            name: participant?.name || "Unknown",
            ratingsCount,
            avgNotesLength,
            avgScore,
            consistency,
          };
        })
      );

      const mostActive = [...stats].sort((a, b) => b.ratingsCount - a.ratingsCount).slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        ratingsCount: s.ratingsCount,
      }));

      const mostDetailed = [...stats].sort((a, b) => b.avgNotesLength - a.avgNotesLength).slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        avgNotesLength: s.avgNotesLength,
      }));

      const highestRated = [...stats].sort((a, b) => b.avgScore - a.avgScore).slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        avgScore: s.avgScore,
      }));

      const mostConsistent = [...stats].sort((a, b) => b.consistency - a.consistency).slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        consistency: s.consistency,
      }));

      res.json({ mostActive, mostDetailed, highestRated, mostConsistent });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== ADMIN =====

  app.get("/api/admin/overview", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [allParticipants, allTastings] = await Promise.all([
        storage.getAllParticipants(),
        storage.getAllTastings(),
      ]);

      const hostIds = new Set(allTastings.map(t => t.hostId));

      const participantsWithStats = await Promise.all(
        allParticipants.map(async (p) => {
          const hostedTastings = allTastings.filter(t => t.hostId === p.id).length;
          return {
            id: p.id,
            name: p.name,
            email: p.email,
            role: p.role || "user",
            language: p.language,
            createdAt: p.createdAt,
            hostedTastings,
            isHost: hostIds.has(p.id),
          };
        })
      );

      const tastingsWithDetails = await Promise.all(
        allTastings.map(async (t) => {
          const host = allParticipants.find(p => p.id === t.hostId);
          const participants = await storage.getTastingParticipants(t.id);
          const whiskies = await storage.getWhiskiesForTasting(t.id);
          return {
            id: t.id,
            title: t.title,
            date: t.date,
            location: t.location,
            status: t.status,
            code: t.code,
            hostName: host?.name || "Unknown",
            hostId: t.hostId,
            participantCount: participants.length,
            whiskyCount: whiskies.length,
            blindMode: t.blindMode,
          };
        })
      );

      res.json({
        participants: participantsWithStats,
        tastings: tastingsWithDetails,
        stats: {
          totalParticipants: allParticipants.length,
          totalHosts: hostIds.size,
          totalTastings: allTastings.length,
          totalAdmins: allParticipants.filter(p => p.role === "admin").length,
        },
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/participants/:id/role", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { role } = req.body;
      if (!role || !["user", "admin", "host"].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be user, admin, or host." });
      }
      const updated = await storage.updateParticipantRole(req.params.id, role);
      if (!updated) return res.status(404).json({ message: "Participant not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/participants/:id", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (req.params.id === requesterId) {
        return res.status(400).json({ message: "Cannot delete yourself" });
      }
      await storage.deleteParticipant(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/tastings/:id", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      await storage.hardDeleteTasting(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
