import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
// @ts-ignore
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { readExcelBuffer, sheetToArrayOfArrays, sheetToJson, sheetToCsv, jsonToSheet, jsonToCsv, buildExcelBuffer, type SimpleWorkbook } from "./excel-utils";
// @ts-ignore
import AdmZip from "adm-zip";
import { storage, getUniquePersonCount, deduplicateParticipantList } from "./storage";
import { insertTastingSchema, insertWhiskySchema, insertRatingSchema, insertParticipantSchema, insertJournalEntrySchema, insertBenchmarkEntrySchema, type Participant } from "@shared/schema";
import OpenAI from "openai";
import { z } from "zod";
import { APP_VERSION, getVersionInfo } from "@shared/version";
import { isSmtpConfigured, sendEmail, buildInviteEmail, buildVerificationEmail, buildThankYouEmail, buildAdminLoginNotification, buildFriendInviteEmail } from "./email";
import { registerObjectStorageRoutes, ObjectStorageService } from "./replit_integrations/object_storage";
import { isAIDisabled, getAISettings, updateAISettings, getAuditLog, AI_FEATURES } from "./ai-settings";
import { getAIClient, getAIStatus } from "./ai-client";
import { hashPassword, verifyPassword } from "./lib/auth";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType, BorderStyle } from "docx";
import sharp from "sharp";
import { extractTextFromImage } from "./lib/ocr.js";
import { getWhiskyIndex } from "./lib/whiskyIndex.js";
import { scoreWhiskies, scoreWhiskiesMultiLine, extractHints, detectMode } from "./lib/matching.js";
import { LRUCache as LRUCacheImpl } from "./lib/cache.js";
import { normalize } from "./lib/whiskyIndex.js";
import { searchOnline, getProviderStatus } from "./lib/onlineSearch.js";

const identifyCache = new LRUCacheImpl<any>(200, 24 * 60 * 60 * 1000);

const identifyRateLimit = new Map<string, { count: number; resetAt: number }>();
function checkIdentifyRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = identifyRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    identifyRateLimit.set(ip, { count: 1, resetAt: now + 5 * 60 * 1000 });
    return true;
  }
  if (entry.count >= 5) return false;
  entry.count++;
  return true;
}

const aiScanCache = new Map<string, { result: any; timestamp: number }>();
let tourCacheVersion = Date.now();
const tourImageCache = new Map<string, string>();
const AI_CACHE_TTL = 24 * 60 * 60 * 1000;
const AI_CACHE_MAX = 500;

function getDefaultSetting(key: string): string {
  const defaults: Record<string, string> = {
    whats_new_enabled: "false",
    whats_new_text: "",
    whats_new_version: "0",
    registration_open: "true",
    guest_mode_enabled: "true",
    maintenance_mode: "false",
    email_notifications_enabled: "true",
    friend_online_notifications: "true",
    comparable_weight_region: "0.40",
    comparable_weight_peat: "0.30",
    comparable_weight_cask: "0.20",
    comparable_weight_abv: "0.10",
    comparable_weight_age: "0.00",
    comparable_min_samples: "7",
    comparable_abv_band: "3",
    comparable_age_band: "3",
    comparable_threshold: "0.5",
    comparable_fallback_behavior: "overall",
    comparable_enable_per_dimension: "false",
  };
  return defaults[key] ?? "";
}

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

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp3", "video/webm"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only audio files are allowed (webm, ogg, mp4, wav, mp3)"));
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
      "text/plain", "text/csv", "text/comma-separated-values",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "image/jpeg", "image/png", "image/webp",
    ];
    const ext = (file.originalname || "").toLowerCase().split(".").pop();
    const allowedExts = ["pdf", "txt", "csv", "xlsx", "xls", "jpg", "jpeg", "png", "webp"];
    if (allowed.includes(file.mimetype) || allowedExts.includes(ext || "")) cb(null, true);
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
  bottler: "bottler", "independent bottler": "bottler", ib: "bottler", abfüller: "bottler",
  vintage: "vintage", jahrgang: "vintage",
  price: "price", preis: "price", "retail price": "price",
  host_summary: "hostSummary", hostsummary: "hostSummary", "host summary": "hostSummary",
};

function normalizeColumnName(raw: string): string | null {
  const key = raw.trim().toLowerCase().replace(/[_\s]+/g, " ");
  return COLUMN_MAP[key] || COLUMN_MAP[key.replace(/ /g, "_")] || COLUMN_MAP[key.replace(/ /g, "")] || null;
}

async function parseSpreadsheetRows(buffer: Buffer, filename: string): Promise<{ rows: Record<string, any>[]; errors: string[] }> {
  const ext = path.extname(filename).toLowerCase();
  const errors: string[] = [];

  if (ext === ".xlsx" || ext === ".xls") {
    const wb = await readExcelBuffer(buffer);
    const sheet = wb.Sheets[wb.SheetNames[0]];
    if (!sheet) { errors.push("No worksheet found in file"); return { rows: [], errors }; }
    const raw: any[][] = sheetToArrayOfArrays(sheet);
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

async function tryFetchWhiskybaseImage(whiskybaseUrlOrId: string | null | undefined, objectStorage: ObjectStorageService): Promise<string | null> {
  if (!whiskybaseUrlOrId) return null;
  try {
    let wbId: string | null = null;
    if (/^\d+$/.test(whiskybaseUrlOrId.trim())) {
      wbId = whiskybaseUrlOrId.trim();
    } else {
      wbId = whiskybaseUrlOrId.match(/\/whisky\/(\d+)/)?.[1] || null;
    }
    if (!wbId) return null;
    const imgUrl = `https://static.whiskybase.com/storage/whiskies/${wbId}/${wbId}-big.jpg`;
    const testResp = await fetch(imgUrl, { method: "HEAD" });
    if (testResp.ok) {
      return await downloadImageFromUrl(imgUrl, objectStorage);
    }
    return null;
  } catch {
    return null;
  }
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

function stripHtmlTags(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

function sanitizeObject(obj: Record<string, any>, keys: string[]): Record<string, any> {
  const result = { ...obj };
  for (const key of keys) {
    if (typeof result[key] === "string") {
      result[key] = stripHtmlTags(result[key]);
    }
  }
  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const objectStorage = new ObjectStorageService();

  const ADMIN_NOTIFICATION_EMAIL = "christoph.aldering@googlemail.com";

  function notifyAdminLogin(participant: { name: string; email?: string | null; experienceLevel?: string | null }, isNew: boolean) {
    const emailContent = buildAdminLoginNotification({
      participantName: participant.name,
      participantEmail: participant.email || undefined,
      isNewRegistration: isNew,
      experienceLevel: participant.experienceLevel || undefined,
      timestamp: new Date(),
    });
    sendEmail({ to: ADMIN_NOTIFICATION_EMAIL, ...emailContent }).catch(() => {});
  }

  // ===== HEALTH CHECK =====
  app.get("/api/health", async (_req: Request, res: Response) => {
    let dbOk = false;
    try {
      await storage.getParticipantByEmail("__health_check_probe__");
      dbOk = true;
    } catch {
      dbOk = true;
    }
    res.json({ status: "ok", db: dbOk, timestamp: new Date().toISOString() });
  });

  // ===== SHARED EXPORT HELPERS =====

  const sendExport = async (res: Response, data: any[], filename: string, format: string, sheetName: string) => {
    if (!data || data.length === 0) {
      return res.status(404).json({ message: "No data available for export" });
    }
    if (format === "csv") {
      const csv = jsonToCsv(data);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
      return res.send("\uFEFF" + csv);
    }
    const buf = await buildExcelBuffer([{ name: sheetName.slice(0, 31), data }]);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
    return res.send(buf);
  };

  const verifyExportAccess = async (participantId: string, pin: string | undefined, level: "own" | "extended" | "admin") => {
    if (!participantId) return { ok: false, status: 400, message: "participantId required" };
    const participant = await storage.getParticipant(participantId);
    if (!participant) return { ok: false, status: 404, message: "Participant not found" };
    if (level === "extended") {
      const tastings = await storage.getTastingsForParticipant(participantId);
      const isHost = tastings.some((t: any) => t.hostId === participantId);
      if (participant.role !== "admin" && !isHost) {
        return { ok: false, status: 403, message: "Host or admin access required" };
      }
    }
    if (level === "admin") {
      if (participant.role !== "admin") {
        return { ok: false, status: 403, message: "Admin access required" };
      }
    }
    return { ok: true, participant };
  };

  const requireOwnerOrAdmin = async (req: Request, paramId: string): Promise<{ authorized: true; requester: Participant } | { authorized: false; status: number; message: string }> => {
    const requesterId = req.headers["x-participant-id"] as string | undefined;
    if (!requesterId) return { authorized: false, status: 403, message: "Forbidden" };
    if (requesterId === paramId) {
      const p = await storage.getParticipant(requesterId);
      if (!p) return { authorized: false, status: 403, message: "Forbidden" };
      return { authorized: true, requester: p };
    }
    const requester = await storage.getParticipant(requesterId);
    if (!requester) return { authorized: false, status: 403, message: "Forbidden" };
    if (requester.role === "admin") return { authorized: true, requester };
    return { authorized: false, status: 403, message: "Forbidden" };
  };

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
      if (!existing) {
        const appSettings = await storage.getAppSettings();
        const registrationOpen = appSettings.registration_open ?? "true";
        if (registrationOpen === "false") {
          return res.status(403).json({ message: "Registration is currently closed." });
        }
      }
      if (existing) {
        if (!data.pin) {
          return res.status(400).json({ message: "PIN is required" });
        }
        if (data.email && existing.email && data.email.toLowerCase() === existing.email.toLowerCase() && await verifyPassword(data.pin || "", existing.pin || "")) {
          return res.status(409).json({ message: "An account with this name and email already exists. Please use the login." });
        }
        if (!existing.pin) {
          const hashed = await hashPassword(data.pin!);
          await storage.updateParticipantPin(existing.id, hashed);
          if (existing.email?.toLowerCase() === ADMIN_EMAIL && existing.role !== "admin") {
            await storage.updateParticipantRole(existing.id, "admin");
          }
          const updated = await storage.getParticipant(existing.id);
          if (updated) { storage.updateLastSeen(updated.id).catch(() => {}); notifyAdminLogin(updated, false); }
          return res.json(updated);
        }
        if (!(await verifyPassword(data.pin || "", existing.pin))) {
          return res.status(401).json({ message: "Invalid password" });
        }
        if (existing.email?.toLowerCase() === ADMIN_EMAIL && existing.role !== "admin") {
          await storage.updateParticipantRole(existing.id, "admin");
          const updated = await storage.getParticipant(existing.id);
          if (updated) { storage.updateLastSeen(updated.id).catch(() => {}); notifyAdminLogin(updated, false); }
          return res.json(updated);
        }
        storage.updateLastSeen(existing.id).catch(() => {});
        notifyAdminLogin(existing, false);
        return res.json(existing);
      }
      if (!data.pin) {
        return res.status(400).json({ message: "PIN is required" });
      }
      if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        return res.status(400).json({ message: "A valid email is required" });
      }
      if (data.pin) {
        data.pin = await hashPassword(data.pin);
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
      if (finalParticipant) { storage.updateLastSeen(finalParticipant.id).catch(() => {}); notifyAdminLogin(finalParticipant, true); }
      res.status(201).json(finalParticipant);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/participants/lookup", async (req, res) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const { name } = req.body;
      if (!name || typeof name !== "string") return res.status(400).json({ message: "Name required" });
      const participant = await storage.getParticipantByName(name.trim());
      if (!participant) return res.status(404).json({ message: "Not found" });
      res.json({ id: participant.id, name: participant.name });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/login", async (req, res) => {
    try {
      const { email, pin, experienceLevel } = req.body;
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ message: "A valid email is required" });
      }
      if (!pin || typeof pin !== "string") {
        return res.status(400).json({ message: "PIN is required" });
      }
      const ADMIN_EMAIL = "christoph.aldering@googlemail.com";
      const existing = await storage.getParticipantByEmail(email.trim());
      if (!existing) {
        return res.status(404).json({ message: "No account found with this email. Please register first." });
      }
      if (!existing.pin) {
        await storage.updateParticipantPin(existing.id, pin);
        if (existing.email?.toLowerCase() === ADMIN_EMAIL && existing.role !== "admin") {
          await storage.updateParticipantRole(existing.id, "admin");
        }
        if (experienceLevel && typeof experienceLevel === "string" && ["guest", "explorer", "connoisseur", "analyst"].includes(experienceLevel)) {
          await storage.updateParticipant(existing.id, { experienceLevel });
        }
        const updated = await storage.getParticipant(existing.id);
        if (updated) { storage.updateLastSeen(updated.id).catch(() => {}); notifyAdminLogin(updated, false); }
        return res.json(updated);
      }
      if (!(await verifyPassword(pin || "", existing.pin || ""))) {
        return res.status(401).json({ message: "Invalid password" });
      }
      if (experienceLevel && typeof experienceLevel === "string" && ["guest", "explorer", "connoisseur", "analyst"].includes(experienceLevel)) {
        await storage.updateParticipant(existing.id, { experienceLevel });
      }
      if (existing.email?.toLowerCase() === ADMIN_EMAIL && existing.role !== "admin") {
        await storage.updateParticipantRole(existing.id, "admin");
        const updated = await storage.getParticipant(existing.id);
        if (updated) { storage.updateLastSeen(updated.id).catch(() => {}); notifyAdminLogin(updated, false); }
        return res.json(updated);
      }
      const freshParticipant = await storage.getParticipant(existing.id);
      storage.updateLastSeen(existing.id).catch(() => {});
      notifyAdminLogin(freshParticipant || existing, false);
      return res.json(freshParticipant || existing);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/participants/demo-guest", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 1) {
        return res.status(400).json({ message: "Name is required" });
      }
      const demoTasting = await storage.getTastingByCode("DEMO");
      if (!demoTasting) return res.status(404).json({ message: "Demo tasting not available" });

      const suffix = Math.random().toString(36).slice(2, 6);
      const guestName = `${name.trim()} #${suffix}`;

      const participant = await storage.createParticipant({ name: guestName, experienceLevel: "guest" });
      await storage.addParticipantToTasting({ tastingId: demoTasting.id, participantId: participant.id });
      storage.updateLastSeen(participant.id).catch(() => {});
      res.status(201).json({ id: participant.id, name: participant.name, role: participant.role, experienceLevel: "guest", guest: true, tastingId: demoTasting.id });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/participants/guest", async (req, res) => {
    try {
      const { name, pin } = req.body;
      if (!name || typeof name !== "string" || name.trim().length < 1) {
        return res.status(400).json({ message: "Name is required" });
      }
      if (!pin || typeof pin !== "string" || pin.trim().length < 4) {
        return res.status(400).json({ message: "PIN is required (min. 4 digits)" });
      }
      const existing = await storage.getParticipantByName(name.trim());
      if (existing) {
        if (existing.pin) {
          if (!(await verifyPassword(pin || "", existing.pin))) {
            return res.status(401).json({ message: "Invalid password" });
          }
          storage.updateLastSeen(existing.id).catch(() => {});
          notifyAdminLogin(existing, false);
          return res.json({ id: existing.id, name: existing.name, role: existing.role, canAccessWhiskyDb: existing.canAccessWhiskyDb || false, experienceLevel: existing.experienceLevel || "guest", guest: true });
        }
        const hashedGuestPin = await hashPassword(pin);
        await storage.updateParticipant(existing.id, { pin: hashedGuestPin });
        storage.updateLastSeen(existing.id).catch(() => {});
        notifyAdminLogin(existing, false);
        return res.json({ id: existing.id, name: existing.name, role: existing.role, canAccessWhiskyDb: existing.canAccessWhiskyDb || false, experienceLevel: existing.experienceLevel || "guest", guest: true });
      }
      const hashedNewPin = await hashPassword(pin);
      const participant = await storage.createParticipant({ name: name.trim(), pin: hashedNewPin, experienceLevel: "guest" });
      storage.updateLastSeen(participant.id).catch(() => {});
      notifyAdminLogin(participant, true);
      res.status(201).json({ id: participant.id, name: participant.name, role: participant.role, canAccessWhiskyDb: participant.canAccessWhiskyDb || false, experienceLevel: "guest", guest: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/participants/:id/experience-level", async (req, res) => {
    try {
      const { level } = req.body;
      if (!level || !["guest", "explorer", "connoisseur", "analyst"].includes(level)) {
        return res.status(400).json({ message: "Invalid level. Must be guest, explorer, connoisseur, or analyst." });
      }
      const updated = await storage.updateParticipant(req.params.id, { experienceLevel: level });
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/participants/:id/email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ message: "A valid email is required" });
      }
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const updated = await storage.updateParticipant(participant.id, { email: email.trim() });
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/participants/:id/pin", async (req, res) => {
    try {
      const { currentPin, newPin } = req.body;
      if (!newPin || typeof newPin !== "string" || newPin.length < 4) {
        return res.status(400).json({ message: "New PIN must be at least 4 digits" });
      }
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      if (participant.pin && !(await verifyPassword(currentPin || "", participant.pin))) {
        return res.status(403).json({ message: "Current password is incorrect" });
      }
      const hashedNew = await hashPassword(newPin);
      const updated = await storage.updateParticipantPin(participant.id, hashedNew);
      res.json(updated);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id/export-data", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const profile = await storage.getProfile(participant.id);
      const journal = await storage.getJournalEntries(participant.id);
      const wishlist = await storage.getWishlistEntries(participant.id);
      const stats = await storage.getParticipantStats(participant.id);
      const ratingNotes = await storage.getRatingNotes(participant.id);

      res.json({
        participant: {
          id: participant.id,
          name: participant.name,
          email: participant.email,
          experienceLevel: participant.experienceLevel,
          createdAt: participant.createdAt,
        },
        profile: profile || null,
        ratingNotes,
        journal,
        wishlist,
        stats,
        exportedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/:id/heartbeat", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      await storage.updateLastSeen(participant.id);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/admin/online-users", async (req, res) => {
    try {
      const minutes = parseInt(req.query.minutes as string) || 5;
      const online = await storage.getOnlineParticipants(minutes);
      res.json(online.map(p => ({
        id: p.id,
        name: p.name,
        email: p.email,
        experienceLevel: p.experienceLevel,
        lastSeenAt: p.lastSeenAt,
        role: p.role,
      })));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/:id/secure", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      if (participant.pin) return res.status(400).json({ message: "Account already secured" });
      if (participant.emailVerified) return res.status(400).json({ message: "Account already has verified email" });
      const createdAt = participant.createdAt ? new Date(participant.createdAt).getTime() : 0;
      const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
      if (createdAt < tenMinutesAgo) {
        return res.status(403).json({ message: "Secure window has expired. Please sign in normally." });
      }
      const { pin, email } = req.body;
      if (!pin || typeof pin !== "string" || pin.length < 4) {
        return res.status(400).json({ message: "PIN must be at least 4 characters" });
      }
      const bcrypt = await import("bcrypt");
      const hashedPin = await bcrypt.hash(pin, 10);
      const updates: any = { pin: hashedPin };
      if (email && typeof email === "string") {
        updates.email = email.trim().toLowerCase();
      }
      const updated = await storage.updateParticipant(participant.id, updates);
      res.json({ success: true, id: updated!.id, name: updated!.name });
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.get("/api/platform-stats", async (_req, res) => {
    try {
      const stats = await storage.getPlatformStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id", async (req, res) => {
    const participant = await storage.getParticipant(req.params.id);
    if (!participant) return res.status(404).json({ message: "Not found" });
    const requesterId = req.headers["x-participant-id"] as string;
    if (requesterId === participant.id) {
      res.json(participant);
    } else {
      res.json({ id: participant.id, name: participant.name, role: participant.role, language: participant.language });
    }
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

  app.delete("/api/participants/:id/anonymize", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const { pin } = req.body || {};
      if (!pin || !(await verifyPassword(pin, participant.pin || ""))) {
        return res.status(403).json({ message: "Invalid password" });
      }
      const hash = crypto.randomBytes(4).toString("hex");
      const anonymizedName = `Anonym-${hash}`;
      await storage.updateParticipant(participant.id, {
        name: anonymizedName,
        email: "",
        pin: "",
        newsletterOptIn: false,
      });
      const profile = await storage.getProfile(participant.id);
      if (profile) {
        await storage.upsertProfile({
          participantId: participant.id,
          bio: "",
          favoriteWhisky: "",
          goToDram: "",
          preferredRegions: "",
          preferredPeatLevel: "",
          preferredCaskInfluence: "",
          photoUrl: "",
        });
      }
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/participants/forgot-pin", async (req, res) => {
    try {
      const { name, email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });
      let participant;
      if (name) {
        participant = await storage.getParticipantByName(name.trim());
        if (!participant || !participant.email || participant.email.toLowerCase() !== email.trim().toLowerCase()) {
          participant = await storage.getParticipantByEmail(email.trim());
        }
      } else {
        participant = await storage.getParticipantByEmail(email.trim());
      }
      if (!participant) {
        return res.status(404).json({ message: "No account found with that email" });
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

  app.post("/api/participants/recover-email", async (req, res) => {
    try {
      const { name, password } = req.body;
      if (!name || !password) return res.status(400).json({ message: "Name and password are required" });
      const participant = await storage.getParticipantByName(name.trim());
      if (!participant || !participant.pin) {
        return res.status(404).json({ message: "No account found with that name" });
      }
      const valid = await verifyPassword(password.trim(), participant.pin);
      if (!valid) {
        return res.status(401).json({ message: "Wrong password" });
      }
      if (!participant.email) {
        return res.status(404).json({ message: "No email address on file for this account" });
      }
      const email = participant.email;
      const parts = email.split("@");
      const local = parts[0];
      const domain = parts[1] || "";
      const maskedLocal = local.length <= 2 ? local[0] + "***" : local[0] + "***" + local[local.length - 1];
      const domParts = domain.split(".");
      const maskedDomain = domParts[0].length <= 2 ? domParts[0][0] + "***" : domParts[0][0] + "***" + domParts[0][domParts[0].length - 1];
      const maskedEmail = maskedLocal + "@" + maskedDomain + (domParts.length > 1 ? "." + domParts.slice(1).join(".") : "");
      res.json({ maskedEmail });
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
    let tastings: any[];
    if (participant.role === "admin") {
      tastings = await storage.getAllTastings();
    } else {
      tastings = await storage.getTastingsForParticipant(participantId);
    }
    const hostIds = [...new Set(tastings.map((t: any) => t.hostId).filter(Boolean))];
    const hostMap: Record<string, string> = {};
    await Promise.all(
      hostIds.map(async (hid) => {
        const p = await storage.getParticipant(hid);
        if (p) hostMap[hid] = p.name || p.email || "";
      })
    );
    const enriched = tastings.map((t: any) => ({
      ...t,
      hostName: hostMap[t.hostId] || null,
    }));
    return res.json(enriched);
  });

  app.get("/api/tastings/demo", async (_req, res) => {
    try {
      const tasting = await storage.getTastingByCode("DEMO");
      if (!tasting) return res.status(404).json({ message: "Demo tasting not available" });
      const whiskyList = await storage.getWhiskiesForTasting(tasting.id);
      res.json({ ...tasting, whiskies: whiskyList });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tastings/:id", async (req, res) => {
    const tasting = await storage.getTasting(req.params.id);
    if (!tasting) return res.status(404).json({ message: "Not found" });
    const requesterId = req.headers["x-participant-id"] as string | undefined;
    if (requesterId) {
      const requester = await storage.getParticipant(requesterId);
      if (!requester) return res.status(403).json({ message: "Forbidden" });
      if (requester.role !== "admin" && tasting.hostId !== requesterId) {
        const tp = await storage.getTastingParticipants(tasting.id);
        const isMember = tp.some(p => p.participantId === requesterId);
        if (!isMember) return res.status(403).json({ message: "Forbidden" });
      }
    }
    res.json(tasting);
  });

  app.get("/api/tastings/code/:code", async (req, res) => {
    const tasting = await storage.getTastingByCode(req.params.code);
    if (!tasting) return res.status(404).json({ message: "Not found" });
    res.json(tasting);
  });

  app.post("/api/tastings", async (req, res) => {
    try {
      const sanitizedBody = sanitizeObject(req.body, ["title", "location"]);
      const data = insertTastingSchema.parse(sanitizedBody);
      if (data.title && data.title.length > 200) {
        return res.status(400).json({ message: "Title must not exceed 200 characters" });
      }
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

    const tasting = await storage.getTasting(req.params.id);
    if (!tasting) return res.status(404).json({ message: "Not found" });

    const allowedTransitions: Record<string, string[]> = {
      draft: ["open", "deleted"],
      open: ["closed", "draft"],
      closed: ["reveal", "open"],
      reveal: ["archived", "closed"],
      archived: ["deleted"],
      deleted: [],
    };
    const allowed = allowedTransitions[tasting.status] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Cannot transition from '${tasting.status}' to '${status}'` });
    }

    if (status === "deleted" || status === "archived") {
      if (!hostId) return res.status(400).json({ message: "hostId required for this action" });
      const requester = await storage.getParticipant(hostId);
      if (tasting.hostId !== hostId && (!requester || requester.role !== "admin")) {
        return res.status(403).json({ message: "Only the host or an admin can perform this action" });
      }
    }
    const updated = await storage.updateTastingStatus(req.params.id, status, currentAct);
    if (!updated) return res.status(404).json({ message: "Not found" });

    if (status === "reveal") {
      try {
        const tps = await storage.getTastingParticipants(req.params.id);
        for (const tp of tps) {
          if (tp.participantId !== updated.hostId) {
            await storage.createNotification({
              recipientId: tp.participantId,
              type: "reveal",
              title: `Results ready: "${updated.title}"`,
              message: `The tasting "${updated.title}" has entered the reveal phase. Check out the results!`,
              linkUrl: `/tasting/${updated.id}`,
              tastingId: updated.id,
              isGlobal: false,
            });
          }
        }
      } catch {}
    }

    res.json(updated);
  });

  app.patch("/api/tastings/:id/title", async (req, res) => {
    try {
      const { title, hostId } = req.body;
      if (!hostId) return res.status(400).json({ message: "hostId required" });
      const trimmedTitle = (title || "").trim();
      if (!trimmedTitle) return res.status(400).json({ message: "Title must not be empty" });
      if (trimmedTitle.length > 200) return res.status(400).json({ message: "Title must not exceed 200 characters" });
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Not found" });
      const requester = await storage.getParticipant(hostId);
      if (tasting.hostId !== hostId && (!requester || requester.role !== "admin")) {
        return res.status(403).json({ message: "Only the host or an admin can rename a tasting" });
      }
      const updated = await storage.updateTastingDetails(req.params.id, { title: trimmedTitle });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
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

  app.post("/api/tastings/:id/heartbeat", async (req, res) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      await storage.upsertPresence(req.params.id, participantId);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/tastings/:id/presence", async (req, res) => {
    try {
      const active = await storage.getActiveParticipants(req.params.id, 60);
      res.json(active);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
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

      try {
        const joiner = await storage.getParticipant(participantId);
        if (tasting.hostId !== participantId) {
          await storage.createNotification({
            recipientId: tasting.hostId,
            type: "join",
            title: `${joiner?.name || "Someone"} joined "${tasting.title}"`,
            message: `${joiner?.name || "A participant"} has joined your tasting session "${tasting.title}".`,
            linkUrl: `/tasting/${tasting.id}`,
            tastingId: tasting.id,
            isGlobal: false,
          });
        }
      } catch {}

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
      if (!whisky.imageUrl && whisky.whiskybaseId) {
        const wbImage = await tryFetchWhiskybaseImage(whisky.whiskybaseId, objectStorage);
        if (wbImage) {
          const updated = await storage.updateWhisky(whisky.id, { imageUrl: wbImage });
          return res.status(201).json(updated || whisky);
        }
      }
      res.status(201).json(whisky);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.patch("/api/whiskies/:id", async (req, res) => {
    const updated = await storage.updateWhisky(req.params.id, req.body);
    if (!updated) return res.status(404).json({ message: "Not found" });
    if (!updated.imageUrl && updated.whiskybaseId) {
      const wbImage = await tryFetchWhiskybaseImage(updated.whiskybaseId, objectStorage);
      if (wbImage) {
        const withImage = await storage.updateWhisky(updated.id, { imageUrl: wbImage });
        return res.json(withImage || updated);
      }
    }
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

  const scanUpload = multer({
    storage: multer.diskStorage({
      destination: (_req: any, _file: any, cb: any) => cb(null, uploadsDir),
      filename: (_req: any, file: any, cb: any) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
      },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/whisky/identify", scanUpload.single("photo"), async (req: any, res: Response) => {
    const startMs = Date.now();
    try {
      const clientIp = (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;
      if (!checkIdentifyRateLimit(clientIp)) {
        return res.status(429).json({ message: "Too many requests. Please wait a few minutes." });
      }

      console.log("[IDENTIFY] request received");
      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No photo provided" });
      }

      const imageBuffer = fs.readFileSync(file.path);

      let photoUrl = `/uploads/${file.filename}`;
      let uploadedToObjectStorage = false;
      try {
        const storedPath = await uploadBufferToObjectStorage(objectStorage, imageBuffer, file.mimetype || "image/jpeg");
        photoUrl = storedPath;
        uploadedToObjectStorage = true;
      } catch (uploadErr: any) {
        console.warn("[IDENTIFY] Object storage upload failed, using local path:", uploadErr.message);
      }
      const hash = LRUCacheImpl.hashBuffer(imageBuffer);
      const cached = identifyCache.get(hash);
      if (cached) {
        console.log("[IDENTIFY] cache hit");
        if (uploadedToObjectStorage) fs.unlink(file.path, () => {});
        return res.json({ ...cached, photoUrl });
      }

      const { identifyWhiskyFromImage } = await import("./lib/ocr.js");
      const visionResult = await identifyWhiskyFromImage(file.path);

      if (visionResult && visionResult.name && visionResult.confidence !== "low") {
        const confMap: Record<string, number> = { high: 0.95, medium: 0.75, low: 0.45 };
        const aiCandidate = {
          source: "ai_vision" as const,
          name: visionResult.name,
          distillery: visionResult.distillery,
          confidence: confMap[visionResult.confidence] || 0.45,
          age: visionResult.age,
          abv: visionResult.abv,
          caskType: visionResult.caskType,
          region: visionResult.region,
          whiskyId: undefined as string | undefined,
        };

        if (visionResult.ocrText) {
          try {
            const index = await getWhiskyIndex();
            const hints = extractHints(visionResult.ocrText);
            const localMatches = scoreWhiskies(visionResult.ocrText, hints, index);
            if (localMatches.length > 0 && localMatches[0].confidence >= 0.4) {
              aiCandidate.whiskyId = localMatches[0].whiskyId;
              console.log(`[IDENTIFY] linked to local: ${localMatches[0].name}`);
            }
          } catch {}
        }

        const tookMs = Date.now() - startMs;
        console.log(`[IDENTIFY] AI vision: "${visionResult.name}" (${visionResult.confidence}) in ${tookMs}ms`);

        const result = {
          candidates: [aiCandidate],
          debug: {
            ocrText: visionResult.ocrText?.substring(0, 300) || "",
            tookMs,
            detectedMode: "label" as const,
          },
        };
        if (hash) identifyCache.set(hash, result);
        if (uploadedToObjectStorage) fs.unlink(file.path, () => {});
        return res.json({ ...result, photoUrl });
      }

      console.log("[IDENTIFY] AI vision failed, falling back to OCR+matching");
      const ocrText = await extractTextFromImage(file.path);
      if (!ocrText.trim()) {
        if (uploadedToObjectStorage) fs.unlink(file.path, () => {});
        return res.json({ candidates: [], photoUrl });
      }

      const hints = extractHints(ocrText);
      const index = await getWhiskyIndex();
      const mode = detectMode(ocrText);
      const candidates = mode === "menu"
        ? scoreWhiskiesMultiLine(ocrText, hints, index)
        : scoreWhiskies(ocrText, hints, index);

      const lowConfidence = candidates.length === 0 || candidates[0].confidence < 0.15;
      const finalCandidates = lowConfidence ? [] : candidates;
      const tookMs = Date.now() - startMs;

      const result = {
        candidates: finalCandidates,
        debug: { ocrText: ocrText.substring(0, 300), tookMs, detectedMode: mode },
      };
      if (hash) identifyCache.set(hash, result);
      if (uploadedToObjectStorage) fs.unlink(file.path, () => {});
      res.json({ ...result, photoUrl });
    } catch (e: any) {
      console.error("[IDENTIFY] error:", e.message);
      if (uploadedToObjectStorage) fs.unlink(file.path, () => {});
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/whisky/identify-text", async (req: Request, res: Response) => {
    const startMs = Date.now();
    try {
      const clientIp = (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;
      if (!checkIdentifyRateLimit(clientIp)) {
        return res.status(429).json({ message: "Too many requests. Please wait a few minutes." });
      }

      const { query } = req.body || {};
      if (!query || typeof query !== "string" || query.trim().length < 2) {
        return res.status(400).json({ message: "Query text is required (at least 2 characters)" });
      }

      const queryText = query.trim();
      console.log(`[IDENTIFY-TEXT] query: "${queryText.substring(0, 100)}"`);

      const cacheKey = `text:${normalize(queryText)}`;
      const cached = identifyCache.get(cacheKey);
      if (cached) {
        console.log("[IDENTIFY-TEXT] cache hit");
        return res.json(cached);
      }

      try {
        const openai = new OpenAI({
          apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
          baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        });

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `You are a whisky identification expert. Given a text description or name, identify the whisky. Return JSON:
{"name": "full product name", "distillery": "distillery name", "age": "age or empty", "abv": "ABV% or empty", "caskType": "cask type or empty", "region": "region or empty", "confidence": "high/medium/low"}
If the text is too vague to identify a specific whisky, return {"name": "", "confidence": "low"}.`,
            },
            { role: "user", content: queryText },
          ],
        });

        const raw = completion.choices[0]?.message?.content || "{}";
        const parsed = JSON.parse(raw);

        if (parsed.name && parsed.confidence !== "low") {
          const confMap: Record<string, number> = { high: 0.95, medium: 0.75, low: 0.45 };
          const aiCandidate = {
            source: "ai_text" as const,
            name: parsed.name,
            distillery: parsed.distillery || "",
            confidence: confMap[parsed.confidence] || 0.45,
            age: parsed.age || "",
            abv: parsed.abv || "",
            caskType: parsed.caskType || "",
            region: parsed.region || "",
            whiskyId: undefined as string | undefined,
          };

          const index = await getWhiskyIndex();
          const hints = extractHints(queryText);
          const localMatches = scoreWhiskies(queryText, hints, index);
          if (localMatches.length > 0 && localMatches[0].confidence >= 0.4) {
            aiCandidate.whiskyId = localMatches[0].whiskyId;
          }

          const tookMs = Date.now() - startMs;
          console.log(`[IDENTIFY-TEXT] AI: "${parsed.name}" (${parsed.confidence}) in ${tookMs}ms`);
          const result = { candidates: [aiCandidate], debug: { queryText: queryText.substring(0, 300), tookMs, detectedMode: "text" as const } };
          identifyCache.set(cacheKey, result);
          return res.json(result);
        }
      } catch (aiErr: any) {
        console.warn("[IDENTIFY-TEXT] AI failed, falling back to local:", aiErr.message);
      }

      const hints = extractHints(queryText);
      const index = await getWhiskyIndex();
      const photoMode = detectMode(queryText);
      const candidates = photoMode === "menu"
        ? scoreWhiskiesMultiLine(queryText, hints, index)
        : scoreWhiskies(queryText, hints, index);

      const lowConfidence = candidates.length === 0 || candidates[0].confidence < 0.15;
      const finalCandidates = lowConfidence ? [] : candidates;
      const tookMs = Date.now() - startMs;
      console.log(`[IDENTIFY-TEXT] local fallback: ${finalCandidates.length} candidates in ${tookMs}ms`);

      const result = { candidates: finalCandidates, debug: { queryText: queryText.substring(0, 300), tookMs, detectedMode: "text" as const } };
      identifyCache.set(cacheKey, result);
      res.json(result);
    } catch (e: any) {
      console.error("[IDENTIFY-TEXT] error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/whisky/identify-online", async (req: Request, res: Response) => {
    const startMs = Date.now();
    try {
      const clientIp = (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;
      if (!checkIdentifyRateLimit(clientIp)) {
        return res.status(429).json({ message: "Too many requests. Please wait a few minutes." });
      }

      const { query, ocrText, sendPhoto, photoUrl } = req.body || {};
      const searchQuery = (query || ocrText || "").trim();

      if (!searchQuery || searchQuery.length < 2) {
        return res.status(400).json({ message: "Query text is required" });
      }

      console.log(`[SIMPLE_MODE][ONLINE_SEARCH] request: query="${searchQuery.substring(0, 80)}" sendPhoto=${!!sendPhoto}`);

      const onlineResult = await searchOnline(searchQuery);

      const index = await getWhiskyIndex();
      for (const c of onlineResult.candidates) {
        const localMatches = scoreWhiskies(c.name + (c.distillery ? ` ${c.distillery}` : ""), extractHints(c.name), index);
        if (localMatches.length > 0 && localMatches[0].confidence >= 0.4) {
          c.whiskyId = localMatches[0].whiskyId;
          c.confidence = Math.min(0.85, c.confidence + 0.15);
          c.confidence = Math.round(c.confidence * 100) / 100;
          console.log(`[SIMPLE_MODE][ONLINE_SEARCH] mapped "${c.name}" → local ${localMatches[0].name} (${c.confidence})`);
        }
      }

      const tookMs = Date.now() - startMs;
      console.log(`[SIMPLE_MODE][ONLINE_SEARCH] returning ${onlineResult.candidates.length} candidates in ${tookMs}ms`);

      res.json({
        candidates: onlineResult.candidates,
        debug: onlineResult.debug ? { ...onlineResult.debug, tookMs } : undefined,
      });
    } catch (e: any) {
      console.error("[SIMPLE_MODE][ONLINE_SEARCH] error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/whisky/identify-status", (_req: Request, res: Response) => {
    const status = getProviderStatus();
    res.json(status);
  });

  app.post("/api/uploads/scan-photo", scanUpload.single("photo"), async (req: any, res: Response) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ message: "No file provided" });
      let photoUrl = `/uploads/${file.filename}`;
      try {
        const buf = fs.readFileSync(file.path);
        const storedPath = await uploadBufferToObjectStorage(objectStorage, buf, file.mimetype || "image/jpeg");
        photoUrl = storedPath;
        fs.unlink(file.path, () => {});
      } catch (uploadErr: any) {
        console.warn("[SIMPLE_MODE] Object storage upload failed, using local path:", uploadErr.message);
      }
      console.log(`[SIMPLE_MODE] scan photo uploaded: ${photoUrl}`);
      res.json({ photoUrl });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== SESSION AUTH (shared by Classic + Simple) =====
  const sessionSigninAttempts = new Map<string, { count: number; resetAt: number }>();
  const sessionResumeTokens = new Map<string, { mode: string; name?: string; expiresAt: number }>();
  const sessionResumeAttempts = new Map<string, { count: number; resetAt: number }>();

  function generateResumeToken(): string {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  }

  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of sessionResumeTokens) {
      if (now > v.expiresAt) sessionResumeTokens.delete(k);
    }
  }, 60 * 60 * 1000);

  const handleSignin = async (req: Request, res: Response) => {
    const clientIp = (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;
    const now = Date.now();
    const entry = sessionSigninAttempts.get(clientIp);
    if (entry && now < entry.resetAt) {
      if (entry.count >= 5) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({ ok: false, message: "Too many attempts.", retryAfter });
      }
      entry.count++;
    } else {
      sessionSigninAttempts.set(clientIp, { count: 1, resetAt: now + 5 * 60 * 1000 });
    }

    const { name, email, pin, password, mode, remember } = req.body || {};
    const credential = password || pin;
    if (!credential || typeof credential !== "string") {
      return res.status(400).json({ ok: false, message: "Password is required" });
    }

    const authMode = mode === "tasting" ? "tasting" : "log";

    let participant: any = null;
    if (email && typeof email === "string" && email.trim()) {
      participant = await storage.getParticipantByEmail(email.trim().toLowerCase());
    }
    if (!participant && name && typeof name === "string" && name.trim()) {
      participant = await storage.getParticipantByName(name.trim());
    }

    if (participant && participant.pin) {
      const credTrimmed = credential.trim();
      const credHex = Buffer.from(credTrimmed.substring(0, 5)).toString("hex");
      console.log(`[SESSION][AUTH] verifying password for pid=${participant.id} email=${participant.email} credLen=${credTrimmed.length} credHex5=${credHex} pinHashLen=${participant.pin.length}`);
      const valid = await verifyPassword(credential.trim(), participant.pin);
      console.log(`[SESSION][AUTH] bcrypt result: ${valid}`);
      if (valid) {
        if (!participant.pin.startsWith("$2b$") && !participant.pin.startsWith("$2a$")) {
          try {
            const hashed = await hashPassword(credential.trim());
            await storage.updateParticipantPin(participant.id, hashed);
            console.log(`[SESSION][AUTH] auto-rehashed plaintext pin for pid=${participant.id}`);
          } catch (rehashErr) {
            console.warn(`[SESSION][AUTH] rehash failed:`, rehashErr);
          }
        }
        let displayName = participant.name;
        if (name && typeof name === "string" && name.trim() && name.trim() !== participant.name) {
          try {
            await storage.updateParticipant(participant.id, { name: name.trim() });
            displayName = name.trim();
            console.log(`[SESSION][AUTH] updated name for pid=${participant.id} to "${displayName}"`);
          } catch (nameErr) {
            console.warn(`[SESSION][AUTH] failed to update name:`, nameErr);
          }
        }
        console.log(`[SESSION][AUTH] signin success for "${displayName}" mode=${authMode} (DB match via ${email ? "email" : "name"})`);
        const e = sessionSigninAttempts.get(clientIp);
        if (e) e.count = 0;
        const result: any = { ok: true, name: displayName, mode: authMode, pid: participant.id, role: participant.role || "user" };
        const token = generateResumeToken();
        sessionResumeTokens.set(token, { mode: authMode, name: displayName, pid: participant.id, role: participant.role || "user", expiresAt: now + 14 * 24 * 60 * 60 * 1000 });
        result.resumeToken = token;
        return res.json(result);
      }
    }

    const configuredPin = process.env.SIMPLE_MODE_PIN;
    if (configuredPin && credential.trim() === configuredPin) {
      const displayName = authMode === "log" ? (name || undefined) : undefined;
      console.log(`[SESSION][AUTH] signin success for "${displayName || "anon"}" mode=${authMode} (global PIN)`);
      const e = sessionSigninAttempts.get(clientIp);
      if (e) e.count = 0;
      let globalPid: string | undefined;
      if (displayName) {
        const found = await storage.getParticipantByName(displayName);
        if (found) globalPid = found.id;
      }
      const result: any = { ok: true, name: displayName, mode: authMode, pid: globalPid };
      const token = generateResumeToken();
      sessionResumeTokens.set(token, { mode: authMode, name: displayName, pid: globalPid, expiresAt: now + 14 * 24 * 60 * 60 * 1000 });
      result.resumeToken = token;
      return res.json(result);
    }

    if (!configuredPin && process.env.NODE_ENV !== "production") {
      console.warn("[SESSION][AUTH] No credentials matched, allowing in dev");
      const result: any = { ok: true, name: authMode === "log" ? (name || undefined) : undefined, mode: authMode };
      const token = generateResumeToken();
      sessionResumeTokens.set(token, { mode: authMode, name: result.name, expiresAt: now + 14 * 24 * 60 * 60 * 1000 });
      result.resumeToken = token;
      return res.json(result);
    }

    if (email && !participant) {
      console.log(`[SESSION][AUTH] signin failed — no account for email "${email}"`);
      return res.status(401).json({ ok: false, message: "No account found for this email" });
    }
    console.log(`[SESSION][AUTH] signin failed for "${email || name || "anon"}"`);
    return res.status(401).json({ ok: false, message: "Invalid password" });
  };

  const handleResume = (req: Request, res: Response) => {
    const clientIp = (req.ip || req.headers["x-forwarded-for"] || "unknown") as string;
    const now = Date.now();
    const rEntry = sessionResumeAttempts.get(clientIp);
    if (rEntry && now < rEntry.resetAt) {
      if (rEntry.count >= 30) {
        return res.status(429).json({ ok: false, message: "Too many attempts." });
      }
      rEntry.count++;
    } else {
      sessionResumeAttempts.set(clientIp, { count: 1, resetAt: now + 60 * 1000 });
    }

    const { resumeToken } = req.body || {};
    if (!resumeToken || typeof resumeToken !== "string") {
      return res.status(400).json({ ok: false });
    }
    const stored = sessionResumeTokens.get(resumeToken);
    if (!stored || now > stored.expiresAt) {
      if (stored) sessionResumeTokens.delete(resumeToken);
      return res.status(401).json({ ok: false });
    }
    return res.json({ ok: true, mode: stored.mode, name: stored.name, pid: stored.pid || undefined, role: (stored as any).role || "user" });
  };

  const handleSignout = (req: Request, res: Response) => {
    const { resumeToken } = req.body || {};
    if (resumeToken && typeof resumeToken === "string") {
      sessionResumeTokens.delete(resumeToken);
    }
    return res.json({ ok: true });
  };

  app.post("/api/session/signin", handleSignin);
  app.post("/api/session/resume", handleResume);
  app.post("/api/session/signout", handleSignout);

  app.post("/api/simple/unlock", handleSignin);
  app.post("/api/simple/resume", handleResume);
  app.post("/api/simple/logout", handleSignout);

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
      const { rows, errors } = await parseSpreadsheetRows(buffer, spreadsheetFile.originalname);

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
      const { rows, errors: parseErrors } = await parseSpreadsheetRows(buffer, spreadsheetFile.originalname);

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

          if (!imageAttached && row.whiskybaseId) {
            const wbImage = await tryFetchWhiskybaseImage(row.whiskybaseId, objectStorage);
            if (wbImage) {
              await storage.updateWhisky(whisky.id, { imageUrl: wbImage });
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
      const allWhiskies = await storage.getActiveWhiskies();
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

  app.get("/api/tastings/:id/results", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Not found" });

      const [allRatings, allWhiskies] = await Promise.all([
        storage.getRatingsForTasting(req.params.id),
        storage.getWhiskiesForTasting(req.params.id),
      ]);

      const whiskyMap = new Map(allWhiskies.map((w) => [w.id, w]));

      const grouped: Record<string, typeof allRatings> = {};
      for (const r of allRatings) {
        if (!grouped[r.whiskyId]) grouped[r.whiskyId] = [];
        grouped[r.whiskyId].push(r);
      }

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

      const results = allWhiskies.map((w) => {
        const rats = grouped[w.id] || [];
        const overalls = rats.map((r) => r.overall).filter((v): v is number => v != null);
        const noses = rats.map((r) => r.nose).filter((v): v is number => v != null);
        const tastes = rats.map((r) => r.taste).filter((v): v is number => v != null);
        const finishes = rats.map((r) => r.finish).filter((v): v is number => v != null);
        const balances = rats.map((r) => r.balance).filter((v): v is number => v != null);

        return {
          whiskyId: w.id,
          name: w.name ?? "Unknown",
          distillery: w.distillery ?? null,
          age: w.age ?? null,
          abv: w.abv ?? null,
          region: w.region ?? null,
          imageUrl: w.imageUrl ?? null,
          sortOrder: w.sortOrder ?? 0,
          ratingCount: rats.length,
          avgOverall: avg(overalls),
          avgNose: avg(noses),
          avgTaste: avg(tastes),
          avgFinish: avg(finishes),
          avgBalance: avg(balances),
          ratings: rats.map((r) => ({
            participantId: r.participantId,
            overall: r.overall,
            nose: r.nose,
            taste: r.taste,
            finish: r.finish,
            balance: r.balance,
            notes: r.notes,
          })),
        };
      });

      results.sort((a, b) => (b.avgOverall ?? 0) - (a.avgOverall ?? 0));

      res.json({
        tastingId: tasting.id,
        title: tasting.title,
        status: tasting.status,
        blindMode: tasting.blindMode,
        whiskyCount: allWhiskies.length,
        totalRatings: allRatings.length,
        results,
      });
    } catch (err: any) {
      console.error("Error fetching results:", err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  app.get("/api/tastings/:id/results/export", async (req, res) => {
    try {
      const format = (req.query.format as string) || "csv";
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Not found" });

      const [allRatings, allWhiskies] = await Promise.all([
        storage.getRatingsForTasting(req.params.id),
        storage.getWhiskiesForTasting(req.params.id),
      ]);

      const avg = (arr: number[]) => arr.length ? Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10 : null;

      const rows = allWhiskies
        .map((w, i) => {
          const rats = allRatings.filter(r => r.whiskyId === w.id);
          const overalls = rats.map(r => r.overall).filter((v): v is number => v != null);
          return {
            Rank: i + 1,
            Whisky: w.name ?? "Unknown",
            Distillery: w.distillery ?? "",
            Region: w.region ?? "",
            Age: w.age ?? "",
            ABV: w.abv ?? "",
            "Avg Overall": avg(overalls)?.toFixed(1) ?? "",
            "Avg Nose": avg(rats.map(r => r.nose).filter((v): v is number => v != null))?.toFixed(1) ?? "",
            "Avg Taste": avg(rats.map(r => r.taste).filter((v): v is number => v != null))?.toFixed(1) ?? "",
            "Avg Finish": avg(rats.map(r => r.finish).filter((v): v is number => v != null))?.toFixed(1) ?? "",
            "Avg Balance": avg(rats.map(r => r.balance).filter((v): v is number => v != null))?.toFixed(1) ?? "",
            Ratings: rats.length,
          };
        })
        .sort((a, b) => parseFloat(b["Avg Overall"] || "0") - parseFloat(a["Avg Overall"] || "0"))
        .map((row, i) => ({ ...row, Rank: i + 1 }));

      const safeName = (tasting.title || "results").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
      await sendExport(res, rows, `CaskSense_${safeName}_results`, format, "Results");
    } catch (err: any) {
      console.error("Results export error:", err);
      res.status(500).json({ message: "Export failed" });
    }
  });

  app.get("/api/tastings/:id/ratings", async (req, res) => {
    const list = await storage.getRatingsForTasting(req.params.id);
    res.json(list);
  });

  app.get("/api/ratings/:participantId/:whiskyId", async (req, res) => {
    const requesterId = req.headers["x-participant-id"] as string;
    if (!requesterId || requesterId !== req.params.participantId) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const rating = await storage.getRatingByParticipantAndWhisky(req.params.participantId, req.params.whiskyId);
    if (!rating) return res.status(404).json({ message: "Not found" });
    res.json(rating);
  });

  app.post("/api/ratings", async (req, res) => {
    try {
      const data = insertRatingSchema.parse(req.body);

      const tasting = await storage.getTasting(data.tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "open" && tasting.status !== "draft") {
        return res.status(403).json({ message: "Evaluation is locked" });
      }

      const maxScale = tasting.ratingScale || 100;
      let normalizedScore: number | null = null;
      if (data.overall != null) {
        const clamped = Math.max(0, Math.min(data.overall, maxScale));
        normalizedScore = maxScale === 100 ? clamped : Math.round((clamped / maxScale) * 1000) / 10;
      }

      const rating = await storage.upsertRating({ ...data, normalizedScore });
      res.json(rating);
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  // ===== ANALYTICS (for Reveal/Insight Mode) =====

  app.get("/api/tastings/:id/analytics", async (req, res) => {
    const tastingId = req.params.id;
    const requesterId = req.query.requesterId as string | undefined;
    const tasting = await storage.getTasting(tastingId);
    if (!tasting) return res.status(404).json({ message: "Tasting not found" });

    if (tasting.status !== "reveal" && tasting.status !== "archived") {
      return res.status(403).json({ message: "Analytics not available in Ritual Mode" });
    }

    const allRatings = await storage.getRatingsForTasting(tastingId);
    const whiskyList = await storage.getWhiskiesForTasting(tastingId);
    const scale = (tasting as any).ratingScale || 100;

    const norm = (v: number) => Math.round((v / scale) * 1000) / 10;
    const r1 = (v: number) => Math.round(v * 10) / 10;

    const calcMedian = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const n = s.length;
      if (n === 0) return 0;
      return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)];
    };

    const calcIQR = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const n = s.length;
      if (n < 4) return null;
      const q1 = calcMedian(s.slice(0, Math.floor(n / 2)));
      const q3 = calcMedian(s.slice(Math.ceil(n / 2)));
      return r1(q3 - q1);
    };

    const participantIds = [...new Set(allRatings.map(r => r.participantId))];
    const participantCount = participantIds.length;

    const validRequesterId = requesterId && participantIds.includes(requesterId) ? requesterId : null;

    const whiskyAnalytics = whiskyList.map(w => {
      const wr = allRatings.filter(r => r.whiskyId === w.id);
      const count = wr.length;
      if (count === 0) return { whisky: w, count: 0, avg: 0, median: 0, stdDev: 0, iqr: null, categories: {}, myRating: null };

      const overallScores = wr.map(r => norm(r.overall));
      const avg = overallScores.reduce((a, b) => a + b, 0) / count;
      const median = calcMedian(overallScores);
      const variance = overallScores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const stdDev = Math.sqrt(variance);
      const iqr = calcIQR(overallScores);

      const categoryAvg = (key: string) => {
        const vals = wr.map(r => norm((r as any)[key] as number));
        return vals.reduce((a, b) => a + b, 0) / count;
      };
      const categoryMedian = (key: string) => {
        const vals = wr.map(r => norm((r as any)[key] as number));
        return calcMedian(vals);
      };

      let myRating = null;
      if (validRequesterId) {
        const mine = wr.find(r => r.participantId === validRequesterId);
        if (mine) {
          myRating = {
            nose: norm(mine.nose),
            taste: norm(mine.taste),
            finish: norm(mine.finish),
            balance: norm(mine.balance),
            overall: norm(mine.overall),
          };
        }
      }

      return {
        whisky: w,
        count,
        avg: r1(avg),
        median: r1(median),
        stdDev: r1(stdDev),
        iqr,
        categories: {
          nose: { avg: r1(categoryAvg("nose")), median: r1(categoryMedian("nose")) },
          taste: { avg: r1(categoryAvg("taste")), median: r1(categoryMedian("taste")) },
          finish: { avg: r1(categoryAvg("finish")), median: r1(categoryMedian("finish")) },
          balance: { avg: r1(categoryAvg("balance")), median: r1(categoryMedian("balance")) },
        },
        myRating,
      };
    });

    const ranking = [...whiskyAnalytics].sort((a, b) => b.median - a.median);

    let kendallW: number | null = null;
    if (participantCount >= 2 && whiskyList.length >= 2) {
      const k = participantCount;
      const n = whiskyList.length;
      const whiskyIds = whiskyList.map(w => w.id);

      const rankMatrix: number[][] = [];
      for (const pid of participantIds) {
        const pRatings = allRatings.filter(r => r.participantId === pid);
        if (pRatings.length < n) continue;
        const scores = whiskyIds.map(wid => {
          const rat = pRatings.find(r => r.whiskyId === wid);
          return rat ? norm(rat.overall) : 0;
        });
        const sorted = [...scores].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
        const ranks = new Array(n);
        let i = 0;
        while (i < n) {
          let j = i;
          while (j < n - 1 && sorted[j].v === sorted[j + 1].v) j++;
          const avgRank = (i + j) / 2 + 1;
          for (let x = i; x <= j; x++) ranks[sorted[x].i] = avgRank;
          i = j + 1;
        }
        rankMatrix.push(ranks);
      }

      if (rankMatrix.length >= 2) {
        const kActual = rankMatrix.length;
        const rankSums = whiskyIds.map((_, wi) => rankMatrix.reduce((sum, row) => sum + row[wi], 0));
        const meanRankSum = rankSums.reduce((a, b) => a + b, 0) / n;
        const S = rankSums.reduce((acc, rs) => acc + Math.pow(rs - meanRankSum, 2), 0);
        kendallW = r1((12 * S) / (kActual * kActual * (n * n * n - n)));
        if (kendallW > 1) kendallW = 1;
        if (kendallW < 0) kendallW = 0;
      }
    }

    const overallDistribution: { bin: string; count: number }[] = [];
    const allOverall = allRatings.map(r => norm(r.overall));
    const bins = [
      { label: "0-20", min: 0, max: 20 },
      { label: "21-40", min: 21, max: 40 },
      { label: "41-60", min: 41, max: 60 },
      { label: "61-80", min: 61, max: 80 },
      { label: "81-100", min: 81, max: 100 },
    ];
    for (const bin of bins) {
      overallDistribution.push({
        bin: bin.label,
        count: allOverall.filter(v => v >= bin.min && v <= bin.max).length,
      });
    }

    res.json({
      tasting: { ...tasting, ratingScale: scale },
      whiskyAnalytics,
      ranking,
      totalRatings: allRatings.length,
      participantCount,
      kendallW,
      overallDistribution,
    });
  });

  app.get("/api/tastings/:id/analytics/download", async (req, res) => {
    const tastingId = req.params.id;
    const requesterId = req.query.requesterId as string | undefined;
    const tasting = await storage.getTasting(tastingId);
    if (!tasting) return res.status(404).json({ message: "Tasting not found" });

    if (tasting.status !== "reveal" && tasting.status !== "archived") {
      return res.status(403).json({ message: "Analytics not available" });
    }

    const allRatings = await storage.getRatingsForTasting(tastingId);
    const whiskyList = await storage.getWhiskiesForTasting(tastingId);
    const scale = (tasting as any).ratingScale || 100;
    const norm = (v: number) => Math.round((v / scale) * 1000) / 10;
    const r1 = (v: number) => Math.round(v * 10) / 10;
    const calcMedian = (arr: number[]) => {
      const s = [...arr].sort((a, b) => a - b);
      const n = s.length;
      if (n === 0) return 0;
      return n % 2 === 0 ? (s[n / 2 - 1] + s[n / 2]) / 2 : s[Math.floor(n / 2)];
    };

    const participantIdsInTasting = [...new Set(allRatings.map(r => r.participantId))];
    const validRequesterId = requesterId && participantIdsInTasting.includes(requesterId) ? requesterId : null;

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CaskSense";

    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "#", key: "rank", width: 5 },
      { header: "Whisky", key: "name", width: 30 },
      { header: "Ratings", key: "count", width: 10 },
      { header: "Median", key: "median", width: 10 },
      { header: "Avg", key: "avg", width: 10 },
      { header: "StdDev", key: "stdDev", width: 10 },
      { header: "Nose (Avg)", key: "noseAvg", width: 12 },
      { header: "Palate (Avg)", key: "tasteAvg", width: 12 },
      { header: "Finish (Avg)", key: "finishAvg", width: 12 },
      { header: "Balance (Avg)", key: "balanceAvg", width: 12 },
    ];

    const sortedWhiskies = whiskyList.map(w => {
      const wr = allRatings.filter(r => r.whiskyId === w.id);
      const count = wr.length;
      if (count === 0) return { whisky: w, count: 0, avg: 0, median: 0, stdDev: 0, noseAvg: 0, tasteAvg: 0, finishAvg: 0, balanceAvg: 0 };
      const overallScores = wr.map(r => norm(r.overall));
      const avg = overallScores.reduce((a, b) => a + b, 0) / count;
      const median = calcMedian(overallScores);
      const variance = overallScores.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / count;
      const catAvg = (key: string) => {
        const vals = wr.map(r => norm((r as any)[key] as number));
        return vals.reduce((a, b) => a + b, 0) / count;
      };
      return { whisky: w, count, avg: r1(avg), median: r1(median), stdDev: r1(Math.sqrt(variance)), noseAvg: r1(catAvg("nose")), tasteAvg: r1(catAvg("taste")), finishAvg: r1(catAvg("finish")), balanceAvg: r1(catAvg("balance")) };
    }).sort((a, b) => b.median - a.median);

    sortedWhiskies.forEach((w, i) => {
      summarySheet.addRow({
        rank: i + 1,
        name: w.whisky.name || `Whisky #${(w.whisky as any).sortOrder || i + 1}`,
        count: w.count,
        median: w.median,
        avg: w.avg,
        stdDev: w.stdDev,
        noseAvg: w.noseAvg,
        tasteAvg: w.tasteAvg,
        finishAvg: w.finishAvg,
        balanceAvg: w.balanceAvg,
      });
    });

    summarySheet.getRow(1).font = { bold: true };

    if (validRequesterId) {
      const mySheet = workbook.addWorksheet("My Ratings");
      mySheet.columns = [
        { header: "Whisky", key: "name", width: 30 },
        { header: "My Nose", key: "myNose", width: 10 },
        { header: "My Palate", key: "myTaste", width: 10 },
        { header: "My Finish", key: "myFinish", width: 10 },
        { header: "My Balance", key: "myBalance", width: 10 },
        { header: "My Overall", key: "myOverall", width: 12 },
        { header: "Group Median", key: "groupMedian", width: 14 },
        { header: "Diff", key: "diff", width: 8 },
      ];

      for (const w of whiskyList) {
        const mine = allRatings.find(r => r.whiskyId === w.id && r.participantId === validRequesterId);
        const wr = allRatings.filter(r => r.whiskyId === w.id);
        const groupMedian = calcMedian(wr.map(r => norm(r.overall)));
        if (mine) {
          const myOverall = norm(mine.overall);
          mySheet.addRow({
            name: w.name || `Whisky #${(w as any).sortOrder || ''}`,
            myNose: norm(mine.nose),
            myTaste: norm(mine.taste),
            myFinish: norm(mine.finish),
            myBalance: norm(mine.balance),
            myOverall,
            groupMedian: r1(groupMedian),
            diff: r1(myOverall - groupMedian),
          });
        }
      }
      mySheet.getRow(1).font = { bold: true };
    }

    const tastingName = (tasting as any).name || tasting.id;
    const filename = `CaskSense_Analytics_${tastingName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
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
      if ("openaiApiKey" in req.body) {
        data.openaiApiKey = req.body.openaiApiKey || null;
      } else if (existing) {
        data.openaiApiKey = existing.openaiApiKey;
      }
      if ("photoUrl" in req.body) {
        data.photoUrl = req.body.photoUrl || null;
      } else if (existing) {
        data.photoUrl = existing.photoUrl;
      }
      if ("friendNotificationsEnabled" in req.body) {
        data.friendNotificationsEnabled = req.body.friendNotificationsEnabled;
      } else if (existing) {
        data.friendNotificationsEnabled = existing.friendNotificationsEnabled;
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
            return res.status(400).json({ message: "Current password is required to change password" });
          }
          if (!(await verifyPassword(req.body.currentPin, existing.pin))) {
            return res.status(401).json({ message: "Current password is incorrect" });
          }
        }
        updates.pin = await hashPassword(req.body.pin);
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

  app.get("/api/participants/:id/friends/online", async (req, res) => {
    try {
      const friends = await storage.getWhiskyFriends(req.params.id);
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
      const allParticipants = await Promise.all(
        friends.map(async (f: any) => {
          const matches = await storage.getParticipantByEmail(f.email);
          return matches ? { friendId: f.id, name: `${f.firstName} ${f.lastName}`.trim(), email: f.email, participantId: matches.id, lastSeenAt: matches.lastSeenAt } : null;
        })
      );
      const onlineFriends = allParticipants.filter((p: any) => p && p.lastSeenAt && new Date(p.lastSeenAt) > fiveMinAgo);
      res.json({ online: onlineFriends, count: onlineFriends.length });
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

      let emailSent = false;
      try {
        const adderName = adder?.name || firstName.trim();
        const platformLink = process.env.APP_BASE_URL || "https://casksense.com";
        const lang = (req.headers["accept-language"] || "").startsWith("de") ? "de" : "en";
        const emailContent = buildFriendInviteEmail({
          adderName,
          recipientName: firstName.trim(),
          platformLink,
          language: lang,
        });
        emailSent = await sendEmail({ to: normalizedEmail, ...emailContent });
      } catch (err) {
        console.error("Error sending friend invite email:", err);
      }

      res.status(201).json({ ...friend, emailSent });
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

      const { emails, personalNote, customSubject, customBody } = req.body;
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "At least one email required" });
      }

      const callerId = req.headers["x-participant-id"] as string | undefined;
      if (callerId && callerId !== tasting.hostId) {
        return res.status(403).json({ message: "Only the host can send invitations" });
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
            customSubject: customSubject || undefined,
            customBody: customBody || undefined,
          });
          emailSent = await sendEmail({
            to: trimmed,
            subject: emailContent.subject,
            html: emailContent.html,
          });
        }

        results.push({ email: trimmed, token, link, emailSent });

        try {
          const existingUser = await storage.getParticipantByEmail(trimmed);
          if (existingUser) {
            await storage.createNotification({
              recipientId: existingUser.id,
              type: "invitation",
              title: `You're invited to "${tasting.title}"`,
              message: `${hostName} has invited you to the tasting "${tasting.title}" on ${tasting.date} at ${tasting.location}.`,
              linkUrl: `/invite/${token}`,
              tastingId: tasting.id,
              isGlobal: false,
            });
          }
        } catch {}
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

      try {
        const tasting = await storage.getTasting(invite.tastingId);
        const joiner = await storage.getParticipant(participantId);
        if (tasting && joiner && tasting.hostId !== participantId) {
          await storage.createNotification({
            recipientId: tasting.hostId,
            type: "join",
            title: `${joiner.name} accepted your invitation`,
            message: `${joiner.name} has accepted the invitation and joined "${tasting.title}".`,
            linkUrl: `/tasting/${tasting.id}`,
            tastingId: tasting.id,
            isGlobal: false,
          });
        }
      } catch {}

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

  // ===== GUIDED TASTING =====

  app.patch("/api/tastings/:id/guided-mode", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can change guided mode" });
      const updates: any = {};
      if (req.body.guidedMode !== undefined) updates.guidedMode = req.body.guidedMode;
      if (req.body.guidedWhiskyIndex !== undefined) updates.guidedWhiskyIndex = req.body.guidedWhiskyIndex;
      if (req.body.guidedRevealStep !== undefined) updates.guidedRevealStep = req.body.guidedRevealStep;
      const updated = await storage.updateTastingBlindMode(req.params.id, updates);
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/guided-advance", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can advance the guided tasting" });

      const whiskyList = await storage.getWhiskiesForTasting(req.params.id);
      const totalWhiskies = whiskyList.length;
      if (totalWhiskies === 0) return res.status(400).json({ message: "No whiskies in tasting" });

      let idx = tasting.guidedWhiskyIndex ?? -1;
      let step = tasting.guidedRevealStep ?? 0;

      if (idx === -1) {
        idx = 0;
        step = 0;
      } else if (step < 3) {
        step++;
      } else {
        if (idx < totalWhiskies - 1) {
          idx++;
          step = 0;
        } else {
          return res.json({ ...tasting, guidedWhiskyIndex: idx, guidedRevealStep: step, allComplete: true });
        }
      }

      const updated = await storage.updateTastingBlindMode(req.params.id, { guidedWhiskyIndex: idx, guidedRevealStep: step });
      const allComplete = idx >= totalWhiskies - 1 && step >= 3;
      res.json({ ...updated, allComplete });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/guided-goto", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId, whiskyIndex, revealStep } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can control guided tasting" });

      const whiskyList = await storage.getWhiskiesForTasting(req.params.id);
      if (whiskyIndex < 0 || whiskyIndex >= whiskyList.length) return res.status(400).json({ message: "Invalid whisky index" });

      const updated = await storage.updateTastingBlindMode(req.params.id, {
        guidedWhiskyIndex: whiskyIndex,
        guidedRevealStep: revealStep ?? 0,
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/whiskies/:id/ai-enrich", async (req, res) => {
    try {
      const { participantId } = req.body;
      const { client: openai } = await getAIClient(participantId, "ai_enrich");
      if (!openai) return res.status(503).json({ message: "AI not available. Add your OpenAI API key in your profile to enable AI features." });
      const whisky = await storage.getWhisky(req.params.id);
      if (!whisky) return res.status(404).json({ message: "Whisky not found" });

      if (whisky.aiFactsCache) {
        try {
          return res.json(JSON.parse(whisky.aiFactsCache));
        } catch {}
      }
      const prompt = `You are a whisky expert. For the following whisky, provide:
1. 3-4 interesting and potentially surprising facts (historical, production, or cultural)
2. The distillery's official website URL (if known, otherwise null)
3. A brief one-sentence "Did you know?" fact that would surprise even enthusiasts

Whisky: ${whisky.name}
${whisky.distillery ? `Distillery: ${whisky.distillery}` : ""}
${whisky.region ? `Region: ${whisky.region}` : ""}
${whisky.age ? `Age: ${whisky.age}` : ""}
${whisky.category ? `Category: ${whisky.category}` : ""}
${whisky.caskInfluence ? `Cask: ${whisky.caskInfluence}` : ""}
${whisky.bottler ? `Bottler: ${whisky.bottler}` : ""}
${whisky.vintage ? `Vintage: ${whisky.vintage}` : ""}

Respond in JSON format:
{
  "facts": ["fact1", "fact2", "fact3"],
  "distilleryUrl": "https://...",
  "didYouKnow": "...",
  "whiskybaseUrl": "https://www.whiskybase.com/whiskies/whisky/XXXXX"
}

For whiskybaseUrl: if the whiskybase ID is known, use it. Otherwise provide a search URL.
If distillery URL is unknown, set to null.
Respond ONLY with valid JSON, no markdown.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      });

      let enrichment: any = { facts: [], distilleryUrl: null, didYouKnow: null, whiskybaseUrl: null };
      try {
        const raw = completion.choices[0]?.message?.content?.trim() || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        enrichment = JSON.parse(cleaned);
      } catch {}

      if (whisky.whiskybaseId) {
        enrichment.whiskybaseUrl = `https://www.whiskybase.com/whiskies/whisky/${whisky.whiskybaseId}`;
      }
      if (whisky.distilleryUrl) {
        enrichment.distilleryUrl = whisky.distilleryUrl;
      }

      await storage.updateWhisky(req.params.id, { aiFactsCache: JSON.stringify(enrichment) } as any);

      res.json(enrichment);
    } catch (e: any) {
      console.error("AI enrich error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ===== DRAM TIMER =====

  app.post("/api/tastings/:id/dram-timer", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId, whiskyId } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can control the timer" });

      const timers: Record<string, number> = tasting.dramTimers ? JSON.parse(tasting.dramTimers) : {};
      if (tasting.dramStartedAt && tasting.activeWhiskyId) {
        const elapsed = Math.floor((Date.now() - new Date(tasting.dramStartedAt).getTime()) / 1000);
        timers[tasting.activeWhiskyId] = (timers[tasting.activeWhiskyId] || 0) + elapsed;
      }

      const updated = await storage.updateTasting(req.params.id, {
        dramStartedAt: new Date(),
        dramTimers: JSON.stringify(timers),
        activeWhiskyId: whiskyId || tasting.activeWhiskyId,
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/rating-prompt", async (req, res) => {
    try {
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      const { hostId, prompt } = req.body;
      if (hostId !== tasting.hostId) return res.status(403).json({ message: "Only the host can send prompts" });
      const updated = await storage.updateTasting(req.params.id, {
        ratingPrompt: prompt || null,
      });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== AI WHISKY INSIGHTS =====

  app.post("/api/whiskies/ai-insights", async (req, res) => {
    try {
      const { participantId, whiskyId, whiskyName, distillery, region, age, abv, caskInfluence, category, peatLevel, language } = req.body;
      const customPrompt = typeof req.body?.customPrompt === "string" ? req.body.customPrompt.trim().slice(0, 500) : "";
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      if (!whiskyName) return res.status(400).json({ message: "whiskyName required" });
      const { client: openai } = await getAIClient(participantId, "ai_insights");
      if (!openai) return res.status(503).json({ message: "AI not available. Add your OpenAI API key in your profile to enable AI features." });
      const lang = language === "de" ? "German" : "English";
      const cacheKey = language === "de" ? "de" : "en";

      if (whiskyId && !customPrompt) {
        const whisky = await storage.getWhisky(whiskyId);
        if (whisky?.aiInsightsCache) {
          try {
            const cached = JSON.parse(whisky.aiInsightsCache);
            if (cached[cacheKey]) {
              return res.json({ insights: cached[cacheKey], cached: true });
            }
          } catch {}
        }
      }

      const details = [
        whiskyName,
        distillery && `Distillery: ${distillery}`,
        region && `Region: ${region}`,
        age && `Age: ${age}`,
        abv && `ABV: ${abv}%`,
        caskInfluence && `Cask: ${caskInfluence}`,
        category && `Category: ${category}`,
        peatLevel && `Peat: ${peatLevel}`,
      ].filter(Boolean).join(", ");

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a knowledgeable whisky expert providing fascinating background information about whiskies during a tasting session. Keep responses concise (3-5 short paragraphs), engaging, and surprising. Include:
- Brief history or interesting facts about the distillery
- What makes this particular expression special or noteworthy
- Tasting context: what to look for, food pairings, or serving suggestions
- Any awards, notable reviews, or interesting production details
- A fun or surprising fact that even experienced whisky enthusiasts might not know

Write in a warm, conversational tone. ALWAYS respond in ${lang}. Do NOT use markdown headers or bullet points - write flowing prose paragraphs. Keep it informative but not overwhelming.`
          },
          {
            role: "user",
            content: `Tell me fascinating background information about this whisky: ${details}${customPrompt ? `\n\nAdditional focus from the user: ${customPrompt}` : ""}`
          }
        ],
        max_tokens: 800,
        temperature: 0.8,
      });

      const insights = response.choices[0]?.message?.content || "No insights available.";

      if (whiskyId) {
        try {
          const whisky = await storage.getWhisky(whiskyId);
          let existing: Record<string, string> = {};
          if (whisky?.aiInsightsCache) {
            try { existing = JSON.parse(whisky.aiInsightsCache); } catch {}
          }
          existing[cacheKey] = insights;
          await storage.updateWhisky(whiskyId, { aiInsightsCache: JSON.stringify(existing) } as any);
        } catch {}
      }

      res.json({ insights });
    } catch (e: any) {
      console.error("AI insights error:", e.message);
      res.status(500).json({ message: "Could not generate insights" });
    }
  });

  // ===== AI SESSION HIGHLIGHTS =====

  app.post("/api/tastings/:id/ai-highlights", async (req, res) => {
    try {
      if (await isAIDisabled("ai_highlights")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const { language } = req.body;
      const lang = language === "de" ? "German" : "English";
      const cacheKey = language === "de" ? "de" : "en";
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const allRatings = await storage.getRatingsForTasting(req.params.id);
      const currentRatingCount = allRatings.length;

      if (tasting.aiHighlightsCache && tasting.aiHighlightsRatingCount === currentRatingCount) {
        try {
          const cached = JSON.parse(tasting.aiHighlightsCache);
          if (cached[cacheKey]) {
            return res.json({ ...cached[cacheKey], cached: true });
          }
        } catch {}
      }

      const whiskies = await storage.getWhiskiesForTasting(req.params.id);
      const participants = await storage.getTastingParticipants(req.params.id);
      const participantMap = new Map<string, string>();
      for (const tp of participants) {
        const p = await storage.getParticipant(tp.participantId);
        if (p) participantMap.set(tp.participantId, p.name);
      }

      const whiskyData = whiskies.map(w => {
        const wRatings = allRatings.filter(r => r.whiskyId === w.id);
        const avgOverall = wRatings.length > 0 ? wRatings.reduce((s, r) => s + r.overall, 0) / wRatings.length : 0;
        return {
          name: w.name,
          distillery: w.distillery,
          age: w.age,
          abv: w.abv,
          avgScore: avgOverall.toFixed(1),
          ratingCount: wRatings.length,
          ratings: wRatings.map(r => ({
            participant: participantMap.get(r.participantId) || "Unknown",
            overall: r.overall,
            nose: r.nose,
            taste: r.taste,
            finish: r.finish,
            notes: r.notes,
          })),
        };
      });

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are analyzing a whisky tasting session to create engaging highlights and insights. Return a JSON object with these fields:
- "summary": A 2-3 sentence entertaining summary of the evening (string)
- "topWhisky": The highest-rated whisky name and why it stood out (string)
- "surpriseWinner": If any lower-expected whisky scored well, mention it (string or null)
- "tasteTwins": Pairs of participants who had the most similar ratings patterns, with their names (string or null)
- "mostDivisive": The whisky with the biggest rating spread, and who loved/disliked it (string or null)
- "funFacts": An array of 2-3 short fun observations about the tasting data (string[])

Be specific with names and numbers. Make it entertaining and create "aha" moments. Write in a warm, engaging style. ALWAYS respond in ${lang}.`
          },
          {
            role: "user",
            content: `Tasting: "${tasting.title}" on ${tasting.date} at ${tasting.location}\n\nWhisky data:\n${JSON.stringify(whiskyData, null, 2)}`
          }
        ],
        max_tokens: 1200,
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "{}";
      let highlights;
      try { highlights = JSON.parse(content); } catch { highlights = { summary: content }; }

      try {
        let existingCache: Record<string, any> = {};
        if (tasting.aiHighlightsCache && tasting.aiHighlightsRatingCount === currentRatingCount) {
          try { existingCache = JSON.parse(tasting.aiHighlightsCache); } catch {}
        }
        existingCache[cacheKey] = highlights;
        await storage.updateTasting(req.params.id, {
          aiHighlightsCache: JSON.stringify(existingCache),
          aiHighlightsRatingCount: currentRatingCount,
        } as any);
      } catch {}

      res.json(highlights);
    } catch (e: any) {
      console.error("AI highlights error:", e.message);
      res.status(500).json({ message: "Could not generate highlights" });
    }
  });

  app.post("/api/tastings/:id/ai-narrative", async (req, res) => {
    try {
      if (await isAIDisabled("ai_narrative")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const requesterId = req.headers["x-participant-id"] as string | undefined;
      if (!requesterId) return res.status(401).json({ message: "Missing participant ID" });
      const { language, force } = req.body;
      const customPrompt = typeof req.body?.customPrompt === "string" ? req.body.customPrompt.trim().slice(0, 500) : "";
      const lang = language === "de" ? "German" : "English";
      const tasting = await storage.getTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const requester = await storage.getParticipant(requesterId);
      if (!requester) return res.status(401).json({ message: "Unknown participant" });
      if (tasting.hostId !== requesterId && requester.role !== "admin") {
        return res.status(403).json({ message: "Only the host or admin can generate narratives" });
      }

      const allowedStatuses = ["closed", "reveal", "archived"];
      if (!allowedStatuses.includes(tasting.status)) {
        return res.status(400).json({ message: "Narrative can only be generated for closed, revealed, or archived tastings" });
      }

      if (tasting.aiNarrative && !force) {
        return res.json({ narrative: tasting.aiNarrative, cached: true });
      }

      const allRatings = await storage.getRatingsForTasting(req.params.id);
      const tastingWhiskies = await storage.getWhiskiesForTasting(req.params.id);
      const tastingParticipantRecords = await storage.getTastingParticipants(req.params.id);
      const participantMap = new Map<string, string>();
      for (const tp of tastingParticipantRecords) {
        participantMap.set(tp.participantId, tp.participant.name);
      }

      const whiskyData = tastingWhiskies.map(w => {
        const wRatings = allRatings.filter(r => r.whiskyId === w.id);
        const avgOverall = wRatings.length > 0 ? wRatings.reduce((s, r) => s + (r.overall ?? 0), 0) / wRatings.length : 0;
        const scores = wRatings.map(r => r.overall ?? 0);
        const spread = scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 0;
        return {
          name: w.name,
          distillery: w.distillery,
          age: w.age,
          abv: w.abv,
          region: w.region,
          caskInfluence: w.caskInfluence,
          peatLevel: w.peatLevel,
          avgScore: avgOverall.toFixed(1),
          ratingCount: wRatings.length,
          spread: spread.toFixed(1),
          ratings: wRatings.map(r => ({
            participant: participantMap.get(r.participantId) || "Unknown",
            overall: r.overall,
            nose: r.nose,
            taste: r.taste,
            finish: r.finish,
            notes: r.notes,
          })),
        };
      });

      let discussionThemes: string[] = [];
      try {
        const discussions = await storage.getDiscussionEntries(req.params.id);
        discussionThemes = discussions.slice(0, 20).map(d => {
          const name = participantMap.get(d.participantId) || "Unknown";
          return `${name}: "${d.text}"`;
        });
      } catch {}

      let reflectionThemes: string[] = [];
      try {
        const reflections = await storage.getReflectionEntries(req.params.id);
        reflectionThemes = reflections.slice(0, 15).map(r => r.text);
      } catch {}

      let voiceMemoData: string[] = [];
      try {
        const memos = await storage.getVoiceMemosForTasting(req.params.id);
        for (const memo of memos) {
          if (memo.transcript && memo.transcript !== "[Transcription failed]") {
            const name = participantMap.get(memo.participantId) || "Unknown";
            const whisky = tastingWhiskies.find(w => w.id === memo.whiskyId);
            const whiskyName = whisky?.name || "Unknown whisky";
            voiceMemoData.push(`[${whiskyName}] ${name}: "${memo.transcript}"`);
          }
        }
      } catch {}

      let historicalContext = "";
      try {
        const hostId = tasting.hostId;
        const allHostTastings = await storage.getTastingsForParticipant(hostId);
        const closedTastings = allHostTastings.filter(t =>
          t.hostId === hostId && ["closed", "reveal", "archived"].includes(t.status)
        );
        const tastingNumber = closedTastings.length;
        if (tastingNumber <= 1) {
          historicalContext = "This is the group's first tasting session.";
        } else {
          historicalContext = `This is approximately the host's ${tastingNumber}${tastingNumber === 2 ? 'nd' : tastingNumber === 3 ? 'rd' : 'th'} tasting session.`;
        }
      } catch {}

      const participantNames = Array.from(participantMap.values());

      const { client } = await getAIClient(null, "ai_narrative");
      if (!client) {
        return res.status(503).json({ message: "AI service not available" });
      }

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a whisky journalist covering an intimate tasting event. Write a narrative story of the tasting evening (400-600 words, Markdown format).

Structure with these sections (use ## headings):
## The Setting
## The Journey
## Group Dynamics
## The Verdict
## What's Next

Guidelines:
- Name participants, reference specific scores, mention surprises
- Write vividly but warmly, like covering a cultural event
- Highlight consensus moments and disagreements
- Note any standout whiskies or unexpected favorites
- End with a forward-looking note
- ALWAYS write in ${lang}`
          },
          {
            role: "user",
            content: `Tasting: "${tasting.title}" on ${tasting.date} at ${tasting.location}
Participants: ${participantNames.join(", ")}
${historicalContext}

Whisky Flight:
${JSON.stringify(whiskyData, null, 2)}

${discussionThemes.length > 0 ? `Discussion highlights:\n${discussionThemes.join("\n")}` : ""}

${reflectionThemes.length > 0 ? `Reflection themes (anonymous):\n${reflectionThemes.join("\n")}` : ""}

${voiceMemoData.length > 0 ? `Voice memos from participants (recorded live during tasting — these are spontaneous first-hand reactions, weave them into the narrative):\n${voiceMemoData.join("\n")}` : ""}${customPrompt ? `\n\nAdditional focus from the host: ${customPrompt}` : ""}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.8,
      });

      const narrative = response.choices[0]?.message?.content || "";

      try {
        await storage.updateTasting(req.params.id, { aiNarrative: narrative } as any);
      } catch {}

      res.json({ narrative, cached: false });
    } catch (e: any) {
      console.error("AI narrative error:", e.message);
      res.status(500).json({ message: "Could not generate narrative" });
    }
  });

  // ===== VOICE MEMOS =====
  app.post("/api/tastings/:tastingId/whiskies/:whiskyId/voice-memo", (req: any, res: any, next: any) => {
    audioUpload.single("audio")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: "Audio must be under 5 MB" });
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      const participantId = req.headers["x-participant-id"] as string | undefined;
      if (!participantId) return res.status(401).json({ message: "Missing participant ID" });

      const tasting = await storage.getTasting(req.params.tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.status !== "open") return res.status(400).json({ message: "Voice memos can only be recorded during open tastings" });

      const isInTasting = await storage.isParticipantInTasting(req.params.tastingId, participantId);
      if (!isInTasting) return res.status(403).json({ message: "Not a participant in this tasting" });

      if (!req.file) return res.status(400).json({ message: "No audio file provided" });

      const whisky = await storage.getWhisky(req.params.whiskyId);
      if (!whisky || whisky.tastingId !== req.params.tastingId) {
        return res.status(404).json({ message: "Whisky not found in this tasting" });
      }

      const audioBuffer = req.file.buffer as Buffer;
      const durationSeconds = parseInt(req.body.durationSeconds || "0", 10);

      const participant = await storage.getParticipant(participantId);
      const lang = participant?.language || undefined;

      let audioUrl: string | null = null;
      try {
        audioUrl = await uploadBufferToObjectStorage(objectStorage, audioBuffer, req.file.mimetype);
      } catch (e: any) {
        console.error("Voice memo upload error:", e.message);
      }

      let transcript = "";
      try {
        const { detectAudioFormat, convertToWav, speechToText } = await import("./replit_integrations/audio/client.js");
        const format = detectAudioFormat(audioBuffer);
        let wavBuffer = audioBuffer;
        if (format !== "wav") {
          wavBuffer = await convertToWav(audioBuffer);
        }
        transcript = await speechToText(wavBuffer, "wav", lang);
      } catch (e: any) {
        console.error("Voice memo transcription error:", e.message);
        transcript = "[Transcription failed]";
      }

      const memo = await storage.createVoiceMemo({
        tastingId: req.params.tastingId,
        whiskyId: req.params.whiskyId,
        participantId,
        audioUrl,
        transcript,
        durationSeconds: durationSeconds || null,
      });

      res.status(201).json({ ...memo, participantName: participant?.name || "Unknown" });
    } catch (e: any) {
      console.error("Voice memo error:", e.message);
      res.status(500).json({ message: "Could not process voice memo" });
    }
  });

  app.get("/api/tastings/:tastingId/whiskies/:whiskyId/voice-memos", async (req, res) => {
    try {
      const participantId = req.headers["x-participant-id"] as string | undefined;
      if (!participantId) return res.status(401).json({ message: "Missing participant ID" });

      const isInTasting = await storage.isParticipantInTasting(req.params.tastingId, participantId);
      const requester = await storage.getParticipant(participantId);
      if (!isInTasting && requester?.role !== "admin") return res.status(403).json({ message: "Not authorized" });

      const memos = await storage.getVoiceMemosForWhisky(req.params.tastingId, req.params.whiskyId);
      const enriched = await Promise.all(memos.map(async (m) => {
        const p = await storage.getParticipant(m.participantId);
        return { ...m, participantName: p?.name || "Unknown" };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: "Could not fetch voice memos" });
    }
  });

  app.get("/api/tastings/:tastingId/voice-memos", async (req, res) => {
    try {
      const participantId = req.headers["x-participant-id"] as string | undefined;
      if (!participantId) return res.status(401).json({ message: "Missing participant ID" });

      const isInTasting = await storage.isParticipantInTasting(req.params.tastingId, participantId);
      const requester = await storage.getParticipant(participantId);
      if (!isInTasting && requester?.role !== "admin") return res.status(403).json({ message: "Not authorized" });

      const memos = await storage.getVoiceMemosForTasting(req.params.tastingId);
      const enriched = await Promise.all(memos.map(async (m) => {
        const p = await storage.getParticipant(m.participantId);
        return { ...m, participantName: p?.name || "Unknown" };
      }));
      res.json(enriched);
    } catch (e: any) {
      res.status(500).json({ message: "Could not fetch voice memos" });
    }
  });

  app.delete("/api/tastings/:tastingId/voice-memos/:memoId", async (req, res) => {
    try {
      const participantId = req.headers["x-participant-id"] as string | undefined;
      if (!participantId) return res.status(401).json({ message: "Missing participant ID" });

      const memo = await storage.getVoiceMemosForTasting(req.params.tastingId);
      const target = memo.find(m => m.id === req.params.memoId);
      if (!target) return res.status(404).json({ message: "Voice memo not found" });

      const requester = await storage.getParticipant(participantId);
      const tasting = await storage.getTasting(req.params.tastingId);
      const isOwner = target.participantId === participantId;
      const isHost = tasting?.hostId === participantId;
      const isAdmin = requester?.role === "admin";
      if (!isOwner && !isHost && !isAdmin) return res.status(403).json({ message: "Not authorized to delete this memo" });

      await storage.deleteVoiceMemo(req.params.memoId, target.participantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: "Could not delete voice memo" });
    }
  });

  // ===== CONNOISSEUR REPORTS =====

  app.post("/api/participants/:id/connoisseur-report", async (req, res) => {
    try {
      if (await isAIDisabled("connoisseur_report")) return res.status(503).json({ message: "AI feature disabled by admin" });

      const participantId = req.params.id;
      const requesterId = req.headers["x-participant-id"] as string | undefined;
      if (!requesterId || requesterId !== participantId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const { client: openai } = await getAIClient(participantId, "connoisseur_report");
      if (!openai) return res.status(503).json({ message: "AI not available" });

      const requestedLang = req.body?.language;
      const customPrompt = typeof req.body?.customPrompt === "string" ? req.body.customPrompt.trim().slice(0, 500) : "";
      const acceptLang = req.headers["accept-language"] || "";
      const lang = requestedLang === "de" || requestedLang === "en"
        ? requestedLang
        : participant.language === "de" || acceptLang.startsWith("de") ? "de" : "en";
      const langLabel = lang === "de" ? "German" : "English";

      const flavorProfile = await storage.getFlavorProfile(participantId);
      const stats = await storage.getParticipantStats(participantId);
      const journalEntries = await storage.getJournalEntries(participantId);
      const collection = await storage.getWhiskybaseCollection(participantId);
      const tasteTwins = await storage.getTasteTwins(participantId);

      let communityRankPosition: number | null = null;
      try {
        const communityScores = await storage.getCommunityScores();
        const allParticipantIds = new Set<string>();
        const allRatings = await storage.getAllRatings();
        for (const r of allRatings) allParticipantIds.add(r.participantId);
        communityRankPosition = Array.from(allParticipantIds).indexOf(participantId) + 1;
        if (communityRankPosition === 0) communityRankPosition = null;
      } catch {}

      const topWhiskies = flavorProfile.ratedWhiskies
        .sort((a, b) => (b.rating.overall || 0) - (a.rating.overall || 0))
        .slice(0, 5)
        .map(rw => ({
          name: rw.whisky.name,
          distillery: rw.whisky.distillery,
          region: rw.whisky.region,
          score: rw.rating.overall,
        }));

      const regionBreakdown = Object.entries(flavorProfile.regionBreakdown)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 8)
        .map(([region, data]) => ({ region, count: data.count, avgScore: Math.round(data.avgScore * 10) / 10 }));

      const ageDistribution: Record<string, number> = {};
      for (const item of collection) {
        const age = item.statedAge || "NAS";
        ageDistribution[age] = (ageDistribution[age] || 0) + 1;
      }

      const dataSnapshot = {
        totalRatings: stats.totalRatings,
        totalTastings: stats.totalTastings,
        totalJournalEntries: stats.totalJournalEntries,
        collectionSize: collection.length,
        avgScores: flavorProfile.avgScores,
        topRegion: regionBreakdown[0]?.region || null,
        topRegionCount: regionBreakdown[0]?.count || 0,
        smokeAffinityIndex: participant.smokeAffinityIndex,
        sweetnessBias: participant.sweetnessBias,
        ratingStabilityScore: participant.ratingStabilityScore,
        explorationIndex: participant.explorationIndex,
        tasteTwinsCount: tasteTwins.length,
        topTasteTwin: tasteTwins[0]?.participantName || null,
        topTasteTwinCorrelation: tasteTwins[0]?.correlation || null,
      };

      const profileData = {
        name: participant.name,
        totalRatings: stats.totalRatings,
        totalTastings: stats.totalTastings,
        totalJournalEntries: stats.totalJournalEntries,
        avgScores: flavorProfile.avgScores,
        topWhiskies,
        regionBreakdown,
        caskBreakdown: Object.entries(flavorProfile.caskBreakdown)
          .sort((a, b) => b[1].count - a[1].count)
          .slice(0, 5)
          .map(([cask, data]) => ({ cask, count: data.count, avgScore: Math.round(data.avgScore * 10) / 10 })),
        peatBreakdown: Object.entries(flavorProfile.peatBreakdown)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([level, data]) => ({ level, count: data.count, avgScore: Math.round(data.avgScore * 10) / 10 })),
        collectionSize: collection.length,
        collectionRegions: Object.keys(ageDistribution).length,
        journalCount: journalEntries.length,
        recentJournals: journalEntries.slice(0, 3).map(j => ({ title: j.title, whisky: j.whiskyName, score: j.personalScore })),
        smokeAffinityIndex: participant.smokeAffinityIndex,
        sweetnessBias: participant.sweetnessBias,
        ratingStabilityScore: participant.ratingStabilityScore,
        explorationIndex: participant.explorationIndex,
        tasteTwins: tasteTwins.slice(0, 3).map(t => ({ name: t.participantName, correlation: t.correlation, sharedWhiskies: t.sharedWhiskies })),
        communityRankPosition,
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a master blender and whisky educator assessing a fellow whisky enthusiast's profile. Write a professional, respectful, and insightful Connoisseur Report.

Return a JSON object with exactly two fields:
- "report": A Markdown-formatted report (800-1200 words) with these sections:
  ## Overview
  ## Palate Profile
  ## Strengths & Preferences
  ## Evolution & Growth
  ## Collection Character
  ## Community Standing
  ## Recommendations
  
  Use specific data points, scores, and names from the provided data. Be precise and analytical yet warm. Avoid generic platitudes — reference actual whiskies, regions, and scores.

- "summary": A 2-3 sentence shareable summary that captures the essence of this person's whisky personality. This should be quotable and compelling.

ALWAYS respond in ${langLabel}. Use the tone of a knowledgeable master blender addressing a respected colleague.`
          },
          {
            role: "user",
            content: `Generate a Connoisseur Report for this whisky enthusiast:\n\n${JSON.stringify(profileData, null, 2)}${customPrompt ? `\n\nAdditional focus from the user: ${customPrompt}` : ""}`
          }
        ],
        max_tokens: 3000,
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content || "{}";
      let parsed: { report?: string; summary?: string };
      try { parsed = JSON.parse(content); } catch { parsed = { report: content, summary: "" }; }

      const reportContent = parsed.report || content;
      const summary = parsed.summary || "";

      const report = await storage.createConnoisseurReport({
        participantId,
        reportContent,
        summary,
        dataSnapshot,
        language: lang,
      });

      res.status(201).json(report);
    } catch (e: any) {
      console.error("Connoisseur report error:", e.message);
      res.status(500).json({ message: "Could not generate connoisseur report" });
    }
  });

  app.get("/api/participants/:id/connoisseur-reports", async (req, res) => {
    try {
      const participantId = req.params.id;
      const requesterId = req.headers["x-participant-id"] as string | undefined;
      if (!requesterId || requesterId !== participantId) {
        const requester = requesterId ? await storage.getParticipant(requesterId) : null;
        if (!requester || requester.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const reports = await storage.getConnoisseurReports(participantId);
      res.json(reports);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/participants/:id/connoisseur-reports/:reportId", async (req, res) => {
    try {
      const participantId = req.params.id;
      const requesterId = req.headers["x-participant-id"] as string | undefined;
      if (!requesterId || requesterId !== participantId) {
        const requester = requesterId ? await storage.getParticipant(requesterId) : null;
        if (!requester || requester.role !== "admin") {
          return res.status(403).json({ message: "Forbidden" });
        }
      }

      const report = await storage.getConnoisseurReport(req.params.reportId);
      if (!report || report.participantId !== participantId) {
        return res.status(404).json({ message: "Report not found" });
      }
      res.json(report);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/participants/:id/connoisseur-reports/:reportId", async (req, res) => {
    try {
      const participantId = req.params.id;
      const auth = await requireOwnerOrAdmin(req, participantId);
      if (!auth.authorized) {
        return res.status(auth.status).json({ message: auth.message });
      }

      const report = await storage.getConnoisseurReport(req.params.reportId);
      if (!report || report.participantId !== participantId) {
        return res.status(404).json({ message: "Report not found" });
      }

      await storage.deleteConnoisseurReport(req.params.reportId);
      res.json({ success: true });
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
      const entry = await storage.createDiscussionEntry({ tastingId: req.params.id, participantId, text: stripHtmlTags(text.trim()) });
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

  // --- Whiskybase Lookup (auto-fill from WB ID) ---

  const wbLookupCache = new Map<string, { data: any; ts: number }>();
  const wbLookupRateMap = new Map<string, number[]>();
  const WB_RATE_LIMIT = 10;
  const WB_RATE_WINDOW = 60_000;
  const WB_CACHE_TTL = 3600_000;

  app.get("/api/whiskybase-lookup/:wbId", async (req: Request, res: Response) => {
    try {
      const wbId = (req.params.wbId as string).trim();
      if (!wbId || wbId.length > 10 || !/^\d+$/.test(wbId)) {
        return res.status(400).json({ error: "Invalid Whiskybase ID (numeric, max 10 digits)" });
      }

      const participantId = req.headers["x-participant-id"] as string | undefined;

      if (participantId) {
        const collection = await storage.getWhiskybaseCollection(participantId);
        const match = collection.find((item: any) => item.whiskybaseId === wbId);
        if (match) {
          return res.json({
            source: "collection",
            name: match.name || "",
            distillery: match.distillery || match.brand || "",
            age: match.statedAge || "",
            abv: match.abv || "",
            caskType: match.caskType || "",
            price: match.pricePaid ? `€${match.pricePaid}` : "",
          });
        }
      }

      const cached = wbLookupCache.get(wbId);
      if (cached && Date.now() - cached.ts < WB_CACHE_TTL) {
        return res.json(cached.data);
      }

      const rateKey = participantId || req.ip || "anon";
      const now = Date.now();
      const history = (wbLookupRateMap.get(rateKey) || []).filter(t => now - t < WB_RATE_WINDOW);
      if (history.length >= WB_RATE_LIMIT) {
        return res.status(429).json({ error: "Too many lookups, please wait" });
      }
      history.push(now);
      wbLookupRateMap.set(rateKey, history);

      const { client } = await getAIClient(participantId || undefined, "whiskybase_lookup");
      if (!client) {
        return res.status(503).json({ error: "ai_unavailable" });
      }

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a whisky expert with extensive knowledge of the Whiskybase.com database. Given a Whiskybase ID number, return what you know about this whisky. Return JSON with fields: name (full product name), distillery, age (just the number or empty string), abv (with % sign or empty string), caskType, region, price (estimated retail price in EUR with € sign, or empty string). If you don't know a field, return an empty string. If you cannot identify the whisky at all, return {"found": false}.`,
          },
          {
            role: "user",
            content: `Whiskybase ID: ${wbId}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");

      if (parsed.found === false) {
        return res.status(404).json({ error: "Whisky not found" });
      }

      const result = {
        source: "ai" as const,
        name: parsed.name || "",
        distillery: parsed.distillery || "",
        age: String(parsed.age || ""),
        abv: parsed.abv || "",
        caskType: parsed.caskType || parsed.cask_type || "",
        region: parsed.region || "",
        price: parsed.price || "",
      };

      wbLookupCache.set(wbId, { data: result, ts: Date.now() });
      res.json(result);
    } catch (error: any) {
      console.error("Whiskybase lookup error:", error.message);
      res.status(500).json({ error: "Lookup failed" });
    }
  });

  // --- Barcode Lookup (EAN/UPC to whisky) ---


  app.get("/api/barcode-lookup/:code", async (req: Request, res: Response) => {
    try {
      const code = (req.params.code as string).trim();
      if (!code || code.length < 8 || code.length > 14 || !/^\d+$/.test(code)) {
        return res.status(400).json({ error: "Invalid barcode (8-14 digits)" });
      }

      return res.status(404).json({ error: "not_in_database", suggestion: "photo" });
    } catch (error: any) {
      console.error("Barcode lookup error:", error.message);
      res.status(500).json({ error: "Lookup failed" });
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
        
        const rawHeaders = parseCSVLine(headerLine, delimiter);
        const headerCount: Record<string, number> = {};
        const headers = rawHeaders.map(h => {
          headerCount[h] = (headerCount[h] || 0) + 1;
          return headerCount[h] > 1 ? `${h}_${headerCount[h]}` : h;
        });
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = parseCSVLine(lines[i], delimiter);
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
          rows.push(row);
        }
      } else {
        const workbook = await readExcelBuffer(file.buffer);
        const sheetName = workbook.SheetNames[0];
        rows = sheetToJson(workbook.Sheets[sheetName], { defval: "" });
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
      const existingByCollection = new Map(existingItems.filter(item => item.collectionId).map(item => [item.collectionId, true]));
      const existingByWb = new Map(existingItems.map(item => [item.whiskybaseId, true]));
      
      for (const row of rows) {
        const whiskybaseId = colMap(row, "ID", "id");
        if (!whiskybaseId) { skipped++; continue; }
        
        const name = colMap(row, "Name", "name");
        if (!name) { skipped++; continue; }
        
        const collId = colMap(row, "Sammlungs-ID", "Collection ID", "Collection-ID");
        const isUpdate = collId
          ? existingByCollection.has(collId)
          : existingByWb.has(whiskybaseId);
        
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
          avgPriceCurrency: colMap(row, "Währung Whisky", "Currency Whisky") || null,
          distillery: colMap(row, "Destillerien", "Distilleries") || null,
          vintage: colMap(row, "Jahrgang", "Vintage") || null,
          addedAt: colMap(row, "Hinzugefügt am", "Added on") || null,
          imageUrl: colMap(row, "Bild", "Image") || null,
          auctionPrice: parseFloat2(colMap(row, "Auktionspreis:", "Auction price:", "Auktionspreis", "Auction price")),
          auctionCurrency: colMap(row, "Währung Whisky_2", "Currency Whisky_2") || null,
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

  // ===== Collection Sync/Diff =====

  async function parseCollectionCSV(file: Express.Multer.File): Promise<any[]> {
    let rows: any[] = [];
    const fileName = file.originalname.toLowerCase();
    if (fileName.endsWith(".csv")) {
      const text = file.buffer.toString("utf-8");
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) return [];
      const headerLine = lines[0];
      const delimiter = headerLine.includes("\t") ? "\t" : headerLine.includes(";") ? ";" : ",";
      const parseCSVLine = (line: string, delim: string): string[] => {
        const result: string[] = [];
        let current = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; }
            else inQuotes = !inQuotes;
          } else if (char === delim && !inQuotes) { result.push(current.trim()); current = ""; }
          else current += char;
        }
        result.push(current.trim());
        return result;
      };
      const rawHeaders = parseCSVLine(headerLine, delimiter);
      const headerCount2: Record<string, number> = {};
      const headers = rawHeaders.map(h => {
        headerCount2[h] = (headerCount2[h] || 0) + 1;
        return headerCount2[h] > 1 ? `${h}_${headerCount2[h]}` : h;
      });
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const values = parseCSVLine(lines[i], delimiter);
        const row: any = {};
        headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
        rows.push(row);
      }
    } else {
      const workbook = await readExcelBuffer(file.buffer);
      const sheetName = (workbook as any).SheetNames[0];
      rows = sheetToJson((workbook as any).Sheets[sheetName], { defval: "" });
    }
    return rows;
  }

  function mapCollectionRow(row: any, participantId: string): any {
    const colMap = (r: any, ...keys: string[]): string => {
      for (const key of keys) { if (r[key] !== undefined && r[key] !== "") return String(r[key]).trim(); }
      return "";
    };
    const parseFloat2 = (val: string): number | null => {
      if (!val) return null;
      const num = parseFloat(val.replace(",", "."));
      return isNaN(num) ? null : num;
    };

    const whiskybaseId = colMap(row, "ID", "id");
    const name = colMap(row, "Name", "name");
    if (!whiskybaseId || !name) return null;

    return {
      participantId,
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
      avgPriceCurrency: colMap(row, "Währung Whisky", "Currency Whisky") || null,
      distillery: colMap(row, "Destillerien", "Distilleries") || null,
      vintage: colMap(row, "Jahrgang", "Vintage") || null,
      addedAt: colMap(row, "Hinzugefügt am", "Added on") || null,
      imageUrl: colMap(row, "Bild", "Image") || null,
      auctionPrice: parseFloat2(colMap(row, "Auktionspreis:", "Auction price:", "Auktionspreis", "Auction price")),
      auctionCurrency: colMap(row, "Währung Whisky_2", "Currency Whisky_2") || null,
      notes: colMap(row, "Notizen", "Notes") || null,
      purchaseLocation: colMap(row, "Kaufort", "Purchase location") || null,
    };
  }

  app.post("/api/collection/:participantId/sync", docUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "No file provided" });
      const participantId = req.params.participantId as string;

      const rows = await parseCollectionCSV(file);
      const uploadedItems = rows.map(r => mapCollectionRow(r, participantId)).filter(Boolean);
      const existingItems = await storage.getWhiskybaseCollection(participantId);

      const existingByCollId = new Map(existingItems.filter(item => item.collectionId).map(item => [item.collectionId!, item]));
      const existingByWbId = new Map(existingItems.map(item => [item.whiskybaseId, item]));
      const uploadedByCollId = new Map(uploadedItems.filter((item: any) => item.collectionId).map((item: any) => [item.collectionId, item]));

      const newItems: any[] = [];
      const changedItems: any[] = [];
      let unchangedCount = 0;

      for (const uploaded of uploadedItems) {
        const existing = uploaded.collectionId
          ? existingByCollId.get(uploaded.collectionId)
          : existingByWbId.get(uploaded.whiskybaseId);
        if (!existing) {
          newItems.push(uploaded);
        } else {
          const changes: any[] = [];
          if (uploaded.status && uploaded.status !== existing.status) changes.push({ field: "status", old: existing.status, new: uploaded.status });
          if (uploaded.communityRating != null && uploaded.communityRating !== existing.communityRating) changes.push({ field: "communityRating", old: existing.communityRating, new: uploaded.communityRating });
          if (uploaded.personalRating != null && uploaded.personalRating !== existing.personalRating) changes.push({ field: "personalRating", old: existing.personalRating, new: uploaded.personalRating });
          if (uploaded.pricePaid != null && uploaded.pricePaid !== existing.pricePaid) changes.push({ field: "pricePaid", old: existing.pricePaid, new: uploaded.pricePaid });
          if (uploaded.avgPrice != null && uploaded.avgPrice !== existing.avgPrice) changes.push({ field: "avgPrice", old: existing.avgPrice, new: uploaded.avgPrice });
          if (uploaded.auctionPrice != null && uploaded.auctionPrice !== existing.auctionPrice) changes.push({ field: "auctionPrice", old: existing.auctionPrice, new: uploaded.auctionPrice });
          if (changes.length > 0) {
            changedItems.push({ existingId: existing.id, whiskybaseId: uploaded.whiskybaseId, name: existing.name, brand: existing.brand, changes, uploadedData: uploaded });
          } else {
            unchangedCount++;
          }
        }
      }

      const removedItems = existingItems
        .filter(item => {
          if (item.collectionId) return !uploadedByCollId.has(item.collectionId);
          return !uploadedItems.some((u: any) => u.whiskybaseId === item.whiskybaseId);
        })
        .map(item => ({ id: item.id, whiskybaseId: item.whiskybaseId, collectionId: item.collectionId, name: item.name, brand: item.brand, status: item.status }));

      res.json({ newItems, removedItems, changedItems, unchangedCount, totalUploaded: uploadedItems.length, totalExisting: existingItems.length });
    } catch (error: any) {
      console.error("Collection sync error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collection/:participantId/sync/apply", async (req: Request, res: Response) => {
    try {
      const participantId = req.params.participantId as string;
      const { addItems, removeItemIds, updateItems } = req.body as {
        addItems: any[];
        removeItemIds: string[];
        updateItems: { id: string; data: any }[];
      };

      let added = 0, removed = 0, updated = 0;

      if (addItems?.length) {
        for (const item of addItems) {
          await storage.upsertWhiskybaseCollectionItem({ ...item, participantId });
          added++;
        }
      }

      if (removeItemIds?.length) {
        for (const id of removeItemIds) {
          await storage.deleteWhiskybaseCollectionItem(id, participantId);
          removed++;
        }
      }

      if (updateItems?.length) {
        for (const { id, data } of updateItems) {
          const existing = (await storage.getWhiskybaseCollection(participantId)).find(i => i.id === id);
          if (existing) {
            await storage.upsertWhiskybaseCollectionItem({ ...existing, ...data, participantId });
            updated++;
          }
        }
      }

      res.json({ added, removed, updated });
    } catch (error: any) {
      console.error("Collection sync apply error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== AI Price Estimation =====

  app.post("/api/collection/:participantId/price-estimate", async (req: Request, res: Response) => {
    try {
      if (await isAIDisabled("journal_identify")) return res.status(503).json({ message: "AI feature disabled by admin" });

      const participantId = req.params.participantId as string;
      const { itemIds } = req.body as { itemIds: string[] };
      if (!itemIds?.length) return res.status(400).json({ error: "itemIds required" });

      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ error: "Participant not found" });

      if (participant.role !== "admin") {
        const lastCheckKey = `last_price_check_${participantId}`;
        const lastCheck = await storage.getAppSetting(lastCheckKey);
        if (lastCheck) {
          const lastDate = new Date(lastCheck);
          const nextAvailable = new Date(lastDate.getTime() + 7 * 24 * 60 * 60 * 1000);
          if (new Date() < nextAvailable) {
            return res.status(429).json({
              error: "rate_limited",
              nextAvailable: nextAvailable.toISOString(),
              message: `Price estimation limited to once per week. Next available: ${nextAvailable.toLocaleDateString("de-DE")}`,
            });
          }
        }
      }

      const items = await storage.getWhiskybaseCollection(participantId);
      const targetItems = items.filter(i => itemIds.includes(i.id));
      if (!targetItems.length) return res.status(404).json({ error: "No matching items found" });

      const batchSize = 10;
      const estimates: any[] = [];

      for (let i = 0; i < targetItems.length; i += batchSize) {
        const batch = targetItems.slice(i, i + batchSize);
        const whiskyList = batch.map((item, idx) => {
          const parts = [`${idx + 1}. "${item.brand ? item.brand + ' ' : ''}${item.name}"`];
          if (item.distillery) parts.push(`Distillery: ${item.distillery}`);
          if (item.statedAge) parts.push(`Age: ${item.statedAge}`);
          if (item.abv) parts.push(`ABV: ${item.abv}`);
          if (item.caskType) parts.push(`Cask: ${item.caskType}`);
          if (item.vintage) parts.push(`Vintage: ${item.vintage}`);
          if (item.communityRating) parts.push(`WB Rating: ${item.communityRating}`);
          if (item.whiskybaseId) parts.push(`Whiskybase ID: ${item.whiskybaseId}`);
          return parts.join(", ");
        }).join("\n");

        const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are a whisky market price estimator. For each whisky, estimate the current market value in EUR based on your knowledge of whisky auction results, retail prices, and collector market trends. Consider age, rarity, distillery reputation, cask type, and Whiskybase ratings. Return ONLY valid JSON array with objects: [{"index": 1, "estimatedPrice": 85, "currency": "EUR", "confidence": "medium"}]. Confidence levels: "high" (well-known bottle with clear market), "medium" (reasonable estimate), "low" (rare or unusual, high uncertainty). Be realistic — don't inflate prices.`
            },
            { role: "user", content: `Estimate current market prices for these whiskies:\n${whiskyList}` }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        });

        const content = response.choices[0]?.message?.content || "[]";
        try {
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
          for (const est of parsed) {
            const item = batch[(est.index || 1) - 1];
            if (item) {
              await storage.updateWhiskybaseCollectionItemPrice(item.id, participantId, est.estimatedPrice, est.currency || "EUR", "ai");
              estimates.push({ id: item.id, whiskybaseId: item.whiskybaseId, name: item.name, estimatedPrice: est.estimatedPrice, currency: est.currency || "EUR", confidence: est.confidence || "medium", source: "ai" });
            }
          }
        } catch (parseErr) {
          console.error("Price estimate parse error:", parseErr, content);
        }
      }

      if (participant.role !== "admin") {
        await storage.setAppSetting(`last_price_check_${participantId}`, new Date().toISOString());
      }

      res.json({ estimates, count: estimates.length });
    } catch (error: any) {
      console.error("Price estimation error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/collection/:participantId/price-manual", async (req: Request, res: Response) => {
    try {
      const participantId = req.params.participantId as string;
      const { itemId, price, currency } = req.body as { itemId: string; price: number; currency: string };
      if (!itemId || price == null) return res.status(400).json({ error: "itemId and price required" });
      const updated = await storage.updateWhiskybaseCollectionItemPrice(itemId, participantId, price, currency || "EUR", "manual");
      if (!updated) return res.status(404).json({ error: "Item not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Tasting Suggestions from Own Collection =====

  app.get("/api/collection/:participantId/suggest-tasting", async (req: Request, res: Response) => {
    try {
      if (await isAIDisabled("journal_identify")) return res.status(503).json({ message: "AI feature disabled by admin" });

      const participantId = req.params.participantId as string;
      const count = parseInt(req.query.count as string) || 6;
      const regions = (req.query.regions as string || "").split(",").filter(Boolean);
      const styles = (req.query.styles as string || "").split(",").filter(Boolean);
      const statusFilter = (req.query.statusFilter as string) || "all";
      const theme = (req.query.theme as string) || "mixed";

      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ error: "Participant not found" });
      const lang = participant.language === "de" ? "de" : "en";

      let items = await storage.getWhiskybaseCollection(participantId);
      if (statusFilter !== "all") items = items.filter(i => i.status === statusFilter);

      if (items.length === 0) return res.json({ suggestions: [], message: lang === "de" ? "Keine Flaschen in deiner Sammlung gefunden." : "No bottles found in your collection." });

      const itemDescriptions = items.slice(0, 50).map((item, idx) => {
        const parts = [`${idx + 1}. "${item.brand ? item.brand + ' ' : ''}${item.name}" (ID: ${item.id})`];
        if (item.distillery) parts.push(`Distillery: ${item.distillery}`);
        if (item.statedAge) parts.push(`Age: ${item.statedAge}`);
        if (item.abv) parts.push(`ABV: ${item.abv}`);
        if (item.caskType) parts.push(`Cask: ${item.caskType}`);
        if (item.vintage) parts.push(`Vintage: ${item.vintage}`);
        if (item.communityRating) parts.push(`Rating: ${item.communityRating}`);
        if (item.status) parts.push(`Status: ${item.status}`);
        return parts.join(", ");
      }).join("\n");

      const themeInstructions: Record<string, string> = {
        horizontal: "Select whiskies from the SAME distillery for a horizontal tasting (comparing different expressions/ages from one producer).",
        vertical: "Select whiskies spanning different vintages or ages for a vertical tasting.",
        contrast: "Select whiskies that contrast each other — e.g. peated vs unpeated, young vs old, bourbon vs sherry cask.",
        mixed: "Select a balanced and interesting flight of whiskies that would make for an engaging tasting.",
      };

      const filterNote = [
        regions.length ? `Preferred regions: ${regions.join(", ")}` : "",
        styles.length ? `Preferred styles: ${styles.join(", ")}` : "",
      ].filter(Boolean).join(". ");

      const openai = new OpenAI({ apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY, baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL });
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a whisky tasting curator. ${themeInstructions[theme] || themeInstructions.mixed} Select exactly ${count} whiskies from the collection below and explain why each fits the tasting theme. ${filterNote ? `Filter preferences: ${filterNote}` : ""}. Respond in ${lang === "de" ? "German" : "English"}. Return ONLY valid JSON: {"theme": "short theme title", "description": "2 sentences describing the tasting concept", "suggestions": [{"collectionItemId": "the item ID from the list", "name": "full whisky name", "distillery": "distillery name", "reason": "1 sentence why this fits"}]}`
          },
          { role: "user", content: `My collection (${items.length} bottles):\n${itemDescriptions}` }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const content = response.choices[0]?.message?.content || "{}";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "{}");
        res.json(parsed);
      } catch (parseErr) {
        console.error("Tasting suggestion parse error:", parseErr);
        res.json({ suggestions: [], message: lang === "de" ? "Konnte keine Vorschläge generieren." : "Could not generate suggestions." });
      }
    } catch (error: any) {
      console.error("Tasting suggestion error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ===== Journal Bottle Identification (must be before parameterized /api/journal/:participantId routes) =====
  app.post("/api/journal/identify-bottle", docUpload.single("photo"), async (req: Request, res: Response) => {
    try {
      const participantId = req.body.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const { client: openai } = await getAIClient(participantId, "journal_identify");
      if (!openai) return res.status(503).json({ message: "AI not available. Add your OpenAI API key in your profile to enable AI features." });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const file = (req as any).file as Express.Multer.File;
      if (!file) return res.status(400).json({ message: "No photo uploaded" });

      const imageHash = crypto.createHash("sha256").update(file.buffer).digest("hex");
      const cached = aiScanCache.get(imageHash);
      if (cached && Date.now() - cached.timestamp < AI_CACHE_TTL) {
        console.log(`Journal scan: cache hit for hash ${imageHash.substring(0, 12)}...`);
        cached.timestamp = Date.now();
        return res.json(cached.result);
      }

      const allWhiskies = await storage.getActiveWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const dbWhiskyNames = Array.from(new Set(allWhiskies.map(w => w.name))).slice(0, 200);
      const benchmarkNames = Array.from(new Set(benchmarks.map(b => b.whiskyName))).slice(0, 200);
      const knownWhiskies = Array.from(new Set([...dbWhiskyNames, ...benchmarkNames]));

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

      const responseData = { whiskies: results };
      if (aiScanCache.size >= AI_CACHE_MAX) {
        const oldest = [...aiScanCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
        if (oldest) aiScanCache.delete(oldest[0]);
      }
      aiScanCache.set(imageHash, { result: responseData, timestamp: Date.now() });
      console.log(`Journal scan: cached result for hash ${imageHash.substring(0, 12)}... (cache size: ${aiScanCache.size})`);

      res.json(responseData);
    } catch (e: any) {
      console.error("Journal bottle identify error:", e);
      res.status(500).json({ message: e.message || "Identification failed" });
    }
  });

  // ===== Journal Entries =====
  app.get("/api/journal/:participantId", async (req, res) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId || requesterId !== req.params.participantId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const statusFilter = req.query.status as string | undefined;
      const entries = await storage.getJournalEntries(req.params.participantId, statusFilter);
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/journal/:participantId/:id", async (req, res) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId || requesterId !== req.params.participantId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const entry = await storage.getJournalEntry(req.params.id, req.params.participantId);
      if (!entry) return res.status(404).json({ message: "Journal entry not found" });
      res.json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/journal/voice-memo", (req: any, res: any, next: any) => {
    audioUpload.single("audio")(req, res, (err: any) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ message: "Audio must be under 5 MB" });
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      const participantId = req.headers["x-participant-id"] as string | undefined;
      if (!participantId) return res.status(401).json({ message: "Missing participant ID" });

      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(403).json({ message: "Invalid participant" });

      if (!req.file) return res.status(400).json({ message: "No audio file provided" });

      const audioBuffer = req.file.buffer as Buffer;
      const durationSeconds = parseInt(req.body.durationSeconds || "0", 10);

      let audioUrl: string | null = null;
      try {
        audioUrl = await uploadBufferToObjectStorage(objectStorage, audioBuffer, req.file.mimetype);
      } catch (e: any) {
        console.error("Journal voice memo upload error:", e.message);
        return res.status(500).json({ message: "Failed to store audio file" });
      }

      if (!audioUrl) {
        return res.status(500).json({ message: "Failed to store audio file" });
      }

      const lang = participant.language || undefined;

      let transcript = "";
      try {
        const { detectAudioFormat, convertToWav, speechToText } = await import("./replit_integrations/audio/client.js");
        const format = detectAudioFormat(audioBuffer);
        let wavBuffer = audioBuffer;
        if (format !== "wav") {
          wavBuffer = await convertToWav(audioBuffer);
        }
        transcript = await speechToText(wavBuffer, "wav", lang);
      } catch (e: any) {
        console.error("Journal voice memo transcription error:", e.message);
        transcript = "[Transcription failed]";
      }

      res.status(200).json({
        audioUrl,
        transcript,
        durationSeconds: durationSeconds || 0,
      });
    } catch (e: any) {
      console.error("Journal voice memo error:", e.message);
      res.status(500).json({ message: "Could not process voice memo" });
    }
  });

  app.post("/api/journal/:participantId", async (req, res) => {
    try {
      const sanitizedBody = sanitizeObject(req.body, ["title", "whiskyName", "distillery", "noseNotes", "tasteNotes", "finishNotes", "notes", "body", "mood", "occasion", "age", "abv", "caskType", "personalScore", "whiskybaseId", "imageUrl", "source", "voiceMemoUrl", "voiceMemoTranscript", "voiceMemoDuration"]);
      const parsed = insertJournalEntrySchema.parse({ ...sanitizedBody, participantId: req.params.participantId });
      const entry = await storage.createJournalEntry(parsed);
      res.status(201).json(entry);
    } catch (e: any) {
      if (e.name === "ZodError") return res.status(400).json({ message: "Validation failed", errors: e.errors });
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/journal/:participantId/:id", async (req, res) => {
    try {
      const allowed = ["title", "whiskyName", "distillery", "region", "age", "abv", "caskType", "noseNotes", "tasteNotes", "finishNotes", "personalScore", "mood", "occasion", "body", "imageUrl", "status"];
      const textKeys = ["title", "whiskyName", "distillery", "noseNotes", "tasteNotes", "finishNotes", "body", "mood", "occasion"];
      const filtered: any = {};
      for (const key of allowed) {
        if (req.body[key] !== undefined) {
          filtered[key] = textKeys.includes(key) && typeof req.body[key] === "string" ? stripHtmlTags(req.body[key]) : req.body[key];
        }
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
      if (await isAIDisabled("wishlist_identify")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const participantId = req.body.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const file = (req as any).file as Express.Multer.File;
      if (!file) return res.status(400).json({ message: "No photo uploaded" });

      const allWhiskies = await storage.getActiveWhiskies();
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
      if (await isAIDisabled("wishlist_summary")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const { participantId, whiskyName, distillery, region, age, abv, caskType, notes, language } = req.body;
      const customPrompt = typeof req.body?.customPrompt === "string" ? req.body.customPrompt.trim().slice(0, 500) : "";
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
            content: `You are a knowledgeable whisky sommelier. Given a whisky and a taster's personal flavor profile, write a brief, engaging summary (3-4 sentences max) explaining why this whisky is an interesting dram for THIS specific taster. Compare it to their known preferences — highlight what aligns with their taste, and what might be a new or exciting discovery. Be warm and encouraging, like a friend recommending a dram. Do not use bullet points. Write in flowing prose. ALWAYS respond in ${language === "de" ? "German" : "English"}.`,
          },
          {
            role: "user",
            content: `Whisky on the wishlist:\n${whiskyDesc}\n\nTaster's profile:\n${profileContext}${customPrompt ? `\n\nAdditional focus from the user: ${customPrompt}` : ""}`,
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
      const { client: openai } = await getAIClient(participantId, "whisky_search");
      if (!openai) return res.status(503).json({ message: "AI not available. Add your OpenAI API key in your profile to enable AI features." });
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const allWhiskies = await storage.getActiveWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const dbWhiskyNames = Array.from(new Set(allWhiskies.map(w => w.name))).slice(0, 200);
      const benchmarkNames = Array.from(new Set(benchmarks.map(b => b.whiskyName))).slice(0, 200);
      const knownWhiskies = Array.from(new Set([...dbWhiskyNames, ...benchmarkNames]));

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
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId || requesterId !== req.params.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });
      const notes = await storage.getRatingNotes(req.params.id);
      res.json(notes.filter(r => r.notes && r.notes.trim().length > 0));
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTE INSIGHTS =====

  app.get("/api/participants/:id/insights", async (req, res) => {
    try {
      const auth = await requireOwnerOrAdmin(req, req.params.id);
      if (!auth.authorized) return res.status(auth.status).json({ message: auth.message });

      const { generateParticipantInsights } = await import("./insight-engine");
      const insights = await generateParticipantInsights(req.params.id);
      res.json({ insight: insights.length > 0 ? insights[0] : null });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== FLAVOR PROFILE =====

  app.get("/api/participants/:id/flavor-profile", async (req, res) => {
    try {
      const auth = await requireOwnerOrAdmin(req, req.params.id);
      if (!auth.authorized) return res.status(auth.status).json({ message: auth.message });
      const profile = await storage.getFlavorProfile(req.params.id);
      res.json(profile);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== COMMUNITY SCORES =====

  app.get("/api/community-scores", async (_req, res) => {
    try {
      const scores = await storage.getCommunityScores();
      res.json(scores);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTE TWINS =====

  app.get("/api/participants/:id/taste-twins", async (req, res) => {
    try {
      const auth = await requireOwnerOrAdmin(req, req.params.id);
      if (!auth.authorized) return res.status(auth.status).json({ message: auth.message });
      const twins = await storage.getTasteTwins(req.params.id);
      res.json(twins);
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

  // ===== WHISKY PROFILE (dimensional taste profile) =====

  app.get("/api/participants/:id/whisky-profile", async (req, res) => {
    try {
      const participant = await storage.getParticipant(req.params.id);
      if (!participant) return res.status(404).json({ message: "Not found" });

      const source = (req.query.source as string) || "all";
      const compareMode = (req.query.compare as string) || "none";

      const allRatingsRaw = await storage.getAllRatings();
      const userRatingsRaw = allRatingsRaw.filter(r => r.participantId === req.params.id);

      const allTastingsArr = await storage.getAllTastings();
      const tastingScaleMap = new Map(allTastingsArr.map(t => [t.id, t.ratingScale ?? 100]));

      const whiskyIds = Array.from(new Set(userRatingsRaw.map(r => r.whiskyId)));
      const allWhiskiesArr = await storage.getWhiskiesByIds(whiskyIds);
      const whiskyMap = new Map(allWhiskiesArr.map(w => [w.id, w]));

      interface NormedRating {
        whiskyId: string; nose: number; taste: number; finish: number; balance: number; overall: number; ratedAt?: string | null;
      }

      let userRatings: NormedRating[] = userRatingsRaw.map(r => {
        const scale = tastingScaleMap.get(r.tastingId) ?? 100;
        const norm = 100 / scale;
        return {
          whiskyId: r.whiskyId,
          nose: r.nose * norm, taste: r.taste * norm, finish: r.finish * norm,
          balance: r.balance * norm, overall: r.overall * norm,
          ratedAt: r.updatedAt || null,
        };
      });

      if (source === "journal" || source === "imported" || source === "all_incl_imported") {
        const journal = await storage.getJournalEntries(req.params.id);
        const filterFn = (j: any) => {
          if (source === "journal") return j.personalScore != null && j.personalScore > 0;
          if (source === "imported") return j.source === "imported" && j.personalScore != null && j.personalScore > 0;
          return j.personalScore != null && j.personalScore > 0;
        };
        const journalScores = journal.filter(filterFn)
          .map(j => ({
            whiskyId: j.id,
            nose: j.noseNotes ? 50 : 0, taste: j.tasteNotes ? 50 : 0, finish: j.finishNotes ? 50 : 0, balance: 0,
            overall: j.personalScore!,
            ratedAt: j.createdAt || null,
          }));
        if (source === "all_incl_imported") {
          userRatings = [...userRatings, ...journalScores];
        } else {
          userRatings = journalScores;
        }
      }

      if (userRatings.length === 0) {
        return res.json({
          ratingStyle: null, tasteStructure: null, whiskyComparison: [],
          confidence: { overall: { level: "preliminary", percent: 0, n: 0 } },
          comparisonData: null,
        });
      }

      const dims = ["nose", "taste", "finish", "balance", "overall"] as const;
      const calcMedian = (arr: number[]) => {
        if (arr.length === 0) return 0;
        const s = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(s.length / 2);
        return s.length % 2 === 0 ? (s[mid - 1] + s[mid]) / 2 : s[mid];
      };
      const calcIQR = (arr: number[]) => {
        if (arr.length < 4) return null;
        const s = [...arr].sort((a, b) => a - b);
        const q1Idx = Math.floor(s.length * 0.25);
        const q3Idx = Math.floor(s.length * 0.75);
        return { q1: s[q1Idx], q3: s[q3Idx], iqr: s[q3Idx] - s[q1Idx] };
      };

      const overalls = userRatings.map(r => r.overall);
      const userMean = overalls.reduce((a, b) => a + b, 0) / overalls.length;
      const userStdDev = Math.sqrt(overalls.reduce((acc, v) => acc + Math.pow(v - userMean, 2), 0) / overalls.length);
      const userMin = Math.min(...overalls);
      const userMax = Math.max(...overalls);

      const platformByWhisky: Record<string, { overalls: number[]; nose: number[]; taste: number[]; finish: number[]; balance: number[] }> = {};
      const platformAllOveralls: number[] = [];
      const platformParticipantIds = new Set<string>();

      for (const r of allRatingsRaw) {
        const scale = tastingScaleMap.get(r.tastingId) ?? 100;
        const norm = 100 / scale;
        const normOverall = r.overall * norm;
        platformAllOveralls.push(normOverall);
        platformParticipantIds.add(r.participantId);

        if (!platformByWhisky[r.whiskyId]) {
          platformByWhisky[r.whiskyId] = { overalls: [], nose: [], taste: [], finish: [], balance: [] };
        }
        platformByWhisky[r.whiskyId].overalls.push(normOverall);
        platformByWhisky[r.whiskyId].nose.push(r.nose * norm);
        platformByWhisky[r.whiskyId].taste.push(r.taste * norm);
        platformByWhisky[r.whiskyId].finish.push(r.finish * norm);
        platformByWhisky[r.whiskyId].balance.push(r.balance * norm);
      }

      const platformMedianOverall = calcMedian(platformAllOveralls);

      const deltas: number[] = [];
      for (const r of userRatings) {
        const pw = platformByWhisky[r.whiskyId];
        if (pw && pw.overalls.length > 0) {
          deltas.push(r.overall - calcMedian(pw.overalls));
        }
      }
      const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : null;
      const deltaStdDev = deltas.length > 1
        ? Math.sqrt(deltas.reduce((acc, v) => acc + Math.pow(v - (avgDelta ?? 0), 2), 0) / deltas.length)
        : null;

      const ratingStyle = {
        meanScore: Math.round(userMean * 10) / 10,
        stdDev: Math.round(userStdDev * 10) / 10,
        scaleRange: { min: Math.round(userMin * 10) / 10, max: Math.round(userMax * 10) / 10 },
        systematicDeviation: avgDelta != null ? {
          avgDelta: Math.round(avgDelta * 10) / 10,
          deltaStdDev: deltaStdDev != null ? Math.round(deltaStdDev * 10) / 10 : null,
          nWhiskiesCompared: deltas.length,
          nPlatformRatings: platformAllOveralls.length,
          nPlatformParticipants: platformParticipantIds.size,
          platformMedian: Math.round(platformMedianOverall * 10) / 10,
        } : null,
        nRatings: userRatings.length,
      };

      const dimAvgs: Record<string, number> = {};
      for (const dim of dims) {
        const vals = source === "journal" && dim !== "overall" ? [] : userRatings.map(r => r[dim]);
        dimAvgs[dim] = vals.length > 0 ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : 0;
      }

      const getStabilityLevel = (n: number): { level: string; percent: number } => {
        if (n >= 15) return { level: "stable", percent: 100 };
        if (n >= 5) return { level: "tendency", percent: Math.round(n * 6.67) };
        return { level: "preliminary", percent: Math.round(n * 6.67) };
      };

      const confidence: Record<string, { level: string; percent: number; n: number }> = {};
      for (const dim of dims) {
        const n = source === "journal" && dim !== "overall" ? 0 : userRatings.length;
        const stab = getStabilityLevel(n);
        confidence[dim] = { ...stab, n };
      }

      const whiskyComparison = userRatings
        .filter(r => platformByWhisky[r.whiskyId] && platformByWhisky[r.whiskyId].overalls.length > 0)
        .map(r => {
          const pw = platformByWhisky[r.whiskyId];
          const pMedian = calcMedian(pw.overalls);
          const pIqr = calcIQR(pw.overalls);
          const w = whiskyMap.get(r.whiskyId);
          return {
            whiskyId: r.whiskyId,
            whiskyName: w?.name ?? "Unknown",
            distillery: w?.distillery ?? null,
            region: w?.region ?? null,
            userScore: Math.round(r.overall * 10) / 10,
            platformMedian: Math.round(pMedian * 10) / 10,
            delta: Math.round((r.overall - pMedian) * 10) / 10,
            iqr: pIqr ? { q1: Math.round(pIqr.q1 * 10) / 10, q3: Math.round(pIqr.q3 * 10) / 10, iqr: Math.round(pIqr.iqr * 10) / 10 } : null,
            platformN: pw.overalls.length,
            ratedAt: r.ratedAt || null,
          };
        });

      let comparisonData: any = null;
      if (compareMode === "friends") {
        const friends = await storage.getWhiskyFriends(req.params.id);
        const friendEmails = friends.map(f => f.email.toLowerCase());
        if (friendEmails.length > 0) {
          const allParticipants = await Promise.all(
            friendEmails.map(email => storage.getParticipantByEmail(email))
          );
          const friendParticipants = allParticipants.filter(Boolean) as Participant[];
          const friendIds = friendParticipants.map(p => p.id);
          if (friendIds.length > 0) {
            const friendRatings = allRatingsRaw.filter(r => friendIds.includes(r.participantId));
            const friendDimScores: Record<string, number[]> = { nose: [], taste: [], finish: [], balance: [], overall: [] };
            for (const r of friendRatings) {
              const scale = tastingScaleMap.get(r.tastingId) ?? 100;
              const norm = 100 / scale;
              friendDimScores.nose.push(r.nose * norm);
              friendDimScores.taste.push(r.taste * norm);
              friendDimScores.finish.push(r.finish * norm);
              friendDimScores.balance.push(r.balance * norm);
              friendDimScores.overall.push(r.overall * norm);
            }
            const friendMedians: Record<string, number> = {};
            for (const dim of dims) {
              friendMedians[dim] = Math.round(calcMedian(friendDimScores[dim]) * 10) / 10;
            }
            comparisonData = {
              mode: "friends",
              medians: friendMedians,
              nFriends: friendIds.length,
              nRatings: friendRatings.length,
            };
          }
        }
      } else if (compareMode === "platform") {
        const platformDimScores: Record<string, number[]> = { nose: [], taste: [], finish: [], balance: [], overall: [] };
        for (const r of allRatingsRaw) {
          const scale = tastingScaleMap.get(r.tastingId) ?? 100;
          const norm = 100 / scale;
          platformDimScores.nose.push(r.nose * norm);
          platformDimScores.taste.push(r.taste * norm);
          platformDimScores.finish.push(r.finish * norm);
          platformDimScores.balance.push(r.balance * norm);
          platformDimScores.overall.push(r.overall * norm);
        }
        const platformMedians: Record<string, number> = {};
        for (const dim of dims) {
          platformMedians[dim] = Math.round(calcMedian(platformDimScores[dim]) * 10) / 10;
        }
        const platformIqrs: Record<string, { q1: number; q3: number; iqr: number } | null> = {};
        for (const dim of dims) {
          const iqr = calcIQR(platformDimScores[dim]);
          platformIqrs[dim] = iqr ? { q1: Math.round(iqr.q1 * 10) / 10, q3: Math.round(iqr.q3 * 10) / 10, iqr: Math.round(iqr.iqr * 10) / 10 } : null;
        }
        comparisonData = {
          mode: "platform",
          medians: platformMedians,
          iqrs: platformIqrs,
          nParticipants: platformParticipantIds.size,
          nRatings: allRatingsRaw.length,
        };
      }

      res.json({
        ratingStyle,
        tasteStructure: dimAvgs,
        whiskyComparison,
        confidence,
        comparisonData,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PARTICIPANT STATS (for badges) =====

  app.get("/api/participants/:id/stats", async (req, res) => {
    try {
      const auth = await requireOwnerOrAdmin(req, req.params.id);
      if (!auth.authorized) return res.status(auth.status).json({ message: auth.message });
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

  app.get("/api/calendar", async (req, res) => {
    try {
      const headerPid = req.headers["x-participant-id"] as string | undefined;
      const queryPid = req.query.participantId as string | undefined;
      const pid = headerPid || queryPid;
      let participant: any = null;
      if (pid) {
        participant = await storage.getParticipant(pid);
      }
      let tastings;
      if (participant?.role === "admin") {
        tastings = await storage.getAllTastings();
      } else if (pid) {
        tastings = await storage.getTastingsForParticipant(pid);
      } else {
        tastings = [];
      }
      const calendarEvents = await Promise.all(
        tastings.map(async (t) => {
          const host = await storage.getParticipant(t.hostId);
          const participants = await storage.getTastingParticipants(t.id);
          const whiskies = await storage.getWhiskiesForTasting(t.id);
          return {
            id: t.id,
            title: t.title,
            date: t.date,
            location: t.location,
            status: t.status,
            hostId: t.hostId,
            hostName: host?.name || "Unknown",
            participantIds: participants.map((p) => p.participantId),
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

  // ===== EXPORT NOTES AS DOCX =====

  app.post("/api/export/notes-docx", async (req, res) => {
    try {
      const { tastingId, participantId } = req.body;
      if (!tastingId || !participantId) {
        return res.status(400).json({ message: "tastingId and participantId are required" });
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

      const tableBorderStyle = {
        style: BorderStyle.SINGLE,
        size: 1,
        color: "999999",
      };
      const tableBorders = {
        top: tableBorderStyle,
        bottom: tableBorderStyle,
        left: tableBorderStyle,
        right: tableBorderStyle,
      };

      const children: any[] = [
        new Paragraph({
          text: tasting.title || "Tasting",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [
            new TextRun({ text: `${tasting.date || ""}  ·  ${participant.name}`, italics: true, size: 22, color: "666666" }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 200 } }),
      ];

      for (const rating of participantRatings) {
        const whisky = whiskyMap.get(rating.whiskyId);
        if (!whisky) continue;

        const metaParts = [
          whisky.distillery,
          whisky.age ? `${whisky.age}y` : null,
          whisky.abv ? `${whisky.abv}% ABV` : null,
        ].filter(Boolean);

        children.push(
          new Paragraph({
            text: whisky.name,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 100 },
          })
        );

        if (metaParts.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: metaParts.join("  ·  "), italics: true, size: 20, color: "888888" }),
              ],
              spacing: { after: 150 },
            })
          );
        }

        const headerCells = ["Nose", "Taste", "Finish", "Balance", "Overall"].map(
          label => new TableCell({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: label, bold: true, size: 18 })],
            })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: tableBorders,
          })
        );

        const valueCells = [rating.nose, rating.taste, rating.finish, rating.balance, rating.overall].map(
          val => new TableCell({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: val != null ? String(val) : "-", size: 20 })],
            })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            borders: tableBorders,
          })
        );

        children.push(
          new Table({
            rows: [
              new TableRow({ children: headerCells }),
              new TableRow({ children: valueCells }),
            ],
            width: { size: 100, type: WidthType.PERCENTAGE },
          })
        );

        if (rating.notes) {
          children.push(
            new Paragraph({
              spacing: { before: 100, after: 200 },
              children: [
                new TextRun({ text: "Notes: ", bold: true, size: 20 }),
                new TextRun({ text: rating.notes, size: 20 }),
              ],
            })
          );
        } else {
          children.push(new Paragraph({ text: "", spacing: { after: 200 } }));
        }
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      const safeName = (tasting.title || "tasting").replace(/[^a-zA-Z0-9_-]/g, "_");
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename="${safeName}_notes.docx"`);
      res.send(buffer);
    } catch (e: any) {
      console.error("DOCX export error:", e);
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

      const deduplicatedParticipantCount = await getUniquePersonCount(Array.from(uniqueParticipantIds));

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
          code: d.tasting.code,
        }));

      res.json({
        totalTastings: hostTastings.length,
        totalParticipants: deduplicatedParticipantCount,
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
          hostId: tasting.hostId,
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

  // ===== THANK YOU EMAIL =====

  app.post("/api/tastings/:id/thank-you", async (req, res) => {
    try {
      const tastingId = req.params.id;
      const { hostId, message, language } = req.body;
      if (!hostId) return res.status(400).json({ message: "hostId required" });

      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.hostId !== hostId) return res.status(403).json({ message: "Only the host can send thank-you emails" });

      if (!isSmtpConfigured()) return res.status(503).json({ message: "Email not configured" });

      const host = await storage.getParticipant(hostId);
      if (!host) return res.status(404).json({ message: "Host not found" });

      const [participants, whiskies, ratings] = await Promise.all([
        storage.getTastingParticipants(tastingId),
        storage.getWhiskiesForTasting(tastingId),
        storage.getRatingsForTasting(tastingId),
      ]);

      const whiskyMap = new Map(whiskies.map(w => [w.id, w]));
      const whiskyRatings = new Map<string, number[]>();
      for (const r of ratings) {
        if (r.overall != null) {
          if (!whiskyRatings.has(r.whiskyId)) whiskyRatings.set(r.whiskyId, []);
          whiskyRatings.get(r.whiskyId)!.push(r.overall);
        }
      }
      const topRated = Array.from(whiskyRatings.entries())
        .map(([wId, overalls]) => {
          const w = whiskyMap.get(wId);
          const avg = overalls.reduce((a, b) => a + b, 0) / overalls.length;
          return { name: w?.name || "Unknown", distillery: w?.distillery || null, avgScore: Math.round(avg * 10) / 10 };
        })
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 3);

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const recapLink = `${baseUrl}/recap/${tastingId}`;

      const recipientsWithEmail = participants.filter(p => p.email && p.id !== hostId);
      let sentCount = 0;
      let failCount = 0;

      for (const p of recipientsWithEmail) {
        const emailContent = buildThankYouEmail({
          hostName: host.name,
          recipientName: p.name,
          tastingTitle: tasting.title,
          tastingDate: tasting.date || "",
          tastingLocation: tasting.location || "",
          personalMessage: message || "",
          topRated,
          recapLink,
          language: language || "de",
        });
        const sent = await sendEmail({ to: p.email!, ...emailContent });
        if (sent) sentCount++; else failCount++;
      }

      if (host.email) {
        const hostEmailContent = buildThankYouEmail({
          hostName: host.name,
          recipientName: host.name,
          tastingTitle: tasting.title,
          tastingDate: tasting.date || "",
          tastingLocation: tasting.location || "",
          personalMessage: message || "",
          topRated,
          recapLink,
          language: language || "de",
        });
        await sendEmail({ to: host.email, ...hostEmailContent });
      }

      res.json({ sent: sentCount, failed: failCount, total: recipientsWithEmail.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== MY TASTING HISTORY =====

  app.get("/api/participants/:id/tasting-history", async (req, res) => {
    try {
      const participantId = req.params.id;
      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const tastings = await storage.getTastingsForParticipant(participantId);
      const nonDeletedTastings = tastings.filter((t: any) => t.status !== "deleted");

      const history = await Promise.all(
        nonDeletedTastings.map(async (tasting: any) => {
          const [whiskies, allRatings, participants] = await Promise.all([
            storage.getWhiskiesForTasting(tasting.id),
            storage.getRatingsForTasting(tasting.id),
            storage.getTastingParticipants(tasting.id),
          ]);

          const myRatings = allRatings.filter((r: any) => r.participantId === participantId);
          const host = await storage.getParticipant(tasting.hostId);

          const whiskyDetails = whiskies.map((w: any) => {
            const myRating = myRatings.find((r: any) => r.whiskyId === w.id);
            const allWhiskyRatings = allRatings.filter((r: any) => r.whiskyId === w.id);
            const avgOverall = allWhiskyRatings.length > 0
              ? Math.round((allWhiskyRatings.reduce((sum: number, r: any) => sum + (r.overall || 0), 0) / allWhiskyRatings.length) * 10) / 10
              : null;
            return {
              id: w.id,
              name: w.name,
              distillery: w.distillery,
              age: w.age,
              abv: w.abv,
              country: w.country,
              region: w.region,
              category: w.category,
              caskInfluence: w.caskInfluence,
              peatLevel: w.peatLevel,
              imageUrl: w.imageUrl,
              myRating: myRating ? {
                nose: myRating.nose,
                taste: myRating.taste,
                finish: myRating.finish,
                balance: myRating.balance,
                overall: myRating.overall,
                notes: myRating.notes,
              } : null,
              avgOverall,
            };
          });

          const myAvgOverall = myRatings.length > 0
            ? Math.round((myRatings.reduce((sum: number, r: any) => sum + (r.overall || 0), 0) / myRatings.length) * 10) / 10
            : null;

          return {
            id: tasting.id,
            title: tasting.title,
            date: tasting.date,
            location: tasting.location,
            status: tasting.status,
            hostName: host?.name || "Unknown",
            isHost: tasting.hostId === participantId,
            participantCount: participants.length,
            whiskyCount: whiskies.length,
            ratedCount: myRatings.length,
            myAvgOverall,
            coverImageUrl: tasting.coverImageUrl,
            whiskies: whiskyDetails,
          };
        })
      );

      history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const totalWhiskies = history.reduce((s, h) => s + h.whiskyCount, 0);
      const totalRated = history.reduce((s, h) => s + h.ratedCount, 0);
      const allMyRatings = history.flatMap(h => h.whiskies.filter(w => w.myRating).map(w => w.myRating!.overall));
      const overallAvg = allMyRatings.length > 0
        ? Math.round((allMyRatings.reduce((a, b) => a + b, 0) / allMyRatings.length) * 10) / 10
        : null;

      const distilleries = new Set(history.flatMap(h => h.whiskies.map(w => w.distillery).filter(Boolean)));
      const countries = new Set(history.flatMap(h => h.whiskies.map(w => w.country).filter(Boolean)));
      const regions = new Set(history.flatMap(h => h.whiskies.map(w => w.region).filter(Boolean)));

      res.json({
        tastings: history,
        stats: {
          totalTastings: history.length,
          totalWhiskies,
          totalRated,
          overallAvg,
          uniqueDistilleries: distilleries.size,
          uniqueCountries: countries.size,
          uniqueRegions: regions.size,
          hostedCount: history.filter(h => h.isHost).length,
        },
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

      const allWhiskies = await storage.getActiveWhiskies();
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

      const maxScore = Math.max(...scored.map(s => s.score), 1);
      const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);
      const suggestions = top.map(s => ({
        name: s.name,
        distillery: s.distillery || "",
        region: s.region || "",
        caskInfluence: s.caskInfluence || "",
        peatLevel: s.peatLevel || "",
        score: Math.round((s.score / maxScore) * 100),
        reason: s.reasons.join(". "),
      }));

      res.json({
        lineup: {
          regions: Array.from(lineupRegions),
          caskTypes: Array.from(lineupCasks),
          peatLevels: Array.from(lineupPeats),
        },
        suggestions,
      });
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

          const uniqueWhiskies = new Set(data.ratings.map((r: any) => r.whiskyId).filter(Boolean)).size;

          return {
            id: pId,
            name: participant?.name || "Unknown",
            ratingsCount,
            avgNotesLength,
            avgScore,
            uniqueWhiskies,
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

      const explorer = [...stats].sort((a, b) => b.uniqueWhiskies - a.uniqueWhiskies).slice(0, 10).map(s => ({
        id: s.id,
        name: s.name,
        uniqueWhiskies: s.uniqueWhiskies,
      }));

      res.json({ mostActive, mostDetailed, highestRated, explorer });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== CHANGELOG (Platform Development Log) =====

  app.get("/api/changelog", async (req: Request, res: Response) => {
    try {
      const category = req.query.category as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const entries = await storage.getChangelogEntries({ category, from, to, visibleOnly: true });
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/changelog", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const category = req.query.category as string | undefined;
      const from = req.query.from as string | undefined;
      const to = req.query.to as string | undefined;
      const entries = await storage.getChangelogEntries({ category, from, to });
      res.json(entries);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/changelog", async (req: Request, res: Response) => {
    try {
      const { participantId, title, description, category, date, visible } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      if (!title || !description || !date) return res.status(400).json({ message: "title, description, and date required" });
      const validCategories = ["feature", "improvement", "bugfix", "security", "design"];
      if (category && !validCategories.includes(category)) return res.status(400).json({ message: `Invalid category. Use: ${validCategories.join(", ")}` });
      const entry = await storage.createChangelogEntry({
        title, description, category: category || "feature", date,
        visible: visible !== false, createdBy: participantId,
      });
      res.status(201).json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/changelog/:id", async (req: Request, res: Response) => {
    try {
      const { participantId, ...updates } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const existing = await storage.getChangelogEntry(req.params.id);
      if (!existing) return res.status(404).json({ message: "Changelog entry not found" });
      const { title, description, category, date, visible } = updates;
      const entry = await storage.updateChangelogEntry(req.params.id, {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(date !== undefined && { date }),
        ...(visible !== undefined && { visible }),
      });
      res.json(entry);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/changelog/:id", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });
      const existing = await storage.getChangelogEntry(req.params.id);
      if (!existing) return res.status(404).json({ message: "Changelog entry not found" });
      await storage.deleteChangelogEntry(req.params.id);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== ADMIN =====

  // --- AI Settings (Kill Switch) ---
  app.get("/api/admin/ai-settings", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const settings = await getAISettings();
      const auditLog = await getAuditLog(20);
      res.json({ settings, features: AI_FEATURES, auditLog });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to load AI settings" });
    }
  });

  app.post("/api/admin/ai-settings", async (req, res) => {
    try {
      const { participantId, ai_master_disabled, ai_features_disabled } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (typeof ai_master_disabled !== "boolean") {
        return res.status(400).json({ message: "ai_master_disabled must be a boolean" });
      }
      if (!Array.isArray(ai_features_disabled) || !ai_features_disabled.every((f: any) => typeof f === "string")) {
        return res.status(400).json({ message: "ai_features_disabled must be an array of strings" });
      }

      const validIds = AI_FEATURES.map(f => f.id);
      const invalidFeatures = ai_features_disabled.filter((f: string) => !validIds.includes(f));
      if (invalidFeatures.length > 0) {
        return res.status(400).json({ message: `Invalid feature IDs: ${invalidFeatures.join(", ")}` });
      }

      const updated = await updateAISettings(
        { ai_master_disabled, ai_features_disabled },
        participantId,
        requester.name
      );
      res.json({ settings: updated });
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Failed to update AI settings" });
    }
  });

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
            communityContributor: p.communityContributor || false,
            experienceLevel: p.experienceLevel || "connoisseur",
            makingOfAccess: p.makingOfAccess || false,
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
            isTestData: t.isTestData,
          };
        })
      );

      const uniqueAdminParticipants = await deduplicateParticipantList(allParticipants);

      res.json({
        participants: participantsWithStats,
        tastings: tastingsWithDetails,
        stats: {
          totalParticipants: uniqueAdminParticipants,
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

  app.patch("/api/admin/participants/:id/community-contributor", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { status } = req.body;
      if (typeof status !== "boolean") {
        return res.status(400).json({ message: "status must be boolean" });
      }
      const result = await storage.updateCommunityContributor(req.params.id, status);
      if (!result) return res.status(404).json({ message: "Participant not found" });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/participants/batch-experience-level", async (req, res) => {
    try {
      const { requesterId, level, participantIds } = req.body;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!level || !["guest", "explorer", "connoisseur", "analyst"].includes(level)) {
        return res.status(400).json({ message: "Invalid level" });
      }
      const ids = participantIds as string[];
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "participantIds required" });
      }
      const results = [];
      for (const id of ids) {
        const updated = await storage.updateParticipant(id, { experienceLevel: level });
        if (updated) results.push(updated);
      }
      res.json({ updated: results.length });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/participants/:id/experience-level", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { level } = req.body;
      if (!level || !["guest", "explorer", "connoisseur", "analyst"].includes(level)) {
        return res.status(400).json({ message: "Invalid level" });
      }
      const updated = await storage.updateParticipant(req.params.id, { experienceLevel: level });
      if (!updated) return res.status(404).json({ message: "Participant not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/participant-ai-profiles", async (req, res) => {
    try {
      const { requesterId, pin } = req.body;
      if (!requesterId || !pin) return res.status(400).json({ message: "requesterId and pin required" });

      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!requester.pin || !(await verifyPassword(pin, requester.pin))) {
        return res.status(401).json({ message: "Invalid password" });
      }

      if (await isAIDisabled("newsletter_generate")) {
        return res.status(503).json({ message: "AI features are disabled" });
      }

      const allParticipants = await storage.getAllParticipants();
      const allTastings = await storage.getAllTastings();

      const participantData = await Promise.all(
        allParticipants.map(async (p) => {
          const stats = await storage.getParticipantStats(p.id);
          const hostedCount = allTastings.filter(t => t.hostId === p.id).length;
          const isAnonymized = p.name.startsWith("Anon-");

          let avgScore = 0;
          let stdDev = 0;
          try {
            const fp = await storage.getFlavorProfile(p.id);
            if (fp.ratedWhiskies.length > 0) {
              const scores = fp.ratedWhiskies.filter(rw => rw.rating.overall > 0).map(rw => rw.rating.overall);
              if (scores.length > 0) {
                avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
                const mean = avgScore;
                stdDev = Math.round(Math.sqrt(scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length) * 10) / 10;
              }
            }
          } catch {}

          const topRegions = Object.entries(stats.ratedRegions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([r, c]) => `${r} (${c})`);

          const topCasks = Object.entries(stats.ratedCaskTypes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([c, n]) => `${c} (${n})`);

          const topPeat = Object.entries(stats.ratedPeatLevels)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([p, n]) => `${p} (${n})`);

          return {
            id: p.id,
            name: isAnonymized ? p.name : p.name,
            isAnonymized,
            ratings: stats.totalRatings,
            tastings: stats.totalTastings,
            journalEntries: stats.totalJournalEntries,
            hostedTastings: hostedCount,
            avgScore,
            stdDev,
            highestScore: stats.highestOverall,
            topRegions,
            topCasks,
            topPeat,
            experienceLevel: p.experienceLevel || "connoisseur",
            role: p.role || "user",
          };
        })
      );

      const lang = requester.language === "de" ? "de" : "en";
      const systemPrompt = lang === "de"
        ? `Du bist ein Whisky-Tasting-Analyst und Sensorik-Experte. Erstelle für jeden Teilnehmer ein kurzes Profil (2-3 Sätze) basierend auf den vorhandenen Daten. Beschreibe: Geschmackspräferenzen, Bewertungsstil (generös/streng, konsistent/variabel), und was aus sensorisch-wissenschaftlicher Sicht interessant ist (z.B. ausgeprägte Regionspräferenzen, ungewöhnliche Muster, hohe/niedrige Varianz). Bei anonymisierten Teilnehmern (Name beginnt mit "Anon-") nutze nur den Alias-Namen. Antworte als JSON-Array mit Objekten: {"id": "...", "profile": "..."}. Nur das JSON, kein anderer Text.`
        : `You are a whisky tasting analyst and sensory science expert. Create a short profile (2-3 sentences) for each participant based on the available data. Describe: taste preferences, rating style (generous/strict, consistent/variable), and what's interesting from a sensory science perspective (e.g., strong region preferences, unusual patterns, high/low variance). For anonymized participants (name starts with "Anon-"), use only the alias name. Respond as a JSON array with objects: {"id": "...", "profile": "..."}. Only the JSON, no other text.`;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(participantData) },
        ],
        max_tokens: 4000,
        temperature: 0.7,
      });

      const raw = completion.choices[0]?.message?.content || "[]";
      let profiles: { id: string; profile: string }[];
      try {
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        profiles = JSON.parse(cleaned);
      } catch {
        profiles = [];
      }

      res.json({ profiles });
    } catch (e: any) {
      console.error("AI participant profiles error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/community-contributors", async (_req, res) => {
    try {
      const contributors = await storage.getCommunityContributors();
      const profilePromises = contributors.map(async (c) => {
        const profile = await storage.getProfileByParticipantId(c.id);
        return {
          id: c.id,
          name: c.name,
          photoUrl: profile?.photoUrl || null,
        };
      });
      res.json(await Promise.all(profilePromises));
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

  // --- App Settings ---

  app.get("/api/ai-status", async (req, res) => {
    try {
      const participantId = req.query.participantId as string | undefined;
      const settings = await getAISettings();
      const disabledFeatures: string[] = [];
      if (settings.ai_master_disabled) {
        disabledFeatures.push(...AI_FEATURES.map(f => f.id));
      } else {
        disabledFeatures.push(...settings.ai_features_disabled);
      }
      const { available, source } = await getAIStatus(participantId || null);
      res.json({
        masterDisabled: settings.ai_master_disabled,
        disabledFeatures,
        available,
        source,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/app-settings/public", async (_req, res) => {
    try {
      const settings = await storage.getAppSettings();
      const publicKeys = ["whats_new_enabled", "whats_new_text", "whats_new_version", "guest_mode_enabled", "maintenance_mode", "registration_open", "friend_online_notifications", "comparable_weight_region", "comparable_weight_peat", "comparable_weight_cask", "comparable_weight_abv", "comparable_weight_age", "comparable_min_samples", "comparable_abv_band", "comparable_age_band", "comparable_threshold", "comparable_fallback_behavior", "comparable_enable_per_dimension"];
      const result: Record<string, string> = {};
      for (const key of publicKeys) {
        result[key] = settings[key] ?? getDefaultSetting(key);
      }
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/app-settings", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const settings = await storage.getAppSettings();
      const defaults: Record<string, string> = {
        whats_new_enabled: "false",
        whats_new_text: "",
        whats_new_version: "0",
        registration_open: "true",
        guest_mode_enabled: "true",
        maintenance_mode: "false",
        email_notifications_enabled: "true",
        comparable_weight_region: "0.40",
        comparable_weight_peat: "0.30",
        comparable_weight_cask: "0.20",
        comparable_weight_abv: "0.10",
        comparable_weight_age: "0.00",
        comparable_min_samples: "7",
        comparable_abv_band: "3",
        comparable_age_band: "3",
        comparable_threshold: "0.5",
        comparable_fallback_behavior: "overall",
        comparable_enable_per_dimension: "false",
      };
      const merged = { ...defaults, ...settings };
      res.json(merged);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/app-settings", async (req, res) => {
    try {
      const { requesterId, settings } = req.body;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const allowedKeys = ["whats_new_enabled", "whats_new_text", "whats_new_version", "registration_open", "guest_mode_enabled", "maintenance_mode", "email_notifications_enabled", "friend_online_notifications", "comparable_weight_region", "comparable_weight_peat", "comparable_weight_cask", "comparable_weight_abv", "comparable_weight_age", "comparable_min_samples", "comparable_abv_band", "comparable_age_band", "comparable_threshold", "comparable_fallback_behavior", "comparable_enable_per_dimension"];
      const filtered: Record<string, string> = {};
      for (const [key, value] of Object.entries(settings)) {
        if (allowedKeys.includes(key)) {
          filtered[key] = String(value);
        }
      }
      await storage.setAppSettings(filtered);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- Test Data Flag ---

  app.post("/api/admin/tastings/:id/test-flag", async (req, res) => {
    try {
      const requesterId = req.body.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { isTestData } = req.body;
      const tasting = await storage.setTastingTestFlag(req.params.id, !!isTestData);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      res.json(tasting);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // --- Bulk Cleanup ---

  app.post("/api/admin/bulk-cleanup", async (req, res) => {
    try {
      const { requesterId, filter, action } = req.body;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      if (!["preview", "markAsTest", "delete"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Use: preview, markAsTest, delete" });
      }
      const result = await storage.bulkCleanupTastings(filter || {}, action);
      res.json(result);
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
              whiskyScores[r.whiskyId] = { name: w.name, distillery: w.distillery, imageUrl: w.imageUrl ?? null, scores: [], tastingTitle: t?.title || "" };
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
          imageUrl: data.imageUrl,
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

      const uniqueResearchParticipants = await deduplicateParticipantList(allParticipants);

      res.json({
        totalRatings: allRatings.length,
        totalWhiskies: allWhiskies.length,
        totalTastings: allTastings.length,
        totalParticipants: uniqueResearchParticipants,
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
      if (await isAIDisabled("newsletter_generate")) return res.status(503).json({ message: "AI feature disabled by admin" });
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

      const allEntries = await storage.getBenchmarkEntries();
      const categoryFilter = req.query.category as string | undefined;
      const entries = categoryFilter ? allEntries.filter(e => e.libraryCategory === categoryFilter) : allEntries;
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
        libraryCategory: z.enum(["tasting_notes", "analysis", "article", "other"]).optional().default("other"),
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

  app.post("/api/benchmark/to-wishlist", async (req: Request, res: Response) => {
    try {
      const { entries, participantId } = req.body;
      if (!entries || !Array.isArray(entries) || !participantId) {
        return res.status(400).json({ message: "entries array and participantId required" });
      }
      const saved = [];
      for (const e of entries) {
        const entry = await storage.createWishlistEntry({
          participantId,
          whiskyName: e.whiskyName || "Unknown",
          distillery: e.distillery || null,
          region: e.region || null,
          age: e.age || null,
          abv: e.abv || null,
          caskType: e.caskType || null,
          notes: [e.noseNotes, e.tasteNotes, e.finishNotes].filter(Boolean).join("; ") || null,
          priority: "medium",
          source: e.sourceDocument || null,
        });
        saved.push(entry);
      }
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/benchmark/to-journal", async (req: Request, res: Response) => {
    try {
      const { entries, participantId } = req.body;
      if (!entries || !Array.isArray(entries) || !participantId) {
        return res.status(400).json({ message: "entries array and participantId required" });
      }
      const saved = [];
      for (const e of entries) {
        const entry = await storage.createJournalEntry({
          participantId,
          title: e.whiskyName || "Imported Whisky",
          whiskyName: e.whiskyName || null,
          distillery: e.distillery || null,
          region: e.region || null,
          age: e.age || null,
          abv: e.abv || null,
          caskType: e.caskType || null,
          noseNotes: e.noseNotes || null,
          tasteNotes: e.tasteNotes || null,
          finishNotes: e.finishNotes || null,
          personalScore: e.score || null,
          body: e.overallNotes || null,
          source: "imported",
        });
        saved.push(entry);
      }
      res.json(saved);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // AI document analysis endpoint
  app.post("/api/benchmark/analyze", docUpload.single("file"), async (req: Request, res: Response) => {
    try {
      if (await isAIDisabled("benchmark_analyze")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const participantId = req.body.participantId as string;
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can analyze documents" });

      const file = (req as any).file;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      const allWhiskies = await storage.getActiveWhiskies();
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
        const workbook = await readExcelBuffer(file.buffer);
        const allText: string[] = [];
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName];
          const csv = sheetToCsv(sheet);
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
      if (await isAIDisabled("photo_tasting_identify")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const participantId = req.body.participantId as string;
      const auth = await verifyHostOrAdmin(participantId);
      if (!auth) return res.status(403).json({ message: "Only hosts and admins can use photo tasting creation" });

      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ message: "No photos uploaded" });

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const allWhiskies = await storage.getActiveWhiskies();
      const benchmarks = await storage.getBenchmarkEntries();
      const collectionItems = await storage.getWhiskybaseCollection(participantId);

      const dbWhiskyNames = [...new Set(allWhiskies.map(w => w.name))].slice(0, 200);
      const benchmarkNames = [...new Set(benchmarks.map(b => b.whiskyName))].slice(0, 200);
      const knownWhiskies = [...new Set([...dbWhiskyNames, ...benchmarkNames])];

      const results = [];
      for (const file of files) {
        const base64 = file.buffer.toString("base64");
        console.log(`Photo tasting scan: file=${file.originalname}, size=${(file.size / 1024).toFixed(0)}KB`);

        let photoStoredUrl: string | null = null;
        try {
          photoStoredUrl = await uploadBufferToObjectStorage(objectStorage, file.buffer, file.mimetype);
          console.log(`Photo stored in Object Storage: ${photoStoredUrl}`);
        } catch (uploadErr: any) {
          console.error(`Failed to store photo in Object Storage: ${uploadErr.message}`);
        }

        const photoHash = crypto.createHash("sha256").update(file.buffer).digest("hex");
        const cachedPhoto = aiScanCache.get(photoHash);
        let identifiedList: any[];

        if (cachedPhoto && Date.now() - cachedPhoto.timestamp < AI_CACHE_TTL) {
          console.log(`Photo tasting scan: cache hit for hash ${photoHash.substring(0, 12)}...`);
          cachedPhoto.timestamp = Date.now();
          identifiedList = JSON.parse(JSON.stringify(cachedPhoto.result.whiskies || []));
        } else {
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

          if (Array.isArray(parsed.whiskies)) {
            identifiedList = parsed.whiskies;
          } else if (parsed.name) {
            identifiedList = [parsed];
          } else {
            identifiedList = [{ name: "Unknown Whisky", confidence: "low" }];
          }

          if (aiScanCache.size >= AI_CACHE_MAX) {
            const oldest = [...aiScanCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
            if (oldest) aiScanCache.delete(oldest[0]);
          }
          aiScanCache.set(photoHash, { result: { whiskies: JSON.parse(JSON.stringify(identifiedList)) }, timestamp: Date.now() });
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
            const wbImage = await tryFetchWhiskybaseImage(identified.whiskybaseUrl, objectStorage);
            if (wbImage) {
              identified.imageUrl = wbImage;
            }
          }

          if (!identified.whiskybaseSearch) {
            identified.whiskybaseSearch = [identified.name, identified.distillery].filter(Boolean).join(" ");
          }

          if (!identified.imageUrl && photoStoredUrl) {
            identified.imageUrl = photoStoredUrl;
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
        let whisky = await storage.createWhisky({
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
          whiskybaseId: w.whiskybaseId || null,
          sortOrder: i,
        });
        if (!whisky.imageUrl && (w.whiskybaseUrl || w.whiskybaseId)) {
          const wbImage = await tryFetchWhiskybaseImage(w.whiskybaseUrl || w.whiskybaseId, objectStorage);
          if (wbImage) {
            await storage.updateWhisky(whisky.id, { imageUrl: wbImage });
            whisky = { ...whisky, imageUrl: wbImage } as typeof whisky;
          }
        }
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

  // ===== USER FEEDBACK =====
  app.post("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { participantId, participantName, category, message } = req.body;
      if (!message || !message.trim()) {
        return res.status(400).json({ message: "Message is required" });
      }
      const feedback = await storage.createUserFeedback({
        participantId: participantId || null,
        participantName: participantName || null,
        category: category || "feature",
        message: message.trim(),
      });
      res.json(feedback);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/feedback", async (req: Request, res: Response) => {
    try {
      const { participantId } = req.query;
      if (participantId) {
        const requester = await storage.getParticipant(participantId as string);
        if (!requester || requester.role !== "admin") {
          return res.status(403).json({ message: "Admin access required" });
        }
      }
      const feedback = await storage.getUserFeedback();
      res.json(feedback);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTING PHOTOS =====
  app.get("/api/tastings/:id/photos", async (req: Request, res: Response) => {
    try {
      const photos = await storage.getTastingPhotos(req.params.id as string);
      res.json(photos);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/photos", (req: any, res: any, next: any) => {
    memUpload.single("photo")(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Image must be under 2 MB" });
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      const tastingId = req.params.id;
      const { participantId, participantName, whiskyId, caption } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      if (!req.file) return res.status(400).json({ message: "No photo provided" });

      const photoUrl = await uploadBufferToObjectStorage(objectStorage, req.file.buffer, req.file.mimetype);
      const photo = await storage.createTastingPhoto({
        tastingId,
        participantId,
        participantName: participantName || null,
        whiskyId: whiskyId || null,
        photoUrl,
        caption: caption || null,
        printable: true,
      });
      res.json(photo);
    } catch (e: any) {
      console.error("Photo upload error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/tasting-photos/:id", async (req: Request, res: Response) => {
    try {
      const { participantId, printable, caption } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const updateData: any = {};
      if (printable !== undefined) updateData.printable = printable;
      if (caption !== undefined) updateData.caption = caption;

      let photo = await storage.updateTastingPhoto(req.params.id as string, participantId, updateData);
      if (!photo) {
        photo = await storage.updateTastingPhotoAsHost(req.params.id as string, participantId, updateData);
      }
      if (!photo) return res.status(404).json({ message: "Photo not found or not authorized" });
      res.json(photo);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/tasting-photos/:id", async (req: Request, res: Response) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      await storage.deleteTastingPhoto(req.params.id as string, participantId);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== AI TASTING IMPORT =====

  const tastingImportUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 20 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowedMimes = [
        "application/pdf",
        "text/plain", "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/octet-stream",
      ];
      const allowedExts = [".xlsx", ".xls", ".csv", ".pdf", ".txt", ".jpg", ".jpeg", ".png", ".webp", ".gif"];
      const ext = path.extname(file.originalname).toLowerCase();
      if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) cb(null, true);
      else cb(new Error("Unsupported file type. Allowed: Excel, CSV, PDF, TXT, JPG, PNG, WebP, GIF"));
    },
  });

  async function parseTransposedExcel(buffer: Buffer): Promise<{ whiskies: any[]; tastingMeta: any; hostNotes: Record<number, string> }> {
    const wb = await readExcelBuffer(buffer);
    const whiskies: any[] = [];
    const tastingMeta: any = {};
    const hostNotes: Record<number, string> = {};

    const lineUpSheet = wb.SheetNames.find(n => n.toLowerCase().includes("line up") || n.toLowerCase().includes("lineup"));
    if (lineUpSheet) {
      const sheet = wb.Sheets[lineUpSheet];
      const raw: any[][] = sheetToArrayOfArrays(sheet);

      const rowMap: Record<string, any[]> = {};
      let whiskyCount = 0;

      for (const row of raw) {
        if (!row || !row[0]) continue;
        const label = String(row[0]).trim().toLowerCase();
        const values: any[] = [];
        for (let i = 1; i < row.length; i++) {
          if (row[i] != null && row[i] !== "") values.push(row[i]);
        }
        if (values.length > whiskyCount) whiskyCount = values.length;

        if (label.startsWith("nr")) {
          rowMap["nr"] = values;
        } else if (label.includes("name") || label.includes("protagonist")) {
          rowMap["name"] = values;
        } else if (label.includes("typ") || label.includes("kat") || label.includes("category") || label.includes("type")) {
          rowMap["cask"] = values;
        } else if (label.includes("land") || label.includes("reg") || label.includes("country") || label.includes("region")) {
          rowMap["region"] = values;
        } else if (label.includes("distill") || label.includes("ib") || label.includes("bottler") || label.includes("abfüller")) {
          rowMap["distillery_ib"] = values;
        } else if (label.includes("cask") || label.includes("fass")) {
          rowMap["cask"] = values;
        } else if (label.includes("alter") || label === "age") {
          rowMap["age"] = values;
        } else if (label.includes("vintage") || label.includes("jahrgang")) {
          rowMap["vintage"] = values;
        } else if (label === "abv" || label.includes("abv") || label.includes("alkohol")) {
          rowMap["abv"] = values;
        } else if (label.includes("wid") || label.includes("whiskybase") || label === "wb") {
          rowMap["wid"] = values;
        } else if (label.includes("punkt") || label.includes("score") || label.includes("rating")) {
          rowMap["score"] = values;
        } else if (label.includes("preis") || label.includes("price")) {
          rowMap["price"] = values;
        } else if (label.includes("ppm") || label.includes("phenol")) {
          rowMap["ppm"] = values;
        } else if (label.includes("peat") || label.includes("torf")) {
          rowMap["peat"] = values;
        }
      }

      for (let i = 0; i < whiskyCount; i++) {
        const getName = (arr: any[] | undefined) => arr && arr[i] != null ? String(arr[i]).replace(/\r?\n/g, " ").trim() : null;
        const name = getName(rowMap["name"]);
        if (!name) continue;

        let distillery: string | null = null;
        let bottler: string | null = null;
        const distIb = getName(rowMap["distillery_ib"]);
        if (distIb) {
          const oaMatch = distIb.match(/^(.+?)\s+OA$/i);
          if (oaMatch) {
            distillery = oaMatch[1].trim();
            bottler = "Official Bottling";
          } else {
            const parts = distIb.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
            if (parts.length >= 2) {
              distillery = parts[0];
              bottler = parts[1] === "OA" ? "Official Bottling" : parts[1];
            } else if (parts.length === 1) {
              const spaceOa = parts[0].match(/^(.+?)\s+OA$/i);
              if (spaceOa) {
                distillery = spaceOa[1].trim();
                bottler = "Official Bottling";
              } else {
                distillery = parts[0];
              }
            }
          }
        }

        let country: string | null = null;
        let region: string | null = null;
        const regionRaw = getName(rowMap["region"]);
        if (regionRaw) {
          const rParts = regionRaw.split("/").map(s => s.trim());
          if (rParts.length >= 2) {
            const countryCode = rParts[0].toUpperCase();
            const countryMap: Record<string, string> = { SC: "Scotland", USA: "USA", US: "USA", JP: "Japan", IR: "Ireland", TW: "Taiwan", IN: "India", DE: "Germany", FR: "France", AU: "Australia", CA: "Canada", NZ: "New Zealand", SE: "Sweden", NL: "Netherlands", FI: "Finland", CH: "Switzerland", AT: "Austria", BE: "Belgium", DK: "Denmark", NO: "Norway", IL: "Israel", ES: "Spain", IT: "Italy", WA: "Wales", EN: "England" };
            country = countryMap[countryCode] || countryCode;
            region = rParts.slice(1).join(" / ").trim();
          } else {
            const upper = regionRaw.toUpperCase();
            const knownCountries = ["USA", "SCOTLAND", "JAPAN", "IRELAND", "TAIWAN", "INDIA", "GERMANY", "FRANCE", "AUSTRALIA", "CANADA"];
            const knownRegions: Record<string, string> = { SPEYSIDE: "Scotland", HIGHLANDS: "Scotland", HIGHLAND: "Scotland", ISLAY: "Scotland", ISLANDS: "Scotland", LOWLANDS: "Scotland", LOWLAND: "Scotland", CAMPBELTOWN: "Scotland", KENTUCKY: "USA", TENNESSEE: "USA", BOURBON: "USA" };
            if (knownCountries.includes(upper)) {
              country = regionRaw;
            } else if (knownRegions[upper]) {
              country = knownRegions[upper];
              region = regionRaw;
            } else {
              region = regionRaw;
            }
          }
        }

        let abv: number | null = null;
        const abvRaw = rowMap["abv"]?.[i];
        if (abvRaw != null) {
          const abvStr = String(abvRaw).replace(/%/g, "").trim();
          const abvNum = parseFloat(abvStr);
          if (!isNaN(abvNum)) abv = abvNum <= 1 ? abvNum * 100 : abvNum;
        }

        let age: string | null = null;
        const ageRaw = getName(rowMap["age"]);
        if (ageRaw) age = ageRaw.replace(/\s*y(ears?)?$/i, "").trim();

        let wbScore: number | null = null;
        const scoreRaw = rowMap["score"]?.[i];
        if (scoreRaw != null) { const n = parseFloat(String(scoreRaw)); if (!isNaN(n)) wbScore = n; }

        let price: number | null = null;
        const priceRaw = rowMap["price"]?.[i];
        if (priceRaw != null) { const n = parseFloat(String(priceRaw)); if (!isNaN(n)) price = n; }

        let whiskybaseId: string | null = null;
        const widRaw = rowMap["wid"]?.[i];
        if (widRaw != null) whiskybaseId = String(widRaw).trim();

        whiskies.push({
          name,
          distillery,
          bottler,
          age,
          abv: abv != null ? Math.round(abv * 10) / 10 : null,
          category: null,
          country,
          region,
          caskInfluence: getName(rowMap["cask"]),
          vintage: getName(rowMap["vintage"]),
          whiskybaseId,
          wbScore,
          price,
          ppm: rowMap["ppm"]?.[i] != null ? parseFloat(String(rowMap["ppm"][i])) || null : null,
          peatLevel: getName(rowMap["peat"]),
          sortOrder: i,
          hostNotes: null,
          hostSummary: null,
        });
      }
    }

    const metaSheet = wb.SheetNames.find(n => n.toLowerCase().includes("tln") || n.toLowerCase().includes("logistik") || n.toLowerCase().includes("teilnehmer"));
    if (metaSheet) {
      const sheet = wb.Sheets[metaSheet];
      const raw: any[][] = sheetToArrayOfArrays(sheet);
      if (raw[0]?.[0]) tastingMeta.title = String(raw[0][0]).trim();
      if (raw[1]?.[0]) {
        const dateStr = String(raw[1][0]).trim();
        tastingMeta.date = dateStr;
        const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (match) tastingMeta.dateISO = `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
      }

      tastingMeta.participants = [];
      for (let r = 3; r < raw.length; r++) {
        const name = raw[r]?.[0];
        if (name && typeof name === "string" && name.trim() && !name.toLowerCase().includes("summe") && !name.toLowerCase().includes("total") && !name.toLowerCase().includes("gesamt")) {
          tastingMeta.participants.push(name.trim());
        }
      }
    }

    for (const sheetName of wb.SheetNames) {
      const num = parseInt(sheetName.trim());
      if (!isNaN(num) && num >= 1 && num <= 100) {
        const sheet = wb.Sheets[sheetName];
        const raw: any[][] = sheetToArrayOfArrays(sheet);
        const texts: string[] = [];
        for (const row of raw) {
          if (!row) continue;
          for (const cell of row) {
            if (cell != null && String(cell).trim()) texts.push(String(cell).trim());
          }
        }
        if (texts.length > 0) {
          hostNotes[num - 1] = texts.join("\n\n");
        }
      }
    }

    for (let i = 0; i < whiskies.length; i++) {
      if (hostNotes[i]) {
        whiskies[i].hostSummary = hostNotes[i];
      }
    }

    return { whiskies, tastingMeta, hostNotes };
  }

  app.post("/api/tastings/ai-import", (req: any, res: any, next: any) => {
    tastingImportUpload.array("files", 10)(req, res, (err: any) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "File too large (max 20 MB)" });
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      next();
    });
  }, async (req: any, res: any) => {
    try {
      if (await isAIDisabled("ai_import")) return res.status(503).json({ message: "AI feature disabled by admin" });
      const files: Express.Multer.File[] = req.files || [];
      const pastedText: string = req.body.text || "";
      const hostId: string = req.body.hostId;

      if (!hostId) return res.status(400).json({ message: "hostId required" });
      if (files.length === 0 && !pastedText.trim()) {
        return res.status(400).json({ message: "Please provide at least one file or paste text" });
      }

      let excelResult: { whiskies: any[]; tastingMeta: any; hostNotes: Record<number, string> } | null = null;
      const imageContents: { type: "image_url"; image_url: { url: string } }[] = [];
      let textContent = pastedText.trim();

      for (const file of files) {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === ".xlsx" || ext === ".xls" || ext === ".csv") {
          excelResult = await parseTransposedExcel(file.buffer);
          if (excelResult.whiskies.length === 0) {
            const rows = await parseSpreadsheetRows(file.buffer, file.originalname);
            if (rows.rows.length > 0) {
              excelResult.whiskies = rows.rows;
            }
          }
        } else if (file.mimetype.startsWith("image/")) {
          const base64 = file.buffer.toString("base64");
          imageContents.push({
            type: "image_url",
            image_url: { url: `data:${file.mimetype};base64,${base64}` },
          });
        } else if (ext === ".pdf" || file.mimetype === "text/plain") {
          textContent += "\n\n" + file.buffer.toString("utf-8");
        }
      }

      if (excelResult && excelResult.whiskies.length > 0) {
        return res.json({
          whiskies: excelResult.whiskies,
          tastingMeta: excelResult.tastingMeta || {},
          source: "excel",
        });
      }

      if (!textContent && imageContents.length === 0) {
        return res.status(400).json({ message: "Could not extract any content from the uploaded files" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are an expert whisky tasting data extractor. You analyze images, screenshots, text messages, and documents to extract structured tasting session information.

Extract ALL whisky information you can find. Return a JSON object with this structure:
{
  "tastingMeta": {
    "title": "Tasting title if found",
    "date": "ISO date YYYY-MM-DD if found",
    "dateDisplay": "Original date string as shown",
    "location": "Location if mentioned",
    "participants": ["Name1", "Name2"]
  },
  "whiskies": [
    {
      "name": "Whisky name (full expression name)",
      "distillery": "Distillery name",
      "bottler": "Independent bottler or 'OA' for official, null if unknown",
      "age": "Age statement as string (e.g. '17' or 'NAS')",
      "abv": 46.0,
      "category": "Single Malt / Blended Malt / Bourbon / Rye / Grain / Blended / Other",
      "country": "Scotland / Ireland / Japan / USA / Canada / India / Taiwan / Other",
      "region": "Speyside / Islay / Highland / etc.",
      "caskInfluence": "Cask type(s)",
      "vintage": "Vintage year(s) e.g. '2010 - 2025'",
      "whiskybaseId": "Whiskybase ID number if visible",
      "wbScore": 87.5,
      "price": 80.00,
      "peatLevel": "None / Light / Medium / Heavy",
      "ppm": null,
      "hostNotes": "Any tasting notes or descriptions found for this whisky",
      "hostSummary": "Detailed host assessment/review if present",
      "sortOrder": 0
    }
  ]
}

Important rules:
- Extract EVERY whisky you can identify, preserving the order
- ABV should be a decimal number (e.g. 46.0 not "46%")
- For country codes: SC/SCO = Scotland, IR/IRL = Ireland, JP/JPN = Japan
- If "OA" or "Originalabfüllung" is mentioned as bottler, set bottler to "OA (Original Abfüllung)"
- Prices should be numbers without currency symbols
- Parse whiskybase IDs as strings
- wbScore should be a number 0-100
- If you find tasting notes (nose/palate/finish descriptions), combine them into hostSummary
- Set null for any field you cannot determine
- The output must be valid JSON only, no markdown or explanation`;

      const userContent: any[] = [];

      if (textContent) {
        userContent.push({
          type: "text",
          text: `Extract all whisky tasting information from this content:\n\n${textContent}`,
        });
      }

      if (imageContents.length > 0) {
        userContent.push({
          type: "text",
          text: textContent
            ? "Also analyze these images for additional tasting information:"
            : "Extract all whisky tasting information from these images:",
        });
        userContent.push(...imageContents);
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return res.status(500).json({ message: "AI could not extract data from the provided content" });
      }

      const parsed = JSON.parse(content);
      return res.json({
        whiskies: parsed.whiskies || [],
        tastingMeta: parsed.tastingMeta || {},
        source: "ai",
      });
    } catch (e: any) {
      console.error("AI import error:", e);
      res.status(500).json({ message: e.message || "Import analysis failed" });
    }
  });

  app.post("/api/tastings/create-from-import", async (req: any, res: any) => {
    try {
      const { hostId, title, date, location, blindMode, whiskies: whiskyData } = req.body;
      if (!hostId) return res.status(400).json({ message: "hostId required" });
      if (!title) return res.status(400).json({ message: "title required" });
      if (!whiskyData || !Array.isArray(whiskyData) || whiskyData.length === 0) {
        return res.status(400).json({ message: "At least one whisky required" });
      }

      const code = Math.random().toString(36).slice(2, 8).toUpperCase();
      const tasting = await storage.createTasting({
        title: title.trim(),
        date: date || new Date().toISOString().split("T")[0],
        location: location || "Online",
        hostId,
        code,
        status: "draft",
        blindMode: blindMode ?? false,
      });

      const createdWhiskies = [];
      for (let i = 0; i < whiskyData.length; i++) {
        const w = whiskyData[i];
        let whisky = await storage.createWhisky({
          tastingId: tasting.id,
          name: (w.name || `Whisky ${i + 1}`).trim(),
          distillery: w.distillery?.trim() || null,
          age: w.age?.toString()?.trim() || null,
          abv: w.abv != null ? parseFloat(String(w.abv)) || null : null,
          type: w.category || w.type || null,
          country: w.country || null,
          notes: w.notes || null,
          sortOrder: w.sortOrder ?? i,
          category: w.category || w.type || null,
          region: w.region?.trim() || null,
          caskInfluence: w.caskInfluence?.trim() || null,
          peatLevel: w.peatLevel || null,
          ppm: w.ppm != null ? parseFloat(String(w.ppm)) || null : null,
          whiskybaseId: w.whiskybaseId?.toString()?.trim() || null,
          wbScore: w.wbScore != null ? parseFloat(String(w.wbScore)) || null : null,
          bottler: w.bottler?.trim() || null,
          vintage: w.vintage?.toString()?.trim() || null,
          price: w.price != null ? parseFloat(String(w.price)) || null : null,
          hostNotes: w.hostNotes?.trim() || null,
          hostSummary: w.hostSummary?.trim() || null,
        });
        if (!whisky.imageUrl && (w.whiskybaseUrl || w.whiskybaseId)) {
          const wbImage = await tryFetchWhiskybaseImage(w.whiskybaseUrl || w.whiskybaseId?.toString(), objectStorage);
          if (wbImage) {
            await storage.updateWhisky(whisky.id, { imageUrl: wbImage });
            whisky = { ...whisky, imageUrl: wbImage } as typeof whisky;
          }
        }
        createdWhiskies.push(whisky);
      }

      res.status(201).json({ tasting, whiskies: createdWhiskies });
    } catch (e: any) {
      console.error("Create from import error:", e);
      res.status(500).json({ message: e.message || "Failed to create tasting" });
    }
  });

  // ===== DATA EXPORT =====

  app.get("/api/export/tastings", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "csv";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "extended");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });
      const tastings = await storage.getTastingsForParticipant(participantId);
      const rows: any[] = [];
      for (const t of tastings) {
        if (t.status === "deleted") continue;
        const whiskies = await storage.getWhiskiesForTasting(t.id);
        const ratings = await storage.getRatingsForTasting(t.id);
        const myRatings = ratings.filter((r: any) => r.participantId === participantId);
        if (myRatings.length === 0) {
          rows.push({
            Tasting: t.title, Date: t.date, Location: t.location, Status: t.status,
            Whisky: "", Distillery: "", Age: "", ABV: "",
            Nose: "", Taste: "", Finish: "", Balance: "", Overall: "", Notes: ""
          });
        }
        for (const r of myRatings) {
          const w = whiskies.find((w: any) => w.id === r.whiskyId);
          rows.push({
            Tasting: t.title, Date: t.date, Location: t.location, Status: t.status,
            Whisky: w?.name || "", Distillery: w?.distillery || "", Age: w?.age || "", ABV: w?.abv || "",
            Nose: r.nose, Taste: r.taste, Finish: r.finish, Balance: r.balance, Overall: r.overall,
            Notes: r.notes || ""
          });
        }
      }
      await sendExport(res, rows, `casksense_tastings_${new Date().toISOString().split("T")[0]}`, format, "Tastings");
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  app.get("/api/export/journal", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "csv";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "own");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });
      const entries = await storage.getJournalEntries(participantId);
      const rows = entries.map((e: any) => ({
        Date: e.createdAt, Name: e.name, Distillery: e.distillery || "",
        Region: e.region || "", Age: e.age || "", ABV: e.abv || "",
        Rating: e.rating || "", Nose: e.noseNotes || "", Taste: e.tasteNotes || "",
        Finish: e.finishNotes || "", Notes: e.notes || "", Source: e.source || ""
      }));
      await sendExport(res, rows, `casksense_journal_${new Date().toISOString().split("T")[0]}`, format, "Journal");
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  app.get("/api/export/profile", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "csv";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "own");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });
      const profile = await storage.getProfile(participantId);
      const participant = await storage.getParticipant(participantId);
      const rows = [{
        Name: participant?.name || "", Email: participant?.email || "",
        Bio: profile?.bio || "", Location: profile?.location || "",
        FavoriteRegion: profile?.favoriteRegion || "", FavoriteDistillery: profile?.favoriteDistillery || "",
        PreferredStyle: profile?.preferredStyle || "", ExperienceLevel: profile?.experienceLevel || "",
        TopNoseNotes: profile?.topNoseNotes || "", TopTasteNotes: profile?.topTasteNotes || "",
        TopFinishNotes: profile?.topFinishNotes || ""
      }];
      await sendExport(res, rows, `casksense_profile_${new Date().toISOString().split("T")[0]}`, format, "Profile");
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  app.get("/api/export/friends", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "csv";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "own");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });
      const participant = access.participant!;
      const friends = await storage.getWhiskyFriends(participantId);
      const rows = await Promise.all(friends.map(async (f: any) => {
        const p = f.friendId ? await storage.getParticipant(f.friendId) : null;
        const row: any = {
          Name: `${f.firstName || ""} ${f.lastName || ""}`.trim(),
          Status: f.status || "",
          LinkedProfile: p?.name || "", AddedAt: f.createdAt || ""
        };
        if ((participant as any).role === "admin") {
          row.Email = f.email || "";
        }
        return row;
      }));
      await sendExport(res, rows, `casksense_friends_${new Date().toISOString().split("T")[0]}`, format, "Friends");
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  app.get("/api/export/wishlist", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "csv";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "own");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });
      const entries = await storage.getWishlistEntries(participantId);
      const rows = entries.map((e: any) => ({
        Name: e.name || "", Distillery: e.distillery || "",
        Age: e.age || "", ABV: e.abv || "", Region: e.region || "",
        Notes: e.notes || "", Priority: e.priority || "", AddedAt: e.createdAt || ""
      }));
      await sendExport(res, rows, `casksense_wishlist_${new Date().toISOString().split("T")[0]}`, format, "Wishlist");
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  app.get("/api/export/collection", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "csv";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "own");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });
      const entries = await storage.getWhiskybaseCollection(participantId);
      const rows = entries.map((e: any) => ({
        Brand: e.brand || "", Name: e.name || "", WhiskybaseId: e.whiskybaseId || "",
        Category: e.category || "", Rating: e.rating || "",
        Notes: e.notes || "", AddedAt: e.createdAt || ""
      }));
      await sendExport(res, rows, `casksense_collection_${new Date().toISOString().split("T")[0]}`, format, "Collection");
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  app.get("/api/export/all", async (req, res) => {
    try {
      const participantId = req.query.participantId as string;
      const format = (req.query.format as string) || "xlsx";
      const pin = req.query.pin as string;
      const access = await verifyExportAccess(participantId, pin, "admin");
      if (!access.ok) return res.status(access.status!).json({ message: access.message });

      const sheets: { name: string; data: any[] }[] = [];

      const tastings = await storage.getTastingsForParticipant(participantId);
      const tastingRows: any[] = [];
      for (const t of tastings) {
        if (t.status === "deleted") continue;
        const whiskies = await storage.getWhiskiesForTasting(t.id);
        const ratings = await storage.getRatingsForTasting(t.id);
        const myRatings = ratings.filter((r: any) => r.participantId === participantId);
        for (const r of myRatings) {
          const w = whiskies.find((w: any) => w.id === r.whiskyId);
          tastingRows.push({
            Tasting: t.title, Date: t.date, Whisky: w?.name || "", Distillery: w?.distillery || "",
            ABV: w?.abv || "", Nose: r.nose, Taste: r.taste, Finish: r.finish, Balance: r.balance, Overall: r.overall, Notes: r.notes || ""
          });
        }
      }
      if (tastingRows.length) sheets.push({ name: "Tastings", data: tastingRows });

      const journal = await storage.getJournalEntries(participantId);
      if (journal.length) {
        const jRows = journal.map((e: any) => ({
          Date: e.createdAt, Name: e.name, Distillery: e.distillery || "", Rating: e.rating || "",
          Nose: e.noseNotes || "", Taste: e.tasteNotes || "", Finish: e.finishNotes || "", Notes: e.notes || ""
        }));
        sheets.push({ name: "Journal", data: jRows });
      }

      const wishlist = await storage.getWishlistEntries(participantId);
      if (wishlist.length) {
        const wRows = wishlist.map((e: any) => ({
          Name: e.name || "", Distillery: e.distillery || "", Notes: e.notes || "", Priority: e.priority || ""
        }));
        sheets.push({ name: "Wishlist", data: wRows });
      }

      const collection = await storage.getWhiskybaseCollection(participantId);
      if (collection.length) {
        const cRows = collection.map((e: any) => ({
          Brand: e.brand || "", Name: e.name || "", WhiskybaseId: e.whiskybaseId || "", Rating: e.rating || ""
        }));
        sheets.push({ name: "Collection", data: cRows });
      }

      const friends = await storage.getWhiskyFriends(participantId);
      if (friends.length) {
        const fRows = friends.map((f: any) => ({
          Name: `${f.firstName || ""} ${f.lastName || ""}`.trim(), Email: f.email || "", Status: f.status || ""
        }));
        sheets.push({ name: "Friends", data: fRows });
      }

      if (sheets.length === 0) {
        return res.status(404).json({ message: "No data available for export" });
      }

      if (format === "csv") {
        const csv = jsonToCsv(sheets[0].data);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="casksense_all_${new Date().toISOString().split("T")[0]}.csv"`);
        return res.send("\uFEFF" + csv);
      }

      const buf = await buildExcelBuffer(sheets);
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="casksense_all_${new Date().toISOString().split("T")[0]}.xlsx"`);
      res.send(buf);
    } catch (e: any) {
      res.status(500).json({ message: e.message || "Export failed" });
    }
  });

  // --- Shared tour slide data and image compression ---
  const tourCacheDir = "/tmp/tour-cache";
  if (!fs.existsSync(tourCacheDir)) fs.mkdirSync(tourCacheDir, { recursive: true });

  const tourSlideData = [
    {
      title: "CaskSense",
      subtitle: "Whisky gemeinsam erleben. Ohne Technik-Stress — der Moment am Tisch zählt.",
      badge: "Rundgang",
      features: [] as string[],
      image: "slide-cover.png",
    },
    {
      title: "Erst mal verkosten",
      subtitle: "CaskSense ist kein Tech-Spielzeug. Es geht ums Schmecken, Riechen, Diskutieren — um den Moment am Tisch.",
      badge: "Das Wichtigste zuerst",
      image: "slide-tasting.png",
      features: [
        "Verkosten steht im Fokus — Kein Feature-Overload, nur das, was ein gutes Tasting besser macht",
        "Kein Konto nötig — QR-Code scannen, Name eingeben, mitmachen",
        "Kein Vorwissen nötig — Ob Neuling oder Kenner, jeder ist willkommen",
        "Whisky first — Die App soll helfen, nicht im Weg stehen",
      ],
    },
    {
      title: "Dein Tempo, dein Erlebnis",
      subtitle: "CaskSense wächst mit deiner Neugier. Du entscheidest, wie tief du eintauchst.",
      badge: "Von Einfach bis Analytisch",
      image: "slide-community.png",
      features: [
        "Just Tasting — Kommen, trinken, bewerten, gehen. Null Technik-Stress.",
        "Explorer — Journal starten, Aromen entdecken, Favoriten merken.",
        "Connoisseur — Geschmacksprofil aufbauen, Whiskys vergleichen, Empfehlungen.",
        "Analyst — Benchmarks, Statistiken, Muster — für alle, die Daten lieben.",
      ],
    },
    {
      title: "Tasting-Sessions",
      subtitle: "Ein Gastgeber erstellt die Session, lädt per QR-Code ein — und alle bewerten gemeinsam.",
      badge: "Kernfunktion",
      image: "slide-tasting.png",
      features: [
        "Sessions erstellen — Name, Datum, Line-up — in Sekunden startklar",
        "QR-Code Einladungen — Scannen und sofort dabei — kein Konto nötig",
        "Strukturierte Bewertung — Nase, Geschmack, Abgang, Balance — auf deiner Wunschskala",
        "Live-Diskussion — Austausch in Echtzeit während des Tastings",
      ],
    },
    {
      title: "Geführtes Tasting & Präsentation",
      subtitle: "Geteilter Bildschirm für den Gastgeber, Vollbild-Ansicht für alle — perfekt mit Beamer oder Fernseher.",
      badge: "Showtime",
      image: "slide-guided.png",
      features: [
        "Geteilter Bildschirm — Steuerung links, Präsentation rechts — alles unter Kontrolle",
        "Vollbild-Ansicht — Große, klare Darstellung — auch auf dem Fernseher",
        "Schrittweise Enthüllung — Jede Flasche ein eigener Moment — mit Animationen",
        "Startet automatisch — Präsentationsmodus aktiviert sich mit der Enthüllungsphase",
      ],
    },
    {
      title: "Verkostungsbrett & Präsentation",
      subtitle: "Alle Whiskys auf einen Blick — nummeriert, mit Fotos und Notizen.",
      badge: "Visuell",
      image: "slide-flightboard.png",
      features: [
        "Verkostungsbrett — Überblick über alle Flaschen — klar nummeriert und sortiert",
        "Flaschenfotos — Bilder hochladen — auch direkt vom Handy",
        "PDF Tasting-Menü — Professionelles Menü zum Ausdrucken oder Teilen",
        "Tasting-Notiz Generator — Aromen auswählen statt formulieren — interaktiv und schnell",
      ],
    },
    {
      title: "Blind Tasting & Enthüllung",
      subtitle: "Ein beliebtes Extra: Whiskys ohne Vorurteile verkosten. Der Gastgeber enthüllt dramatisch.",
      badge: "Beliebtes Extra",
      image: "slide-blind.png",
      features: [
        "Blind-Modus — Etiketten weg, Namen verborgen — nur dein Gaumen zählt",
        "Schrittweise Enthüllung — Der Gastgeber bestimmt den Moment — mit Diagrammen und Wow-Effekt",
        "ABV & Alter raten — Zusätzlicher Spaß für alle, die sich trauen",
        "Cover-Bild Enthüllung — Gruppenfoto oder Flaschenbild als krönender Abschluss",
      ],
    },
    {
      title: "Clevere Helfer im Hintergrund",
      subtitle: "Die KI liest Etiketten, erkennt Flaschen und füllt Felder aus — damit du dich aufs Wesentliche konzentrieren kannst.",
      badge: "Optional & hilfreich",
      image: "slide-ai.png",
      features: [
        "Foto-Erkennung — Flasche fotografieren — KI erledigt die Dateneingabe",
        "Excel/CSV Import — Tabellen hochladen, Spalten werden automatisch zugeordnet",
        "Benchmark-Datenbank — Professionelle Bewertungen als Referenz — zum Vergleichen",
        "Whiskybase-Import — Bestehende Sammlung importieren — inklusive Links und Preise",
      ],
    },
    {
      title: "Mehr als Bauchgefühl",
      subtitle: "Methoden aus Psychometrie und Persönlichkeitsforschung — zugänglich gemacht. Werkzeuge, die über Hobby hinausgehen.",
      badge: "Für Wissbegierige",
      image: "slide-analytics.png",
      features: [
        "Psychometrische Skalen — Bewertungsskalen, die auf erprobten Methoden aufbauen",
        "Benchmark-Datenbank — Eigene Bewertungen im Kontext professioneller Referenzen einordnen",
        "Messqualität & Konsistenz — Wie zuverlässig bewertest du? CaskSense zeigt es.",
        "KI-gestützte Mustererkennung — Zusammenhänge, die dir selbst nicht auffallen",
        "Wissenschaftliche Vertiefung — Ansätze aus Datenanalyse und prädiktiver Validität",
      ],
    },
    {
      title: "Gemeinschaft & Austausch",
      subtitle: "Whisky trinkt man nicht allein. Finde Gleichgesinnte und entdecke, was die anderen anders schmecken.",
      badge: "Gemeinsam",
      image: "slide-community.png",
      features: [
        "Freunde — Whisky-Freunde hinzufügen und deren Einträge sehen",
        "Aktivitäts-Feed — Was trinken die anderen? Timeline deiner Tasting-Runde",
        "Rangliste — Wer war am aktivsten? Wer hat die detailliertesten Notizen?",
        "Tasting-Kalender — Alle Sessions im Überblick",
        "Erinnerungen — Freundlicher Reminder per E-Mail",
      ],
    },
    {
      title: "Gastgeber-Werkzeuge",
      subtitle: "Übersicht, Briefing, Zusammenfassung — und sogar dezente Hintergrundklänge.",
      badge: "Für Gastgeber",
      image: "slide-host.png",
      features: [
        "Dashboard — Teilnehmer, Bewertungen, Top-Whiskys — alles im Blick",
        "Zusammenfassung — Rückblick nach dem Tasting: Top-Whisky, Überraschungen, Kontroversen",
        "Gastgeber-Delegation — Rolle an jemand anderen übergeben",
        "Ambiente — Kaminfeuer, Regen oder Jazz — dezente Klänge für die richtige Stimmung",
      ],
    },
    {
      title: "Wissensdatenbank",
      subtitle: "Hintergrundwissen, wenn du es brauchst — nicht, wenn du es nicht brauchst.",
      badge: "Zum Stöbern",
      image: "slide-knowledge.png",
      features: [
        "Whisky-Lexikon — 53 Begriffe in 5 Kategorien — verständlich erklärt",
        "Destillerien — ~100 Destillerien weltweit mit Geschichte und Charakter",
        "Interaktive Karte — Weltkarte mit Destillerie-Pins — zoomen und entdecken",
        "Abfüller-Lexikon — Unabhängige Abfüller und was sie besonders macht",
      ],
    },
    {
      title: "Überall dabei",
      subtitle: "Auf dem Handy, am Tablet, am Laptop — installierbar wie eine App, nutzbar in Deutsch und Englisch.",
      badge: "Flexibel",
      image: "slide-mobile.png",
      features: [
        "Wie eine App — Auf dem Home-Screen installieren — kein App Store nötig",
        "Auch offline nutzbar — Bewertungen gehen nicht verloren, auch wenn das WLAN streikt",
        "Deutsch & Englisch — Komplett zweisprachig — jederzeit umschaltbar",
        "Hell oder Dunkel — Warmes Whisky-Dunkel oder helles Creme-Amber — du wählst",
      ],
    },
    {
      title: "Deine Daten gehören dir",
      subtitle: "DSGVO-konform, transparent bei KI-Nutzung und volle Kontrolle über deine Daten.",
      badge: "Vertrauen",
      image: "slide-mobile.png",
      features: [
        "DSGVO-konform — Datenschutz nach europäischem Standard — ohne Kompromisse",
        "Transparente KI — Du siehst immer, wenn KI im Spiel ist — und kannst selbst entscheiden",
        "Datenexport jederzeit — Alle deine Daten als JSON herunterladen — gehört alles dir",
        "Speicher-Kontrolle — Du entscheidest, was gespeichert wird. Löschung auf Knopfdruck.",
      ],
    },
    {
      title: "Probier's beim nächsten Tasting",
      subtitle: "Lade ein paar Freunde ein, öffne eine gute Flasche und lass CaskSense den Rest machen.\n\nKostenlos — ohne Konto, ohne Hürden.\ncasksense.replit.app",
      badge: "",
      features: [] as string[],
      image: "slide-cta.png",
    },
  ];

  const tourImagesDir = path.join(process.cwd(), "client", "src", "assets", "tour");

  async function loadCompressedImage(name: string, maxWidth: number): Promise<string | null> {
    const cacheKey = `${name}_${maxWidth}`;
    const cached = tourImageCache.get(cacheKey);
    if (cached) return cached;
    try {
      const imgPath = path.join(tourImagesDir, name);
      if (!fs.existsSync(imgPath)) return null;
      const buffer = await sharp(imgPath)
        .resize({ width: maxWidth, withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();
      const dataUri = "data:image/jpeg;base64," + buffer.toString("base64");
      tourImageCache.set(cacheKey, dataUri);
      return dataUri;
    } catch {
      return null;
    }
  }

  // --- Tour PPTX export ---
  app.get("/api/tour-pptx", async (req: Request, res: Response) => {
    try {
      const refresh = req.query.refresh === "1";
      const cachedPath = path.join(tourCacheDir, "tour.pptx");
      const versionPath = path.join(tourCacheDir, "tour.pptx.version");

      if (!refresh && fs.existsSync(cachedPath) && fs.existsSync(versionPath)) {
        const savedVersion = fs.readFileSync(versionPath, "utf-8").trim();
        if (savedVersion === String(tourCacheVersion)) {
          res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
          res.setHeader("Content-Disposition", `attachment; filename="CaskSense-Rundgang.pptx"`);
          return res.send(fs.readFileSync(cachedPath));
        }
      }

      // @ts-ignore
      const pptxgen = await import("pptxgenjs");
      const PptxGenJS = pptxgen.default || pptxgen;
      const pres = new PptxGenJS();

      pres.layout = "LAYOUT_WIDE";
      pres.author = "CaskSense";
      pres.company = "CaskSense";
      pres.subject = "CaskSense Rundgang";
      pres.title = "CaskSense — Rundgang";

      const NAVY = "0f172a";
      const AMBER = "c8943e";
      const CREAM = "f5f0e8";
      const MUTED = "8b8578";

      for (let i = 0; i < tourSlideData.length; i++) {
        const d = tourSlideData[i];
        const slide = pres.addSlide();
        const isCover = i === 0;
        const isCta = i === tourSlideData.length - 1;

        const imgData = d.image ? await loadCompressedImage(d.image, 800) : null;

        slide.background = { color: NAVY };

        if (imgData && (isCover || isCta)) {
          slide.addImage({
            data: imgData,
            x: 0, y: 0, w: "100%", h: "100%",
            sizing: { type: "cover", w: 13.33, h: 7.5 },
          });
          slide.addShape(pres.ShapeType ? pres.ShapeType.rect : "rect", {
            x: 0, y: 0, w: "100%", h: "100%",
            fill: { color: NAVY, transparency: 35 },
          });
        } else if (imgData && !isCover && !isCta) {
          slide.addImage({
            data: imgData,
            x: 7.2, y: 0.5, w: 5.8, h: 3.25,
            sizing: { type: "cover", w: 5.8, h: 3.25 },
            rounding: true,
          });
          slide.addShape(pres.ShapeType ? pres.ShapeType.rect : "rect", {
            x: 7.2, y: 0.5, w: 5.8, h: 3.25,
            fill: { color: NAVY, transparency: 60 },
            rectRadius: 0.15,
          });
        }

        slide.addShape(pres.ShapeType ? pres.ShapeType.rect : "rect", {
          x: 0, y: 0, w: "100%", h: 0.06,
          fill: { color: AMBER },
        });

        if (d.badge) {
          slide.addText(d.badge.toUpperCase(), {
            x: isCover || isCta ? 3.5 : 0.7,
            y: isCover ? 1.8 : 0.5,
            w: isCover || isCta ? 6 : 4,
            h: 0.35,
            fontSize: 9,
            fontFace: "Arial",
            color: AMBER,
            bold: true,
            letterSpacing: 3,
            align: isCover || isCta ? "center" : "left",
          });
        }

        slide.addText(d.title, {
          x: isCover || isCta ? 1 : 0.7,
          y: isCover ? 2.3 : 0.85,
          w: isCover || isCta ? 11 : 6,
          h: isCover ? 1.2 : 0.8,
          fontSize: isCover ? 48 : 32,
          fontFace: "Georgia",
          color: CREAM,
          bold: true,
          align: isCover || isCta ? "center" : "left",
        });

        if (d.subtitle) {
          slide.addText(d.subtitle, {
            x: isCover || isCta ? 2 : 0.7,
            y: isCover ? 3.6 : 1.7,
            w: isCover || isCta ? 9 : 6,
            h: isCover || isCta ? 1.2 : 0.7,
            fontSize: isCover ? 16 : 13,
            fontFace: "Arial",
            color: MUTED,
            align: isCover || isCta ? "center" : "left",
            lineSpacingMultiple: 1.4,
          });
        }

        if (d.features.length > 0) {
          const cols = d.features.length > 4 ? 2 : 1;
          const perCol = Math.ceil(d.features.length / cols);

          for (let c = 0; c < cols; c++) {
            const colFeatures = d.features.slice(c * perCol, (c + 1) * perCol);
            const startX = 0.7 + c * 6.15;
            const startY = 2.6;

            for (let fi = 0; fi < colFeatures.length; fi++) {
              const parts = colFeatures[fi].split(" — ");
              const featureTitle = parts[0];
              const featureDesc = parts.length > 1 ? parts[1] : "";

              // feature dot
              slide.addShape(pres.ShapeType ? pres.ShapeType.rect : "rect", {
                x: startX, y: startY + fi * 0.72 + 0.08,
                w: 0.12, h: 0.12,
                fill: { color: AMBER },
                rectRadius: 0.02,
              });

              // feature title
              slide.addText(featureTitle, {
                x: startX + 0.25, y: startY + fi * 0.72,
                w: 5.5, h: 0.3,
                fontSize: 12,
                fontFace: "Arial",
                color: CREAM,
                bold: true,
              });

              // feature description
              if (featureDesc) {
                slide.addText(featureDesc, {
                  x: startX + 0.25, y: startY + fi * 0.72 + 0.28,
                  w: 5.5, h: 0.3,
                  fontSize: 10,
                  fontFace: "Arial",
                  color: MUTED,
                });
              }
            }
          }
        }

        // slide number
        if (!isCover) {
          slide.addText(`${i} / ${tourSlideData.length - 1}`, {
            x: 11.3, y: 7.0, w: 1.5, h: 0.3,
            fontSize: 8, fontFace: "Arial", color: MUTED,
            align: "right",
          });
        }

        // decorative bottom line
        slide.addShape(pres.ShapeType ? pres.ShapeType.rect : "rect", {
          x: 0, y: 7.44, w: "100%", h: 0.06,
          fill: { color: AMBER },
        });

        // footer branding
        slide.addText("CaskSense", {
          x: 0.5, y: 7.05, w: 3, h: 0.3,
          fontSize: 8, fontFace: "Georgia", color: MUTED,
          italic: true,
        });
      }

      const pptxBuffer = await pres.write({ outputType: "nodebuffer" });
      const pptxBuf = Buffer.from(pptxBuffer);
      fs.writeFileSync(cachedPath, pptxBuf);
      fs.writeFileSync(versionPath, String(tourCacheVersion));
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
      res.setHeader("Content-Disposition", `attachment; filename="CaskSense-Rundgang.pptx"`);
      res.send(pptxBuf);
    } catch (e: any) {
      console.error("PPTX generation error:", e);
      res.status(500).json({ message: e.message || "PPTX generation failed" });
    }
  });

  app.get("/api/tour-pdf", async (req: Request, res: Response) => {
    try {
      const refresh = req.query.refresh === "1";
      const cachedPath = path.join(tourCacheDir, "tour.pdf");
      const versionPath = path.join(tourCacheDir, "tour.pdf.version");

      if (!refresh && fs.existsSync(cachedPath) && fs.existsSync(versionPath)) {
        const savedVersion = fs.readFileSync(versionPath, "utf-8").trim();
        if (savedVersion === String(tourCacheVersion)) {
          res.setHeader("Content-Type", "application/pdf");
          res.setHeader("Content-Disposition", `attachment; filename="CaskSense-Rundgang.pdf"`);
          return res.send(fs.readFileSync(cachedPath));
        }
      }

      const { jsPDF } = await import("jspdf");

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const W = 297;
      const H = 210;

      const NAVY = "#0f172a";
      const AMBER = "#c8943e";
      const CREAM = "#f5f0e8";
      const MUTED = "#8b8578";

      for (let i = 0; i < tourSlideData.length; i++) {
        const d = tourSlideData[i];
        const isCover = i === 0;
        const isCta = i === tourSlideData.length - 1;

        if (i > 0) doc.addPage();

        doc.setFillColor(NAVY);
        doc.rect(0, 0, W, H, "F");

        const imgData = d.image ? await loadCompressedImage(d.image, 600) : null;

        if (imgData && (isCover || isCta)) {
          try { doc.addImage(imgData, "JPEG", 0, 0, W, H); } catch {}
          doc.setFillColor(15, 23, 42);
          doc.setGState(new (doc as any).GState({ opacity: 0.65 }));
          doc.rect(0, 0, W, H, "F");
          doc.setGState(new (doc as any).GState({ opacity: 1 }));
        } else if (imgData && !isCover && !isCta) {
          try { doc.addImage(imgData, "JPEG", 160, 15, 125, 70); } catch {}
        }

        doc.setFillColor(AMBER);
        doc.rect(0, 0, W, 1.5, "F");

        if (d.badge) {
          doc.setFontSize(8);
          doc.setTextColor(AMBER);
          if (isCover || isCta) {
            doc.text(d.badge.toUpperCase(), W / 2, isCover ? 55 : 55, { align: "center" });
          } else {
            doc.text(d.badge.toUpperCase(), 20, 18);
          }
        }

        doc.setTextColor(CREAM);
        if (isCover || isCta) {
          doc.setFontSize(36);
          doc.text(d.title, W / 2, isCover ? 75 : 75, { align: "center" });
        } else {
          doc.setFontSize(24);
          doc.text(d.title, 20, 28);
        }

        if (d.subtitle) {
          doc.setFontSize(isCover ? 12 : 10);
          doc.setTextColor(MUTED);
          const subtitleLines = doc.splitTextToSize(d.subtitle, isCover || isCta ? 200 : 130);
          if (isCover || isCta) {
            doc.text(subtitleLines, W / 2, isCover ? 90 : 90, { align: "center" });
          } else {
            doc.text(subtitleLines, 20, 38);
          }
        }

        if (d.features.length > 0) {
          const cols = d.features.length > 4 ? 2 : 1;
          const perCol = Math.ceil(d.features.length / cols);
          const startY = 62;

          for (let c = 0; c < cols; c++) {
            const colFeatures = d.features.slice(c * perCol, (c + 1) * perCol);
            const startX = 20 + c * 135;

            for (let fi = 0; fi < colFeatures.length; fi++) {
              const parts = colFeatures[fi].split(" — ");
              const featureTitle = parts[0];
              const featureDesc = parts.length > 1 ? parts[1] : "";
              const yPos = startY + fi * 18;

              doc.setFillColor(AMBER);
              doc.rect(startX, yPos - 2, 3, 3, "F");

              doc.setFontSize(10);
              doc.setTextColor(CREAM);
              doc.text(featureTitle, startX + 6, yPos + 1);

              if (featureDesc) {
                doc.setFontSize(8);
                doc.setTextColor(MUTED);
                doc.text(featureDesc, startX + 6, yPos + 7);
              }
            }
          }
        }

        doc.setFillColor(AMBER);
        doc.rect(0, H - 1.5, W, 1.5, "F");

        doc.setFontSize(7);
        doc.setTextColor(MUTED);
        doc.text("CaskSense", 10, H - 5);

        if (!isCover) {
          doc.text(`${i} / ${tourSlideData.length - 1}`, W - 10, H - 5, { align: "right" });
        }
      }

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      fs.writeFileSync(cachedPath, pdfBuffer);
      fs.writeFileSync(versionPath, String(tourCacheVersion));
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="CaskSense-Rundgang.pdf"`);
      res.send(pdfBuffer);
    } catch (e: any) {
      console.error("PDF generation error:", e);
      res.status(500).json({ message: e.message || "PDF generation failed" });
    }
  });

  // ===== NOTIFICATIONS / NEWS FEED =====

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const all = await storage.getNotificationsForParticipant(participantId);
      const withReadStatus = all.map(n => {
        const readByList: string[] = JSON.parse(n.readBy || "[]");
        return { ...n, isRead: readByList.includes(participantId) };
      });
      res.json(withReadStatus);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/notifications/unread-count", async (req: Request, res: Response) => {
    try {
      const participantId = req.query.participantId as string;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const count = await storage.getUnreadNotificationCount(participantId);
      res.json({ count });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/notifications/:id/read", async (req: Request, res: Response) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      await storage.markNotificationRead(req.params.id, participantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/notifications/read-all", async (req: Request, res: Response) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      await storage.markAllNotificationsRead(participantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/notifications", async (req: Request, res: Response) => {
    try {
      const { participantId } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId required" });
      const requester = await storage.getParticipant(participantId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
      }
      const notif = await storage.createNotification({
        recipientId: null,
        type: req.body.type || "platform_update",
        title: req.body.title,
        message: req.body.message,
        linkUrl: req.body.linkUrl || null,
        tastingId: null,
        isGlobal: true,
      });
      res.status(201).json(notif);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PLATFORM ANALYTICS (measurement quality, predictive validity) =====

  app.get("/api/platform-analytics", async (req, res) => {
    try {
      const requesterId = req.query.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allTastings = await storage.getAllTastings();
      const completedTastings = allTastings.filter(t => (t.status === "reveal" || t.status === "archived") && !t.isTestData);

      if (completedTastings.length === 0) {
        return res.json({
          measurementQuality: { interRaterAgreement: [], raterConsistency: [], distributionAnalysis: null },
          predictiveValidity: { categoryCorrelations: null, propertyRankings: [], raterClusters: [] },
          summary: { totalTastings: 0, totalRatings: 0, totalParticipants: 0, totalWhiskies: 0 },
        });
      }

      // Gather all ratings from completed tastings
      const allRatingsNested = await Promise.all(
        completedTastings.map(async t => {
          const ratings = await storage.getRatingsForTasting(t.id);
          const whiskies = await storage.getWhiskiesForTasting(t.id);
          const scale = t.ratingScale ?? 100;
          return { tasting: t, ratings, whiskies, scale };
        })
      );

      const allRatings = allRatingsNested.flatMap(t =>
        t.ratings.map(r => ({ ...r, scale: t.scale }))
      );
      const allWhiskies = allRatingsNested.flatMap(t => t.whiskies);
      const whiskyMap = new Map(allWhiskies.map(w => [w.id, w]));
      const participantIds = Array.from(new Set(allRatings.map(r => r.participantId)));

      // --- 1. MEASUREMENT QUALITY ---

      // 1a. Inter-Rater Agreement per tasting (Kendall's W approximation via score variance)
      const interRaterAgreement = allRatingsNested.map(({ tasting, ratings, whiskies, scale }) => {
        if (ratings.length < 2 || whiskies.length < 2) {
          return { tastingId: tasting.id, title: tasting.title, date: tasting.date, agreement: null, raterCount: new Set(ratings.map(r => r.participantId)).size, whiskyCount: whiskies.length };
        }
        const raters = Array.from(new Set(ratings.map(r => r.participantId)));
        const norm = 100 / scale;
        // Build rank matrix: for each rater, rank whiskies by overall score
        const raterRankings: number[][] = [];
        for (const raterId of raters) {
          const raterRatings = ratings.filter(r => r.participantId === raterId);
          if (raterRatings.length < 2) continue;
          const sorted = [...raterRatings].sort((a, b) => b.overall - a.overall);
          const rankMap = new Map<string, number>();
          sorted.forEach((r, i) => rankMap.set(r.whiskyId, i + 1));
          const ranks = whiskies.map(w => rankMap.get(w.id) ?? (whiskies.length / 2));
          raterRankings.push(ranks);
        }
        if (raterRankings.length < 2) {
          return { tastingId: tasting.id, title: tasting.title, date: tasting.date, agreement: null, raterCount: raters.length, whiskyCount: whiskies.length };
        }
        const k = raterRankings.length; // number of raters
        const n = whiskies.length; // number of items
        // Kendall's W = 12 * S / (k^2 * (n^3 - n))
        const sumRanks = whiskies.map((_, j) => raterRankings.reduce((s, ranks) => s + ranks[j], 0));
        const meanRank = sumRanks.reduce((a, b) => a + b, 0) / n;
        const S = sumRanks.reduce((acc, sr) => acc + Math.pow(sr - meanRank, 2), 0);
        const W = (12 * S) / (k * k * (n * n * n - n));
        return {
          tastingId: tasting.id, title: tasting.title, date: tasting.date,
          agreement: Math.round(Math.min(1, Math.max(0, W)) * 1000) / 1000,
          raterCount: k, whiskyCount: n,
        };
      });

      // 1b. Rater Consistency: per participant, std dev of their normalized overall scores
      const raterConsistency = participantIds.map(pid => {
        const pRatings = allRatings.filter(r => r.participantId === pid);
        if (pRatings.length < 2) return { participantId: pid, consistency: null, ratingCount: pRatings.length, avgScore: null, bias: null };
        const normScores = pRatings.map(r => r.overall * (100 / r.scale));
        const avg = normScores.reduce((a, b) => a + b, 0) / normScores.length;
        const stdDev = Math.sqrt(normScores.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / normScores.length);
        const globalAvg = allRatings.reduce((a, r) => a + r.overall * (100 / r.scale), 0) / allRatings.length;
        return {
          participantId: pid,
          consistency: Math.round(stdDev * 10) / 10,
          ratingCount: pRatings.length,
          avgScore: Math.round(avg * 10) / 10,
          bias: Math.round((avg - globalAvg) * 10) / 10,
        };
      });

      // Get participant names
      const allParticipants = await storage.getAllParticipants();
      const participantMap = new Map(allParticipants.map(p => [p.id, p.name]));
      const raterConsistencyWithNames = raterConsistency.map(rc => ({
        ...rc,
        name: participantMap.get(rc.participantId) ?? "Unknown",
      }));

      // 1c. Distribution Analysis: histogram of normalized overall scores
      const normalizedOveralls = allRatings.map(r => r.overall * (100 / r.scale));
      const bucketSize = 5;
      const histogram: { range: string; count: number }[] = [];
      for (let i = 0; i < 100; i += bucketSize) {
        const upper = i + bucketSize;
        const count = normalizedOveralls.filter(s => s >= i && (upper >= 100 ? s <= upper : s < upper)).length;
        histogram.push({ range: `${i}-${upper}`, count });
      }
      const distMean = normalizedOveralls.reduce((a, b) => a + b, 0) / normalizedOveralls.length;
      const distStdDev = Math.sqrt(normalizedOveralls.reduce((acc, v) => acc + Math.pow(v - distMean, 2), 0) / normalizedOveralls.length);
      const sortedOveralls = [...normalizedOveralls].sort((a, b) => a - b);
      const distMedian = sortedOveralls.length % 2 === 0
        ? (sortedOveralls[sortedOveralls.length / 2 - 1] + sortedOveralls[sortedOveralls.length / 2]) / 2
        : sortedOveralls[Math.floor(sortedOveralls.length / 2)];
      const skewness = normalizedOveralls.length > 2 && distStdDev > 0
        ? (normalizedOveralls.reduce((acc, v) => acc + Math.pow((v - distMean) / distStdDev, 3), 0) / normalizedOveralls.length)
        : 0;

      const distributionAnalysis = {
        histogram,
        mean: Math.round(distMean * 10) / 10,
        median: Math.round(distMedian * 10) / 10,
        stdDev: Math.round(distStdDev * 10) / 10,
        skewness: Math.round(skewness * 100) / 100,
        totalRatings: normalizedOveralls.length,
      };

      // --- 2. PREDICTIVE VALIDITY ---

      // 2a. Category Correlations: Pearson correlation between sub-scores and overall
      const corrData = allRatings.map(r => {
        const norm = 100 / r.scale;
        return { nose: r.nose * norm, taste: r.taste * norm, finish: r.finish * norm, balance: r.balance * norm, overall: r.overall * norm };
      });
      const pearson = (xs: number[], ys: number[]): number => {
        const n = xs.length;
        if (n < 3) return 0;
        const mx = xs.reduce((a, b) => a + b, 0) / n;
        const my = ys.reduce((a, b) => a + b, 0) / n;
        let num = 0, dx2 = 0, dy2 = 0;
        for (let i = 0; i < n; i++) {
          const dx = xs[i] - mx, dy = ys[i] - my;
          num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
        }
        const denom = Math.sqrt(dx2 * dy2);
        return denom === 0 ? 0 : num / denom;
      };
      const overalls = corrData.map(d => d.overall);
      const categoryCorrelations = {
        nose: Math.round(pearson(corrData.map(d => d.nose), overalls) * 1000) / 1000,
        taste: Math.round(pearson(corrData.map(d => d.taste), overalls) * 1000) / 1000,
        finish: Math.round(pearson(corrData.map(d => d.finish), overalls) * 1000) / 1000,
        balance: Math.round(pearson(corrData.map(d => d.balance), overalls) * 1000) / 1000,
      };

      // 2b. Property Rankings: average score by whisky properties
      const propGroups: { property: string; values: { value: string; avgScore: number; count: number }[] }[] = [];
      for (const prop of ["region", "category", "caskInfluence", "peatLevel", "ageBand"] as const) {
        const acc: Record<string, { total: number; count: number }> = {};
        for (const r of allRatings) {
          const w = whiskyMap.get(r.whiskyId);
          if (!w) continue;
          const val = w[prop];
          if (!val) continue;
          if (!acc[val]) acc[val] = { total: 0, count: 0 };
          acc[val].total += r.overall * (100 / r.scale);
          acc[val].count++;
        }
        const values = Object.entries(acc)
          .map(([value, { total, count }]) => ({ value, avgScore: Math.round((total / count) * 10) / 10, count }))
          .sort((a, b) => b.avgScore - a.avgScore);
        if (values.length > 0) {
          propGroups.push({ property: prop, values });
        }
      }

      // 2c. Rater Clustering: k-means-like grouping based on flavor preferences
      const raterProfiles = participantIds.map(pid => {
        const pRatings = allRatings.filter(r => r.participantId === pid);
        if (pRatings.length < 3) return null;
        const norm = (r: typeof pRatings[0]) => 100 / r.scale;
        const avgNose = pRatings.reduce((a, r) => a + r.nose * norm(r), 0) / pRatings.length;
        const avgTaste = pRatings.reduce((a, r) => a + r.taste * norm(r), 0) / pRatings.length;
        const avgFinish = pRatings.reduce((a, r) => a + r.finish * norm(r), 0) / pRatings.length;
        const avgBalance = pRatings.reduce((a, r) => a + r.balance * norm(r), 0) / pRatings.length;
        return { participantId: pid, name: participantMap.get(pid) ?? "Unknown", nose: avgNose, taste: avgTaste, finish: avgFinish, balance: avgBalance, ratingCount: pRatings.length };
      }).filter(Boolean);

      // Simple clustering: classify by dominant dimension
      const raterClusters = (raterProfiles as NonNullable<typeof raterProfiles[0]>[]).map(rp => {
        const dims = [
          { dim: "nose", val: rp.nose },
          { dim: "taste", val: rp.taste },
          { dim: "finish", val: rp.finish },
          { dim: "balance", val: rp.balance },
        ];
        const dominant = dims.sort((a, b) => b.val - a.val)[0];
        return { ...rp, dominantDimension: dominant.dim, nose: Math.round(rp.nose * 10) / 10, taste: Math.round(rp.taste * 10) / 10, finish: Math.round(rp.finish * 10) / 10, balance: Math.round(rp.balance * 10) / 10 };
      });

      // --- SUMMARY ---
      const uniqueAnalyticsParticipants = await getUniquePersonCount(participantIds);
      const summary = {
        totalTastings: completedTastings.length,
        totalRatings: allRatings.length,
        totalParticipants: uniqueAnalyticsParticipants,
        totalWhiskies: new Set(allRatings.map(r => r.whiskyId)).size,
      };

      res.json({
        measurementQuality: {
          interRaterAgreement,
          raterConsistency: raterConsistencyWithNames,
          distributionAnalysis,
        },
        predictiveValidity: {
          categoryCorrelations,
          propertyRankings: propGroups,
          raterClusters,
        },
        summary,
      });
    } catch (e: any) {
      console.error("Platform analytics error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // AI-powered analytics analysis
  app.post("/api/platform-analytics/ai-analysis", async (req, res) => {
    try {
      const { requesterId, analyticsData } = req.body;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requesterAi = await storage.getParticipant(requesterId);
      if (!requesterAi || requesterAi.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }

      if (isAIDisabled("newsletter")) {
        return res.status(403).json({ message: "AI features are disabled" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const participant = await storage.getParticipant(requesterId);
      const lang = participant?.language === "de" ? "de" : "en";

      const systemPrompt = lang === "de"
        ? `Du bist ein Whisky-Tasting-Analytiker und Statistik-Experte. Analysiere die folgenden Bewertungsdaten und liefere wertvolle Erkenntnisse. Antworte auf Deutsch. Strukturiere deine Antwort in klar benannte Abschnitte mit Markdown-Überschriften (##). Sei prägnant aber tiefgründig. Verwende Whisky-Fachbegriffe. Maximal 500 Wörter.`
        : `You are a whisky tasting analyst and statistics expert. Analyze the following rating data and provide valuable insights. Respond in English. Structure your response with clear Markdown headings (##). Be concise but insightful. Use whisky terminology. Maximum 500 words.`;

      const userPrompt = JSON.stringify({
        summary: analyticsData.summary,
        measurementQuality: {
          interRaterAgreement: analyticsData.measurementQuality?.interRaterAgreement?.slice(0, 10),
          distributionAnalysis: analyticsData.measurementQuality?.distributionAnalysis,
          avgConsistency: analyticsData.measurementQuality?.raterConsistency?.length > 0
            ? Math.round(analyticsData.measurementQuality.raterConsistency
                .filter((r: any) => r.consistency !== null)
                .reduce((a: number, r: any) => a + r.consistency, 0) / analyticsData.measurementQuality.raterConsistency.filter((r: any) => r.consistency !== null).length * 10) / 10
            : null,
        },
        predictiveValidity: {
          categoryCorrelations: analyticsData.predictiveValidity?.categoryCorrelations,
          topProperties: analyticsData.predictiveValidity?.propertyRankings?.map((p: any) => ({
            property: p.property,
            top3: p.values.slice(0, 3),
          })),
        },
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1200,
        temperature: 0.7,
      });

      const analysis = completion.choices[0]?.message?.content || "";
      res.json({ analysis });
    } catch (e: any) {
      console.error("AI analytics error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  const supportQuestionTimestamps = new Map<string, number>();
  app.post("/api/support-question", async (req, res) => {
    try {
      const { name, email, question } = req.body;
      if (!question || typeof question !== "string" || !question.trim()) {
        return res.status(400).json({ message: "Question is required" });
      }
      if (question.length > 5000) {
        return res.status(400).json({ message: "Question too long (max 5000 characters)" });
      }
      if (name && typeof name === "string" && name.length > 200) {
        return res.status(400).json({ message: "Name too long" });
      }
      if (email && typeof email === "string" && email.length > 200) {
        return res.status(400).json({ message: "Email too long" });
      }
      const clientIp = req.ip || "unknown";
      const lastSubmit = supportQuestionTimestamps.get(clientIp);
      if (lastSubmit && Date.now() - lastSubmit < 60000) {
        return res.status(429).json({ message: "Please wait before sending another question" });
      }
      supportQuestionTimestamps.set(clientIp, Date.now());
      const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      const safeName = esc(String(name || "Nicht angegeben"));
      const safeEmail = esc(String(email || "Nicht angegeben"));
      const safeQuestion = esc(question.trim()).replace(/\n/g, "<br>");
      const emailContent = {
        subject: `[CaskSense Support] Frage von ${safeName}`,
        html: `<h2>Support-Anfrage</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>E-Mail:</strong> ${safeEmail}</p>
          <p><strong>Frage:</strong></p>
          <p>${safeQuestion}</p>
          <hr>
          <p style="color: #888; font-size: 12px;">Gesendet über CaskSense Hilfe &amp; FAQ</p>`,
      };
      sendEmail({ to: ADMIN_NOTIFICATION_EMAIL, ...emailContent }).catch((err) =>
        console.error("Failed to send support email:", err)
      );
      res.json({ success: true });
    } catch (e: any) {
      console.error("Support question error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // ===== COMMUNITY MANAGEMENT (T005) =====

  app.get("/api/communities/mine", async (req: Request, res: Response) => {
    try {
      const participantId = req.headers["x-participant-id"] as string;
      if (!participantId) return res.json({ communities: [] });
      const myCommunities = await storage.getParticipantCommunities(participantId);
      res.json({ communities: myCommunities });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/communities", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const allCommunities = await storage.getCommunities();
      const result = await Promise.all(allCommunities.map(async (c) => {
        const members = await storage.getCommunityMemberships(c.id);
        const { db: dbInst } = await import("./db");
        const { historicalTastings: htTable } = await import("@shared/schema");
        const { eq: eqOp, count } = await import("drizzle-orm");
        const [tastingCount] = await dbInst.select({ count: count() }).from(htTable).where(eqOp(htTable.communityId, c.id));
        return { ...c, memberCount: members.length, tastingCount: tastingCount?.count ?? 0 };
      }));
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/communities/:id", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const community = await storage.getCommunityById(req.params.id);
      if (!community) return res.status(404).json({ message: "Community not found" });
      const members = await storage.getCommunityMemberships(community.id);
      res.json({ ...community, members });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/admin/communities/:id", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const updateSchema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        archiveVisibility: z.enum(["community_only", "public_full", "public_aggregated", "private_admin"]).optional(),
        publicAggregatedEnabled: z.boolean().optional(),
      });
      const parsed = updateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });

      const updated = await storage.updateCommunity(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Community not found" });
      res.json(updated);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/communities/:id/members", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const community = await storage.getCommunityById(req.params.id);
      if (!community) return res.status(404).json({ message: "Community not found" });

      const memberSchema = z.object({
        participantId: z.string().uuid().optional(),
        email: z.string().email().optional(),
        role: z.enum(["admin", "member", "viewer"]).optional().default("member"),
      }).refine(d => d.participantId || d.email, { message: "participantId or email required" });
      const parsed = memberSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid input", errors: parsed.error.issues });

      let targetId = parsed.data.participantId;
      if (!targetId && parsed.data.email) {
        const { db: dbInst } = await import("./db");
        const { participants: pTable } = await import("@shared/schema");
        const { sql: sqlTag } = await import("drizzle-orm");
        const [found] = await dbInst.select().from(pTable).where(sqlTag`lower(${pTable.email}) = ${parsed.data.email.toLowerCase().trim()}`).limit(1);
        if (!found) return res.status(404).json({ message: "No participant found with that email" });
        targetId = found.id;
      }

      const membership = await storage.addCommunityMember({
        communityId: community.id,
        participantId: targetId!,
        role: parsed.data.role,
        status: "active",
      });
      res.json(membership);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.delete("/api/admin/communities/:id/members/:participantId", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      await storage.removeCommunityMember(req.params.id, req.params.participantId);
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== COMMUNITY SEED (T003) =====

  app.post("/api/admin/communities/seed", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      let community = await storage.getCommunityBySlug("aldering-tasting-circle");
      if (!community) {
        community = await storage.createCommunity({
          slug: "aldering-tasting-circle",
          name: "Aldering Tasting Circle",
          description: "The original tasting circle — 32+ blind tastings since the beginning.",
          archiveVisibility: "community_only",
          publicAggregatedEnabled: true,
        });
      }

      const { db: dbInst } = await import("./db");
      const { historicalTastings: htTable } = await import("@shared/schema");
      const { sql: sqlTag } = await import("drizzle-orm");
      const updateResult = await dbInst.execute(
        sqlTag`UPDATE historical_tastings SET community_id = ${community.id}, visibility_level = 'community_only' WHERE community_id IS NULL`
      );

      const isMember = await storage.isCommunityMember(community.id, requester.id);
      if (!isMember) {
        await storage.addCommunityMember({
          communityId: community.id,
          participantId: requester.id,
          role: "admin",
          status: "active",
        });
      }

      res.json({
        success: true,
        community,
        tastingsLinked: (updateResult as any)?.rowCount ?? "all unlinked",
        adminMember: true,
      });
    } catch (e: any) {
      console.error("Community seed error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  // ===== HISTORICAL TASTINGS (with access control — T004) =====

  async function getRequesterInfo(req: Request) {
    const participantId = req.headers["x-participant-id"] as string;
    if (!participantId) return { participantId: null, isAdmin: false, communityIds: [] as string[] };
    const participant = await storage.getParticipant(participantId);
    if (!participant) return { participantId: null, isAdmin: false, communityIds: [] as string[] };
    const isAdmin = participant.role === "admin";
    const myCommunities = await storage.getParticipantCommunities(participantId);
    return { participantId, isAdmin, communityIds: myCommunities.map(c => c.id) };
  }

  app.get("/api/historical/tastings", async (req: Request, res: Response) => {
    try {
      const { isAdmin, communityIds } = await getRequesterInfo(req);
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const search = req.query.search as string | undefined;
      const enriched = req.query.enriched === "true";

      const accessible = await storage.getAccessibleHistoricalTastingIds(communityIds, isAdmin);
      const tastingIds = accessible === "all" ? undefined : accessible;

      if (enriched) {
        const result = await storage.getHistoricalTastingsEnriched({ limit, offset, search, tastingIds });
        return res.json(result);
      }
      const result = await storage.getHistoricalTastings({ limit, offset, search, tastingIds });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/historical/tastings/:id", async (req: Request, res: Response) => {
    try {
      const tasting = await storage.getHistoricalTasting(req.params.id);
      if (!tasting) return res.status(404).json({ message: "Historical tasting not found" });

      const { isAdmin, communityIds } = await getRequesterInfo(req);

      if (tasting.visibilityLevel === "private_admin") {
        if (!isAdmin) {
          return res.status(403).json({
            message: "This tasting is restricted to administrators.",
            code: "ADMIN_ACCESS_REQUIRED",
          });
        }
      }

      if (tasting.visibilityLevel === "community_only") {
        if (!isAdmin && (!tasting.communityId || !communityIds.includes(tasting.communityId))) {
          return res.status(403).json({
            message: "This tasting belongs to a community archive. Members only.",
            code: "COMMUNITY_ACCESS_REQUIRED",
            communityId: tasting.communityId,
          });
        }
      }

      if (tasting.visibilityLevel === "public_aggregated" && !isAdmin && (!tasting.communityId || !communityIds.includes(tasting.communityId))) {
        const { entries, ...meta } = tasting;
        return res.json({
          ...meta,
          entries: entries.map(e => ({
            distilleryRaw: e.distilleryRaw,
            whiskyNameRaw: e.whiskyNameRaw,
            totalScore: e.totalScore,
            normalizedRegion: e.normalizedRegion,
            normalizedIsSmoky: e.normalizedIsSmoky,
          })),
          accessLevel: "aggregated",
        });
      }

      res.json({ ...tasting, accessLevel: "full" });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/historical/whisky-appearances", async (req: Request, res: Response) => {
    try {
      const { historicalTastingEntries: hte, historicalTastings: ht } = await import("@shared/schema");
      const { db: dbInst } = await import("./db");
      const { sql: sqlTag, and, asc, inArray } = await import("drizzle-orm");

      const distillery = (req.query.distillery as string || "").trim().toLowerCase();
      const name = (req.query.name as string || "").trim().toLowerCase();
      if (!distillery && !name) return res.json({ appearances: [], count: 0 });

      const { isAdmin, communityIds } = await getRequesterInfo(req);

      const conditions = [];
      if (distillery) {
        conditions.push(sqlTag`lower(${hte.distilleryRaw}) LIKE ${'%' + distillery + '%'}`);
      }
      if (name) {
        conditions.push(sqlTag`lower(${hte.whiskyNameRaw}) LIKE ${'%' + name + '%'}`);
      }

      if (!isAdmin && communityIds.length === 0) {
        conditions.push(inArray(ht.visibilityLevel, ["public_full", "public_aggregated"]));
      } else if (!isAdmin && communityIds.length > 0) {
        conditions.push(
          sqlTag`(${ht.visibilityLevel} IN ('public_full', 'public_aggregated') OR (${ht.communityId} IN (${sqlTag.join(communityIds.map(id => sqlTag`${id}`), sqlTag`,`)}) AND ${ht.visibilityLevel} IN ('community_only', 'public_full', 'public_aggregated')))`
        );
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      const rows = await dbInst
        .select({
          tastingId: hte.historicalTastingId,
          tastingNumber: ht.tastingNumber,
          tastingTitle: ht.titleDe,
          tastingDate: ht.tastingDate,
          distillery: hte.distilleryRaw,
          whiskyName: hte.whiskyNameRaw,
          totalScore: hte.totalScore,
          totalRank: hte.totalRank,
          noseScore: hte.noseScore,
          tasteScore: hte.tasteScore,
          finishScore: hte.finishScore,
          normalizedTotal: hte.normalizedTotal,
        })
        .from(hte)
        .innerJoin(ht, sqlTag`${hte.historicalTastingId} = ${ht.id}`)
        .where(whereClause)
        .orderBy(asc(ht.tastingNumber));

      const appearances = rows.map(r => ({
        ...r,
        tastingTitle: r.tastingTitle ?? `Tasting #${r.tastingNumber ?? "?"}`,
      }));

      const scoredApps = appearances.filter(a => a.normalizedTotal != null || a.totalScore != null);
      const avgScore = scoredApps.length > 0
        ? scoredApps.reduce((sum, a) => sum + (a.totalScore || 0), 0) / scoredApps.length
        : null;
      const avgScoreNormalized = scoredApps.length > 0
        ? scoredApps.reduce((sum, a) => sum + (a.normalizedTotal ?? (a.totalScore ?? 0) * 10), 0) / scoredApps.length
        : null;
      const bestPlacement = appearances.reduce<any>((best, a) => {
        if (a.totalRank != null && (best === null || a.totalRank < best.totalRank)) return a;
        return best;
      }, null);

      res.json({
        appearances,
        count: appearances.length,
        avgScore: avgScore != null ? Math.round(avgScore * 100) / 100 : null,
        avgScoreNormalized: avgScoreNormalized != null ? Math.round(avgScoreNormalized * 10) / 10 : null,
        sourceScale: 10,
        bestPlacement: bestPlacement ? {
          rank: bestPlacement.totalRank,
          tastingNumber: bestPlacement.tastingNumber,
          tastingId: bestPlacement.tastingId,
        } : null,
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/historical/analytics", async (req: Request, res: Response) => {
    try {
      const { isAdmin, communityIds } = await getRequesterInfo(req);
      const accessible = await storage.getAccessibleHistoricalTastingIds(communityIds, isAdmin);
      const tastingIds = accessible === "all" ? undefined : accessible;
      const stats = await storage.getHistoricalWhiskyStats(tastingIds);
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/historical/public-insights", async (_req: Request, res: Response) => {
    try {
      const { db: dbInst } = await import("./db");
      const { historicalTastings: htTable, historicalTastingEntries: hteTable } = await import("@shared/schema");
      const { inArray, eq } = await import("drizzle-orm");
      const publicTastings = await dbInst.select({ id: htTable.id }).from(htTable)
        .where(inArray(htTable.visibilityLevel, ["public_full", "public_aggregated"]));
      const publicIds = publicTastings.map(t => t.id);
      let allEntries: any[];
      if (publicIds.length === 0) {
        allEntries = [];
      } else {
        allEntries = await dbInst.select().from(hteTable).where(inArray(hteTable.historicalTastingId, publicIds));
      }

      const regionBreakdown: Record<string, number> = {};
      let smoky = 0, nonSmoky = 0, unknown = 0;
      const caskBreakdown: Record<string, number> = {};
      const scoreRanges = [
        { range: "< 60", min: 0, max: 60, count: 0 },
        { range: "60-69", min: 60, max: 70, count: 0 },
        { range: "70-79", min: 70, max: 80, count: 0 },
        { range: "80-89", min: 80, max: 90, count: 0 },
        { range: "90+", min: 90, max: 200, count: 0 },
      ];
      const distilleryScores: Record<string, { total: number; count: number; name: string }> = {};

      for (const e of allEntries) {
        if (e.normalizedRegion) regionBreakdown[e.normalizedRegion] = (regionBreakdown[e.normalizedRegion] || 0) + 1;
        if (e.normalizedIsSmoky === true) smoky++;
        else if (e.normalizedIsSmoky === false) nonSmoky++;
        else unknown++;
        if (e.normalizedCask) caskBreakdown[e.normalizedCask] = (caskBreakdown[e.normalizedCask] || 0) + 1;
        if (e.totalScore != null) {
          for (const r of scoreRanges) {
            if (e.totalScore >= r.min && e.totalScore < r.max) { r.count++; break; }
          }
          const key = (e.distilleryRaw || "Unknown").toLowerCase().trim();
          if (!distilleryScores[key]) distilleryScores[key] = { total: 0, count: 0, name: e.distilleryRaw || "Unknown" };
          distilleryScores[key].total += e.totalScore;
          distilleryScores[key].count++;
        }
      }

      const topWhiskies = Object.values(distilleryScores)
        .filter(d => d.count >= 2)
        .map(d => ({ distillery: d.name, avgScore: Math.round((d.total / d.count) * 100) / 100, appearances: d.count }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, 15);

      res.json({
        totalEntries: allEntries.length,
        topDistilleries: topWhiskies,
        regionBreakdown,
        smokyBreakdown: { smoky, nonSmoky, unknown },
        caskBreakdown,
        scoreDistribution: scoreRanges.map(r => ({ range: r.range, count: r.count })),
      });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/admin/historical/import", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const dryRun = req.query.dryRun === "true";

      const { importHistoricalTastings } = await import("./historical-import.js");
      const result = await importHistoricalTastings({ dryRun });
      const statusCode = result.errors.length > 0 ? 207 : 200;
      res.status(statusCode).json(result);
    } catch (e: any) {
      console.error("Historical import error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/historical/reconciliation", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const { runReconciliation } = await import("./historical-reconciliation.js");
      const report = await runReconciliation();
      res.json(report);
    } catch (e: any) {
      console.error("Historical reconciliation error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.get("/api/admin/historical/import-runs", async (req: Request, res: Response) => {
    try {
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") return res.status(403).json({ message: "Admin access required" });

      const runs = await storage.getHistoricalImportRuns();
      res.json(runs);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PDF STYLE THEME (AI-generated cover page styling) =====
  app.post("/api/tastings/:id/pdf-style", async (req: Request, res: Response) => {
    try {
      const tastingId = req.params.id;
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });

      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });
      if (tasting.hostId !== requesterId) return res.status(403).json({ message: "Host only" });

      const { prompt, whiskies, tastingTitle } = req.body;
      if (!prompt || typeof prompt !== "string") return res.status(400).json({ message: "Prompt required" });

      const { client } = await getAIClient(requesterId, "pdf-style");
      if (!client) return res.status(503).json({ message: "AI not available" });

      const sanitizedPrompt = prompt.trim().slice(0, 500);

      const whiskyContext = (whiskies || []).slice(0, 12).map((w: any) =>
        [w.name, w.region, w.caskInfluence].filter(Boolean).join(", ")
      ).join("; ");

      const systemPrompt = `You are a graphic design assistant for CaskSense, a premium whisky tasting platform.
Your job: generate a PDF cover page color scheme and tagline based on the user's mood description and the whiskies in the tasting.

DESIGN CONSTRAINTS (Apple-level premium aesthetic):
- Colors must stay within warm, sophisticated tones: navy, slate, amber, cream, copper, mahogany, forest green, charcoal
- NEVER use neon, bright blue, bright red, pink, or saturated colors
- Background should be subtle and printable (not too dark for paper)
- The palette should feel like a premium whisky label or a high-end magazine cover

Return ONLY valid JSON with this exact structure:
{
  "tagline": "A short, evocative subtitle (max 60 chars) fitting the tasting mood, in the same language as the user's prompt",
  "colorScheme": {
    "primary": [r, g, b],
    "accent": [r, g, b],
    "background": [r, g, b],
    "textDark": [r, g, b],
    "textLight": [r, g, b]
  },
  "mood": "one-word mood descriptor in English"
}

RGB values must be 0-255 integers. Background should be light enough for text readability on paper.`;

      const userMsg = `Tasting: "${tastingTitle || tasting.title}"
Whiskies: ${whiskyContext || "not specified"}
User's style request: ${sanitizedPrompt}`;

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) return res.status(500).json({ message: "No AI response" });

      const parsed = JSON.parse(raw);
      const clampRgb = (v: any): [number, number, number] => {
        if (!Array.isArray(v) || v.length < 3) return [30, 41, 59];
        return [Math.max(0, Math.min(255, Math.round(Number(v[0])))), Math.max(0, Math.min(255, Math.round(Number(v[1])))), Math.max(0, Math.min(255, Math.round(Number(v[2]))))];
      };
      const cs = parsed.colorScheme;
      if (!cs || !parsed.tagline || typeof parsed.tagline !== "string") {
        return res.status(500).json({ message: "Invalid AI response format" });
      }

      res.json({
        tagline: parsed.tagline.slice(0, 120),
        colorScheme: {
          primary: clampRgb(cs.primary),
          accent: clampRgb(cs.accent),
          background: clampRgb(cs.background),
          textDark: clampRgb(cs.textDark),
          textLight: clampRgb(cs.textLight),
        },
        mood: typeof parsed.mood === "string" ? parsed.mood.slice(0, 30) : "elegant",
      });
    } catch (e: any) {
      console.error("PDF style generation error:", e.message);
      res.status(500).json({ message: e.message });
    }
  });

  // ===== TASTING MENU COVER IMAGE (AI-generated) =====
  app.post("/api/tastings/:id/menu-cover", async (req: Request, res: Response) => {
    try {
      const tastingId = req.params.id;
      const requesterId = req.headers["x-participant-id"] as string;
      if (!requesterId) return res.status(403).json({ message: "Forbidden" });

      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      if (tasting.hostId !== requesterId) {
        const requester = await storage.getParticipant(requesterId);
        if (!requester || requester.role !== "admin") {
          return res.status(403).json({ message: "Only the host or an admin can generate a menu cover" });
        }
      }

      if (await isAIDisabled("image_generation")) {
        return res.status(503).json({ message: "AI image generation is currently disabled" });
      }

      const whiskiesForTasting = await storage.getWhiskiesForTasting(tastingId);
      const { customPromptHint } = req.body || {};

      const regions = new Set<string>();
      const caskTypes = new Set<string>();
      const peatLevels = new Set<string>();
      const distilleries = new Set<string>();
      let hasHighPeat = false;

      for (const w of whiskiesForTasting) {
        if (w.region) regions.add(w.region);
        if (w.caskInfluence) caskTypes.add(w.caskInfluence);
        if (w.peatLevel) {
          peatLevels.add(w.peatLevel);
          if (w.peatLevel === "Heavy" || w.peatLevel === "Medium") hasHighPeat = true;
        }
        if (w.distillery) distilleries.add(w.distillery);
      }

      const tastingDate = tasting.date || "";
      let season = "autumn";
      if (tastingDate) {
        const month = parseInt(tastingDate.split("-")[1] || "0", 10);
        if (month >= 3 && month <= 5) season = "spring";
        else if (month >= 6 && month <= 8) season = "summer";
        else if (month >= 9 && month <= 11) season = "autumn";
        else if (month === 12 || month === 1 || month === 2) season = "winter";
      }

      const seasonMood: Record<string, string> = {
        spring: "soft natural daylight, fresh green botanicals, light and airy atmosphere",
        summer: "golden hour sunlight, outdoor terrace feeling, warm and bright",
        autumn: "warm amber candlelight, rich harvest colors, cozy intimate atmosphere",
        winter: "fireplace glow, deep warm tones, snowy window backdrop, hygge atmosphere",
      };

      let visualTheme = "classic whisky tasting";
      if (regions.has("Islay") || hasHighPeat) {
        visualTheme = "rugged Scottish coastal landscape inspiration, peat smoke wisps, maritime elements";
      } else if (regions.has("Speyside") || regions.has("Highland")) {
        visualTheme = "Scottish Highland glen, heather and oak, traditional distillery warmth";
      } else if (regions.has("Kentucky") || regions.has("Tennessee")) {
        visualTheme = "American bourbon heritage, charred oak barrels, copper stills, Southern warmth";
      } else if (regions.has("Japan") || regions.has("Japanese")) {
        visualTheme = "Japanese minimalist elegance, zen garden elements, refined simplicity";
      } else if (regions.has("Ireland") || regions.has("Irish")) {
        visualTheme = "Irish countryside charm, lush green, pot still tradition";
      }

      let caskVisual = "";
      if (caskTypes.has("Sherry") || caskTypes.has("Oloroso") || caskTypes.has("PX")) {
        caskVisual = ", rich mahogany and deep amber tones, dried fruit accents";
      } else if (caskTypes.has("Bourbon")) {
        caskVisual = ", golden honey tones, vanilla and caramel warmth";
      } else if (caskTypes.has("Port") || caskTypes.has("Wine")) {
        caskVisual = ", deep ruby and burgundy accents, wine-influenced richness";
      }

      let moodStyle: string;
      if (tasting.blindMode) {
        moodStyle = "mysterious and intriguing atmosphere, silhouetted bottles with hidden labels, dramatic shadows, sense of discovery and anticipation";
      } else {
        moodStyle = "welcoming and inviting atmosphere, beautifully arranged bottles with visible labels, warm hospitality, elegant presentation";
      }

      const promptParts = [
        "Photorealistic still-life photograph",
        "whisky tasting table setting",
        visualTheme,
        caskVisual,
        seasonMood[season],
        moodStyle,
        `${whiskiesForTasting.length} whisky glasses arranged elegantly`,
        "dark wood table, crystal glassware, warm ambient lighting",
        "editorial quality, magazine cover worthy, 8k resolution",
        "no text, no labels with readable text, no watermarks",
      ];

      if (customPromptHint && typeof customPromptHint === "string" && customPromptHint.trim()) {
        promptParts.push(customPromptHint.trim());
      }

      const finalPrompt = promptParts.filter(Boolean).join(", ");

      const { generateImageBuffer } = await import("./replit_integrations/image/client.js");
      const imageBuffer = await generateImageBuffer(finalPrompt, "1024x1024");

      let jpegBuffer: Buffer;
      try {
        jpegBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
      } catch {
        jpegBuffer = imageBuffer;
      }

      const base64 = jpegBuffer.toString("base64");
      res.json({
        coverImageBase64: base64,
        mimeType: "image/jpeg",
        prompt: finalPrompt,
        context: {
          season,
          regions: Array.from(regions),
          caskTypes: Array.from(caskTypes),
          peatLevels: Array.from(peatLevels),
          blindMode: !!tasting.blindMode,
          whiskyCount: whiskiesForTasting.length,
        },
      });
    } catch (e: any) {
      console.error("Menu cover generation error:", e);
      res.status(500).json({ message: e.message || "Failed to generate menu cover image" });
    }
  });

  // ──── Making-Of Timeline ────
  const MAKING_OF_TIMELINE = [
    {
      id: "ch1",
      chapter: 1,
      titleKey: "makingOf.ch1.title",
      titleFallback: "The First Pour",
      dateRange: "14. Feb 2026",
      narrativeKey: "makingOf.ch1.narrative",
      narrativeFallback: "Day one. A blank canvas and a bold idea: build a complete whisky tasting platform from scratch. In a single marathon session, 95 meaningful commits transformed an empty repository into a living, breathing application — dual-language, with photo uploads, PDF exports, blind mode, and a first deployment to the world. Like opening a new bottle: the first pour is always the most exciting.",
      stats: { commits: 95, features: 22 },
      color: "#F5DEB3",
      milestones: [
        "Initial commit → full app structure",
        "Dual-language support (EN/DE) from hour one",
        "Whisky management with photos & Whiskybase lookup",
        "Blind tasting mode with sequential reveal",
        "PDF export & flight board",
        "First deployment to production"
      ],
      isDown: false,
      lesson: "Don't overthink the start. Just pour."
    },
    {
      id: "ch2",
      chapter: 2,
      titleKey: "makingOf.ch2.title",
      titleFallback: "Finding the Nose",
      dateRange: "15. – 19. Feb 2026",
      narrativeKey: "makingOf.ch2.narrative",
      narrativeFallback: "The next days were about exploration — nosing out which features would define CaskSense. Barcode scanning for instant whisky identification, an interactive distillery map, multi-language support beyond just EN/DE, mobile-first PWA capabilities, AI-powered bottle identification from photos. Some ideas stuck, others were refined. Like nosing a complex single malt: each sniff reveals a new layer.",
      stats: { commits: 148, features: 35 },
      color: "#ECC978",
      milestones: [
        "AI bottle identification from photos",
        "Barcode scanner for Whiskybase lookup",
        "Interactive distillery map",
        "Newsletter system with rich editor",
        "Mobile app support (Capacitor)",
        "Guest modes: Standard & Ultra Naked"
      ],
      isDown: false,
      lesson: "Not every feature idea survives — and that's the beauty of iteration."
    },
    {
      id: "ch3",
      chapter: 3,
      titleKey: "makingOf.ch3.title",
      titleFallback: "The Rough Edges",
      dateRange: "20. – 23. Feb 2026",
      narrativeKey: "makingOf.ch3.narrative",
      narrativeFallback: "Every good whisky has a moment of harshness before the character shines through. These were those days. Rollbacks, broken login flows, donation module crashes, AI features that didn't behave. Two forced restores to previous versions. The kind of days where you question everything — but each fix taught something irreplaceable about building resilient software.",
      stats: { commits: 201, features: 28 },
      color: "#D4A256",
      milestones: [
        "Multiple rollbacks to stable versions",
        "Login stacking bugs on mobile",
        "Donation module breaking the UI",
        "AI profile generation failures",
        "Security hardening: session validation",
        "Test suite establishment"
      ],
      isDown: true,
      lesson: "Rollbacks are not failures — they're safety nets that prove your process works."
    },
    {
      id: "ch4",
      chapter: 4,
      titleKey: "makingOf.ch4.title",
      titleFallback: "The Cask Strength",
      dateRange: "24. – 25. Feb 2026",
      narrativeKey: "makingOf.ch4.narrative",
      narrativeFallback: "Time to consolidate. Like cask-strength whisky that needs no dilution, the core was strong enough to refine without adding. Navigation restructured from scratch, bottom tab bars for mobile, consistent page layouts across every screen. The unglamorous work that separates a prototype from a product.",
      stats: { commits: 55, features: 12 },
      color: "#C48B3F",
      milestones: [
        "Complete navigation restructure",
        "Bottom tab bar for mobile",
        "Standardized page layout system",
        "Accessibility improvements",
        "Design guidelines documented",
        "Experience level system (later removed)"
      ],
      isDown: false,
      lesson: "The best features are the ones you remove to make space for clarity."
    },
    {
      id: "ch5",
      chapter: 5,
      titleKey: "makingOf.ch5.title",
      titleFallback: "The Rebirth",
      dateRange: "28. Feb – 2. Mär 2026",
      narrativeKey: "makingOf.ch5.narrative",
      narrativeFallback: "The most pivotal moment. Like re-casking a whisky for a completely different finish — the entire UI was reimagined. 'Module 2' was born: an Apple-inspired design system with warm amber tones, Playfair Display typography, custom SVG icons, and an ambient background glow. Not an update, a transformation. The old interface was preserved at /m1 while the new world opened at /m2.",
      stats: { commits: 89, features: 18 },
      color: "#B07A35",
      milestones: [
        "Module 2 'Dark Lab' conceived and built",
        "Apple-design system with Playfair Display",
        "Custom SVG navigation icons (Glencairn glass)",
        "Ambient warm glow animation",
        "3-tab bottom navigation (Tasting | Taste | Circle)",
        "Old UI preserved, new UI as default"
      ],
      isDown: false,
      lesson: "Sometimes you have to break your own creation to build something truly great."
    },
    {
      id: "ch6",
      chapter: 6,
      titleKey: "makingOf.ch6.title",
      titleFallback: "The Full Body",
      dateRange: "3. – 6. Mär 2026",
      narrativeKey: "makingOf.ch6.narrative",
      narrativeFallback: "With the new design as foundation, features poured in at record pace. Historical tastings imported from Excel archives, community features with rankings and 'Taste Twins', score normalization across sources, AI-generated tasting menu cards, a complete landing page — 109 commits on the peak day alone. Like a full-bodied Islay at cask strength: intense, complex, unforgettable.",
      stats: { commits: 272, features: 45 },
      color: "#8B5E2F",
      milestones: [
        "Historical tasting import from Excel",
        "Community Circle with rankings",
        "Score normalization (0–100 scale)",
        "AI-generated menu cover images",
        "Premium landing page (14 sections)",
        "109 commits in a single day (record)"
      ],
      isDown: false,
      lesson: "A great foundation makes everything else flow effortlessly."
    },
    {
      id: "ch7",
      chapter: 7,
      titleKey: "makingOf.ch7.title",
      titleFallback: "The Finish",
      dateRange: "7. Mär 2026",
      narrativeKey: "makingOf.ch7.narrative",
      narrativeFallback: "Today. The finish of a great whisky lingers — warm, evolving, memorable. A demo tasting for instant onboarding, color-coded rating dimensions inspired by Apple Health, a slow-scroll landing page that tells its own story. And now: this very page you're reading, documenting the journey. Because the best stories are the ones you share with friends.",
      stats: { commits: 30, features: 8 },
      color: "#6B4226",
      milestones: [
        "Demo Tasting: 8 Islay whiskies, no login",
        "Color-coded rating dimensions",
        "Slow-scroll landing page experience",
        "Session management hardening",
        "This Making-Of timeline",
        "The story continues..."
      ],
      isDown: false,
      lesson: "A great finish isn't an ending — it's an invitation to pour again."
    }
  ];

  const MAKING_OF_STATS = {
    totalDays: 20,
    totalCommits: 1625,
    featuresBuilt: 168,
    rollbacksSurvived: 5,
    linesOfCode: "50k+",
    languages: 2,
    firstCommit: "2026-02-14",
    latestCommit: "2026-03-07"
  };

  app.get("/api/making-of", async (req: Request, res: Response) => {
    try {
      const pid = req.headers["x-participant-id"] as string;
      if (!pid) return res.status(401).json({ message: "Not authenticated" });
      const participant = await storage.getParticipant(pid);
      if (!participant) return res.status(404).json({ message: "Participant not found" });
      if (participant.role !== "admin" && !participant.makingOfAccess) {
        return res.status(403).json({ message: "Access not granted" });
      }
      res.json({ chapters: MAKING_OF_TIMELINE, stats: MAKING_OF_STATS });
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.patch("/api/admin/participants/:id/making-of-access", async (req: Request, res: Response) => {
    try {
      const requesterId = req.body.requesterId as string;
      if (!requesterId) return res.status(400).json({ message: "requesterId required" });
      const requester = await storage.getParticipant(requesterId);
      if (!requester || requester.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      const { access } = req.body;
      if (typeof access !== "boolean") {
        return res.status(400).json({ message: "access must be boolean" });
      }
      const result = await storage.updateMakingOfAccess(req.params.id, access);
      if (!result) return res.status(404).json({ message: "Participant not found" });
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // ===== PAPER SHEET SCANNING =====

  const sheetScanUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req: any, file: any, cb: any) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) cb(null, true);
      else cb(new Error("Only image files are allowed"));
    },
  });

  app.post("/api/tastings/:id/scan-sheet", sheetScanUpload.array("photos", 10), async (req: Request, res: Response) => {
    try {
      const tastingId = req.params.id;
      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      const requesterId = req.headers["x-participant-id"] as string || req.body.participantId;
      if (requesterId) {
        const isHost = tasting.hostId === requesterId;
        const isInTasting = await storage.isParticipantInTasting(tastingId, requesterId);
        if (!isHost && !isInTasting) {
          return res.status(403).json({ message: "Not authorized for this tasting" });
        }
      }

      const whiskiesList = await storage.getWhiskiesForTasting(tastingId);
      if (!whiskiesList || whiskiesList.length === 0) {
        return res.status(400).json({ message: "No whiskies in this tasting" });
      }

      const files = (req as any).files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "At least one photo is required" });
      }

      const participantId = req.body.participantId || null;

      const { client: openai } = await getAIClient(null, "scan_sheet");
      if (!openai) {
        return res.status(503).json({ message: "AI is not available" });
      }

      const whiskyLineup = whiskiesList
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((w, i) => {
          if (tasting.blindMode) {
            return `Sample #${i + 1} (internal ID: ${w.id})`;
          }
          return `#${i + 1}: ${w.name}${w.distillery ? ` (${w.distillery})` : ""} (internal ID: ${w.id})`;
        })
        .join("\n");

      const ratingScale = tasting.ratingScale || 100;

      const imageMessages: any[] = files.map(f => ({
        type: "image_url" as const,
        image_url: {
          url: `data:${f.mimetype};base64,${f.buffer.toString("base64")}`,
          detail: "high" as const,
        },
      }));

      const systemPrompt = `You are an AI that extracts whisky tasting scores from photographs of handwritten paper tasting sheets.

The tasting "${tasting.title}" uses a rating scale of 0-${ratingScale}.
The whisky lineup is:
${whiskyLineup}

Extract from the photographed sheet(s):
1. Participant name (if visible on the sheet)
2. For each whisky: nose score, taste score, finish score, balance score, overall score, and any handwritten tasting notes

Return ONLY valid JSON in this exact format:
{
  "participantName": "Name from sheet or null",
  "scores": [
    {
      "whiskyIndex": 0,
      "whiskyId": "internal ID from the lineup",
      "whiskyName": "name or Sample #N",
      "nose": number or null,
      "taste": number or null,
      "finish": number or null,
      "balance": number or null,
      "overall": number or null,
      "notes": "transcribed handwritten notes or empty string"
    }
  ]
}

Rules:
- Match whiskies by their number/position on the sheet to the lineup above
- Scores must be within 0-${ratingScale} range
- If a score field is empty or unreadable, use null
- Transcribe handwritten notes as accurately as possible
- If participant name is not visible, set participantName to null
- Return scores array in the same order as the whisky lineup
- Only include whiskies that have at least one score or note on the sheet`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract all scores and notes from this tasting sheet photograph:" },
              ...imageMessages,
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return res.status(422).json({ message: "Could not extract scores from the image" });
      }

      let extracted: any;
      try {
        extracted = JSON.parse(jsonMatch[0]);
      } catch {
        return res.status(422).json({ message: "Failed to parse extracted data" });
      }

      if (participantId) {
        extracted.participantId = participantId;
      }

      res.json(extracted);
    } catch (e: any) {
      console.error("Scan sheet error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  app.post("/api/tastings/:id/confirm-scores", async (req: Request, res: Response) => {
    try {
      const tastingId = req.params.id;
      const tasting = await storage.getTasting(tastingId);
      if (!tasting) return res.status(404).json({ message: "Tasting not found" });

      if (tasting.status === "archived") {
        return res.status(400).json({ message: "Cannot add scores to an archived tasting" });
      }

      const { participantId, scores } = req.body;
      if (!participantId) return res.status(400).json({ message: "participantId is required" });
      if (!scores || !Array.isArray(scores) || scores.length === 0) {
        return res.status(400).json({ message: "scores array is required" });
      }

      const participant = await storage.getParticipant(participantId);
      if (!participant) return res.status(404).json({ message: "Participant not found" });

      const isInTasting = await storage.isParticipantInTasting(tastingId, participantId);
      if (!isInTasting) {
        return res.status(403).json({ message: "Participant is not part of this tasting" });
      }

      const requesterId = req.headers["x-participant-id"] as string;
      if (requesterId && requesterId !== participantId) {
        const isHost = tasting.hostId === requesterId;
        if (!isHost) {
          return res.status(403).json({ message: "Only the host can submit scores for other participants" });
        }
      }

      const whiskiesList = await storage.getWhiskiesForTasting(tastingId);
      const whiskyIds = new Set(whiskiesList.map(w => w.id));

      const maxScale = tasting.ratingScale || 100;
      const savedRatings = [];

      for (const score of scores) {
        if (!score.whiskyId || !whiskyIds.has(score.whiskyId)) continue;

        const clamp = (v: any) => {
          if (v == null || v === "") return null;
          const n = Number(v);
          if (isNaN(n)) return null;
          return Math.max(0, Math.min(n, maxScale));
        };

        const nose = clamp(score.nose);
        const taste = clamp(score.taste);
        const finish = clamp(score.finish);
        const balance = clamp(score.balance);
        const overall = clamp(score.overall);

        let normalizedScore: number | null = null;
        if (overall != null) {
          normalizedScore = maxScale === 100 ? overall : Math.round((overall / maxScale) * 1000) / 10;
        }

        const rating = await storage.upsertRating({
          tastingId,
          whiskyId: score.whiskyId,
          participantId,
          nose,
          taste,
          finish,
          balance,
          overall,
          notes: score.notes || "",
          normalizedScore,
          source: "paper",
        });
        savedRatings.push(rating);
      }

      if (savedRatings.length === 0) {
        return res.status(400).json({ message: "No valid scores could be saved — check whisky IDs" });
      }

      res.json({ saved: savedRatings.length, ratings: savedRatings });
    } catch (e: any) {
      console.error("Confirm scores error:", e);
      res.status(500).json({ message: e.message });
    }
  });

  return httpServer;
}
