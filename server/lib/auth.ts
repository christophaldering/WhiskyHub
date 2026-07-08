import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 10;

// SECURITY (H-01): Signierte, ablaufende Sitzungs-Token ersetzen die rohe UUID als
// Zugangsnachweis. Das Token ist mit SESSION_SECRET signiert und läuft ab; die UUID
// allein genügt damit (nach dem Scharfschalten) nicht mehr.
const SESSION_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 Tage
function sessionSecret(): string {
  return process.env.SESSION_SECRET || process.env.DATABASE_URL || "";
}
export function issueSessionToken(participantId: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${participantId}.${exp}`;
  const sig = crypto.createHmac("sha256", sessionSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}
// Gibt die participantId zurück, wenn Token gültig UND nicht abgelaufen; sonst null.
export function verifySessionToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [participantId, expStr, sig] = parts;
  const exp = Number(expStr);
  if (!participantId || !Number.isFinite(exp)) return null;
  if (Date.now() > exp) return null;
  const expected = crypto.createHmac("sha256", sessionSecret()).update(`${participantId}.${exp}`).digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  return participantId;
}
// Unterscheidet Token (genau 3 punktgetrennte Teile) von roher UUID (keine Punkte).
export function looksLikeSessionToken(value: string): boolean {
  return typeof value === "string" && value.split(".").length === 3;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored || !plain) return false;
  // SECURITY (H-02): NUR bcrypt-Hashes werden akzeptiert. Kein Klartext-Vergleich mehr.
  // Ein gespeicherter Wert, der kein gültiger bcrypt-Hash ist, gilt als ungültig.
  if (stored.startsWith("$2b$") || stored.startsWith("$2a$")) {
    return bcrypt.compare(plain, stored);
  }
  return false;
}
