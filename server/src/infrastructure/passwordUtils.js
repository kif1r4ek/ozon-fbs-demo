import crypto from "node:crypto";

export function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const derived = crypto.scryptSync(password, salt, 64);
  const stored = Buffer.from(hash, "hex");
  if (stored.length !== derived.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}
