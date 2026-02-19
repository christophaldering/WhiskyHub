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
import { insertTastingSchema, insertWhiskySchema, insertRatingSchema, insertParticipantSchema, insertJournalEntrySchema, insertBenchmarkEntrySchema, type Participant } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { APP_VERSION, getVersionInfo } from "@shared/version";
import { isSmtpConfigured, sendEmail, buildInviteEmail, buildVerificationEmail } from "./email";
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

const docUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [
      "application/pdf",
      "text/plain", "text/csv",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "image/jpeg", "image/png", "image/webp",
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Unsupported file type. Allowed: PDF, TXT, CSV, Excel, JPG, PNG, WebP"));
  },
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
      const ADMIN_EMAIL = "christoph.aldering@googlemail.com";
      const existing = await storage.getParticipantByName(data.name);
      if (existing) {
        if (!data.pin) {
          return res.status(400).json({ message: "PIN is required" });
        }
        if (!existing.pin) {
          await storage.updateParticipantPin(existing.id, data.pin);
          if (existing.email?.toLowerCase() === ADMIN_EMAIL && existing.role !== "admin") {
            await storage.updateParticipantRole(existing.id, "admin");
          }
          const updated = await storage.getParticipant(existing.id);
          return res.json(updated);
        }
        if (data.pin !== existing.pin) {
          return res.status(401).json({ message: "Invalid PIN" });
        }
        if (existing.email?.toLowerCase() === ADMIN_EMAIL && existing.role !== "admin") {
          await storage.updateParticipantRole(existing.id, "admin");
          const updated = await storage.getParticipant(existing.id);
          return res.json(updated);
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

      if (participant.email?.toLowerCase() === ADMIN_EMAIL && participant.role !== "admin") {
        await storage.updateParticipantRole(participant.id, "admin");
      }

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

      if (participant.email) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiry = new Date(Date.now() + 15 * 60 * 1000);
        await storage.setVerificationCode(participant.id, code, expiry);
        const emailContent = buildVerificationEmail({ name: participant.name, code });
        sendEmail({ to: participant.email, ...emailContent }).catch(err =>
          console.error("Failed to send verification email:", err)
        );
      }

      const finalParticipant = await storage.getParticipant(participant.id);
      res.status(201).json(finalParticipant);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/participants/guest", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 1) {
        return res.status(400).json({ message: "Name is required" });
      }
      const existing = await storage.getParticipantByName(name.trim());
      if (existing) {
        if (existing.pin) {
          return res.status(409).json({ message: "This name is already taken by a registered user. Please sign in or choose a different name." });
        }
        return res.json({ id: existing.id, name: existing.name, role: existing.role, canAccessWhiskyDb: existing.canAccessWhiskyDb || false, guest: true });
      }
      const participant = await storage.createParticipant({ name: name.trim() });
      res.status(201).json({ id: participant.id, name: participant.name, role: participant.role, canAccessWhiskyDb: participant.canAccessWhiskyDb || false, guest: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id", async (req, res) => {
    const participant = await storage.getParticipant(req.params.id);
    if (!participant) return res.status(404).json({ message: "Not found" });
    res.json(participant);
  });

  app.post("/api/participants/:id/verify", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) return res.status(400).json({ message: "Verification code is required" });
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      if (participant.emailVerified) return res.json(participant);
      if (!participant.verificationCode || !participant.verificationExpiry) {
        return res.status(400).json({ message: "No verification pending" });
      }
      if (new Date() > new Date(participant.verificationExpiry)) {
        return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
      }
      if (code !== participant.verificationCode) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      const verified = await storage.verifyEmail(participant.id);
      res.json(verified);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/:id/resend-verification", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      if (participant.emailVerified) return res.json({ message: "Already verified" });
      if (!participant.email) return res.status(400).json({ message: "No email on file" });
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await storage.setVerificationCode(participant.id, code, expiry);
      const emailContent = buildVerificationEmail({ name: participant.name, code });
      const sent = await sendEmail({ to: participant.email, ...emailContent });
      if (!sent) return res.status(500).json({ message: "Failed to send email. Please try again." });
      res.json({ message: "Verification code sent" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/participants/:id/language", async (req, res) => {
    const { language } = req.body;
    const updated = await storage.updateParticipantLanguage(req.params.id, language);
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  });

  app.post("/api/participants/forgot-pin", async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
      const participant = await storage.getParticipantByName(name.trim());
      if (!participant || !participant.email || participant.email.toLowerCase() !== email.trim().toLowerCase()) {
        return res.status(404).json({ message: "No account found with that name and email" });
      }
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = new Date(Date.now() + 15 * 60 * 1000);
      await storage.setVerificationCode(participant.id, code, expiry);
      const emailContent = buildVerificationEmail({ name: participant.name, code });
      sendEmail({ to: participant.email, ...emailContent }).catch(err =>
        console.error("Failed to send PIN reset email:", err)
      );
      res.json({ participantId: participant.id });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/reset-pin", async (req, res) => {
    try {
      const { participantId, code, newPin } = req.body;
      if (!participantId || !code || !newPin) return res.status(400).json({ message: "All fields are required" });
      if (newPin.length < 4) return res.status(400).json({ message: "PIN must be at least 4 characters" });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Not found" });
      if (!participant.verificationCode || participant.verificationCode !== code) {
        return res.status(400).json({ message: "Invalid verification code" });
      }
      if (participant.verificationExpiry && new Date() > new Date(participant.verificationExpiry)) {
        return res.status(400).json({ message: "Verification code has expired. Please request a new one." });
      }
      await storage.updateParticipantPin(participant.id, newPin);
      await storage.setVerificationCode(participant.id, "", new Date(0));
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTINGS =====

  app.get("/api/tastings", async (req, res) => {
    const participantId = req.query.participantId as string | undefined;
    if (!participantId) {
      return res.json([]);
    }
    const participant = await storage.getParticipant(participantId);
    if (!participant) {
      return res.json([]);
    }
    if (participant.role === "admin") {
      const all = await storage.getAllTastings();
      return res.json(all);
    }
    const filtered = await storage.getTastingsForParticipant(participantId);
    return res.json(filtered);
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

  app.post("/api/tastings/:id/cover-image", (req: any, res: any, next: any) => {
    memUpload.single("image")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ message: "Image must be under 2 MB" });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const hostId = req.body.hostId;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can update the cover image" });
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      const coverImageUrl = await uploadBufferToObjectStorage(objectStorage, req.file.buffer, req.file.mimetype);
      const updated = await storage.updateTastingDetails(req.params.id, { coverImageUrl });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.delete("/api/tastings/:id/cover-image", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can remove the cover image" });
      const updated = await storage.updateTastingDetails(req.params.id, { coverImageUrl: null });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/tastings/:id/cover-image-reveal", async (req: Request, res: Response) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId, revealed } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can toggle cover image visibility" });
      const updated = await storage.updateTastingDetails(req.params.id, { coverImageRevealed: !!revealed });
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

  app.post("/api/tastings/:id/transfer-host", async (req: Request, res: Response) => {
    try {
      const { hostId, newHostId } = req.body;
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.hostId !== hostId) return res.status(403).json({ message: "Only the current host can transfer host role" });
      if (!newHostId) return res.status(400).json({ message: "newHostId is required" });
      const newHost = await storage.getParticipant(newHostId);
      if (!newHost) return res.status(404).json({ message: "New host participant not found" });
      const updated = await storage.transferTastingHost(req.params.id, newHostId);
      res.json(updated);
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
      const { participantId, code } = req.body;
      const tastingId = req.params.id;

      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const already = await storage.isParticipantInTasting(tastingId, participantId);
      if (already) return res.json({ message: "Already joined" });

      if (tasting.hostId === participantId) {
        const tp = await storage.addParticipantToTasting({ tastingId, participantId });
        return res.status(201).json(tp);
      }

      const participant = await storage.getParticipant(participantId);
      if (participant?.role === "admin") {
        const tp = await storage.addParticipantToTasting({ tastingId, participantId });
        return res.status(201).json(tp);
      }

      const hasInvite = await storage.getInvitesByTasting(tastingId);
      const invited = hasInvite.some(inv =>
        inv.email && participant?.email && inv.email.toLowerCase() === participant.email.toLowerCase()
      );

      if (!invited && (!code || tasting.code !== code)) {
        return res.status(403).json({ message: "A valid session code or invitation is required to join" });
      }

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
      if (req.body.newsletterOptIn !== undefined) updates.newsletterOptIn = !!req.body.newsletterOptIn;

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

  // ===== PHOTO REVEAL (per-whisky and bulk) =====

  app.patch("/api/whiskies/:id/reveal-photo", async (req, res) => {
    try {
      const { hostId, revealed } = req.body;
      if (!hostId) return res.status(401).json({ message: "Not authenticated" });

      const whisky = await storage.getWhisky(req.params.id);
      if (!whisky) return res.status(404).json({ message: "Whisky not found" });

      const tasting = await storage.getTasting(whisky.tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.hostId !== hostId) return res.status(403).json({ message: "Only the host can reveal photos" });
      if (!tasting.blindMode) return res.status(400).json({ message: "Tasting is not in blind mode" });

      const updated = await storage.updateWhisky(req.params.id, { photoRevealed: revealed !== false });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/reveal-all-photos", async (req, res) => {
    try {
      const { hostId, revealed } = req.body;
      if (!hostId) return res.status(401).json({ message: "Not authenticated" });

      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.hostId !== hostId) return res.status(403).json({ message: "Only the host can reveal photos" });
      if (!tasting.blindMode) return res.status(400).json({ message: "Tasting is not in blind mode" });

      const tastingWhiskies = await storage.getWhiskiesForTasting(req.params.id);
      const revealValue = revealed !== false;
      const updated = await Promise.all(
        tastingWhiskies.map(w => storage.updateWhisky(w.id, { photoRevealed: revealValue }))
      );
      res.json({ count: updated.length, revealed: revealValue });
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

  // --- Tasting Reminders ---

  app.get("/api/reminders/:participantId", async (req: Request, res: Response) => {
    try {
      const reminders = await storage.getRemindersForParticipant(req.params.participantId as string);
      res.json(reminders);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/reminders/:participantId", async (req: Request, res: Response) => {
    try {
      const participantId = req.params.participantId as string;
      const VALID_OFFSETS = [30, 60, 360, 1440];
      const { tastingId, enabled, offsetMinutes } = req.body;
      const parsedOffset = Number(offsetMinutes);
      if (!VALID_OFFSETS.includes(parsedOffset)) {
        return res.status(400).json({ message: `offsetMinutes must be one of: ${VALID_OFFSETS.join(", ")}` });
      }
      if (typeof enabled !== "boolean" && enabled !== undefined) {
        return res.status(400).json({ message: "enabled must be a boolean" });
      }
      if (tastingId !== undefined && tastingId !== null && typeof tastingId !== "string") {
        return res.status(400).json({ message: "tastingId must be a string or null" });
      }
      const reminder = await storage.setReminder({
        participantId,
        tastingId: tastingId || null,
        enabled: enabled !== false,
        offsetMinutes: parsedOffset,
      });
      res.json(reminder);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/reminders/:participantId/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteReminder(req.params.id as string, req.params.participantId as string);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/reminders/:participantId/tasting/:tastingId", async (req: Request, res: Response) => {
    try {
      await storage.deleteRemindersForTasting(req.params.tastingId as string, req.params.participantId as string);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- Whiskybase Collection ---
  
  app.get("/api/collection/:participantId", async (req: Request, res: Response) => {
    try {
      const items = await storage.getWhiskybaseCollection(req.params.participantId as string);
      res.json(items);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collection/:participantId/import", docUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });
      
      const participantId = req.params.participantId as string;
      let rows: any[] = [];
      
      const fileName = file.originalname.toLowerCase();
      if (fileName.endsWith(".csv")) {
        const text = file.buffer.toString("utf-8");
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines.length < 2) return res.status(400).json({ error: "File is empty or has no data rows" });
        
        const headerLine = lines[0];
        const delimiter = headerLine.includes("\t") ? "\t" : headerLine.includes(";") ? ";" : ",";
        
        const parseCSVLine = (line: string, delim: string): string[] => {
          const result: string[] = [];
          let current = "";
          let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
                current += '"';
                i++;
              } else {
                inQuotes = !inQuotes;
              }
            } else if (char === delim && !inQuotes) {
              result.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          result.push(current.trim());
          return result;
        };
        
        const headers = parseCSVLine(headerLine, delimiter);
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = parseCSVLine(lines[i], delimiter);
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
          rows.push(row);
        }
      } else {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "" });
      }
      
      const colMap = (row: any, ...keys: string[]): string => {
        for (const key of keys) {
          if (row[key] !== undefined && row[key] !== "") return String(row[key]).trim();
        }
        return "";
      };
      
      const parseFloat2 = (val: string): number | null => {
        if (!val) return null;
        const cleaned = val.replace(",", ".");
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
      };
      
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      
      const existingItems = await storage.getWhiskybaseCollection(participantId as string);
      const existingMap = new Map(existingItems.map(item => [item.whiskybaseId, true]));
      
      for (const row of rows) {
        const whiskybaseId = colMap(row, "ID", "id");
        if (!whiskybaseId) { skipped++; continue; }
        
        const name = colMap(row, "Name", "name");
        if (!name) { skipped++; continue; }
        
        const isUpdate = existingMap.has(whiskybaseId);
        
        await storage.upsertWhiskybaseCollectionItem({
          participantId: participantId as string,
          whiskybaseId,
          collectionId: colMap(row, "Sammlungs-ID", "Collection ID", "Collection-ID") || null,
          brand: colMap(row, "Marke", "Brand") || null,
          name,
          bottlingSeries: colMap(row, "Abfüllserie", "Bottling serie", "Bottling series") || null,
          status: colMap(row, "Status", "status") || null,
          statedAge: colMap(row, "Deklariertes Alter", "Stated Age") || null,
          size: colMap(row, "Größe", "Size") || null,
          abv: colMap(row, "Stärke", "Strength") || null,
          unit: colMap(row, "Einheit", "Unit") || null,
          caskType: colMap(row, "Fasstyp", "Cask type") || null,
          communityRating: parseFloat2(colMap(row, "Bewertung", "Rating")),
          personalRating: parseFloat2(colMap(row, "Meine Bewertung", "My rating")),
          pricePaid: parseFloat2(colMap(row, "Bezahlter Preis", "Price paid")),
          currency: colMap(row, "Währung", "Currency") || null,
          avgPrice: parseFloat2(colMap(row, "Mittlerer preis", "Mittlerer Preis", "Average price")),
          avgPriceCurrency: (() => {
            const keys = Object.keys(row);
            const currencyKeys = keys.filter(k => k.toLowerCase().includes("währung") || k.toLowerCase().includes("currency"));
            return currencyKeys.length > 1 ? String(row[currencyKeys[1]] || "").trim() : colMap(row, "Währung Whisky", "Currency Whisky") || null;
          })(),
          distillery: colMap(row, "Destillerien", "Distilleries") || null,
          vintage: colMap(row, "Jahrgang", "Vintage") || null,
          addedAt: colMap(row, "Hinzugefügt am", "Added on") || null,
          imageUrl: colMap(row, "Bild", "Image") || null,
          auctionPrice: parseFloat2(colMap(row, "Auktionspreis:", "Auction price:", "Auktionspreis", "Auction price")),
          auctionCurrency: (() => {
            const keys = Object.keys(row);
            const currencyKeys = keys.filter(k => k.toLowerCase().includes("währung") || k.toLowerCase().includes("currency"));
            return currencyKeys.length > 2 ? String(row[currencyKeys[2]] || "").trim() : null;
          })(),
          notes: colMap(row, "Notizen", "Notes") || null,
          purchaseLocation: colMap(row, "Kaufort", "Purchase location") || null,
        });
        
        if (isUpdate) updated++;
        else imported++;
      }
      
      res.json({ imported, updated, skipped, total: rows.length });
    } catch (error: any) {
      console.error("Collection import error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/collection/:participantId/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteWhiskybaseCollectionItem(req.params.id as string, req.params.participantId as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collection/:participantId/:id/to-journal", async (req: Request, res: Response) => {
    try {
      const participantId = req.params.participantId as string;
      const id = req.params.id as string;
      const items = await storage.getWhiskybaseCollection(participantId);
      const item = items.find(i => i.id === id);
      if (!item) return res.status(404).json({ error: "Item not found" });
      
      const journalEntry = await storage.createJournalEntry({
        participantId: participantId as string,
        title: [item.brand, item.name].filter(Boolean).join(" - "),
        whiskyName: item.name,
        distillery: item.distillery || item.brand,
        region: null,
        age: item.statedAge,
        abv: item.abv,
        caskType: item.caskType,
        noseNotes: null,
        tasteNotes: null,
        finishNotes: null,
        personalScore: item.personalRating,
        whiskybaseId: item.whiskybaseId,
        wbScore: item.communityRating,
        mood: null,
        occasion: null,
        imageUrl: null,
        body: [
          item.bottlingSeries ? `Series: ${item.bottlingSeries}` : null,
          item.vintage ? `Vintage: ${item.vintage}` : null,
          item.status ? `Status: ${item.status}` : null,
          item.pricePaid ? `Price: ${item.pricePaid} ${item.currency || ""}` : null,
          item.notes || null,
        ].filter(Boolean).join("\n"),
      });
      
      res.json(journalEntry);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Journal Bottle Identification (must be before parameterized /api/journal/:participantId routes) =====
  app.post("/api/journal/identify-bottle", docUpload.single("photo"), async (req: Request, res: Response) => {
    try {
      const participantId = req.body.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const file = (req as any).file as Express.Multer.File;
      if (!file) return res.status(400).json({ message: "No photo uploaded" });

      const allWhiskies = await storage.getAllWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const dbWhiskyNames = Array.from(new Set(allWhiskies.map(w => w.name))).slice(0, 200);
      const benchmarkNames = Array.from(new Set(benchmarks.map(b => b.whiskyName))).slice(0, 200);
      const knownWhiskies = Array.from(new Set([...dbWhiskyNames, ...benchmarkNames]));

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const base64 = file.buffer.toString("base64");
      console.log(`Journal scan: file=${file.originalname}, size=${(file.size / 1024).toFixed(0)}KB, type=${file.mimetype}`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a whisky identification expert. Analyze the photo and identify ALL whiskies shown. The image may be:
- A whisky bottle or multiple bottles (read the labels carefully — zoom in on all text)
- A newspaper or magazine article/review about whiskies
- A tasting note card or scorecard
- A menu or price list featuring whiskies
- A screenshot of a website or social media post about whiskies
- Any other image containing whisky information

A single photo may show multiple bottles side by side, on a shelf, on a table, or in a collection. Identify EVERY distinct whisky you can see.

Read ALL text visible on each label or in the image. Pay close attention to:
- The brand name and expression name (e.g. "The GlenDronach Parliament")
- Age statement (look for "Aged X Years")
- ABV percentage (usually on the lower part of the label, e.g. "48% vol")
- Cask type / maturation info (e.g. "Oloroso and Pedro Ximenez Sherry Casks")
- Region of origin (e.g. "Highland Single Malt Scotch Whisky")
- Distillery name

You MUST return a JSON object with a "whiskies" array. Each element has these fields:
- whiskyName (string, required - full whisky name as on the label, including expression name)
- distillery (string or null)
- region (string or null, e.g. Islay, Speyside, Highland, Lowland, Campbeltown, Kentucky, Tennessee, Japan)
- country (string or null, e.g. Scotland, Ireland, Japan, USA, Taiwan)
- age (string or null, just the number e.g. "12", "18", "21", or "NAS")
- abv (string or null, e.g. "48.0" - look carefully on the label for the % vol)
- caskType (string or null, e.g. "Oloroso & PX Sherry Casks", "Bourbon Cask", "Sherry Cask", "Port Finish", "Ex-Bourbon")
- category (string or null, e.g. "Single Malt", "Blended Malt", "Bourbon", "Rye")
- whiskybaseUrl (string or null - if you know the Whiskybase URL or can construct it, provide it)
- whiskybaseSearch (string - a search query for Whiskybase to find this whisky, e.g. "GlenDronach 21 Parliament")
- confidence (string, "high", "medium", or "low")
- matchedExisting (string or null - if name closely matches one from the known whiskies list below, return the matched name exactly as listed)

Known whiskies in the database (try to match if possible):
${knownWhiskies.slice(0, 100).join(", ")}

IMPORTANT: Return {"whiskies": [...]} with an array of ALL whiskies found. If only one whisky is visible, return an array with one element. If you cannot identify any whisky, return {"whiskies": [{"whiskyName": "Unknown Whisky", "confidence": "low"}]}.`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64}`, detail: "high" } },
              { type: "text", text: "Identify ALL whiskies visible in this image. Read every word on each label carefully and extract all details including ABV, age, cask type, and region for each whisky." },
            ],
          },
        ],
        max_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content || "{}";
      console.log("Journal scan AI response:", content.substring(0, 500));
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        try {
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { whiskies: [{ whiskyName: "Unknown Whisky", confidence: "low" }] };
        } catch {
          parsed = { whiskies: [{ whiskyName: "Unknown Whisky", confidence: "low" }] };
        }
      }

      let identifiedList: any[] = [];
      if (Array.isArray(parsed.whiskies)) {
        identifiedList = parsed.whiskies;
      } else if (parsed.whiskyName) {
        identifiedList = [parsed];
      } else {
        identifiedList = [{ whiskyName: "Unknown Whisky", confidence: "low" }];
      }

      const results: any[] = [];
      for (let identified of identifiedList) {
        if (!identified.whiskyName) identified.whiskyName = "Unknown Whisky";

        const matchedWhisky = allWhiskies.find(w =>
          w.name.toLowerCase() === (identified.matchedExisting || identified.whiskyName || "").toLowerCase()
        );
        const matchedBenchmark = benchmarks.find(b =>
          b.whiskyName.toLowerCase() === (identified.matchedExisting || identified.whiskyName || "").toLowerCase()
        );

        if (matchedWhisky) {
          identified.distillery = identified.distillery || matchedWhisky.distillery;
          identified.region = identified.region || matchedWhisky.region;
          identified.country = identified.country || matchedWhisky.country;
          identified.age = identified.age || matchedWhisky.age;
          identified.abv = identified.abv || (matchedWhisky.abv ? String(matchedWhisky.abv) : null);
          identified.caskType = identified.caskType || matchedWhisky.caskInfluence;
          identified.matchedInDb = true;
        } else if (matchedBenchmark) {
          identified.distillery = identified.distillery || matchedBenchmark.distillery;
          identified.region = identified.region || matchedBenchmark.region;
          identified.country = identified.country || matchedBenchmark.country;
          identified.age = identified.age || matchedBenchmark.age;
          identified.abv = identified.abv || matchedBenchmark.abv;
          identified.caskType = identified.caskType || matchedBenchmark.caskType;
          identified.matchedInDb = true;
        }

        if (!identified.whiskybaseSearch) {
          identified.whiskybaseSearch = [identified.whiskyName, identified.distillery].filter(Boolean).join(" ");
        }

        results.push(identified);
      }

      res.json({ whiskies: results });
    } catch (e: any) {
      console.error("Journal bottle identify error:", e);
      res.status(500).json({ message: e.message || "Identification failed" });
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
      const allowed = ["title", "whiskyName", "distillery", "region", "age", "abv", "caskType", "noseNotes", "tasteNotes", "finishNotes", "personalScore", "mood", "occasion", "body", "imageUrl"];
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

  app.post("/api/journal/:participantId/:id/image", (req: any, res: any, next: any) => {
    memUpload.single("image")(req, res, (err: any) => {
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
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      const imageUrl = await uploadBufferToObjectStorage(objectStorage, req.file.buffer, req.file.mimetype);
      const entry = await storage.updateJournalEntry(req.params.id, req.params.participantId, { imageUrl });
      if (!entry) return res.status(404).json({ message: "Journal entry not found" });
      res.json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== WISHLIST =====

  app.get("/api/wishlist/:participantId", async (req, res) => {
    try {
      const entries = await storage.getWishlistEntries(req.params.participantId);
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/wishlist/:participantId", async (req, res) => {
    try {
      const data = { ...req.body, participantId: req.params.participantId };
      const entry = await storage.createWishlistEntry(data);
      res.status(201).json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/wishlist/:participantId/:id", async (req, res) => {
    try {
      const { whiskyName, distillery, region, age, abv, caskType, notes, priority, source } = req.body;
      const entry = await storage.updateWishlistEntry(req.params.id, req.params.participantId, {
        whiskyName, distillery, region, age, abv, caskType, notes, priority, source,
      });
      if (!entry) return res.status(404).json({ message: "Wishlist entry not found" });
      res.json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/wishlist/:participantId/:id", async (req, res) => {
    try {
      await storage.deleteWishlistEntry(req.params.id, req.params.participantId);
      res.status(204).end();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== WISHLIST PHOTO IDENTIFY =====

  app.post("/api/wishlist/identify", docUpload.single("photo"), async (req: Request, res: Response) => {
    try {
      const participantId = req.body.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const file = (req as any).file as Express.Multer.File;
      if (!file) return res.status(400).json({ message: "No photo uploaded" });

      const allWhiskies = await storage.getAllWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const dbWhiskyNames = Array.from(new Set(allWhiskies.map(w => w.name))).slice(0, 200);
      const benchmarkNames = Array.from(new Set(benchmarks.map(b => b.whiskyName))).slice(0, 200);
      const knownWhiskies = Array.from(new Set([...dbWhiskyNames, ...benchmarkNames]));

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const base64 = file.buffer.toString("base64");
      console.log(`Wishlist scan: file=${file.originalname}, size=${(file.size / 1024).toFixed(0)}KB, type=${file.mimetype}`);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a whisky identification expert. You will receive a photo that may be:
- A whisky bottle or multiple bottles (read the labels carefully — zoom in on all text)
- A newspaper or magazine article/review about whiskies
- A tasting note card or scorecard
- A menu or price list featuring whiskies
- A screenshot of a website or social media post about whiskies
- Any other image containing whisky information

A single photo may show multiple bottles side by side, on a shelf, on a table, or in a collection. Identify EVERY distinct whisky you can see.

Read ALL text visible on each label or in the image. Pay close attention to:
- The brand name and expression name
- Age statement (look for "Aged X Years")
- ABV percentage (usually on the lower part of the label)
- Cask type / maturation info
- Region of origin
- Distillery name

You MUST return a JSON object with a "whiskies" array. Each element has these fields:
- whiskyName (string, required - full whisky name including expression, e.g. "The GlenDronach Parliament Aged 21 Years")
- distillery (string or null - the distillery name, e.g. "GlenDronach")
- region (string or null, e.g. Islay, Speyside, Highland, Lowland, Campbeltown, Kentucky, Tennessee, Japan)
- country (string or null, e.g. Scotland, Ireland, Japan, USA, Taiwan)
- age (string or null, just the number e.g. "12", "18", "21", or "NAS" if no age statement)
- abv (string or null, e.g. "48.0" - look carefully on the label for the % vol)
- caskType (string or null, e.g. "Oloroso & PX Sherry Casks", "Bourbon Cask", "Sherry Cask", "Port Finish")
- category (string or null, e.g. "Single Malt", "Blended Malt", "Bourbon", "Rye", "Blended Scotch")
- notes (string or null - any tasting notes, review text, or interesting context from the source)
- source (string or null - describe what the image shows, e.g. "Bottle label", "Newspaper review", "Magazine article", "Menu")
- confidence (string, "high", "medium", or "low")
- matchedExisting (string or null - if name closely matches one from the known whiskies list below, return the matched name exactly as listed)
- whiskybaseSearch (string - a search query for Whiskybase to find this whisky, e.g. "GlenDronach 21 Parliament")
- whiskybaseUrl (string or null - if you know the Whiskybase URL, provide it. Format: https://www.whiskybase.com/whiskies/whisky/XXXXX)

Known whiskies in the database (try to match if possible):
${knownWhiskies.slice(0, 100).join(", ")}

IMPORTANT: Return {"whiskies": [...]} with an array of ALL whiskies found. If only one whisky is visible, return an array with one element. If you cannot identify any whisky, return {"whiskies": [{"whiskyName": "Unknown Whisky", "confidence": "low"}]}.`,
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64}`, detail: "high" } },
              { type: "text", text: "Identify ALL whiskies visible in this image. Read every word on each label or in the text carefully. Extract all whisky details you can find for each whisky." },
            ],
          },
        ],
        max_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content || "{}";
      console.log("Wishlist scan AI response:", content.substring(0, 500));
      let parsed: any;
      try {
        parsed = JSON.parse(content);
      } catch {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        try {
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { whiskies: [{ whiskyName: "Unknown Whisky", confidence: "low" }] };
        } catch {
          parsed = { whiskies: [{ whiskyName: "Unknown Whisky", confidence: "low" }] };
        }
      }

      let identifiedList: any[] = [];
      if (Array.isArray(parsed.whiskies)) {
        identifiedList = parsed.whiskies;
      } else if (parsed.whiskyName) {
        identifiedList = [parsed];
      } else {
        identifiedList = [{ whiskyName: "Unknown Whisky", confidence: "low" }];
      }

      const results: any[] = [];
      for (let identified of identifiedList) {
        if (!identified.whiskyName) identified.whiskyName = "Unknown Whisky";

        if (!identified.whiskybaseSearch) {
          identified.whiskybaseSearch = [identified.whiskyName, identified.distillery].filter(Boolean).join(" ");
        }

        const matchedWhisky = allWhiskies.find(w =>
          w.name.toLowerCase() === (identified.matchedExisting || identified.whiskyName || "").toLowerCase()
        );
        const matchedBenchmark = benchmarks.find(b =>
          b.whiskyName.toLowerCase() === (identified.matchedExisting || identified.whiskyName || "").toLowerCase()
        );

        if (matchedWhisky) {
          identified.distillery = identified.distillery || matchedWhisky.distillery;
          identified.region = identified.region || matchedWhisky.region;
          identified.country = identified.country || matchedWhisky.country;
          identified.age = identified.age || matchedWhisky.age;
          identified.abv = identified.abv || (matchedWhisky.abv ? String(matchedWhisky.abv) : null);
          identified.caskType = identified.caskType || matchedWhisky.caskInfluence;
          identified.matchedInDb = true;
        } else if (matchedBenchmark) {
          identified.distillery = identified.distillery || matchedBenchmark.distillery;
          identified.region = identified.region || matchedBenchmark.region;
          identified.country = identified.country || matchedBenchmark.country;
          identified.age = identified.age || matchedBenchmark.age;
          identified.abv = identified.abv || matchedBenchmark.abv;
          identified.caskType = identified.caskType || matchedBenchmark.caskType;
          identified.matchedInDb = true;
        }

        results.push(identified);
      }

      res.json({ whiskies: results });
    } catch (e: any) {
      console.error("Wishlist identify error:", e);
      res.status(500).json({ message: e.message || "Identification failed" });
    }
  });

  // ===== WISHLIST AI SUMMARY ("Why it's an interesting dram") =====

  app.post("/api/wishlist/generate-summary", async (req: Request, res: Response) => {
    try {
      const { participantId, whiskyName, distillery, region, age, abv, caskType, notes } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      if (!whiskyName) return res.status(400).json({ message: "whiskyName required" });

      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      let flavorProfile: any = null;
      try {
        flavorProfile = await storage.getFlavorProfile(participantId);
      } catch {}

      const profileContext = flavorProfile && flavorProfile.radar && flavorProfile.radar.length > 0
        ? `The taster's personal flavor profile (average scores out of 10):
${flavorProfile.radar.map((r: any) => `- ${r.dimension}: ${r.average}`).join("\n")}
${flavorProfile.topRegions?.length ? `Preferred regions: ${flavorProfile.topRegions.map((r: any) => r.region).join(", ")}` : ""}
${flavorProfile.topCaskTypes?.length ? `Preferred cask types: ${flavorProfile.topCaskTypes.map((c: any) => c.caskType).join(", ")}` : ""}
${flavorProfile.topWhiskies?.length ? `Top-rated whiskies: ${flavorProfile.topWhiskies.slice(0, 5).map((w: any) => `${w.name} (${w.score})`).join(", ")}` : ""}`
        : "The taster has no established flavor profile yet — they are exploring whisky.";

      const whiskyDesc = [
        whiskyName,
        distillery ? `Distillery: ${distillery}` : null,
        region ? `Region: ${region}` : null,
        age ? `Age: ${age} years` : null,
        abv ? `ABV: ${abv}%` : null,
        caskType ? `Cask: ${caskType}` : null,
        notes ? `Notes: ${notes}` : null,
      ].filter(Boolean).join("\n");

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable whisky sommelier. Given a whisky and a taster's personal flavor profile, write a brief, engaging summary (3-4 sentences max) explaining why this whisky is an interesting dram for THIS specific taster. Compare it to their known preferences — highlight what aligns with their taste, and what might be a new or exciting discovery. Be warm and encouraging, like a friend recommending a dram. Do not use bullet points. Write in flowing prose.`,
          },
          {
            role: "user",
            content: `Whisky on the wishlist:\n${whiskyDesc}\n\nTaster's profile:\n${profileContext}`,
          },
        ],
        max_tokens: 300,
      });

      const summary = response.choices[0]?.message?.content?.trim() || "";
      const summaryDate = new Date();

      res.json({ summary, summaryDate: summaryDate.toISOString() });
    } catch (e: any) {
      console.error("Wishlist summary error:", e);
      res.status(500).json({ message: e.message || "Summary generation failed" });
    }
  });

  app.post("/api/extract-whisky-text", async (req: Request, res: Response) => {
    try {
      const { text, participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      if (!text || typeof text !== "string" || text.trim().length < 3) return res.status(400).json({ message: "Text required (min 3 characters)" });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const allWhiskies = await storage.getAllWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const dbWhiskyNames = Array.from(new Set(allWhiskies.map(w => w.name))).slice(0, 200);
      const benchmarkNames = Array.from(new Set(benchmarks.map(b => b.whiskyName))).slice(0, 200);
      const knownWhiskies = Array.from(new Set([...dbWhiskyNames, ...benchmarkNames]));

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a whisky identification expert. Extract whisky details from the provided text. The text may be:
- A whisky name or description
- A review or tasting note
- A menu listing
- An article excerpt
- Any text mentioning a whisky

Return a JSON object with these fields:
- whiskyName (string, required - full whisky name)
- distillery (string or null)
- region (string or null, e.g. Islay, Speyside, Highland, Lowland, Campbeltown, Kentucky, Tennessee, Japan)
- country (string or null, e.g. Scotland, Ireland, Japan, USA, Taiwan)
- age (string or null, just the number e.g. "12", "18", or "NAS")
- abv (string or null, e.g. "46.0")
- caskType (string or null, e.g. "Bourbon Cask", "Sherry Cask", "Port Finish")
- category (string or null, e.g. "Single Malt", "Blended Malt", "Bourbon", "Rye", "Blended Scotch")
- notes (string or null - any tasting notes or interesting context extracted)
- source (string or null - describe where this info seems to come from)
- confidence (string, "high", "medium", or "low")
- matchedExisting (string or null - if name closely matches one from the known whiskies list below, return the matched name exactly as listed)
- whiskybaseSearch (string - a search query for Whiskybase to find this whisky, e.g. "GlenDronach 21 Parliament")
- whiskybaseUrl (string or null - if you know the Whiskybase URL, provide it. Format: https://www.whiskybase.com/whiskies/whisky/XXXXX)

Known whiskies in the database (try to match if possible):
${knownWhiskies.slice(0, 100).join(", ")}

Return ONLY valid JSON object. If you cannot identify any whisky, return {"whiskyName": "Unknown Whisky", "confidence": "low"}.`,
          },
          { role: "user", content: text.trim() },
        ],
        max_tokens: 512,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      let identified: any;
      try {
        identified = jsonMatch ? JSON.parse(jsonMatch[0]) : { whiskyName: "Unknown Whisky", confidence: "low" };
      } catch {
        identified = { whiskyName: "Unknown Whisky", confidence: "low" };
      }
      if (!identified.whiskyName) identified.whiskyName = "Unknown Whisky";

      if (!identified.whiskybaseSearch) {
        identified.whiskybaseSearch = [identified.whiskyName, identified.distillery].filter(Boolean).join(" ");
      }

      const matchedWhisky = allWhiskies.find(w =>
        w.name.toLowerCase() === (identified.matchedExisting || identified.whiskyName || "").toLowerCase()
      );
      const matchedBenchmark = benchmarks.find(b =>
        b.whiskyName.toLowerCase() === (identified.matchedExisting || identified.whiskyName || "").toLowerCase()
      );

      if (matchedWhisky) {
        identified.distillery = identified.distillery || matchedWhisky.distillery;
        identified.region = identified.region || matchedWhisky.region;
        identified.country = identified.country || matchedWhisky.country;
        identified.age = identified.age || matchedWhisky.age;
        identified.abv = identified.abv || (matchedWhisky.abv ? String(matchedWhisky.abv) : null);
        identified.caskType = identified.caskType || matchedWhisky.caskInfluence;
        identified.matchedInDb = true;
      } else if (matchedBenchmark) {
        identified.distillery = identified.distillery || matchedBenchmark.distillery;
        identified.region = identified.region || matchedBenchmark.region;
        identified.country = identified.country || matchedBenchmark.country;
        identified.age = identified.age || matchedBenchmark.age;
        identified.abv = identified.abv || matchedBenchmark.abv;
        identified.caskType = identified.caskType || matchedBenchmark.caskType;
        identified.matchedInDb = true;
      }

      res.json(identified);
    } catch (e: any) {
      console.error("Text extraction error:", e);
      res.status(500).json({ message: e.message || "Extraction failed" });
    }
  });

  // ===== RATING NOTES =====

  app.get("/api/participants/:id/rating-notes", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const notes = await storage.getRatingNotes(req.params.id);
      res.json(notes.filter(r => r.notes && r.notes.trim().length > 0));
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

  // ===== GLOBAL AVERAGES =====

  app.get("/api/flavor-profile/global", async (_req, res) => {
    try {
      const averages = await storage.getGlobalAverages();
      res.json(averages);
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
            canAccessWhiskyDb: p.canAccessWhiskyDb || false,
            newsletterOptIn: p.newsletterOptIn || false,
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

  app.patch("/api/admin/participants/:id/whisky-db-access", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { canAccess } = req.body;
      if (typeof canAccess !== "boolean") {
        return res.status(400).json({ message: "canAccess must be boolean" });
      }
      const result = await storage.updateWhiskyDbAccess(req.params.id, canAccess);
      if (!result) return res.status(404).json({ message: "Participant not found" });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/curation/suggestions", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const regionsParam = req.query.regions as string;
      const stylesParam = req.query.styles as string;
      const ageRange = req.query.ageRange as string;

      if (!participantId) return res.status(400).json({ message: "participantId required" });

      const allTastings = await storage.getAllTastings();
      const allWhiskies: any[] = [];

      for (const tasting of allTastings) {
        const whiskies = await storage.getWhiskiesForTasting(tasting.id);
        const ratings = await storage.getRatingsForTasting(tasting.id);

        for (const w of whiskies) {
          const whiskyRatings = ratings.filter(r => r.whiskyId === w.id);
          const overallScores = whiskyRatings.map(r => r.overall).filter((v): v is number => v != null);
          const avgScore = overallScores.length > 0 ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length : null;
          allWhiskies.push({
            id: w.id,
            name: w.name,
            distillery: w.distillery,
            age: w.age,
            abv: w.abv,
            region: w.region,
            caskInfluence: w.caskInfluence,
            peatLevel: w.peatLevel,
            imageUrl: w.imageUrl,
            tastingTitle: tasting.title,
            tastingDate: tasting.date,
            ratingCount: whiskyRatings.length,
            avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
          });
        }
      }

      let filtered = allWhiskies;
      if (regionsParam) {
        const regionKeys = regionsParam.split(",").map(r => r.toLowerCase());
        filtered = filtered.filter(w => {
          if (!w.region) return false;
          const wr = w.region.toLowerCase();
          return regionKeys.some(rk => wr.includes(rk));
        });
      }
      if (stylesParam) {
        const styleKeys = stylesParam.split(",").map(s => s.toLowerCase());
        filtered = filtered.filter(w => {
          const cask = (w.caskInfluence || "").toLowerCase();
          const peat = (w.peatLevel || "").toLowerCase();
          return styleKeys.some(sk => {
            if (sk.includes("peat") && peat !== "none" && peat !== "") return true;
            if (sk.includes("sherr") && cask.includes("sherr")) return true;
            if (sk.includes("bourbon") && cask.includes("bourbon")) return true;
            if (sk.includes("wine") && (cask.includes("wine") || cask.includes("port") || cask.includes("rum"))) return true;
            return false;
          });
        });
      }

      const unique = new Map<string, any>();
      for (const w of filtered) {
        const key = `${w.name}-${w.distillery}`;
        if (!unique.has(key) || (w.avgScore || 0) > (unique.get(key).avgScore || 0)) {
          unique.set(key, w);
        }
      }

      const results = Array.from(unique.values())
        .sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0))
        .slice(0, 20);

      res.json({ suggestions: results, totalMatches: unique.size });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/global-whisky-database", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester) return res.status(403).json({ message: "Access denied" });

      const allTastings = await storage.getAllTastings();
      const isAdmin = requester.role === "admin";
      const hasDbAccess = requester.canAccessWhiskyDb === true;
      if (!isAdmin && !hasDbAccess) {
        return res.status(403).json({ message: "Access denied. Admin approval required." });
      }

      const allWhiskies: any[] = [];
      for (const tasting of allTastings) {
        const whiskies = await storage.getWhiskiesForTasting(tasting.id);
        const ratings = await storage.getRatingsForTasting(tasting.id);
        const host = await storage.getParticipant(tasting.hostId);

        for (const w of whiskies) {
          const whiskyRatings = ratings.filter(r => r.whiskyId === w.id);
          const overallScores = whiskyRatings.map(r => r.overall).filter((v): v is number => v != null);
          const avgScore = overallScores.length > 0 ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length : null;
          allWhiskies.push({
            id: w.id,
            name: w.name,
            distillery: w.distillery,
            age: w.age,
            abv: w.abv,
            type: w.type,
            region: w.region,
            category: w.category,
            caskInfluence: w.caskInfluence,
            peatLevel: w.peatLevel,
            wbScore: w.wbScore,
            whiskybaseId: w.whiskybaseId,
            imageUrl: w.imageUrl,
            tastingId: tasting.id,
            tastingTitle: tasting.title,
            tastingDate: tasting.date,
            hostName: host?.name || "Unknown",
            ratingCount: whiskyRatings.length,
            avgScore: avgScore ? Math.round(avgScore * 10) / 10 : null,
          });
        }
      }

      res.json(allWhiskies);
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

  app.get("/api/admin/tasting-details/:id", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const [whiskiesData, ratingsData, participantsData, host] = await Promise.all([
        storage.getWhiskiesForTasting(tasting.id),
        storage.getRatingsForTasting(tasting.id),
        storage.getTastingParticipants(tasting.id),
        storage.getParticipant(tasting.hostId),
      ]);

      const allParticipants = await storage.getAllParticipants();
      const participantMap = new Map(allParticipants.map(p => [p.id, p.name]));

      const whiskyDetails = whiskiesData.map(w => {
        const wRatings = ratingsData.filter(r => r.whiskyId === w.id);
        const overallScores = wRatings.map(r => r.overall).filter((v): v is number => v != null);
        const avgOverall = overallScores.length > 0 ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length : null;

        return {
          id: w.id,
          name: w.name,
          distillery: w.distillery,
          age: w.age,
          abv: w.abv,
          region: w.region,
          caskInfluence: w.caskInfluence,
          peatLevel: w.peatLevel,
          imageUrl: w.imageUrl,
          avgOverall: avgOverall ? Math.round(avgOverall * 10) / 10 : null,
          ratingCount: wRatings.length,
          ratings: wRatings.map(r => ({
            participantName: participantMap.get(r.participantId) || "Unknown",
            participantId: r.participantId,
            nose: r.nose,
            taste: r.taste,
            finish: r.finish,
            balance: r.balance,
            overall: r.overall,
            notes: r.notes,
          })),
        };
      });

      res.json({
        id: tasting.id,
        title: tasting.title,
        date: tasting.date,
        location: tasting.location,
        status: tasting.status,
        hostName: host?.name || "Unknown",
        participantCount: participantsData.length,
        participants: participantsData.map(p => ({ id: p.id, name: p.name })),
        whiskies: whiskyDetails,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/all-journals", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [allEntries, allParticipants] = await Promise.all([
        storage.getAllJournalEntries(),
        storage.getAllParticipants(),
      ]);

      const participantMap = new Map(allParticipants.map(p => [p.id, p.name]));

      const entriesWithNames = allEntries.map(e => ({
        ...e,
        participantName: participantMap.get(e.participantId) || "Unknown",
      }));

      res.json(entriesWithNames);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/analytics", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [allTastings, allParticipants, allWhiskies, allRatings] = await Promise.all([
        storage.getAllTastings(),
        storage.getAllParticipants(),
        storage.getAllWhiskies(),
        storage.getAllRatings(),
      ]);

      const participantMap = new Map(allParticipants.map(p => [p.id, p.name]));
      const whiskyMap = new Map(allWhiskies.map(w => [w.id, w]));
      const tastingMap = new Map(allTastings.map(t => [t.id, t]));

      const scoreDistribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const participantRatings: Record<string, { name: string; count: number; totalScore: number; scores: number[] }> = {};
      const whiskyScores: Record<string, { name: string; distillery: string | null; scores: number[]; tastingTitle: string }> = {};

      for (const r of allRatings) {
        if (r.overall != null) {
          const bucket = Math.min(Math.floor(r.overall / 10), 9);
          scoreDistribution[bucket]++;

          const pName = participantMap.get(r.participantId) || "Unknown";
          if (!participantRatings[r.participantId]) {
            participantRatings[r.participantId] = { name: pName, count: 0, totalScore: 0, scores: [] };
          }
          participantRatings[r.participantId].count++;
          participantRatings[r.participantId].totalScore += r.overall;
          participantRatings[r.participantId].scores.push(r.overall);

          const w = whiskyMap.get(r.whiskyId);
          const t = tastingMap.get(r.tastingId);
          if (w) {
            if (!whiskyScores[r.whiskyId]) {
              whiskyScores[r.whiskyId] = { name: w.name, distillery: w.distillery, scores: [], tastingTitle: t?.title || "" };
            }
            whiskyScores[r.whiskyId].scores.push(r.overall);
          }
        }
      }

      const topWhiskies = Object.entries(whiskyScores)
        .map(([id, data]) => ({
          id,
          name: data.name,
          distillery: data.distillery,
          tastingTitle: data.tastingTitle,
          avgScore: Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 10) / 10,
          ratingCount: data.scores.length,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 20);

      const participantStats = Object.entries(participantRatings)
        .map(([id, data]) => {
          const avg = data.totalScore / data.count;
          const variance = data.scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / data.count;
          return {
            id,
            name: data.name,
            count: data.count,
            avgScore: Math.round(avg * 10) / 10,
            stdDev: Math.round(Math.sqrt(variance) * 10) / 10,
            minScore: Math.min(...data.scores),
            maxScore: Math.max(...data.scores),
          };
        })
        .sort((a, b) => b.count - a.count);

      const regionCounts: Record<string, number> = {};
      for (const w of allWhiskies) {
        if (w.region) regionCounts[w.region] = (regionCounts[w.region] || 0) + 1;
      }

      const tastingsPerMonth: Record<string, number> = {};
      for (const t of allTastings) {
        if (t.date) {
          const month = t.date.substring(0, 7);
          tastingsPerMonth[month] = (tastingsPerMonth[month] || 0) + 1;
        }
      }

      res.json({
        totalRatings: allRatings.length,
        totalWhiskies: allWhiskies.length,
        totalTastings: allTastings.length,
        totalParticipants: allParticipants.length,
        scoreDistribution: scoreDistribution.map((count, i) => ({
          range: `${i * 10}-${i * 10 + 9}`,
          count,
        })),
        topWhiskies,
        participantStats,
        regionCounts: Object.entries(regionCounts).sort((a, b) => b[1] - a[1]),
        tastingsPerMonth: Object.entries(tastingsPerMonth).sort((a, b) => a[0].localeCompare(b[0])),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ============================================================
  // NEWSLETTER MANAGEMENT (admin-only)
  // ============================================================

  app.get("/api/admin/newsletters", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      const requester = requesterId ? await storage.getParticipant(requesterId) : null;
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const all = await storage.getNewsletters();
      res.json(all);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.get("/api/admin/newsletters/:id/recipients", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      const requester = requesterId ? await storage.getParticipant(requesterId) : null;
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only" });
      const recipients = await storage.getNewsletterRecipients(req.params.id);
      res.json(recipients);
    } catch (e: any) { res.status(500).json({ message: e.message }); }
  });

  app.post("/api/admin/newsletters/generate", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      const requester = requesterId ? await storage.getParticipant(requesterId) : null;
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { type, customNotes } = req.body; // type: "welcome" | "update"
      const existingNewsletters = await storage.getNewsletters();
      const isFirstNewsletter = existingNewsletters.length === 0;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const featureList = `
Key CaskSense Features:
- Collaborative whisky tasting sessions with structured evaluation (nose, taste, finish, balance)
- Blind tasting mode with progressive reveal (name → metadata → image)
- Personal whisky journal with AI-powered bottle scanner (photo → auto-fill details)
- Achievement badges (37 milestones from beginner to expert)
- Personal flavor profile with radar charts and global comparison
- Whisky recommendations based on taste preferences
- Side-by-side whisky comparison with overlaid charts
- Tasting note generator with predefined flavor categories
- Interactive flavor wheel visualization
- Shared tasting calendar with upcoming events
- Friend activity feed and participant leaderboard
- Distillery encyclopedia with 100+ entries and interactive map
- Independent bottlers encyclopedia (20+ entries)
- Whisky lexicon with 53 bilingual entries
- Smart whisky pairing suggestions
- Tasting curation wizard for planning flights
- QR code invitations for sessions
- PDF export of tasting menus and personal notes
- Progressive Web App (installable on mobile)
- Ambient soundscapes (fireplace, rain, night)
- Dark/light theme support
- Whisky wishlist with AI scanning
- Host dashboard with analytics
- Benchmark analyzer for document analysis
- Newsletter system for community updates
- Multi-language support (English & German)
`;

      const systemPrompt = isFirstNewsletter || type === "welcome"
        ? `You are a copywriter for CaskSense, a sophisticated whisky tasting web application. Write a warm, engaging FIRST newsletter that introduces the platform to subscribers. The tone should be: friendly, passionate about whisky, slightly sophisticated but approachable — like a knowledgeable friend inviting you to discover something special. Keep it concise (300-400 words max). Use short paragraphs. Include a brief "What CaskSense offers" section highlighting 5-6 standout features. End with an inviting call to action. Write in a way that makes people excited to explore the platform. The subject line should be catchy and welcoming. Output as JSON with keys: "subject" (string) and "body" (string, HTML formatted with inline styles for email compatibility, using the CaskSense brand colors: dark slate #4a5568 for headings, warm amber accents).`
        : `You are a copywriter for CaskSense, a whisky tasting web application. Write a concise, engaging UPDATE newsletter informing subscribers about new features and improvements. The tone should be: enthusiastic but measured, informative, making each update feel valuable. Keep it under 300 words. Use bullet points or short sections for each feature. Include a brief intro, the updates, and a short closing. The subject line should hint at what's new. Output as JSON with keys: "subject" (string) and "body" (string, HTML formatted with inline styles for email compatibility, using brand colors: dark slate #4a5568 for headings, warm amber accents).`;

      const userMessage = customNotes
        ? `Here are the platform features:\n${featureList}\n\nAdditional notes from admin:\n${customNotes}`
        : `Here are the platform features:\n${featureList}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.8,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || "{}");
      res.json({ subject: result.subject || "CaskSense Newsletter", body: result.body || "" });
    } catch (e: any) {
      console.error("Newsletter AI generation error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/newsletters/send", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      const requester = requesterId ? await storage.getParticipant(requesterId) : null;
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const { subject, contentHtml, recipientIds } = req.body;
      if (!subject || !contentHtml || !recipientIds?.length) {
        return res.status(400).json({ message: "Subject, content, and recipients required" });
      }

      const allParticipants = await storage.getAllParticipants();
      const recipients = allParticipants.filter(p => recipientIds.includes(p.id) && p.email);

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No valid email recipients found" });
      }

      const emailWrapper = (body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f9f9f7;color:#333;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border:1px solid #e5e5e0;border-radius:4px;overflow:hidden;">
    <div style="padding:32px 32px 16px;border-bottom:1px solid #e5e5e0;">
      <h1 style="margin:0;font-size:24px;color:#4a5568;font-weight:700;letter-spacing:-0.5px;">CaskSense</h1>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a0aec0;">Newsletter</p>
    </div>
    <div style="padding:32px;">
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e5e0;background:#fafaf8;">
      <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">CaskSense — Where Tasting Becomes Reflection</p>
    </div>
  </div>
</body>
</html>`;

      const newsletter = await storage.createNewsletter({
        subject,
        contentHtml,
        contentText: null,
        recipientCount: recipients.length,
        sentAt: new Date(),
      });

      let sentCount = 0;
      const errors: string[] = [];

      for (const recipient of recipients) {
        try {
          const success = await sendEmail({
            to: recipient.email!,
            subject,
            html: emailWrapper(contentHtml),
          });
          if (success) sentCount++;
          else errors.push(`Failed: ${recipient.email}`);
        } catch (err: any) {
          errors.push(`Error for ${recipient.email}: ${err.message}`);
        }
      }

      await storage.addNewsletterRecipients(
        newsletter.id,
        recipients.map(r => ({ participantId: r.id, email: r.email! }))
      );

      res.json({
        newsletterId: newsletter.id,
        totalRecipients: recipients.length,
        sent: sentCount,
        errors,
      });
    } catch (e: any) {
      console.error("Newsletter send error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/newsletters/:id/resend", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      const requester = requesterId ? await storage.getParticipant(requesterId) : null;
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin only" });

      const newsletter = await storage.getNewsletter(req.params.id);
      if (!newsletter) return res.status(404).json({ message: "Newsletter not found" });

      const { recipientIds } = req.body;
      if (!recipientIds?.length) return res.status(400).json({ message: "Recipients required" });

      const allParticipants = await storage.getAllParticipants();
      const recipients = allParticipants.filter(p => recipientIds.includes(p.id) && p.email);

      if (recipients.length === 0) {
        return res.status(400).json({ message: "No valid email recipients found" });
      }

      const emailWrapper = (body: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:'Georgia',serif;background:#f9f9f7;color:#333;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border:1px solid #e5e5e0;border-radius:4px;overflow:hidden;">
    <div style="padding:32px 32px 16px;border-bottom:1px solid #e5e5e0;">
      <h1 style="margin:0;font-size:24px;color:#4a5568;font-weight:700;letter-spacing:-0.5px;">CaskSense</h1>
      <p style="margin:4px 0 0;font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#a0aec0;">Newsletter</p>
    </div>
    <div style="padding:32px;">
      ${body}
    </div>
    <div style="padding:16px 32px;border-top:1px solid #e5e5e0;background:#fafaf8;">
      <p style="margin:0;font-size:11px;color:#a0aec0;text-align:center;">CaskSense — Where Tasting Becomes Reflection</p>
    </div>
  </div>
</body>
</html>`;

      let sentCount = 0;
      for (const recipient of recipients) {
        try {
          const success = await sendEmail({
            to: recipient.email!,
            subject: newsletter.subject,
            html: emailWrapper(newsletter.contentHtml),
          });
          if (success) sentCount++;
        } catch {}
      }

      await storage.addNewsletterRecipients(
        newsletter.id,
        recipients.map(r => ({ participantId: r.id, email: r.email! }))
      );

      res.json({ sent: sentCount, totalRecipients: recipients.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ============================================================
  // BENCHMARK ANALYZER - Document upload + AI extraction
  // ============================================================

  async function verifyHostOrAdmin(participantId: string | undefined): Promise<{ participant: Participant; isHost: boolean; isAdmin: boolean } | null> {
    if (!participantId) return null;
    const participant = await storage.getParticipant(participantId);
    if (!participant) return null;
    const allTastings = await storage.getAllTastings();
    const isHost = allTastings.some(t => t.hostId === participantId);
    const isAdmin = participant.role === "admin";
    if (!isHost && !isAdmin) return null;
    return { participant, isHost, isAdmin };
  }

  // Get all benchmark entries
  app.get("/api/benchmark", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can access benchmark data" });

      const entries = await storage.getBenchmarkEntries();
      const enriched = await Promise.all(entries.map(async (entry) => {
        let uploaderName = null;
        if (entry.uploadedBy) {
          const uploader = await storage.getParticipant(entry.uploadedBy);
          uploaderName = uploader?.name || null;
        }
        return { ...entry, uploaderName };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Save approved benchmark entries (batch)
  app.post("/api/benchmark", async (req: Request, res: Response) => {
    try {
      const { entries, participantId } = req.body;
      if (!entries || !Array.isArray(entries) || !participantId) {
        return res.status(400).json({ message: "entries array and participantId required" });
      }
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts can save benchmark entries" });

      const entrySchema = z.object({
        whiskyName: z.string().min(1),
        distillery: z.string().nullable().optional(),
        region: z.string().nullable().optional(),
        country: z.string().nullable().optional(),
        age: z.string().nullable().optional(),
        abv: z.string().nullable().optional(),
        caskType: z.string().nullable().optional(),
        category: z.string().nullable().optional(),
        noseNotes: z.string().nullable().optional(),
        tasteNotes: z.string().nullable().optional(),
        finishNotes: z.string().nullable().optional(),
        overallNotes: z.string().nullable().optional(),
        score: z.number().nullable().optional(),
        scoreScale: z.string().nullable().optional(),
        sourceDocument: z.string().nullable().optional(),
        sourceAuthor: z.string().nullable().optional(),
      });

      const validated = [];
      for (const e of entries) {
        const parsed = entrySchema.safeParse(e);
        if (!parsed.success) continue;
        validated.push({
          ...parsed.data,
          uploadedBy: participantId,
        });
      }

      if (validated.length === 0) {
        return res.status(400).json({ message: "No valid entries to save" });
      }

      const saved = await storage.createBenchmarkEntries(validated);
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Delete a benchmark entry
  app.delete("/api/benchmark/:id", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can delete benchmark entries" });

      await storage.deleteBenchmarkEntry(req.params.id);
      res.status(204).send();
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // AI document analysis endpoint
  app.post("/api/benchmark/analyze", docUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const participantId = req.body.participantId as string;
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can analyze documents" });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const allWhiskies = await storage.getAllWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();

      const enrichEntries = (entries: any[]) => {
        return entries.map((entry: any) => {
          if (!entry.whiskyName) return entry;
          
          if (!entry.whiskybaseSearch) {
            entry.whiskybaseSearch = [entry.whiskyName, entry.distillery].filter(Boolean).join(" ");
          }
          
          const matchedWhisky = allWhiskies.find(w =>
            w.name.toLowerCase() === (entry.whiskyName || "").toLowerCase()
          );
          const matchedBenchmark = benchmarks.find(b =>
            b.whiskyName.toLowerCase() === (entry.whiskyName || "").toLowerCase()
          );
          
          if (matchedWhisky) {
            entry.distillery = entry.distillery || matchedWhisky.distillery;
            entry.region = entry.region || matchedWhisky.region;
            entry.country = entry.country || matchedWhisky.country;
            entry.age = entry.age || matchedWhisky.age;
            entry.abv = entry.abv || (matchedWhisky.abv ? String(matchedWhisky.abv) : null);
            entry.caskType = entry.caskType || matchedWhisky.caskInfluence;
            entry.matchedInDb = true;
          } else if (matchedBenchmark) {
            entry.distillery = entry.distillery || matchedBenchmark.distillery;
            entry.region = entry.region || matchedBenchmark.region;
            entry.country = entry.country || matchedBenchmark.country;
            entry.age = entry.age || matchedBenchmark.age;
            entry.abv = entry.abv || matchedBenchmark.abv;
            entry.caskType = entry.caskType || matchedBenchmark.caskType;
            entry.matchedInDb = true;
          }
          
          return entry;
        });
      };

      let textContent = "";
      const isImage = file.mimetype.startsWith("image/");

      if (isImage) {
        // For images, send directly to GPT vision
        const base64 = file.buffer.toString("base64");
        const openai = new OpenAI({
          apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a whisky tasting notes extraction expert. Analyze the image and extract ALL whisky tasting information you can find. Return a JSON array of objects, each with these fields:
- whiskyName (string, required)
- distillery (string or null)
- region (string or null, e.g. Islay, Speyside, Highland)
- country (string or null)
- age (string or null, e.g. "12", "NAS")
- abv (string or null, e.g. "46%")
- caskType (string or null, e.g. "Sherry", "Bourbon")
- category (string or null, e.g. "Single Malt", "Blended")
- noseNotes (string or null)
- tasteNotes (string or null)
- finishNotes (string or null)
- overallNotes (string or null)
- score (number or null, normalized to 0-100 scale)
- scoreScale (string or null, original scale e.g. "0-100", "1-5 stars")
- sourceAuthor (string or null, reviewer/author name if visible)
- whiskybaseSearch (string or null - a search query for Whiskybase to find this whisky, e.g. "Lagavulin 16")

Return ONLY valid JSON array. If no whisky data found, return [].`,
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64}` } },
                { type: "text", text: "Extract all whisky tasting notes and scores from this image." },
              ],
            },
          ],
          max_tokens: 4096,
        });

        const content = response.choices[0]?.message?.content || "[]";
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        const entries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        return res.json({ entries: enrichEntries(entries), fileName: file.originalname });
      }

      // Text-based files
      if (file.mimetype === "text/plain" || file.mimetype === "text/csv") {
        textContent = file.buffer.toString("utf-8");
      } else if (file.mimetype === "application/pdf") {
        // Extract text from PDF using simple approach
        const pdfText = file.buffer.toString("utf-8");
        // Try to extract readable text from PDF binary
        const textChunks: string[] = [];
        const matches = pdfText.match(/\(([^)]+)\)/g);
        if (matches) {
          textChunks.push(...matches.map((m: string) => m.slice(1, -1)));
        }
        // Also try stream-based extraction
        const streamMatches = pdfText.match(/BT[\s\S]*?ET/g);
        if (streamMatches) {
          for (const block of streamMatches) {
            const tjMatches = block.match(/\(([^)]*)\)\s*Tj/g);
            if (tjMatches) {
              textChunks.push(...tjMatches.map((m: string) => {
                const inner = m.match(/\(([^)]*)\)/);
                return inner ? inner[1] : "";
              }));
            }
          }
        }
        textContent = textChunks.join(" ").trim();
        if (!textContent || textContent.length < 20) {
          // Fallback: send as base64 to GPT vision for scanned PDFs
          const base64 = file.buffer.toString("base64");
          const openai = new OpenAI({
            apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
            baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
          });

          const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are a whisky tasting notes extraction expert. The user will provide PDF content as base64. Try to interpret any text content. Extract ALL whisky tasting information. Return a JSON array of objects with fields: whiskyName, distillery, region, country, age, abv, caskType, category, noseNotes, tasteNotes, finishNotes, overallNotes, score (normalized 0-100), scoreScale, sourceAuthor, whiskybaseSearch (a search query for Whiskybase e.g. "Lagavulin 16"). Return ONLY valid JSON array.`,
              },
              {
                role: "user",
                content: `This is a PDF document (base64 encoded, first 50000 chars): ${base64.slice(0, 50000)}\n\nExtract all whisky tasting data.`,
              },
            ],
            max_tokens: 4096,
          });

          const content = response.choices[0]?.message?.content || "[]";
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          const entries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
          return res.json({ entries: enrichEntries(entries), fileName: file.originalname });
        }
      } else if (file.mimetype.includes("spreadsheet") || file.mimetype.includes("excel")) {
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const allText: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          allText.push(`Sheet: ${sheetName}\n${csv}`);
        }
        textContent = allText.join("\n\n");
      }

      if (!textContent || textContent.trim().length < 5) {
        return res.status(400).json({ message: "Could not extract text from the uploaded file" });
      }

      // Send extracted text to GPT for structured extraction
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const truncatedText = textContent.slice(0, 60000);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a whisky tasting notes extraction expert. Analyze the provided document text and extract ALL whisky tasting information. Return a JSON array of objects, each with these fields:
- whiskyName (string, required)
- distillery (string or null)
- region (string or null, e.g. Islay, Speyside, Highland, Lowland, Campbeltown)
- country (string or null)
- age (string or null, e.g. "12", "NAS")
- abv (string or null, e.g. "46%")
- caskType (string or null, e.g. "Sherry", "Bourbon", "Port")
- category (string or null, e.g. "Single Malt", "Blended Malt", "Bourbon")
- noseNotes (string or null)
- tasteNotes (string or null)
- finishNotes (string or null)
- overallNotes (string or null)
- score (number or null, normalized to 0-100 scale)
- scoreScale (string or null, original scale e.g. "0-100", "1-5 stars", "A-F")
- sourceAuthor (string or null, reviewer/author name)
- whiskybaseSearch (string or null - a search query for Whiskybase to find this whisky, e.g. "Lagavulin 16")

Return ONLY a valid JSON array. If no whisky data is found, return [].`,
          },
          {
            role: "user",
            content: `Extract all whisky tasting data from this document:\n\n${truncatedText}`,
          },
        ],
        max_tokens: 4096,
      });

      const content = response.choices[0]?.message?.content || "[]";
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      const entries = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      res.json({ entries: enrichEntries(entries), fileName: file.originalname });
    } catch (e: any) {
      console.error("Benchmark analyze error:", e);
      res.status(500).json({ message: e.message || "Analysis failed" });
    }
  });

  // ============================================================

  // ============================================================
  // PHOTO TASTING - Upload bottle photos + AI identification
  // ============================================================

  app.post("/api/photo-tasting/identify", docUpload.array("photos", 20), async (req: Request, res: Response) => {
    try {
      const participantId = req.body.participantId as string;
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can use photo tasting creation" });

      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ message: "No photos uploaded" });

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const allWhiskies = await storage.getAllWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const collectionItems = await storage.getWhiskybaseCollection(participantId);

      const dbWhiskyNames = [...new Set(allWhiskies.map(w => w.name))].slice(0, 200);
      const benchmarkNames = [...new Set(benchmarks.map(b => b.whiskyName))].slice(0, 200);
      const knownWhiskies = [...new Set([...dbWhiskyNames, ...benchmarkNames])];

      const results = [];
      for (const file of files) {
        const base64 = file.buffer.toString("base64");
        console.log(`Photo tasting scan: file=${file.originalname}, size=${(file.size / 1024).toFixed(0)}KB`);

        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a whisky bottle identification expert. Analyze the photo and identify ALL whisky bottles visible in the image.

A single photo may show multiple bottles side by side, on a shelf, on a table, or in a collection. You MUST identify EVERY distinct whisky bottle you can see.

Read ALL text visible on each label. Pay close attention to brand name, expression, age statement, ABV, cask type, and region.

You MUST return a JSON object with a "whiskies" array. Each element has these fields:
- name (string, required - full whisky name as on the label)
- distillery (string or null)
- region (string or null, e.g. Islay, Speyside, Highland, Lowland, Campbeltown, Kentucky, Tennessee)
- country (string or null, e.g. Scotland, Ireland, Japan, USA)
- age (string or null, e.g. "12", "18", "NAS")
- abv (number or null, e.g. 46.0)
- type (string or null, e.g. "Single Malt Scotch Whisky", "Bourbon", "Blended")
- category (string or null, e.g. "Single Malt", "Blended Malt", "Bourbon", "Rye")
- caskInfluence (string or null, e.g. "Bourbon", "Sherry", "Port", "Wine")
- peatLevel (string or null, "None", "Light", "Medium", "Heavy")
- notes (string or null, any interesting details from the label)
- confidence (string, "high", "medium", or "low")
- matchedExisting (string or null - if name closely matches one from the known list, return the matched name)
- whiskybaseSearch (string - a search query for Whiskybase to find this whisky, e.g. "Lagavulin 16")
- whiskybaseUrl (string or null - if you know the Whiskybase URL, provide it. Format: https://www.whiskybase.com/whiskies/whisky/XXXXX)

Known whiskies in the database (try to match if possible):
${knownWhiskies.slice(0, 100).join(", ")}

IMPORTANT: Return {"whiskies": [...]} with an array of ALL bottles found. If only one bottle is visible, return an array with one element. If you cannot identify any bottle, return {"whiskies": [{"name": "Unknown Whisky", "confidence": "low"}]}.`,
            },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${file.mimetype};base64,${base64}`, detail: "high" } },
                { type: "text", text: "Identify ALL whisky bottles visible in this photo. Read every word on each label carefully and extract all details for each bottle." },
              ],
            },
          ],
          max_tokens: 4096,
        });

        const content = response.choices[0]?.message?.content || "{}";
        console.log("Photo tasting scan AI response:", content.substring(0, 500));
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          try {
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { whiskies: [{ name: "Unknown Whisky", confidence: "low" }] };
          } catch {
            parsed = { whiskies: [{ name: "Unknown Whisky", confidence: "low" }] };
          }
        }

        let identifiedList: any[] = [];
        if (Array.isArray(parsed.whiskies)) {
          identifiedList = parsed.whiskies;
        } else if (parsed.name) {
          identifiedList = [parsed];
        } else {
          identifiedList = [{ name: "Unknown Whisky", confidence: "low" }];
        }

        for (let identified of identifiedList) {
          if (!identified.name) identified.name = "Unknown Whisky";

          const matchedWhisky = allWhiskies.find(w =>
            w.name.toLowerCase() === (identified.matchedExisting || identified.name || "").toLowerCase()
          );
          const matchedBenchmark = benchmarks.find(b =>
            b.whiskyName.toLowerCase() === (identified.matchedExisting || identified.name || "").toLowerCase()
          );

          if (matchedWhisky) {
            identified = {
              ...identified,
              distillery: identified.distillery || matchedWhisky.distillery,
              region: identified.region || matchedWhisky.region,
              country: identified.country || matchedWhisky.country,
              age: identified.age || matchedWhisky.age,
              abv: identified.abv || matchedWhisky.abv,
              type: identified.type || matchedWhisky.type,
              category: identified.category || matchedWhisky.category,
              caskInfluence: identified.caskInfluence || matchedWhisky.caskInfluence,
              peatLevel: identified.peatLevel || matchedWhisky.peatLevel,
              dbMatch: true,
              dbWhiskyId: matchedWhisky.id,
              imageUrl: matchedWhisky.imageUrl || identified.imageUrl,
            };
          } else if (matchedBenchmark) {
            identified = {
              ...identified,
              distillery: identified.distillery || matchedBenchmark.distillery,
              region: identified.region || matchedBenchmark.region,
              country: identified.country || matchedBenchmark.country,
              age: identified.age || matchedBenchmark.age,
              abv: identified.abv != null ? identified.abv : (matchedBenchmark.abv ? parseFloat(matchedBenchmark.abv) : null),
              caskInfluence: identified.caskInfluence || matchedBenchmark.caskType,
              category: identified.category || matchedBenchmark.category,
              benchmarkMatch: true,
            };
          }

          if (!identified.imageUrl && collectionItems.length > 0) {
            const searchName = (identified.matchedExisting || identified.name || "").toLowerCase();
            const collectionMatch = collectionItems.find(c => {
              const fullName = [c.brand, c.name].filter(Boolean).join(" ").toLowerCase();
              return fullName === searchName || c.name.toLowerCase() === searchName ||
                fullName.includes(searchName) || searchName.includes(c.name.toLowerCase());
            });
            if (collectionMatch?.imageUrl) {
              identified.imageUrl = collectionMatch.imageUrl;
              identified.collectionMatch = true;
            }
          }

          if (!identified.imageUrl && identified.whiskybaseUrl) {
            try {
              const wbId = identified.whiskybaseUrl.match(/\/whisky\/(\d+)/)?.[1];
              if (wbId) {
                const imgUrl = `https://static.whiskybase.com/storage/whiskies/${wbId}/${wbId}-big.jpg`;
                const testResp = await fetch(imgUrl, { method: "HEAD" });
                if (testResp.ok) {
                  const downloaded = await downloadImageFromUrl(imgUrl, objectStorage);
                  if (downloaded) {
                    identified.imageUrl = downloaded;
                  }
                }
              }
            } catch (e) {
              console.log("Whiskybase image fetch failed for", identified.name);
            }
          }

          if (!identified.whiskybaseSearch) {
            identified.whiskybaseSearch = [identified.name, identified.distillery].filter(Boolean).join(" ");
          }

          results.push({
            ...identified,
            fileName: file.originalname,
          });
        }
      }

      res.json({ whiskies: results });
    } catch (e: any) {
      console.error("Photo tasting identify error:", e);
      res.status(500).json({ message: e.message || "Identification failed" });
    }
  });

  app.post("/api/photo-tasting/create", docUpload.single("coverPhoto"), async (req: Request, res: Response) => {
    try {
      const { participantId, title, date, location } = req.body;
      let whiskiesList: any[];
      try {
        whiskiesList = JSON.parse(req.body.whiskies || "[]");
      } catch {
        return res.status(400).json({ message: "Invalid whiskies data" });
      }
      if (!participantId || !title || !whiskiesList || !Array.isArray(whiskiesList)) {
        return res.status(400).json({ message: "participantId, title, and whiskies array required" });
      }
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can create tastings" });

      let coverImageUrl: string | undefined;
      if (req.file) {
        coverImageUrl = await uploadBufferToObjectStorage(objectStorage, req.file.buffer, req.file.mimetype);
      }

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const tasting = await storage.createTasting({
        title,
        date: date || new Date().toISOString().split("T")[0],
        location: location || "",
        hostId: participantId,
        code,
        status: "draft",
        coverImageUrl: coverImageUrl || null,
      });

      const createdWhiskies = [];
      for (let i = 0; i < whiskiesList.length; i++) {
        const w = whiskiesList[i];
        const whisky = await storage.createWhisky({
          tastingId: tasting.id,
          name: w.name || "Unknown",
          distillery: w.distillery || null,
          age: w.age || null,
          abv: w.abv != null ? parseFloat(w.abv) : null,
          type: w.type || null,
          country: w.country || null,
          category: w.category || null,
          region: w.region || null,
          caskInfluence: w.caskInfluence || null,
          peatLevel: w.peatLevel || null,
          notes: w.notes || null,
          imageUrl: w.imageUrl || null,
          sortOrder: i,
        });
        createdWhiskies.push(whisky);
      }

      res.json({ tasting, whiskies: createdWhiskies });
    } catch (e: any) {
      console.error("Photo tasting create error:", e);
      res.status(500).json({ message: e.message || "Failed to create tasting" });
    }
  });

  // --- Encyclopedia Suggestions ---

  app.get("/api/encyclopedia-suggestions", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester) return res.status(404).json({ message: "Participant not found" });
      if (requester.role === "admin") {
        const status = req.query.status as string | undefined;
        const suggestions = await storage.getEncyclopediaSuggestions(status);
        res.json(suggestions);
      } else {
        const all = await storage.getEncyclopediaSuggestions();
        res.json(all.filter(s => s.submittedBy === participantId));
      }
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/encyclopedia-suggestions", async (req: Request, res: Response) => {
    try {
      const { type, name, country, region, founded, description, feature, website, submittedBy, submitterName } = req.body;
      if (!type || !name || !country || !region) {
        return res.status(400).json({ message: "type, name, country, and region are required" });
      }
      if (!["distillery", "bottler"].includes(type)) {
        return res.status(400).json({ message: "type must be 'distillery' or 'bottler'" });
      }
      const suggestion = await storage.createEncyclopediaSuggestion({
        type, name, country, region,
        founded: founded ? Number(founded) : null,
        description: description || null,
        feature: feature || null,
        website: website || null,
        submittedBy: submittedBy || null,
        submitterName: submitterName || null,
      });
      res.json(suggestion);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/encyclopedia-suggestions/:id", async (req: Request, res: Response) => {
    try {
      const { status, adminNote, participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "status must be 'approved' or 'rejected'" });
      }
      const updated = await storage.updateSuggestionStatus(req.params.id as string, status, adminNote);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
