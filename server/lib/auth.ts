import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

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
